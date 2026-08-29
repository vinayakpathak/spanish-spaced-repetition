#!/usr/bin/env swift

/**
 Batch Spanish OCR for the generated comic corpus.

 This is the Apple-platform OCR worker used by build-generated-corpus.mjs. It
 deliberately does no downloading and adds no translations or definitions. A
 job file has this shape:

 {
   "schemaVersion": 1,
   "recognitionLanguage": "es-ES",
   "minimumTextHeight": 0.003,
   "jobs": [
     {
       "comicId": "xkcd-es-1",
       "imagePath": "/absolute/cache/image.png",
       "outputPath": "/absolute/cache/vision/result.json"
     }
   ]
 }

 Usage:
   swift scripts/ocr-corpus.swift --jobs /tmp/tira-ocr-jobs.json
   swift scripts/ocr-corpus.swift --jobs /tmp/tira-ocr-jobs.json --force

 Each result is written atomically as deterministic, sorted-key JSON. Vision's
 normalized bottom-left coordinates are converted to percentages with a CSS-
 compatible top-left origin. Recognition confidence is copied from the Vision
 line candidate onto each token; downstream code must treat it as a review
 signal, not as proof that a token is correct.
 */

import AppKit
import Foundation
import Vision

private struct OCRJob: Decodable {
  let comicId: String
  let imagePath: String
  let outputPath: String
}

private struct OCRBatch: Decodable {
  let schemaVersion: Int
  let recognitionLanguage: String
  let minimumTextHeight: Float
  let jobs: [OCRJob]
}

private struct PercentBounds: Codable {
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

private struct RawToken: Codable {
  let text: String
  let confidence: Float
  let bounds: PercentBounds
  let sourceRangeLocation: Int
  let sourceRangeLength: Int
}

private struct RawLine: Codable {
  let sourceOrder: Int
  let text: String
  let confidence: Float
  let bounds: PercentBounds
  let tokens: [RawToken]
}

private struct RawImage: Codable {
  let widthPx: Int
  let heightPx: Int
}

private struct RawEngine: Codable {
  let name: String
  let recognitionLevel: String
  let recognitionLanguages: [String]
  let usesLanguageCorrection: Bool
  let minimumTextHeight: Float
}

private struct RawOCRDocument: Codable {
  let schemaVersion: Int
  let comicId: String
  let image: RawImage
  let engine: RawEngine
  let lines: [RawLine]
}

private enum CLIError: Error, CustomStringConvertible {
  case usage(String)
  case invalidInput(String)

  var description: String {
    switch self {
    case .usage(let message), .invalidInput(let message): return message
    }
  }
}

private let usage = """
usage: ocr-corpus.swift --jobs JOBS_JSON [--force]

Reads a version-1 batch job file and writes one raw Apple Vision OCR JSON file
per job. Run scripts/build-generated-corpus.mjs for the complete cache, build,
and validation pipeline.
"""

private func parseArguments() throws -> (jobsPath: String, force: Bool) {
  var jobsPath: String?
  var force = false
  var index = 1

  while index < CommandLine.arguments.count {
    let argument = CommandLine.arguments[index]
    switch argument {
    case "--jobs":
      index += 1
      guard index < CommandLine.arguments.count else {
        throw CLIError.usage("--jobs requires a path\n\n\(usage)")
      }
      jobsPath = CommandLine.arguments[index]
    case "--force":
      force = true
    case "--help", "-h":
      print(usage)
      exit(0)
    default:
      throw CLIError.usage("unknown argument: \(argument)\n\n\(usage)")
    }
    index += 1
  }

  guard let jobsPath else {
    throw CLIError.usage(usage)
  }
  return (jobsPath, force)
}

private func topLeftPercentBounds(_ rect: CGRect) -> PercentBounds {
  PercentBounds(
    x: rect.minX * 100,
    y: (1 - rect.maxY) * 100,
    width: rect.width * 100,
    height: rect.height * 100
  )
}

private func recognize(job: OCRJob, batch: OCRBatch) throws -> RawOCRDocument {
  let imageURL = URL(fileURLWithPath: job.imagePath)
  guard
    let image = NSImage(contentsOf: imageURL),
    let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else {
    throw CLIError.invalidInput("could not decode image: \(imageURL.path)")
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = [batch.recognitionLanguage]
  request.usesLanguageCorrection = true
  request.minimumTextHeight = batch.minimumTextHeight

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)
  try handler.perform([request])

  // Keep hyphenated compounds and apostrophe forms together. Punctuation is
  // retained in RawLine.text even when it is not itself a clickable token.
  let tokenRegex = try NSRegularExpression(
    pattern: #"[\p{L}\p{N}]+(?:[-‐‑‒–—'’][\p{L}\p{N}]+)*"#
  )

  var lines: [RawLine] = []
  for (sourceOrder, observation) in (request.results ?? []).enumerated() {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let text = candidate.string
    let fullRange = NSRange(text.startIndex..<text.endIndex, in: text)
    var tokens: [RawToken] = []

    for match in tokenRegex.matches(in: text, range: fullRange) {
      guard
        let stringRange = Range(match.range, in: text),
        let tokenBox = try? candidate.boundingBox(for: stringRange)
      else { continue }

      tokens.append(
        RawToken(
          text: String(text[stringRange]),
          confidence: candidate.confidence,
          bounds: topLeftPercentBounds(tokenBox.boundingBox),
          sourceRangeLocation: match.range.location,
          sourceRangeLength: match.range.length
        )
      )
    }

    lines.append(
      RawLine(
        sourceOrder: sourceOrder,
        text: text,
        confidence: candidate.confidence,
        bounds: topLeftPercentBounds(observation.boundingBox),
        tokens: tokens
      )
    )
  }

  return RawOCRDocument(
    schemaVersion: 1,
    comicId: job.comicId,
    image: RawImage(widthPx: cgImage.width, heightPx: cgImage.height),
    engine: RawEngine(
      name: "apple-vision",
      recognitionLevel: "accurate",
      recognitionLanguages: [batch.recognitionLanguage],
      usesLanguageCorrection: true,
      minimumTextHeight: batch.minimumTextHeight
    ),
    lines: lines
  )
}

private func writeJSON<T: Encodable>(_ value: T, to outputPath: String) throws {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
  var data = try encoder.encode(value)
  data.append(Data("\n".utf8))

  let outputURL = URL(fileURLWithPath: outputPath)
  try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
  )
  try data.write(to: outputURL, options: .atomic)
}

do {
  let arguments = try parseArguments()
  let batchData = try Data(contentsOf: URL(fileURLWithPath: arguments.jobsPath))
  let batch = try JSONDecoder().decode(OCRBatch.self, from: batchData)

  guard batch.schemaVersion == 1 else {
    throw CLIError.invalidInput(
      "unsupported OCR job schemaVersion \(batch.schemaVersion); expected 1"
    )
  }
  guard batch.recognitionLanguage == "es-ES" else {
    throw CLIError.invalidInput(
      "recognitionLanguage must be es-ES; got \(batch.recognitionLanguage)"
    )
  }
  guard batch.minimumTextHeight > 0 && batch.minimumTextHeight < 1 else {
    throw CLIError.invalidInput("minimumTextHeight must be between 0 and 1")
  }

  var failures: [String] = []
  for (jobIndex, job) in batch.jobs.enumerated() {
    let outputExists = FileManager.default.fileExists(atPath: job.outputPath)
    if outputExists && !arguments.force {
      fputs("[\(jobIndex + 1)/\(batch.jobs.count)] cached \(job.comicId)\n", stderr)
      continue
    }

    do {
      let document = try autoreleasepool {
        try recognize(job: job, batch: batch)
      }
      try writeJSON(document, to: job.outputPath)
      fputs(
        "[\(jobIndex + 1)/\(batch.jobs.count)] OCR \(job.comicId): " +
          "\(document.lines.count) lines\n",
        stderr
      )
    } catch {
      failures.append("\(job.comicId): \(error)")
      fputs("[\(jobIndex + 1)/\(batch.jobs.count)] FAILED \(job.comicId): \(error)\n", stderr)
    }
  }

  if !failures.isEmpty {
    fputs("\nOCR failed for \(failures.count) job(s):\n", stderr)
    for failure in failures { fputs("- \(failure)\n", stderr) }
    exit(1)
  }
} catch let error as CLIError {
  fputs("\(error.description)\n", stderr)
  exit(64)
} catch {
  fputs("ocr-corpus.swift: \(error)\n", stderr)
  exit(1)
}
