import { browserRandomFill, random53, secureInteger, secureUnitFloat, type RandomFill } from './random'

function sequence(...chunks: number[][]): RandomFill {
  let index = 0
  return (target) => {
    target.set(chunks[index++] ?? [])
    return target
  }
}

describe('secure random primitives', () => {
  it('constructs the full 53-bit sample range', () => {
    expect(random53(sequence([0, 0, 0, 0, 0, 0, 0]))).toBe(0)
    expect(random53(sequence([31, 255, 255, 255, 255, 255, 255]))).toBe(0x1f_ffff_ffff_ffff)
  })

  it('generates inclusive integer bounds', () => {
    expect(secureInteger(1, 6, sequence([0, 0, 0, 0, 0, 0, 0]))).toEqual({ ok: true, value: 1 })
    expect(secureInteger(1, 1, sequence([0, 0, 0, 0, 0, 0, 0]))).toEqual({ ok: true, value: 1 })
  })

  it('rejects samples outside the largest exact multiple', () => {
    const result = secureInteger(1, 3, sequence(
      [31, 255, 255, 255, 255, 255, 255],
      [0, 0, 0, 0, 0, 0, 1],
    ))
    expect(result).toEqual({ ok: true, value: 2 })
  })

  it('creates half-open unit floats', () => {
    expect(secureUnitFloat(sequence([0, 0, 0, 0, 0, 0, 0]))).toEqual({ ok: true, value: 0 })
    const high = secureUnitFloat(sequence([31, 255, 255, 255, 255, 255, 255]))
    expect(high.ok && high.value).toBeLessThan(1)
  })

  it('does not fall back when secure crypto is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
    const mathSpy = vi.spyOn(Math, 'random')
    expect(() => browserRandomFill(new Uint8Array(1))).toThrow()
    expect(secureInteger(1, 6)).toMatchObject({ ok: false, code: 'unsupported' })
    expect(mathSpy).not.toHaveBeenCalled()
    mathSpy.mockRestore()
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
  })
})
