import { failure, success, type ToolResult } from './result'

export type RandomFill = (bytes: Uint8Array) => Uint8Array

const RANDOM_SPACE = 0x20_0000_0000_0000

export const browserRandomFill: RandomFill = (bytes) => {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random unavailable')
  return globalThis.crypto.getRandomValues(bytes)
}

export function random53(fill: RandomFill = browserRandomFill): number {
  const bytes = fill(new Uint8Array(7))
  if (bytes.length !== 7) throw new Error('Random source returned an invalid buffer')
  let value = bytes[0] & 0x1f
  for (let index = 1; index < bytes.length; index += 1) value = value * 256 + bytes[index]
  return value
}

export function secureUnitFloat(fill: RandomFill = browserRandomFill): ToolResult<number> {
  try {
    return success(random53(fill) / RANDOM_SPACE)
  } catch {
    return failure('unsupported', '当前浏览器不支持安全随机数生成。')
  }
}

export function secureInteger(minimum: number, maximum: number, fill: RandomFill = browserRandomFill): ToolResult<number> {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
    return failure('invalid-input', '整数范围必须由有效的安全整数构成。')
  }
  const span = maximum - minimum + 1
  if (!Number.isSafeInteger(span) || span <= 0 || span > RANDOM_SPACE) {
    return failure('too-long', '整数范围过大，无法无偏生成。')
  }
  try {
    const limit = Math.floor(RANDOM_SPACE / span) * span
    let sample = random53(fill)
    while (sample >= limit) sample = random53(fill)
    return success(minimum + (sample % span))
  } catch {
    return failure('unsupported', '当前浏览器不支持安全随机数生成。')
  }
}
