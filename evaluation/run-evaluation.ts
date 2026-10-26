import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { evaluatePipelines, validateDatasetFiles, type EvaluationSample } from '../lib/ocr-evaluation'

const exec = promisify(execFile)
const root = process.cwd()

async function main() {
  const datasetPath = path.join(root, 'evaluation/dataset.json')
  const reportDir = path.join(root, 'evaluation/reports')
  const dataset = JSON.parse(await readFile(datasetPath, 'utf8')) as unknown
  const validation = await validateDatasetFiles(dataset, root)
  if (validation.errors.length || validation.skipped.length) {
    console.error(JSON.stringify({ message: 'Dataset is not ready for evaluation.', validation }, null, 2))
    process.exitCode = 2
    return
  }
  if (!validation.samples.length) {
    console.error('Dataset is empty. Add permissioned images and manually verified referenceText before running evaluation.')
    process.exitCode = 2
    return
  }
  const runOcr = async (sample: EvaluationSample, preprocess: boolean) => {
    const args = [path.resolve(root, sample.imagePath), 'stdout', '-l', 'kan']
    if (preprocess) args.push('--psm', '6')
    const { stdout } = await exec('tesseract', args, { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })
    return stdout
  }
  const result = await evaluatePipelines(validation.samples, runOcr)
  await mkdir(reportDir, { recursive: true })
  const report = { generatedAt: new Date().toISOString(), configuration: { engine: 'tesseract', language: 'kan', timeoutMs: 30_000 }, dataset: validation, ...result }
  await writeFile(path.join(reportDir, 'latest.json'), JSON.stringify(report, null, 2))
  await writeFile(path.join(reportDir, 'latest.txt'), `Kannada OCR evaluation\nGenerated: ${report.generatedAt}\nSamples: ${validation.samples.length}\nWithout preprocessing CER: ${result.withoutPreprocessing.cer ?? 'n/a'}\nWith preprocessing CER: ${result.withPreprocessing.cer ?? 'n/a'}\nWithout preprocessing WER: ${result.withoutPreprocessing.wer ?? 'n/a'}\nWith preprocessing WER: ${result.withPreprocessing.wer ?? 'n/a'}\n`)
  console.log(`Reports written to ${path.relative(root, reportDir)}/latest.json and latest.txt`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
