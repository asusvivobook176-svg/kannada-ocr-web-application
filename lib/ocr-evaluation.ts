import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

export type EvaluationSample = {
  id: string
  imagePath: string
  referenceText: string
  category?: string
  metadata?: Record<string, string>
  notes?: string
}

export type ValidationIssue = { id?: string; field?: string; message: string }
export type DatasetValidation = {
  samples: EvaluationSample[]
  errors: ValidationIssue[]
  skipped: Array<{ id?: string; reason: string }>
  valid: boolean
}

export type SampleMetrics = EvaluationSample & { prediction: string; cer: number; wer: number; characterErrors: number; wordErrors: number }
export type EvaluationSummary = {
  samples: number; evaluatedSamples: number; failedSamples: number; skippedSamples: number
  totalReferenceCharacters: number; totalReferenceWords: number; characterErrors: number; wordErrors: number
  cer: number | null; wer: number | null
  commonErrors: Array<{ expected: string; actual: string; count: number }>
  perSample: Array<SampleMetrics & { status: 'evaluated' | 'failed' }>
}

export function normalizeKannadaText(value: string) { return value.normalize('NFC').replace(/\s+/gu, ' ').trim() }
export function tokenizeWords(value: string) { const normalized = normalizeKannadaText(value); return normalized ? normalized.split(' ') : [] }
function levenshtein<T>(left: T[], right: T[]) { const row = Array.from({ length: right.length + 1 }, (_, i) => i); for (let i = 1; i <= left.length; i++) { let diagonal = row[0]; row[0] = i; for (let j = 1; j <= right.length; j++) { const above = row[j]; row[j] = left[i - 1] === right[j - 1] ? diagonal : 1 + Math.min(row[j], row[j - 1], diagonal); diagonal = above } } return row[right.length] }
export function characterErrorCount(reference: string, prediction: string) { return levenshtein([...normalizeKannadaText(reference)], [...normalizeKannadaText(prediction)]) }
export function wordErrorCount(reference: string, prediction: string) { return levenshtein(tokenizeWords(reference), tokenizeWords(prediction)) }

export function validateDataset(input: unknown, rootDir = process.cwd()): DatasetValidation {
  const errors: ValidationIssue[] = []; const skipped: Array<{ id?: string; reason: string }> = []
  if (!input || typeof input !== 'object' || !Array.isArray((input as { samples?: unknown }).samples)) return { samples: [], errors: [{ message: 'Dataset must be an object with a samples array.' }], skipped, valid: false }
  const samples: EvaluationSample[] = []; const ids = new Set<string>(); const seenPaths = new Set<string>()
  for (const [index, raw] of (input as { samples: unknown[] }).samples.entries()) {
    if (!raw || typeof raw !== 'object') { errors.push({ field: `samples[${index}]`, message: 'Sample must be an object.' }); continue }
    const item = raw as Partial<EvaluationSample>; const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id) { errors.push({ field: `samples[${index}].id`, message: 'Sample id is required.' }); continue }
    if (ids.has(id)) { errors.push({ id, field: 'id', message: 'Sample ids must be unique.' }); continue }; ids.add(id)
    if (!item.imagePath || typeof item.imagePath !== 'string' || path.isAbsolute(item.imagePath) || item.imagePath.includes('..')) { errors.push({ id, field: 'imagePath', message: 'imagePath must be a safe relative path.' }); continue }
    if (seenPaths.has(item.imagePath)) { errors.push({ id, field: 'imagePath', message: 'Each image path must be unique.' }); continue }; seenPaths.add(item.imagePath)
    if (typeof item.referenceText !== 'string' || !item.referenceText.trim()) { skipped.push({ id, reason: 'Missing manually verified referenceText.' }); continue }
    if (item.category !== undefined && typeof item.category !== 'string') { errors.push({ id, field: 'category', message: 'category must be a string.' }); continue }
    samples.push({ id, imagePath: item.imagePath, referenceText: item.referenceText, ...(item.category ? { category: item.category } : {}), ...(item.metadata ? { metadata: item.metadata } : {}), ...(item.notes ? { notes: item.notes } : {}) })
  }
  return { samples, errors, skipped, valid: errors.length === 0 }
}

export async function validateDatasetFiles(dataset: unknown, rootDir: string) {
  const result = validateDataset(dataset, rootDir)
  for (const sample of result.samples) { try { await access(path.resolve(rootDir, sample.imagePath)) } catch { result.skipped.push({ id: sample.id, reason: `Image not found: ${sample.imagePath}` }) } }
  return result
}

function metrics(sample: EvaluationSample, prediction: string): SampleMetrics { const chars = [...normalizeKannadaText(sample.referenceText)].length; const words = tokenizeWords(sample.referenceText).length; const characterErrors = characterErrorCount(sample.referenceText, prediction); const wordErrors = wordErrorCount(sample.referenceText, prediction); return { ...sample, prediction, characterErrors, wordErrors, cer: chars ? characterErrors / chars : 0, wer: words ? wordErrors / words : 0 } }
function commonErrors(reference: string, prediction: string) { const expected = [...normalizeKannadaText(reference)], actual = [...normalizeKannadaText(prediction)]; const errors: Array<{ expected: string; actual: string }> = []; let i = 0, j = 0; while (i < expected.length || j < actual.length) { if (expected[i] === actual[j]) { i++; j++ } else { errors.push({ expected: expected[i] ?? '∅', actual: actual[j] ?? '∅' }); i += Number(i < expected.length); j += Number(j < actual.length) } } return errors }
export function evaluateDataset(samples: EvaluationSample[], predictions: Record<string, string>, failures: Record<string, string> = {}): EvaluationSummary { const perSample = samples.map((sample) => ({ ...metrics(sample, predictions[sample.id] ?? ''), status: failures[sample.id] ? 'failed' as const : 'evaluated' as const })); const evaluated = perSample.filter((sample) => sample.status === 'evaluated'); const totalChars = evaluated.reduce((n, s) => n + [...normalizeKannadaText(s.referenceText)].length, 0); const totalWords = evaluated.reduce((n, s) => n + tokenizeWords(s.referenceText).length, 0); const charErrors = evaluated.reduce((n, s) => n + s.characterErrors, 0); const wordErrors = evaluated.reduce((n, s) => n + s.wordErrors, 0); const counts = new Map<string, { expected: string; actual: string; count: number }>(); for (const s of evaluated) for (const error of commonErrors(s.referenceText, s.prediction)) { const key = `${error.expected}→${error.actual}`; const current = counts.get(key) ?? { ...error, count: 0 }; current.count++; counts.set(key, current) } return { samples: samples.length, evaluatedSamples: evaluated.length, failedSamples: perSample.length - evaluated.length, skippedSamples: 0, totalReferenceCharacters: totalChars, totalReferenceWords: totalWords, characterErrors: charErrors, wordErrors: wordErrors, cer: totalChars ? charErrors / totalChars : null, wer: totalWords ? wordErrors / totalWords : null, commonErrors: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 20), perSample } }

export async function evaluatePipelines(samples: EvaluationSample[], runOcr: (sample: EvaluationSample, preprocess: boolean) => Promise<string>) { const run = async (preprocess: boolean) => { const predictions: Record<string, string> = {}; const failures: Record<string, string> = {}; for (const sample of samples) try { predictions[sample.id] = await runOcr(sample, preprocess) } catch (error) { failures[sample.id] = error instanceof Error ? error.message : 'OCR failed' } return evaluateDataset(samples, predictions, failures) }; return { withoutPreprocessing: await run(false), withPreprocessing: await run(true) } }
