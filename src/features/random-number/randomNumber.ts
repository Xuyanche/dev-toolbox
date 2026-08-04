import { secureInteger, secureUnitFloat, type RandomFill } from '../../shared/random'
import { failure, success, type ToolResult } from '../../shared/result'

export type NumberKind = 'integer' | 'float'
export interface RandomNumberRequest { minimum: number; maximum: number; count: number; kind: NumberKind; unique: boolean }
export const DEFAULT_RANDOM_REQUEST: RandomNumberRequest = { minimum: 1, maximum: 100, count: 1, kind: 'integer', unique: true }
export const MAX_RANDOM_COUNT = 10_000

export function generateRandomNumbers(request: RandomNumberRequest, fill?: RandomFill): ToolResult<number[]> {
  const { minimum, maximum, count, kind, unique } = request
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) return failure('invalid-input', '最小值必须小于最大值。')
  if (!Number.isSafeInteger(count) || count <= 0 || count > MAX_RANDOM_COUNT) return failure('invalid-input', `生成数量必须是 1–${MAX_RANDOM_COUNT} 的整数。`)
  if (kind === 'integer') {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) return failure('invalid-input', '整数模式的范围必须使用安全整数。')
    const span = maximum - minimum + 1
    if (unique && count > span) return failure('invalid-input', `范围内只有 ${span} 个整数，无法生成 ${count} 个唯一结果。`)
    if (unique) {
      const swaps = new Map<number, number>()
      const values: number[] = []
      for (let index = 0; index < count; index += 1) {
        const chosen = secureInteger(index, span - 1, fill)
        if (!chosen.ok) return chosen
        const selected = swaps.get(chosen.value) ?? chosen.value
        swaps.set(chosen.value, swaps.get(index) ?? index)
        values.push(minimum + selected)
      }
      return success(values)
    }
    const values: number[] = []
    for (let index = 0; index < count; index += 1) {
      const value = secureInteger(minimum, maximum, fill)
      if (!value.ok) return value
      values.push(value.value)
    }
    return success(values)
  }

  const values: number[] = []
  const seen = new Set<number>()
  const maximumAttempts = count * 20 + 100
  for (let attempts = 0; values.length < count && attempts < maximumAttempts; attempts += 1) {
    const unit = secureUnitFloat(fill)
    if (!unit.ok) return unit
    const value = minimum + (maximum - minimum) * unit.value
    if (!Number.isFinite(value)) return failure('invalid-input', '浮点范围过大，无法生成有限结果。')
    if (!unique || !seen.has(value)) {
      values.push(value)
      seen.add(value)
    }
  }
  return values.length === count ? success(values) : failure('crypto-failed', '无法在有限尝试内生成足够的唯一浮点数，请调整范围或数量。')
}
