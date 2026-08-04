import { DEFAULT_RANDOM_REQUEST, generateRandomNumbers } from './randomNumber'

const zeros = (target: Uint8Array) => target

describe('random number domain', () => {
  it('defines the required defaults', () => {
    expect(DEFAULT_RANDOM_REQUEST).toEqual({ minimum: 1, maximum: 100, count: 1, kind: 'integer', unique: true })
  })

  it('generates inclusive integer bounds and unique batches', () => {
    expect(generateRandomNumbers(DEFAULT_RANDOM_REQUEST, zeros)).toEqual({ ok: true, value: [1] })
    const unique = generateRandomNumbers({ minimum: 1, maximum: 3, count: 3, kind: 'integer', unique: true }, zeros)
    expect(unique.ok && new Set(unique.value).size).toBe(3)
  })

  it('permits duplicate integers when uniqueness is off', () => {
    expect(generateRandomNumbers({ minimum: 1, maximum: 2, count: 3, kind: 'integer', unique: false }, zeros)).toEqual({ ok: true, value: [1, 1, 1] })
  })

  it('generates half-open floating values', () => {
    expect(generateRandomNumbers({ minimum: 0, maximum: 1, count: 2, kind: 'float', unique: false }, zeros)).toEqual({ ok: true, value: [0, 0] })
  })

  it.each([
    { minimum: 1, maximum: 1, count: 1, kind: 'integer', unique: true },
    { minimum: 1, maximum: 3, count: 4, kind: 'integer', unique: true },
    { minimum: 1, maximum: 3, count: 0, kind: 'integer', unique: true },
    { minimum: 1, maximum: 3, count: 10_001, kind: 'integer', unique: false },
  ] as const)('rejects invalid request %#', (request) => {
    expect(generateRandomNumbers(request, zeros)).toMatchObject({ ok: false })
  })
})
