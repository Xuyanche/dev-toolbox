import { normalize, type Eol, type Mode, type Source } from './model'

export const MAX_BYTES = 2 * 1024 * 1024
export const MAX_LINES = 20_000
export function detectEol(text: string): Eol {
  const crlf = text.includes('\r\n')
  const lf = text.replaceAll('\r\n', '').includes('\n')
  return crlf && lf || /\r(?!\n)/.test(text) ? 'mixed' : crlf ? 'CRLF' : 'LF'
}
export function checkInput(text: string, multiplier = 1) {
  if (new TextEncoder().encode(text).length > MAX_BYTES * multiplier || normalize(text).split('\n').length > MAX_LINES * multiplier) {
    throw new Error(multiplier === 1 ? '每侧最多支持 2 MiB UTF-8、20,000 行。已有内容已保留。' : '融合结果超过 4 MiB / 40,000 行，请缩小文本。')
  }
  if (text.includes('\0')) throw new Error('不支持含 NUL 的文本或二进制文件，请使用 UTF-8 文本。')
}
export function sourceFromText(text: string, name = ''): Source {
  checkInput(text)
  return { text: normalize(text.replace(/^\uFEFF/, '')), name, eol: detectEol(text) }
}
export async function readSource(file: File): Promise<Source> {
  if (file.size > MAX_BYTES) throw new Error('文件超过 2 MiB，已有内容已保留。')
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new Error('无法读取 UTF-8 文件，请检查文件编码。已有内容已保留。')
  }
  return sourceFromText(text, file.name)
}
export function resolveMode(mode: Mode, left: Source, right: Source) {
  return mode === 'auto' ? /\.ya?ml$/i.test(left.name) || /\.ya?ml$/i.test(right.name) ? 'yaml' : 'text' : mode
}
export function exportText(text: string, eol: 'LF' | 'CRLF') {
  return normalize(text).replaceAll('\n', eol === 'CRLF' ? '\r\n' : '\n')
}
export function suggestedName(mode: 'text' | 'yaml', source: Source) {
  const ext = mode === 'yaml' ? '.yaml' : source.name.match(/\.[^.]+$/)?.[0] ?? '.txt'
  return `merged${ext}`
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename.trim().replace(/[\\/:*?"<>|]/g, '_') || 'merged.txt'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
