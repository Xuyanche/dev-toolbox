import { base64ToBytes, base64UrlToBytes, bytesToBase64, bytesToBase64Url, bytesToHex, bytesToUtf8, hexToBytes, utf8Bytes } from './bytes'

describe('strict byte encodings', () => {
  it('round trips HEX and Base64 bytes', () => {
    const bytes = utf8Bytes('你好')
    const hex = hexToBytes(bytesToHex(bytes))
    const base64 = base64ToBytes(bytesToBase64(bytes))
    expect(hex.ok && Array.from(hex.value)).toEqual(Array.from(bytes))
    expect(base64.ok && Array.from(base64.value)).toEqual(Array.from(bytes))
  })

  it.each(['0', '0g', 'aa bb', '0x12'])('rejects malformed HEX: %s', (value) => {
    expect(hexToBytes(value)).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it.each(['abc', '!!!!', 'YW Jj', 'YWJj===='])('rejects malformed Base64: %s', (value) => {
    expect(base64ToBytes(value)).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('rejects invalid UTF-8', () => {
    expect(bytesToUtf8(Uint8Array.of(0xff))).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('round trips canonical unpadded Base64URL bytes', () => {
    const bytes = Uint8Array.of(0xfb, 0xff, 0x00, 0x61)
    const encoded = bytesToBase64Url(bytes)
    expect(encoded).toBe('-_8AYQ')
    expect(base64UrlToBytes(encoded)).toEqual({ ok: true, value: bytes })
  })

  it.each(['a', 'ab=', 'ab+c', 'ab/c', 'Zh', '中文'])('rejects malformed or non-canonical Base64URL: %s', (value) => {
    expect(base64UrlToBytes(value)).toMatchObject({ ok: false, code: 'invalid-input' })
  })
})
