import { failure, success, type ToolResult } from '../../shared/result'

export type TimeUnit = 'seconds' | 'milliseconds'
export type TimeZoneMode = 'utc' | 'local'
export type DateFormatMode = 'custom' | 'iso'

type Token = 'YYYY' | 'MM' | 'DD' | 'HH' | 'mm' | 'ss' | 'SSS'
type DateFields = Record<Token, number>

export interface FormattedDate {
  text: string
  offset: string
}

interface CompiledFormat {
  parts: Array<{ kind: 'token'; value: Token } | { kind: 'literal'; value: string }>
  tokens: Token[]
  regex: RegExp
}

const TOKENS: Token[] = ['YYYY', 'SSS', 'MM', 'DD', 'HH', 'mm', 'ss']
const TOKEN_PATTERN: Record<Token, string> = {
  YYYY: '(\\d{4})',
  MM: '(\\d{2})',
  DD: '(\\d{2})',
  HH: '(\\d{2})',
  mm: '(\\d{2})',
  ss: '(\\d{2})',
  SSS: '(\\d{3})',
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function timezoneOffsetText(date: Date, zone: TimeZoneMode): string {
  if (zone === 'utc') return 'UTC (Z)'
  const minutes = -date.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

function readFields(date: Date, zone: TimeZoneMode): DateFields {
  const utc = zone === 'utc'
  return {
    YYYY: utc ? date.getUTCFullYear() : date.getFullYear(),
    MM: (utc ? date.getUTCMonth() : date.getMonth()) + 1,
    DD: utc ? date.getUTCDate() : date.getDate(),
    HH: utc ? date.getUTCHours() : date.getHours(),
    mm: utc ? date.getUTCMinutes() : date.getMinutes(),
    ss: utc ? date.getUTCSeconds() : date.getSeconds(),
    SSS: utc ? date.getUTCMilliseconds() : date.getMilliseconds(),
  }
}

function renderToken(token: Token, fields: DateFields): string {
  return pad(fields[token], token === 'YYYY' ? 4 : token === 'SSS' ? 3 : 2)
}

export function compileDateFormat(format: string): ToolResult<CompiledFormat> {
  if (!format) return failure('invalid-input', '日期格式不能为空。')
  const parts: CompiledFormat['parts'] = []
  const tokens: Token[] = []
  let index = 0

  while (index < format.length) {
    const token = TOKENS.find((candidate) => format.startsWith(candidate, index))
    if (token) {
      if (tokens.includes(token)) return failure('invalid-input', `格式标记 ${token} 不能重复。`)
      parts.push({ kind: 'token', value: token })
      tokens.push(token)
      index += token.length
      continue
    }
    const character = format[index]
    if (/[A-Za-z0-9]/.test(character)) {
      return failure('invalid-input', `不支持的日期格式标记：${character}`)
    }
    parts.push({ kind: 'literal', value: character })
    index += 1
  }

  const source = parts
    .map((part) => (part.kind === 'token' ? TOKEN_PATTERN[part.value] : escapeRegex(part.value)))
    .join('')
  return success({ parts, tokens, regex: new RegExp(`^${source}$`) })
}

function validateFields(fields: DateFields): ToolResult<DateFields> {
  if (fields.MM < 1 || fields.MM > 12 || fields.DD < 1 || fields.DD > 31) {
    return failure('invalid-input', '月份或日期超出有效范围。')
  }
  if (fields.HH > 23 || fields.mm > 59 || fields.ss > 59 || fields.SSS > 999) {
    return failure('invalid-input', '时间字段超出有效范围。')
  }
  const check = new Date(0)
  check.setUTCFullYear(fields.YYYY, fields.MM - 1, fields.DD)
  check.setUTCHours(fields.HH, fields.mm, fields.ss, fields.SSS)
  const actual = readFields(check, 'utc')
  if (TOKENS.some((token) => actual[token] !== fields[token])) {
    return failure('invalid-input', '日期不存在或字段组合无效。')
  }
  return success(fields)
}

function fieldsToTimestamp(fields: DateFields, zone: TimeZoneMode, offsetMinutes?: number): ToolResult<number> {
  const valid = validateFields(fields)
  if (!valid.ok) return valid

  const utcDate = new Date(0)
  utcDate.setUTCFullYear(fields.YYYY, fields.MM - 1, fields.DD)
  utcDate.setUTCHours(fields.HH, fields.mm, fields.ss, fields.SSS)
  if (offsetMinutes !== undefined) return success(utcDate.getTime() - offsetMinutes * 60_000)
  if (zone === 'utc') return success(utcDate.getTime())

  const localDate = new Date(0)
  localDate.setFullYear(fields.YYYY, fields.MM - 1, fields.DD)
  localDate.setHours(fields.HH, fields.mm, fields.ss, fields.SSS)
  const roundTrip = readFields(localDate, 'local')
  if (TOKENS.some((token) => roundTrip[token] !== fields[token])) {
    return failure('invalid-input', '该本地时间不存在，可能处于夏令时跳转区间。')
  }
  return success(localDate.getTime())
}

function timestampToDate(value: string, unit: TimeUnit): ToolResult<Date> {
  if (!/^-?\d+$/.test(value.trim())) return failure('invalid-input', '时间戳必须是整数。')
  const numeric = Number(value)
  if (!Number.isSafeInteger(numeric)) return failure('invalid-input', '时间戳超出安全整数范围。')
  const milliseconds = unit === 'seconds' ? numeric * 1000 : numeric
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime())
    ? failure('invalid-input', '时间戳超出浏览器可表示的日期范围。')
    : success(date)
}

export function formatTimestamp(
  value: string,
  unit: TimeUnit,
  zone: TimeZoneMode,
  mode: DateFormatMode,
  format: string,
): ToolResult<FormattedDate> {
  const parsed = timestampToDate(value, unit)
  if (!parsed.ok) return parsed
  const date = parsed.value
  const offset = timezoneOffsetText(date, zone)

  if (mode === 'iso') {
    if (zone === 'utc') return success({ text: date.toISOString(), offset })
    const fields = readFields(date, 'local')
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const absolute = Math.abs(offsetMinutes)
    const suffix = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
    const text = `${renderToken('YYYY', fields)}-${renderToken('MM', fields)}-${renderToken('DD', fields)}T${renderToken('HH', fields)}:${renderToken('mm', fields)}:${renderToken('ss', fields)}.${renderToken('SSS', fields)}${suffix}`
    return success({ text, offset })
  }

  const compiled = compileDateFormat(format)
  if (!compiled.ok) return compiled
  const fields = readFields(date, zone)
  const text = compiled.value.parts
    .map((part) => (part.kind === 'token' ? renderToken(part.value, fields) : part.value))
    .join('')
  const warning = !compiled.value.tokens.includes('SSS') && date.getMilliseconds() !== 0
    ? '当前格式省略了毫秒，反向转换时无法恢复原始精度。'
    : undefined
  return success({ text, offset }, warning)
}

function toUnit(milliseconds: number, unit: TimeUnit): { value: string; warning?: string } {
  if (unit === 'milliseconds') return { value: String(milliseconds) }
  const warning = milliseconds % 1000 !== 0 ? '转换为秒级时间戳时已舍弃毫秒精度。' : undefined
  return { value: String(Math.floor(milliseconds / 1000)), warning }
}

export function parseCustomDate(
  text: string,
  format: string,
  zone: TimeZoneMode,
  unit: TimeUnit,
): ToolResult<string> {
  const compiled = compileDateFormat(format)
  if (!compiled.ok) return compiled
  if (!['YYYY', 'MM', 'DD'].every((token) => compiled.value.tokens.includes(token as Token))) {
    return failure('invalid-input', '反向解析格式必须包含 YYYY、MM 和 DD。')
  }
  const match = compiled.value.regex.exec(text)
  if (!match) return failure('invalid-input', '日期文本与自定义格式不匹配。')
  const fields: DateFields = { YYYY: 0, MM: 1, DD: 1, HH: 0, mm: 0, ss: 0, SSS: 0 }
  compiled.value.tokens.forEach((token, index) => { fields[token] = Number(match[index + 1]) })
  const timestamp = fieldsToTimestamp(fields, zone)
  if (!timestamp.ok) return timestamp
  const converted = toUnit(timestamp.value, unit)
  return success(converted.value, converted.warning)
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})?)?$/

export function parseIsoDate(text: string, zone: TimeZoneMode, unit: TimeUnit): ToolResult<string> {
  const match = ISO_PATTERN.exec(text)
  if (!match) return failure('invalid-input', 'ISO 8601 日期时间格式无效。')
  const fields: DateFields = {
    YYYY: Number(match[1]), MM: Number(match[2]), DD: Number(match[3]),
    HH: Number(match[4] ?? 0), mm: Number(match[5] ?? 0), ss: Number(match[6] ?? 0), SSS: Number(match[7] ?? 0),
  }
  let offsetMinutes: number | undefined
  const suffix = match[8]
  if (suffix === 'Z') offsetMinutes = 0
  else if (suffix) {
    const hours = Number(suffix.slice(1, 3))
    const minutes = Number(suffix.slice(4, 6))
    if (hours > 23 || minutes > 59) return failure('invalid-input', 'ISO 8601 时区偏移无效。')
    offsetMinutes = (suffix[0] === '+' ? 1 : -1) * (hours * 60 + minutes)
  }
  const timestamp = fieldsToTimestamp(fields, zone, offsetMinutes)
  if (!timestamp.ok) return timestamp
  const converted = toUnit(timestamp.value, unit)
  return success(converted.value, converted.warning)
}
