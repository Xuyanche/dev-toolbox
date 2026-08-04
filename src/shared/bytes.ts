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

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function base64UrlToBytes(value: string): ToolResult<Uint8Array> {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    return failure('invalid-input', 'Base64URL 格式无效，请使用无填充的 URL 安全字符。')
  }

  const padding = '='.repeat((4 - value.length % 4) % 4)
  const decoded = base64ToBytes(value.replaceAll('-', '+').replaceAll('_', '/') + padding)
  if (!decoded.ok || bytesToBase64Url(decoded.value) !== value) {
    return failure('invalid-input', 'Base64URL 格式无效或不是规范编码。')
  }
  return decoded
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(value: string): ToolResult<Uint8Array> {
  const normalized = value.trim()
  if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    return failure('invalid-input', 'HEX 格式无效，必须使用完整的两位十六进制字节。')
  }
  const bytes = new Uint8Array(normalized.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16)
  }
  return success(bytes)
}
