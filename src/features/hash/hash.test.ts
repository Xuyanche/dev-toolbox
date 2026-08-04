import { calculateMd5, calculateSha1 } from './hash'

describe('hash digests', () => {
  it('calculates known MD5 vectors and uppercase variants', () => {
    expect(calculateMd5('')).toEqual({
      ok: true,
      value: {
        lower: 'd41d8cd98f00b204e9800998ecf8427e',
        upper: 'D41D8CD98F00B204E9800998ECF8427E',
      },
    })
    expect(calculateMd5('你好')).toMatchObject({
      ok: true,
      value: { lower: '7eca689f0d3389d9dea66ae112e5cfd7' },
    })
  })

  it('calculates a known SHA-1 vector', async () => {
    await expect(calculateSha1('abc')).resolves.toEqual({
      ok: true,
      value: {
        lower: 'a9993e364706816aba3e25717850c26c9cd0d89d',
        upper: 'A9993E364706816ABA3E25717850C26C9CD0D89D',
      },
    })
  })
})
