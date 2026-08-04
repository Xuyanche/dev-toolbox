import { DIE_SIDES, emptyDicePool, formatDiceExpression, parseDiceExpression, rollDice } from './dice'

const zeros = (target: Uint8Array) => target

describe('dice domain', () => {
  it('parses, merges and formats mixed expressions', () => {
    const result = parseDiceExpression('1d6 + 2D6 + 1d20')
    expect(result.ok && formatDiceExpression(result.value)).toBe('3d6 + 1d20')
  })

  it.each(['', '0d6', '2d4', 'd6', '2d6 +', '2d6 nope'])('rejects invalid expression %s', (value) => {
    expect(parseDiceExpression(value)).toMatchObject({ ok: false })
  })

  it('rolls every supported die within bounds and totals results', () => {
    const pool = emptyDicePool()
    for (const sides of DIE_SIDES) pool[sides] = 1
    const result = rollDice(pool, zeros)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.groups.map((group) => group.sides)).toEqual(DIE_SIDES)
    expect(result.value.groups.flatMap((group) => group.values)).toEqual(Array(7).fill(1))
    expect(result.value.total).toBe(7)
  })

  it('rejects an empty pool', () => {
    expect(rollDice(emptyDicePool(), zeros)).toMatchObject({ ok: false, code: 'invalid-input' })
  })
})
