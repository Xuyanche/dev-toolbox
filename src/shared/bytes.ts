import { failure, success, type ToolResult } from './result'

const encoder = new TextEncoder()
const strictDecoder = new TextDecoder('utf-8', { fatal: true })

export const utf8Bytes = (value: string) => encoder.encode(value)

export function bytesToUtf8(value: Uint8Array): ToolResult<string> {
  try {
    return success(strictDecoder.decode(value))
  } catch {
    return failure('invalid-input', '解码后的字节不是有效的 UTF-8 文本。')
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function base64ToBytes(value: string): ToolResult<Uint8Array> {
  const normalized = value.trim()
  const pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  if (normalized.length % 4 !== 0 || !pattern.test(normalized)) {
    return failure('invalid-input', 'Base64 格式无效，请检查字符和填充。')
  }
  try {
    const binary = atob(normalized)
    return success(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return failure('invalid-input', 'Base64 格式无效，请检查输入。')
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
