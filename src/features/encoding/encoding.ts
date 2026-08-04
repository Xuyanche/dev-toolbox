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
