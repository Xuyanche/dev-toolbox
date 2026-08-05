import { secureInteger, type RandomFill } from '../../shared/random'
import { failure, success, type ToolResult } from '../../shared/result'

export const DIE_SIDES = [2, 6, 8, 10, 12, 20, 100] as const
export type DieSides = (typeof DIE_SIDES)[number]
export type DicePool = Record<DieSides, number>

export interface DiceConfiguration { pool: DicePool; modifier: number }
export interface DiceRollGroup { sides: DieSides; values: number[] }
export interface DiceRoll { groups: DiceRollGroup[]; diceTotal: number; modifier: number; total: number }

export const emptyDicePool = (): DicePool => ({ 2: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0, 100: 0 })
export const defaultDicePool = (): DicePool => ({ ...emptyDicePool(), 6: 1 })
export const emptyDiceConfiguration = (): DiceConfiguration => ({ pool: emptyDicePool(), modifier: 0 })
export const defaultDiceConfiguration = (): DiceConfiguration => ({ pool: defaultDicePool(), modifier: 0 })

export function formatDiceExpression({ pool, modifier }: DiceConfiguration): string {
  const dice = DIE_SIDES.filter((sides) => pool[sides] > 0).map((sides) => `${pool[sides]}d${sides}`).join(' + ')
  if (modifier === 0) return dice
  if (!dice) return modifier > 0 ? String(modifier) : `-${Math.abs(modifier)}`
  return modifier > 0 ? `${dice} + ${modifier}` : `${dice} - ${Math.abs(modifier)}`
}

export function parseDiceExpression(value: string): ToolResult<DiceConfiguration> {
  const source = value.trim()
  if (!source) return failure('invalid-input', '请输入类似 2d6、1d6 + 2 或 1d6 - 3 的骰子表达式。')

  const pool = emptyDicePool()
  let modifier = 0
  let index = 0
  let first = true
  let diceCount = 0

  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index += 1
    let sign = 1
    if (source[index] === '+' || source[index] === '-') {
      sign = source[index] === '-' ? -1 : 1
      index += 1
      while (/\s/.test(source[index] ?? '')) index += 1
    } else if (!first) {
      return failure('invalid-input', '表达式各项之间只能使用 + 或 -。')
    }

    const remainder = source.slice(index)
    const dieMatch = /^(\d+)\s*[dD]\s*(\d+)/.exec(remainder)
    const integerMatch = /^(\d+)/.exec(remainder)
    if (!dieMatch && !integerMatch) return failure('invalid-input', `无法识别表达式中“${remainder}”。`)

    if (dieMatch) {
      if (sign < 0) return failure('invalid-input', '骰子项只能相加，不能减去骰子。')
      const count = Number(dieMatch[1])
      const sides = Number(dieMatch[2])
      if (!Number.isSafeInteger(count) || count <= 0) return failure('invalid-input', '骰子数量必须是正安全整数。')
      if (!DIE_SIDES.includes(sides as DieSides)) return failure('invalid-input', `不支持 d${sides}，请选择 d2、d6、d8、d10、d12、d20 或 d100。`)
      const die = sides as DieSides
      pool[die] += count
      diceCount += count
      if (!Number.isSafeInteger(pool[die]) || !Number.isSafeInteger(diceCount)) return failure('too-long', '骰子数量过大。')
      index += dieMatch[0].length
    } else if (integerMatch) {
      const amount = Number(integerMatch[1])
      if (!Number.isSafeInteger(amount)) return failure('invalid-input', '补正必须是安全整数。')
      modifier += sign * amount
      if (!Number.isSafeInteger(modifier)) return failure('invalid-input', '补正总和超出安全整数范围。')
      index += integerMatch[0].length
    }

    while (/\s/.test(source[index] ?? '')) index += 1
    if (index < source.length && source[index] !== '+' && source[index] !== '-') {
      return failure('invalid-input', '表达式只支持骰子与整数的加减法。')
    }
    first = false
  }

  if (diceCount === 0) return failure('invalid-input', '表达式必须包含至少一个骰子项。')
  if (diceCount > 10_000) return failure('too-long', '单次最多投掷 10,000 颗骰子。')
  return success({ pool, modifier })
}

export function rollDice({ pool, modifier }: DiceConfiguration, fill?: RandomFill): ToolResult<DiceRoll> {
  if (!Number.isSafeInteger(modifier)) return failure('invalid-input', '补正必须是安全整数。')
  const count = Object.values(pool).reduce((sum, value) => sum + value, 0)
  if (count === 0) return failure('invalid-input', '请先选择至少一颗骰子。')
  if (count > 10_000) return failure('too-long', '单次最多投掷 10,000 颗骰子。')
  const groups: DiceRollGroup[] = []
  let diceTotal = 0
  for (const sides of DIE_SIDES) {
    if (!pool[sides]) continue
    const values: number[] = []
    for (let index = 0; index < pool[sides]; index += 1) {
      const rolled = secureInteger(1, sides, fill)
      if (!rolled.ok) return rolled
      values.push(rolled.value)
      diceTotal += rolled.value
    }
    groups.push({ sides, values })
  }
  const total = diceTotal + modifier
  if (!Number.isSafeInteger(total)) return failure('invalid-input', '总点数超出安全整数范围。')
  return success({ groups, diceTotal, modifier, total })
}
