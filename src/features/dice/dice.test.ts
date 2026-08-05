import {
  DIE_SIDES,
  emptyDiceConfiguration,
  emptyDicePool,
  formatDiceExpression,
  parseDiceExpression,
  rollDice,
} from './dice'

const zeros = (target: Uint8Array) => target

describe('dice domain', () => {
  it.each([
    ['1d6+2', '1d6 + 2', 2],
    ['1d6-3', '1d6 - 3', -3],
    ['1d6+3-5', '1d6 - 2', -2],
    ['1d6+3-3', '1d6', 0],
    ['1d6 + 2D6 + 1d20 - 4 + 1', '3d6 + 1d20 - 3', -3],
  ])('parses and normalizes %s', (source, normalized, modifier) => {
    const result = parseDiceExpression(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(formatDiceExpression(result.value)).toBe(normalized)
    expect(result.value.modifier).toBe(modifier)
  })

  it.each([
    '', '0d6', '2d4', 'd6', '2d6 +', '2d6 nope', '2d6 - 1d20',
    '1d6 * 2', '1d6 / 2', '(1d6 + 2)', '1d6 + 1.5', '1d6 + nope',
    '1d6 + -2', '1d6 ++ 2', '3', '9007199254740992d6', '1d6 + 9007199254740992',
  ])('rejects invalid or unsupported expression %s', (value) => {
    expect(parseDiceExpression(value)).toMatchObject({ ok: false })
  })

  it('reports subtraction of dice explicitly and preserves safe-integer modifier sums', () => {
    expect(parseDiceExpression('2d6 - 1d20')).toMatchObject({ ok: false, message: expect.stringContaining('不能减去骰子') })
    expect(parseDiceExpression(`1d6 + ${Number.MAX_SAFE_INTEGER} + 1`)).toMatchObject({ ok: false, message: expect.stringContaining('安全整数') })
  })

  it('rolls every supported die, snapshots the modifier and includes it in the total', () => {
    const pool = emptyDicePool()
    for (const sides of DIE_SIDES) pool[sides] = 1
    const result = rollDice({ pool, modifier: 3 }, zeros)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.groups.map((group) => group.sides)).toEqual(DIE_SIDES)
    expect(result.value.groups.flatMap((group) => group.values)).toEqual(Array(7).fill(1))
    expect(result.value).toMatchObject({ diceTotal: 7, modifier: 3, total: 10 })
  })

  it('rejects an empty pool even with a modifier and rejects an unsafe final total', () => {
    expect(rollDice({ ...emptyDiceConfiguration(), modifier: 3 }, zeros)).toMatchObject({ ok: false, code: 'invalid-input' })
    const pool = emptyDicePool()
    pool[2] = 1
    expect(rollDice({ pool, modifier: Number.MAX_SAFE_INTEGER }, zeros)).toMatchObject({ ok: false, message: expect.stringContaining('总点数') })
  })
})
