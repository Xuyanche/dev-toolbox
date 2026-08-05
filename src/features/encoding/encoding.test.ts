import { decodeBase64, decodeUnicode, decodeUrl, encodeBase64, encodeUnicode, encodeUrl } from './encoding'

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

  it('encodes every UTF-16 code unit as canonical Unicode escapes', () => {
    expect(encodeUnicode('A中👋')).toEqual({ ok: true, value: '\\u0041\\u4E2D\\uD83D\\uDC4B' })
    expect(encodeUnicode('')).toEqual({ ok: true, value: '' })
  })

  it('decodes pure and mixed Unicode escapes with case-insensitive hexadecimal digits', () => {
    expect(decodeUnicode('\\u0041\\u4E2D\\uD83D\\uDC4B')).toEqual({ ok: true, value: 'A中👋' })
    expect(decodeUnicode('Hello, \\u4e16\\u754c')).toEqual({ ok: true, value: 'Hello, 世界' })
    expect(decodeUnicode('plain text')).toEqual({ ok: true, value: 'plain text' })
    expect(decodeUnicode('')).toEqual({ ok: true, value: '' })
  })

  it.each(['\\u12', '\\uZZZZ', '\\uD83D', '\\uDC4B', '\\uD83D\\u0041', '\\uDC4B\\uD83D'])(
    'rejects malformed Unicode input: %s',
    (value) => {
      expect(decodeUnicode(value)).toMatchObject({ ok: false, code: 'invalid-input' })
    },
  )

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
