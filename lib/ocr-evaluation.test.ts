import { describe, expect, it } from 'vitest'
import { characterErrorCount, evaluateDataset, normalizeKannadaText, tokenizeWords, validateDataset, wordErrorCount } from './ocr-evaluation'

describe('Kannada OCR evaluation', () => {
  it('normalizes Unicode and whitespace', () => { expect(normalizeKannadaText('  ಕನ್ನಡ\n\n ಪಠ್ಯ  ')).toBe('ಕನ್ನಡ ಪಠ್ಯ'); expect(tokenizeWords('ಕನ್ನಡ\tಪಠ್ಯ')).toEqual(['ಕನ್ನಡ', 'ಪಠ್ಯ']) })
  it('calculates exact and edit distances', () => { expect(characterErrorCount('ಕನ್ನಡ ಪಠ್ಯ', 'ಕನ್ನಡ ಪಠ್ಯ')).toBe(0); expect(characterErrorCount('ಕನ್ನಡ', 'ಕನ್ನಡಾ')).toBe(1); expect(wordErrorCount('ಕನ್ನಡ ಪಠ್ಯ', 'ಕನ್ನಡ ದಾಖಲೆ')).toBe(1); expect(characterErrorCount('ಕನ್ನಡ', '')).toBe(5) })
  it('validates unique ids and references without treating OCR as truth', () => { const result = validateDataset({ samples: [{ id: 'a', imagePath: 'images/a.png', referenceText: 'ಕನ್ನಡ' }, { id: 'a', imagePath: '../secret', referenceText: 'x' }, { id: 'b', imagePath: 'images/b.png' }] }); expect(result.valid).toBe(false); expect(result.errors.some((e) => e.message.includes('unique'))).toBe(true); expect(result.skipped[0].reason).toContain('referenceText') })
  it('keeps partial failures out of aggregate metrics', () => { const result = evaluateDataset([{ id: 'a', imagePath: 'a.png', referenceText: 'ಕನ್ನಡ' }, { id: 'b', imagePath: 'b.png', referenceText: 'ಪಠ್ಯ' }], { a: 'ಕನ್ನಡ' }, { b: 'OCR unavailable' }); expect(result.evaluatedSamples).toBe(1); expect(result.failedSamples).toBe(1); expect(result.cer).toBe(0); expect(result.perSample[1].status).toBe('failed') })
  it('returns null denominators for an empty reference set', () => { const result = evaluateDataset([], {}); expect(result.cer).toBeNull(); expect(result.wer).toBeNull() })
})
