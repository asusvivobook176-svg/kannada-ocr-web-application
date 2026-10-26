import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { stdout } = await execFileAsync('tesseract', ['--version'], { timeout: 3000 })
    return NextResponse.json({ ok: true, engine: stdout.split('\n')[0], language: 'kan' })
  } catch {
    return NextResponse.json({ ok: false, message: 'Tesseract OCR is not available on this server.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const upload = formData.get('file')

  if (!(upload instanceof File)) {
    return NextResponse.json({ message: 'Upload an image file in the file field.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(upload.type)) {
    return NextResponse.json({ message: 'Only JPG, PNG, WEBP, and TIFF images are supported.' }, { status: 415 })
  }
  if (upload.size === 0 || upload.size > MAX_BYTES) {
    return NextResponse.json({ message: 'The image must be between 1 byte and 10 MB.' }, { status: 413 })
  }

  const workingDir = path.join(os.tmpdir(), `kannada-ocr-${randomUUID()}`)
  const inputPath = path.join(workingDir, 'document')
  await mkdir(workingDir, { recursive: true })

  try {
    await writeFile(inputPath, Buffer.from(await upload.arrayBuffer()))
    const { stdout } = await execFileAsync('tesseract', [inputPath, 'stdout', '-l', 'kan'], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
    return NextResponse.json({ text: stdout, characters: stdout.length, engine: 'tesseract', language: 'kan' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const missingLanguage = /failed loading language|Error opening data file|language/i.test(message)
    return NextResponse.json({ message: missingLanguage ? 'Kannada OCR data is not installed on this server.' : 'OCR could not process this image.' }, { status: 503 })
  } finally {
    await rm(workingDir, { recursive: true, force: true })
  }
}
