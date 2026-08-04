import { calculateMd5, calculateSha, SHA_ALGORITHMS } from './hash'

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

  it('calculates all ordered SHA vectors with uppercase variants and expected lengths', async () => {
    expect(SHA_ALGORITHMS.map(({ id, label, hexLength }) => ({ id, label, hexLength }))).toEqual([
      { id: 'sha1', label: 'SHA-1', hexLength: 40 },
      { id: 'sha256', label: 'SHA-256', hexLength: 64 },
      { id: 'sha384', label: 'SHA-384', hexLength: 96 },
      { id: 'sha512', label: 'SHA-512', hexLength: 128 },
    ])

    const result = await calculateSha('abc')
    expect(result).toMatchObject({
      ok: true,
      value: {
        sha1: { lower: 'a9993e364706816aba3e25717850c26c9cd0d89d' },
        sha256: { lower: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
        sha384: { lower: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7' },
        sha512: { lower: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f' },
      },
    })
    if (!result.ok) return
    for (const algorithm of SHA_ALGORITHMS) {
      const digest = result.value[algorithm.id]
      expect(digest.lower).toHaveLength(algorithm.hexLength)
      expect(digest.upper).toBe(digest.lower.toUpperCase())
    }
  })

  it('treats empty and Unicode text as valid UTF-8 input', async () => {
    await expect(calculateSha('')).resolves.toMatchObject({
      ok: true,
      value: {
        sha1: { lower: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' },
        sha256: { lower: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      },
    })
    await expect(calculateSha('你好')).resolves.toMatchObject({
      ok: true,
      value: {
        sha1: { lower: '440ee0853ad1e99f962b63e459ef992d7c211722' },
        sha256: { lower: '670d9743542cae3ea7ebe36af56bd53648b0a1126162e78d81a32934a711302e' },
        sha384: { lower: '05f076c7d180e91d80a56d70b226fca01e2353554c315ac1e8caaaeca2ce0dc0d9d84e206a2bf1143a0ae1b9be9bcfa8' },
        sha512: { lower: '5232181bc0d9888f5c9746e410b4740eb461706ba5dacfbc93587cecfc8d068bac7737e92870d6745b11a25e9cd78b55f4ffc706f73cfcae5345f1b53fb8f6b5' },
      },
    })
  })

  it('returns one atomic error when any SHA digest fails', async () => {
    const originalDigest = crypto.subtle.digest.bind(crypto.subtle)
    const digestSpy = vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name
      return name === 'SHA-384' ? Promise.reject(new Error('unsupported digest')) : originalDigest(algorithm, data)
    })

    await expect(calculateSha('atomic')).resolves.toEqual({
      ok: false,
      code: 'crypto-failed',
      message: 'SHA 摘要批量计算失败，未保留任何部分结果。请重试或检查浏览器 Web Crypto 支持。',
    })
    expect(digestSpy).toHaveBeenCalledTimes(4)
  })

  it('returns an actionable error when Web Crypto is unavailable', async () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
    try {
      await expect(calculateSha('abc')).resolves.toEqual({
        ok: false,
        code: 'unsupported',
        message: '当前环境不支持 Web Crypto API。请使用现代浏览器和 HTTPS。',
      })
    } finally {
      if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    }
  })
})
