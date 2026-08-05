import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8Bytes } from '../../shared/bytes'
import { failure, success, type ToolResult } from '../../shared/result'

export type UrlMode = 'component' | 'complete'

export function encodeBase64(value: string): ToolResult<string> {
  return success(bytesToBase64(utf8Bytes(value)))
}

export function decodeBase64(value: string): ToolResult<string> {
  const decoded = base64ToBytes(value)
  return decoded.ok ? bytesToUtf8(decoded.value) : decoded
}

export function encodeUnicode(value: string): ToolResult<string> {
  let encoded = ''
  for (let index = 0; index < value.length; index += 1) {
    encoded += `\\u${value.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')}`
  }
  return success(encoded)
}

function isHighSurrogate(codeUnit: number) {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff
}

function isLowSurrogate(codeUnit: number) {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff
}

function readUnicodeEscape(value: string, index: number): ToolResult<{ codeUnit: number; nextIndex: number }> {
  const digits = value.slice(index + 2, index + 6)
  if (digits.length !== 4 || !/^[0-9a-f]{4}$/i.test(digits)) {
    return failure('invalid-input', 'Unicode 转义格式无效，请使用 \\u 后跟四位十六进制数字。')
  }
  return success({ codeUnit: Number.parseInt(digits, 16), nextIndex: index + 6 })
}

export function decodeUnicode(value: string): ToolResult<string> {
  let decoded = ''
  let index = 0

  while (index < value.length) {
    if (value[index] !== '\\' || value[index + 1] !== 'u') {
      decoded += value[index]
      index += 1
      continue
    }

    const escape = readUnicodeEscape(value, index)
    if (!escape.ok) return escape

    if (isLowSurrogate(escape.value.codeUnit)) {
      return failure('invalid-input', 'Unicode 代理项必须按高代理项、低代理项成对出现。')
    }

    if (isHighSurrogate(escape.value.codeUnit)) {
      const lowEscape = readUnicodeEscape(value, escape.value.nextIndex)
      if (!lowEscape.ok || !isLowSurrogate(lowEscape.value.codeUnit)) {
        return failure('invalid-input', 'Unicode 代理项必须按高代理项、低代理项成对出现。')
      }
      decoded += String.fromCharCode(escape.value.codeUnit, lowEscape.value.codeUnit)
      index = lowEscape.value.nextIndex
      continue
    }

    decoded += String.fromCharCode(escape.value.codeUnit)
    index = escape.value.nextIndex
  }

  return success(decoded)
}

export function encodeUrl(value: string, mode: UrlMode): ToolResult<string> {
  try {
    return success(mode === 'component' ? encodeURIComponent(value) : encodeURI(value))
  } catch {
    return failure('invalid-input', '文本包含无法编码的 Unicode 代理字符。')
  }
}

export function decodeUrl(value: string, mode: UrlMode): ToolResult<string> {
  try {
    return success(mode === 'component' ? decodeURIComponent(value) : decodeURI(value))
  } catch {
    return failure('invalid-input', 'URL 转义序列无效，请检查百分号后的十六进制字符。')
  }
}
