import { describe, expect, it } from 'vitest'
import { characterErrorCount, evaluateDataset, normalizeKannadaText, tokenizeWords, wordErrorCount } from './ocr-evaluation'

describe('Kannada OCR evaluation', () => {
  it('normalizes Unicode and collapses whitespace consistently', () => {
    expect(normalizeKannadaText('  ಕನ್ನಡ\n\n ಪಠ್ಯ  ')).toBe('ಕನ್ನಡ ಪಠ್ಯ')
    expect(tokenizeWords('ಕನ್ನಡ\tಪಠ್ಯ')).toEqual(['ಕನ್ನಡ', 'ಪಠ್ಯ'])
  })

  it('calculates character and word edit distance', () => {
    expect(characterErrorCount('ಕನ್ನಡ ಪಠ್ಯ', 'ಕನ್ನಡ ಪಠ್ಯ')).toBe(0)
    expect(characterErrorCount('ಕನ್ನಡ', 'ಕನ್ನಡಾ')).toBe(1)
    expect(wordErrorCount('ಕನ್ನಡ ಪಠ್ಯ', 'ಕನ್ನಡ ದಾಖಲೆ')).toBe(1)
  })

  it('aggregates metrics without inventing missing predictions', () => {
    const result = evaluateDataset([
      { id: 'sample-01', imagePath: 'images/sample-01.png', referenceText: 'ಕನ್ನಡ ಪಠ್ಯ' },
    ], {})
    expect(result.samples).toBe(1)
    expect(result.cer).toBe(1)
    expect(result.wer).toBe(1)
    expect(result.perSample[0].prediction).toBe('')
  })
})
