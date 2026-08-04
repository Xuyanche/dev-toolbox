import { decodeBase64, decodeUrl, encodeBase64, encodeUrl } from './encoding'

describe('text encoding', () => {
  it('round trips UTF-8 text through Base64', () => {
    const encoded = encodeBase64('你好 👋')
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(decodeBase64(encoded.value)).toEqual({ ok: true, value: '你好 👋' })
  })

  it('supports empty Base64 input', () => {
    expect(encodeBase64('')).toEqual({ ok: true, value: '' })
    expect(decodeBase64('')).toEqual({ ok: true, value: '' })
  })

  it('rejects invalid Base64 and invalid UTF-8', () => {
    expect(decodeBase64('abc')).toMatchObject({ ok: false, code: 'invalid-input' })
    expect(decodeBase64('/w==')).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('distinguishes component and complete URL modes', () => {
    expect(encodeUrl('a/b c', 'component')).toEqual({ ok: true, value: 'a%2Fb%20c' })
    expect(encodeUrl('https://例子.test/a b?q=1', 'complete')).toEqual({
      ok: true,
      value: 'https://%E4%BE%8B%E5%AD%90.test/a%20b?q=1',
    })
  })

  it('decodes URL text and rejects malformed escapes', () => {
    expect(decodeUrl('a%2Fb%20c', 'component')).toEqual({ ok: true, value: 'a/b c' })
    expect(decodeUrl('%GG', 'component')).toMatchObject({ ok: false })
  })
})
