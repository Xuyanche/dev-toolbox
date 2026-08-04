import { secureInteger, type RandomFill } from '../../shared/random'
import { failure, success, type ToolResult } from '../../shared/result'

export const DIE_SIDES = [2, 6, 8, 10, 12, 20, 100] as const
export type DieSides = (typeof DIE_SIDES)[number]
export type DicePool = Record<DieSides, number>

export interface DiceRollGroup { sides: DieSides; values: number[] }
export interface DiceRoll { groups: DiceRollGroup[]; total: number }

export const emptyDicePool = (): DicePool => ({ 2: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0, 100: 0 })
export const defaultDicePool = (): DicePool => ({ ...emptyDicePool(), 6: 1 })

export function formatDiceExpression(pool: DicePool): string {
  return DIE_SIDES.filter((sides) => pool[sides] > 0).map((sides) => `${pool[sides]}d${sides}`).join(' + ')
}

export function parseDiceExpression(value: string): ToolResult<DicePool> {
  const terms = value.split('+').map((term) => term.trim())
  if (!value.trim() || terms.some((term) => !term)) {
    return failure('invalid-input', '请输入类似 2d6 或 2d6 + 1d20 的骰子表达式。')
  }
  const pool = emptyDicePool()
  for (const term of terms) {
    const match = /^(\d+)\s*[dD]\s*(\d+)$/.exec(term)
    if (!match) return failure('invalid-input', `无法识别骰子项“${term}”。`)
    const count = Number(match[1])
    const sides = Number(match[2])
    if (!Number.isSafeInteger(count) || count <= 0) return failure('invalid-input', '骰子数量必须是正整数。')
    if (!DIE_SIDES.includes(sides as DieSides)) return failure('invalid-input', `不支持 d${sides}，请选择 d2、d6、d8、d10、d12、d20 或 d100。`)
    const die = sides as DieSides
    pool[die] += count
    if (!Number.isSafeInteger(pool[die])) return failure('too-long', '骰子数量过大。')
  }
  if (Object.values(pool).reduce((sum, count) => sum + count, 0) > 10_000) {
    return failure('too-long', '单次最多投掷 10,000 颗骰子。')
  }
  return success(pool)
}

export function rollDice(pool: DicePool, fill?: RandomFill): ToolResult<DiceRoll> {
  const count = Object.values(pool).reduce((sum, value) => sum + value, 0)
  if (count === 0) return failure('invalid-input', '请先选择至少一颗骰子。')
  if (count > 10_000) return failure('too-long', '单次最多投掷 10,000 颗骰子。')
  const groups: DiceRollGroup[] = []
  let total = 0
  for (const sides of DIE_SIDES) {
    if (!pool[sides]) continue
    const values: number[] = []
    for (let index = 0; index < pool[sides]; index += 1) {
      const rolled = secureInteger(1, sides, fill)
      if (!rolled.ok) return rolled
      values.push(rolled.value)
      total += rolled.value
    }
    groups.push({ sides, values })
  }
  return success({ groups, total })
}
