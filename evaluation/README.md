# Kannada OCR accuracy evaluation

## PDF support status

Multi-page PDF OCR is intentionally not enabled yet. The server has no verified PDF renderer dependency or system renderer available, so accepting PDFs would be unsafe and misleading. The upload API continues to validate image signatures and rejects PDFs. Add a maintained, sandboxed renderer (with page, pixel, size, timeout, encryption, and cleanup limits) before implementing page-level OCR.

This directory contains the evaluation contract, an empty dataset template, and automated metric tests. No accuracy claim is made until real image samples and manually verified reference text are added.

## Add verified samples

Add one object per image to `dataset.json`:

```json
{
  "id": "book-001-page-01",
  "imagePath": "images/book-001-page-01.png",
  "referenceText": "ಮನವರಿಕೆ ಮಾಡಿದ Kannada text copied and verified by a reviewer",
  "notes": "Printed book scan, 300 DPI"
}
```

Keep images and references paired by `id`. Do not use OCR output as the reference. Record who verified the transcription and the source provenance outside the prediction output when your evaluation process requires auditability.

## Metric contract

Before comparison, both reference and prediction are normalized with Unicode NFC, runs of Unicode whitespace are replaced by one ASCII space, and leading/trailing whitespace is removed. Characters are counted by Unicode code point (`[...text]`), not UTF-16 code units. CER is character-level Levenshtein distance divided by the number of reference characters. WER is word-level Levenshtein distance after splitting normalized text on spaces, divided by the number of reference words. Empty-reference samples have a zero denominator and report zero for that sample metric; they should normally be excluded from a benchmark.

The evaluator preserves raw predictions separately from any user-corrected editor text. Run the same samples through the OCR pipeline twice: once with preprocessing disabled and once enabled. Compare aggregate and per-sample results only when both runs used the same sample set and timeout policy.

## Run the reproducible evaluator

Run `pnpm evaluate:ocr` from the project root. It requires the `tesseract` executable and Kannada language data (`kan.traineddata`) installed on the host. The command validates every sample and image path, refuses empty or incomplete datasets, runs each sample with and without preprocessing, preserves OCR failures, and writes `evaluation/reports/latest.json` plus `evaluation/reports/latest.txt`. Reports are generated only from samples with manually verified references; no mock predictions are used.

The current environment does not provide a verified dataset or the Tesseract executable, so no accuracy benchmark is claimed. Add permissioned images under the repository, add their manually checked references, and record provenance in metadata before running the command.

## Reporting requirements

Reports should include dataset sample count, per-sample CER/WER, aggregate error counts and denominators, common substitution/deletion/insertion patterns, and the exact pipeline configuration. Never fill missing references or replace failed OCR output with corrected text. A failed page must remain a failed page in the report.
