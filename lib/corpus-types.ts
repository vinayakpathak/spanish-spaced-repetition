/**
 * Versioned interchange types for the machine-generated comic OCR corpus.
 *
 * These records intentionally stop before flashcard authoring. Text in a
 * `GeneratedCorpusComic` is Spanish text observed by OCR and remains
 * `needs_review`; it is not an approved transcript, translation, or lesson.
 * See scripts/build-generated-corpus.mjs for the deterministic builder and
 * runtime validation performed before files are published.
 */

export const GENERATED_CORPUS_SCHEMA_VERSION = 1 as const;

export interface CorpusSourceManifest {
  readonly schemaVersion: typeof GENERATED_CORPUS_SCHEMA_VERSION;
  readonly comics: readonly CorpusSourceComic[];
}

export interface CorpusSourceComic {
  /** Stable across title, transcript, and annotation edits. */
  readonly id: string;
  readonly number?: number;
  readonly title: string;
  readonly pageUrl: string;
  /** Supply exactly one of imageUrl and imagePath in canonical manifests. */
  readonly imageUrl?: string;
  readonly imagePath?: string;
  readonly imageSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly mediaType?: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  readonly originalPageUrl?: string;
  readonly source?: {
    readonly publisher?: string;
    readonly edition?: string;
    readonly translator?: string;
    readonly licenseUrl?: string;
  };
}

export interface PercentBounds {
  /** Percentage of full image width, measured from its left edge. */
  readonly x: number;
  /** Percentage of full image height, measured from its top edge. */
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type GeneratedOCRReviewStatus = "needs_review" | "reviewed" | "rejected";

export type GeneratedOCRReviewReason =
  | "machine_ocr_unreviewed"
  | "provisional_region_grouping"
  | "no_tokens_detected"
  | "full_image_region_fallback"
  | "low_confidence_tokens";

export interface GeneratedCorpusToken {
  readonly id: string;
  readonly order: number;
  readonly lineId: string;
  readonly text: string;
  /** Apple Vision candidate confidence in the inclusive range 0–1. */
  readonly confidence: number;
  /** An array permits later review to join visibly split word fragments. */
  readonly boxes: readonly PercentBounds[];
}

export interface GeneratedCorpusLine {
  readonly id: string;
  readonly order: number;
  /** OCR text including punctuation, before flashcard tokenization review. */
  readonly text: string;
  readonly confidence: number;
  readonly bounds: PercentBounds;
  readonly tokenIds: readonly string[];
}

export interface GeneratedCorpusRegion {
  readonly id: string;
  readonly order: number;
  /** A safe authoring fallback, not a verified speech-bubble boundary. */
  readonly kind: "detected-text-group" | "full-image";
  readonly provisional: true;
  readonly bounds: PercentBounds;
  readonly lineIds: readonly string[];
  readonly tokenIds: readonly string[];
  readonly confidence: number;
}

export interface GeneratedCorpusComic {
  readonly schemaVersion: typeof GENERATED_CORPUS_SCHEMA_VERSION;
  readonly id: string;
  readonly manifestOrder: number;
  readonly number?: number;
  readonly title: string;
  readonly source: {
    readonly pageUrl: string;
    readonly imageUrl?: string;
    readonly originalPageUrl?: string;
    readonly publisher?: string;
    readonly edition?: string;
    readonly translator?: string;
    readonly licenseUrl?: string;
  };
  readonly image: {
    readonly sha256: string;
    readonly mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    readonly bytes: number;
    readonly widthPx: number;
    readonly heightPx: number;
  };
  readonly ocr: {
    readonly engine: "apple-vision";
    readonly recognitionLevel: "accurate";
    readonly recognitionLanguages: readonly ["es-ES"];
    readonly usesLanguageCorrection: true;
    readonly minimumTextHeight: number;
    readonly readingOrder: "geometric-top-to-bottom-then-left-to-right";
  };
  readonly lines: readonly GeneratedCorpusLine[];
  readonly tokens: readonly GeneratedCorpusToken[];
  /** Exactly one provisional authoring fallback region in schema version 1. */
  readonly regions: readonly [GeneratedCorpusRegion];
  readonly review: {
    readonly status: GeneratedOCRReviewStatus;
    readonly reasons: readonly GeneratedOCRReviewReason[];
    readonly lowConfidenceThreshold: number;
    readonly meanTokenConfidence: number;
    readonly minimumTokenConfidence: number;
    readonly lowConfidenceTokenCount: number;
  };
}

export interface GeneratedCorpusIndexEntry {
  readonly id: string;
  readonly manifestOrder: number;
  readonly number?: number;
  readonly title: string;
  readonly file: string;
  readonly imageSha256: string;
  readonly tokenCount: number;
  readonly regionCount: 1;
  readonly meanTokenConfidence: number;
  readonly reviewStatus: GeneratedOCRReviewStatus;
}

export interface GeneratedCorpusIndex {
  readonly schemaVersion: typeof GENERATED_CORPUS_SCHEMA_VERSION;
  readonly sourceManifestFile: string;
  readonly sourceManifestComicCount: number;
  readonly selectedComicCount: number;
  readonly selectionIsPartial: boolean;
  readonly lowConfidenceThreshold: number;
  readonly counts: {
    readonly comics: number;
    readonly tokens: number;
    readonly lowConfidenceTokens: number;
    readonly needsReview: number;
  };
  readonly comics: readonly GeneratedCorpusIndexEntry[];
}
