# Kannada OCR accuracy evaluation

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

## Reporting requirements

Reports should include dataset sample count, per-sample CER/WER, aggregate error counts and denominators, common substitution/deletion/insertion patterns, and the exact pipeline configuration. Never fill missing references or replace failed OCR output with corrected text. A failed page must remain a failed page in the report.
