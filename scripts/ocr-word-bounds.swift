#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

struct OCRWord: Encodable {
  let text: String
  let line: String
  let confidence: Float
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

guard CommandLine.arguments.count == 2 else {
  fputs("usage: ocr-word-bounds.swift IMAGE\n", stderr)
  exit(64)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
guard
  let image = NSImage(contentsOf: imageURL),
  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  fputs("could not read image: \(imageURL.path)\n", stderr)
  exit(66)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["es-ES", "en-US"]
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.006

let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)
do {
  try handler.perform([request])
} catch {
  fputs("Vision OCR failed: \(error)\n", stderr)
  exit(1)
}

let tokenRegex = try NSRegularExpression(
  pattern: #"[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*"#
)
var words: [OCRWord] = []

for observation in request.results ?? [] {
  guard let candidate = observation.topCandidates(1).first else { continue }
  let line = candidate.string
  let fullRange = NSRange(line.startIndex..<line.endIndex, in: line)

  for match in tokenRegex.matches(in: line, range: fullRange) {
    guard
      let stringRange = Range(match.range, in: line),
      let box = try? candidate.boundingBox(for: stringRange)
    else { continue }

    // Vision's normalized coordinates use a bottom-left origin. The app's
    // percentage coordinates use a top-left origin, like CSS positioning.
    let bounds = box.boundingBox
    words.append(
      OCRWord(
        text: String(line[stringRange]),
        line: line,
        confidence: candidate.confidence,
        x: bounds.minX * 100,
        y: (1 - bounds.maxY) * 100,
        width: bounds.width * 100,
        height: bounds.height * 100
      )
    )
  }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
let data = try encoder.encode(words)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
