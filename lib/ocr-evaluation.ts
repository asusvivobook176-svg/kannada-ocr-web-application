export type EvaluationSample = {
  id: string
  imagePath: string
  referenceText: string
  notes?: string
}

export type SampleMetrics = EvaluationSample & {
  prediction: string
  cer: number
  wer: number
  characterErrors: number
  wordErrors: number
}

export type EvaluationSummary = {
  samples: number
  totalReferenceCharacters: number
  totalReferenceWords: number
  characterErrors: number
  wordErrors: number
  cer: number
  wer: number
  commonErrors: Array<{ expected: string; actual: string; count: number }>
  perSample: SampleMetrics[]
}

export function normalizeKannadaText(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

export function tokenizeWords(value: string): string[] {
  const normalized = normalizeKannadaText(value)
  return normalized ? normalized.split(' ') : []
}

function levenshtein<T>(left: T[], right: T[]): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0]
    previous[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column]
      previous[column] = left[row - 1] === right[column - 1]
        ? diagonal
        : 1 + Math.min(previous[column], previous[column - 1], diagonal)
      diagonal = above
    }
  }
  return previous[right.length]
}

export function characterErrorCount(reference: string, prediction: string): number {
  return levenshtein([...normalizeKannadaText(reference)], [...normalizeKannadaText(prediction)])
}

export function wordErrorCount(reference: string, prediction: string): number {
  return levenshtein(tokenizeWords(reference), tokenizeWords(prediction))
}

export function evaluateSample(sample: EvaluationSample, prediction: string): SampleMetrics {
  const referenceCharacters = [...normalizeKannadaText(sample.referenceText)].length
  const referenceWords = tokenizeWords(sample.referenceText).length
  const characterErrors = characterErrorCount(sample.referenceText, prediction)
  const wordErrors = wordErrorCount(sample.referenceText, prediction)
  return {
    ...sample,
    prediction,
    characterErrors,
    wordErrors,
    cer: referenceCharacters ? characterErrors / referenceCharacters : 0,
    wer: referenceWords ? wordErrors / referenceWords : 0,
  }
}

function collectCharacterErrors(reference: string, prediction: string) {
  const expected = [...normalizeKannadaText(reference)]
  const actual = [...normalizeKannadaText(prediction)]
  const rows = Array.from({ length: expected.length + 1 }, () => Array<number>(actual.length + 1).fill(0))
  for (let row = 0; row <= expected.length; row += 1) rows[row][0] = row
  for (let column = 0; column <= actual.length; column += 1) rows[0][column] = column
  for (let row = 1; row <= expected.length; row += 1) {
    for (let column = 1; column <= actual.length; column += 1) {
      rows[row][column] = expected[row - 1] === actual[column - 1]
        ? rows[row - 1][column - 1]
        : 1 + Math.min(rows[row - 1][column], rows[row][column - 1], rows[row - 1][column - 1])
    }
  }
  const errors: Array<{ expected: string; actual: string }> = []
  let row = expected.length
  let column = actual.length
  while (row > 0 || column > 0) {
    if (row > 0 && column > 0 && expected[row - 1] === actual[column - 1]) {
      row -= 1; column -= 1
    } else if (row > 0 && column > 0 && rows[row][column] === rows[row - 1][column - 1] + 1) {
      errors.push({ expected: expected[row - 1], actual: actual[column - 1] }); row -= 1; column -= 1
    } else if (row > 0 && rows[row][column] === rows[row - 1][column] + 1) {
      errors.push({ expected: expected[row - 1], actual: '∅' }); row -= 1
    } else {
      errors.push({ expected: '∅', actual: actual[column - 1] }); column -= 1
    }
  }
  return errors
}

export function evaluateDataset(samples: EvaluationSample[], predictions: Record<string, string>): EvaluationSummary {
  const perSample = samples.map((sample) => evaluateSample(sample, predictions[sample.id] ?? ''))
  const errorCounts = new Map<string, { expected: string; actual: string; count: number }>()
  for (const sample of samples) {
    for (const error of collectCharacterErrors(sample.referenceText, predictions[sample.id] ?? '')) {
      const key = `${error.expected}→${error.actual}`
      const current = errorCounts.get(key) ?? { ...error, count: 0 }
      current.count += 1
      errorCounts.set(key, current)
    }
  }
  const totalReferenceCharacters = perSample.reduce((total, sample) => total + [...normalizeKannadaText(sample.referenceText)].length, 0)
  const totalReferenceWords = perSample.reduce((total, sample) => total + tokenizeWords(sample.referenceText).length, 0)
  const characterErrors = perSample.reduce((total, sample) => total + sample.characterErrors, 0)
  const wordErrors = perSample.reduce((total, sample) => total + sample.wordErrors, 0)
  return {
    samples: samples.length,
    totalReferenceCharacters,
    totalReferenceWords,
    characterErrors,
    wordErrors,
    cer: totalReferenceCharacters ? characterErrors / totalReferenceCharacters : 0,
    wer: totalReferenceWords ? wordErrors / totalReferenceWords : 0,
    commonErrors: [...errorCounts.values()].sort((left, right) => right.count - left.count).slice(0, 20),
    perSample,
  }
}

export async function evaluatePipelines(
  samples: EvaluationSample[],
  runOcr: (sample: EvaluationSample, preprocess: boolean) => Promise<string>,
) {
  const withoutPreprocessing: Record<string, string> = {}
  const withPreprocessing: Record<string, string> = {}
  for (const sample of samples) {
    withoutPreprocessing[sample.id] = await runOcr(sample, false)
    withPreprocessing[sample.id] = await runOcr(sample, true)
  }
  return {
    withoutPreprocessing: evaluateDataset(samples, withoutPreprocessing),
    withPreprocessing: evaluateDataset(samples, withPreprocessing),
  }
}
