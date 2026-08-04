import { failure, success, type ToolResult } from '../../shared/result'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface ParsedJson {
  value: JsonValue
  formatted: string
  minified: string
}

export function parseJson(input: string): ToolResult<ParsedJson> {
  try {
    const value = JSON.parse(input) as JsonValue
    return success({
      value,
      formatted: JSON.stringify(value, null, 2),
      minified: JSON.stringify(value),
    })
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : ''
    return failure('invalid-input', `JSON 解析失败。${detail}`)
  }
}

export function escapeJsonString(input: string): ToolResult<string> {
  return success(JSON.stringify(input).slice(1, -1))
}

export function unescapeJsonString(input: string): ToolResult<string> {
  const trimmed = input.trim()
  const source = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed : `"${input}"`
  try {
    const value = JSON.parse(source)
    if (typeof value !== 'string') {
      return failure('invalid-input', '输入必须是 JSON 字符串字面量或有效的转义内容。')
    }
    return success(value)
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : ''
    return failure('invalid-input', `JSON 字符串转义内容无效。${detail}`)
  }
}

export function getJsonType(value: JsonValue): 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null' {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  return typeof value as 'object' | 'string' | 'number' | 'boolean'
}

export function getJsonNodeCopyValue(value: JsonValue): string {
  const type = getJsonType(value)
  if (type === 'object' || type === 'array') return JSON.stringify(value, null, 2)
  if (type === 'string') return value as string
  return JSON.stringify(value)
}

export function getJsonPreview(value: JsonValue): string {
  const type = getJsonType(value)
  if (type === 'object') return `${Object.keys(value as Record<string, JsonValue>).length} 个属性`
  if (type === 'array') return `${(value as JsonValue[]).length} 个元素`
  if (type === 'string') {
    const text = value as string
    return JSON.stringify(text.length > 80 ? `${text.slice(0, 77)}...` : text)
  }
  return JSON.stringify(value)
}
