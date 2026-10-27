'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clipboard,
  CloudUpload,
  FileImage,
  FileText,
  Info,
  Menu,
  MoreHorizontal,
  PanelRight,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

type Status = 'idle' | 'processing' | 'ready' | 'error'
type ReviewStatus = 'not-reviewed' | 'in-review' | 'verified'

export function KannadaDigitizer() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [text, setText] = useState('')
  const [originalOcrText, setOriginalOcrText] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('not-reviewed')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const matchCount = useMemo(() => {
    if (!query.trim() || !text) return 0
    return text.toLocaleLowerCase().split(query.toLocaleLowerCase()).length - 1
  }, [query, text])

  function chooseFile(selected: File | undefined) {
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(selected.type)) {
      setNotice('Please choose a JPG, PNG, WEBP, or TIFF image.')
      setStatus('error')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setNotice('That file is larger than 10 MB. Choose a smaller image.')
      setStatus('error')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setText('')
    setOriginalOcrText('')
    setReviewStatus('not-reviewed')
    setNotice('')
    setStatus('idle')
  }

  function clearAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setText('')
    setQuery('')
    setNotice('')
    setStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function extractText() {
    if (!file) {
      setNotice('Upload an image first, then start extraction.')
      setStatus('error')
      return
    }

    setStatus('processing')
    setNotice('')
    setText('')

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/ocr', { method: 'POST', body })
      const result = (await response.json()) as { text?: string; message?: string }
      if (!response.ok) throw new Error(result.message || 'OCR could not process this image.')
      setText(result.text || '')
      setOriginalOcrText(result.text || '')
      setReviewStatus('not-reviewed')
      setStatus('ready')
      setNotice(result.text ? 'OCR complete. Review the extracted text before downloading.' : 'OCR completed, but no text was detected.')
    } catch (error) {
      setStatus('error')
      setNotice(error instanceof Error ? error.message : 'OCR could not process this image.')
    }
  }

  async function copyText() {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setNotice('Clipboard access is unavailable. Select the text and copy it manually.')
    }
  }

  function downloadText() {
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${file?.name.replace(/\.[^/.]+$/, '') || 'kannada-text'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#182235]">
      <header className="border-b border-[#e2e4e5] bg-[#fbfaf7]/90 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="Kannada Digit home">
            <span className="grid size-10 place-items-center rounded-[13px] bg-[#152b52] text-white shadow-sm">
              <span className="font-sans text-[13px] font-bold tracking-[-0.08em]">KD</span>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[14px] font-bold tracking-[-0.02em]">Kannada Digit</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#84909e]">Text digitization AI</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-[#667181] md:flex" aria-label="Primary navigation">
            <a className="text-[#152b52]" href="#workspace">Workspace</a>
            <a className="transition-colors hover:text-[#152b52]" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-[#152b52]" href="#about">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-full border border-[#dfe3e5] px-4 py-2 text-[12px] font-bold text-[#536072] transition-colors hover:bg-white sm:block">English <ChevronDown className="ml-1 inline size-3.5" /></button>
            <button className="grid size-9 place-items-center rounded-full border border-[#dfe3e5] text-[#536072] md:hidden" aria-label="Open navigation"><Menu /></button>
            <button onClick={() => inputRef.current?.click()} className="hidden rounded-full bg-[#e9b44c] px-4 py-2.5 text-[12px] font-bold text-[#152b52] transition-transform hover:-translate-y-0.5 sm:block">Start digitizing <ArrowUpRight className="ml-1 inline size-3.5" /></button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-14 sm:px-8 lg:px-12 lg:pb-16 lg:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9e3e5] bg-[#eef5f2] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#31756d]"><Sparkles className="size-3.5" /> Built for Kannada</div>
              <h1 className="max-w-[760px] font-serif text-[clamp(3.3rem,7vw,6.6rem)] leading-[0.92] tracking-[-0.065em] text-[#152b52]">Give every word<br /><span className="text-[#d99528]">a second life.</span></h1>
              <p className="mt-7 max-w-[560px] text-[16px] leading-7 text-[#667181]">Turn scanned Kannada documents and images into clean, editable text. Preserve the stories, records, and ideas that matter.</p>
              <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#84909e]"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#4eaa91]" /> Printed Kannada</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e9b44c]" /> Private by design</span></div>
            </div>
            <div className="relative hidden min-h-[170px] overflow-hidden rounded-[28px] bg-[#dce9e4] p-7 lg:block">
              <div className="absolute -right-8 -top-16 size-48 rounded-full border-[20px] border-[#f4c762]/70" />
              <div className="relative max-w-[300px] text-right font-sans text-[17px] leading-8 text-[#2d615d]">ಅಕ್ಷರಗಳು ಕೇವಲ ಪದಗಳಲ್ಲ — ಅವು ನಮ್ಮ ನೆನಪುಗಳ ಮನೆ.</div>
              <div className="absolute bottom-5 left-7 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f8c81]">Preserve · Search · Share</div>
            </div>
          </div>
        </section>

        <section id="workspace" className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="overflow-hidden rounded-[26px] border border-[#dfe3e5] bg-white shadow-[0_18px_55px_rgba(21,43,82,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0ef] px-5 py-4 sm:px-7">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9aa3ac]">Workspace</p><h2 className="mt-1 font-serif text-[24px] tracking-[-0.03em] text-[#152b52]">New digitization</h2></div>
              <div className="flex items-center gap-3"><span className="flex items-center gap-2 text-[11px] font-semibold text-[#80908c]"><span className="size-2 rounded-full bg-[#4eaa91]" /> OCR engine ready</span><button onClick={clearAll} className="rounded-full p-2 text-[#9aa3ac] transition-colors hover:bg-[#f5f6f4] hover:text-[#152b52]" aria-label="Reset workspace"><RotateCcw className="size-4" /></button></div>
            </div>
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-[#edf0ef] p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="mb-5 flex items-center justify-between"><h3 className="font-serif text-[21px] text-[#152b52]">1. Upload document</h3><span className="rounded-full bg-[#f2f4f2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#87918d]">Max 10 MB</span></div>
                <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
                {!file ? <button onClick={() => inputRef.current?.click()} className="group flex min-h-[290px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#bfcfca] bg-[#f7fbf8] px-6 text-center transition-colors hover:border-[#4eaa91] hover:bg-[#f0f8f4]" aria-label="Upload a document image"><span className="mb-5 grid size-14 place-items-center rounded-2xl bg-white text-[#31756d] shadow-sm"><CloudUpload className="size-6 transition-transform group-hover:-translate-y-1" /></span><span className="text-[15px] font-bold text-[#152b52]">Drop your document here</span><span className="mt-2 text-[12px] text-[#8b9798]">or click to browse from your device</span><span className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1aaa7]"><FileImage className="size-3.5" /> JPG · PNG · WEBP · TIFF</span></button> : <div className="relative min-h-[290px] overflow-hidden rounded-[18px] border border-[#dfe8e3] bg-[#f5f5f1]"><img src={previewUrl} alt={`Preview of ${file.name}`} className="size-full max-h-[290px] object-contain" /><div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-[#152b52]/90 px-3 py-2 text-white backdrop-blur"><span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold"><FileImage className="size-4 shrink-0" /><span className="truncate">{file.name}</span></span><button onClick={clearAll} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Remove uploaded file"><X className="size-4" /></button></div></div>}
                <div className="mt-5 flex items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-[11px] text-[#8c9699]"><Info className="size-3.5" /> Best results with clear, printed text</p><button onClick={() => inputRef.current?.click()} className="text-[11px] font-bold text-[#31756d] hover:underline">{file ? 'Replace' : ''}</button></div>
                <button onClick={extractText} disabled={status === 'processing'} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#152b52] text-[13px] font-bold text-white transition-all hover:bg-[#203b69] disabled:cursor-wait disabled:opacity-60">{status === 'processing' ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Preparing extraction…</> : <><Upload className="size-4" /> Extract Kannada text</>}</button>
                {notice && <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] leading-5 ${status === 'error' ? 'bg-[#fff1ee] text-[#a94f43]' : 'bg-[#f0f7f4] text-[#31756d]'}`}>{notice}</p>}
              </div>

              <div className="p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-serif text-[21px] text-[#152b52]">2. Edit your text</h3><p className="mt-1 text-[12px] text-[#8c9699]">Review and refine the extracted content.</p></div><div className="flex items-center gap-2"><button onClick={copyText} disabled={!text} className="flex items-center gap-1.5 rounded-lg border border-[#dfe3e5] px-3 py-2 text-[11px] font-bold text-[#566273] transition-colors hover:bg-[#f7f8f6] disabled:opacity-40">{copied ? <Check className="size-3.5 text-[#31756d]" /> : <Clipboard className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button><button onClick={downloadText} disabled={!text} className="flex items-center gap-1.5 rounded-lg bg-[#e9b44c] px-3 py-2 text-[11px] font-bold text-[#152b52] transition-colors hover:bg-[#f0c365] disabled:opacity-40"><FileText className="size-3.5" /> Download .txt</button></div></div>
                <div className="relative"><Search className="absolute left-3.5 top-3.5 size-4 text-[#a6b0ae]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search within your text…" className="h-11 w-full rounded-xl border border-[#e3e7e5] bg-[#fafbf9] pl-10 pr-24 text-[12px] outline-none transition-colors placeholder:text-[#a6b0ae] focus:border-[#72a99d] focus:ring-2 focus:ring-[#dceee8]" aria-label="Search within extracted text" />{query && <span className="absolute right-3.5 top-3.5 text-[11px] font-semibold text-[#80908c]">{matchCount} match{matchCount === 1 ? '' : 'es'}</span>}</div>
                <div className="mt-3 overflow-hidden rounded-[18px] border border-[#e3e7e5] bg-[#fcfcfa]"><textarea value={text} onChange={(event) => { setText(event.target.value); if (reviewStatus === 'verified') setReviewStatus('in-review') }} placeholder="Your extracted Kannada text will appear here…" className="min-h-[300px] w-full resize-y bg-transparent p-5 font-sans text-[19px] leading-[1.9] text-[#283951] outline-none placeholder:font-sans placeholder:text-[13px] placeholder:leading-normal placeholder:text-[#b3bcba]" aria-label="Editable extracted text" /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ef] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0aaa7]"><span>{text ? `${[...text].length} characters` : 'No text yet'}</span><span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${reviewStatus === 'verified' ? 'bg-[#4eaa91]' : 'bg-[#e9b44c]'}`} />{reviewStatus === 'verified' ? 'Verified' : reviewStatus === 'in-review' ? 'In review' : 'Not reviewed'}</span></div></div>
                {!text && <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#9da7a5]"><PanelRight className="size-3.5" /> Upload a document to begin</div>}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#e2e4e5] bg-[#eff4f0]">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4e8d80]">Simple by design</p><h2 className="mt-3 max-w-[480px] font-serif text-[38px] leading-[1] tracking-[-0.04em] text-[#152b52]">From paper to<br />possibility.</h2></div><p className="max-w-[330px] text-[13px] leading-6 text-[#71807d]">A focused workspace for making Kannada archives accessible, one page at a time.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3"><Step number="01" title="Upload" body="Choose a clear image of a printed Kannada document." /><Step number="02" title="Extract" body="Our OCR pipeline reads the script and returns editable text." /><Step number="03" title="Refine" body="Correct, search, copy, and save the result in your own words." /></div></div>
        </section>
      </main>
      <footer id="about" className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-5 py-8 text-[11px] text-[#8d9897] sm:flex-row sm:px-8 lg:px-12"><span>© 2026 Kannada Digit</span><span>Made for preserving language, memory, and meaning.</span><span className="flex items-center gap-1.5"><MoreHorizontal className="size-4" /> Printed text first · Handwriting coming later</span></footer>
    </div>
  )
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="rounded-2xl border border-[#dce6e0] bg-[#f8fbf8] p-6"><span className="text-[11px] font-bold tracking-[0.14em] text-[#d39a34]">{number}</span><h3 className="mt-7 font-serif text-[25px] tracking-[-0.03em] text-[#152b52]">{title}</h3><p className="mt-2 text-[13px] leading-6 text-[#71807d]">{body}</p></div>
}
