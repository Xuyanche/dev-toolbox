import { base64UrlToBytes, bytesToBase64Url, utf8Bytes } from '../../shared/bytes'
import { deriveJwtHeader, generateJwt, generateSecret, getRegisteredClaims, parseJsonObject, parseJwt, verifyJwt } from './jwt'

const knownToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('JWT domain', () => {
  it('derives the exact generated header from secret presence and the retained HMAC choice', () => {
    expect(deriveJwtHeader('', 'HS512')).toEqual({ alg: 'none', typ: 'JWT' })
    expect(deriveJwtHeader('secret', 'HS512')).toEqual({ alg: 'HS512', typ: 'JWT' })
  })

  it('verifies the common HS256 reference vector and preserves custom claims', async () => {
    const parsed = parseJwt(knownToken)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(parsed.value.payload).toMatchObject({ sub: '1234567890', name: 'John Doe', iat: 1516239022 })
    expect(parsed.value.signingInput).toBe(knownToken.slice(0, knownToken.lastIndexOf('.')))
    expect(getRegisteredClaims(parsed.value.payload)).toEqual({ sub: '1234567890', iat: 1516239022 })
    expect(await verifyJwt(parsed.value, 'your-256-bit-secret')).toBe('valid')
    expect(await verifyJwt(parsed.value, 'wrong secret')).toBe('invalid')
    expect(await verifyJwt(parsed.value)).toBe('unverified')
  })

  it.each(['HS256', 'HS384', 'HS512'] as const)('round trips a %s signed token', async (algorithm) => {
    const generated = await generateJwt({ sub: 'alice', custom: { role: 'admin' } }, '本地 secret', algorithm)
    expect(generated.ok).toBe(true)
    if (!generated.ok) return
    const parsed = parseJwt(generated.value)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.header.alg).toBe(algorithm)
    expect(parsed.value.payload).toEqual({ sub: 'alice', custom: { role: 'admin' } })
    expect(await verifyJwt(parsed.value, '本地 secret')).toBe('valid')
  })

  it('generates and identifies an unsigned debugging token', async () => {
    const generated = await generateJwt({ debug: true }, '', 'HS256')
    expect(generated).toMatchObject({ ok: true, warning: expect.stringContaining('没有签名') })
    if (!generated.ok) return
    expect(generated.value.endsWith('.')).toBe(true)
    const parsed = parseJwt(generated.value)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.header).toEqual({ alg: 'none', typ: 'JWT' })
    expect(await verifyJwt(parsed.value, 'even-with-a-secret')).toBe('unsigned')
  })

  it('reports unsupported algorithms without algorithm confusion', async () => {
    const header = bytesToBase64Url(utf8Bytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
    const payload = bytesToBase64Url(utf8Bytes('{}'))
    const parsed = parseJwt(`${header}.${payload}.AA`)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(await verifyJwt(parsed.value, 'secret')).toBe('unsupported')
  })

  it.each([
    'one.two',
    'one.two.three.four',
    '!!!!.e30.',
    `${bytesToBase64Url(utf8Bytes('[]'))}.e30.`,
    `${bytesToBase64Url(utf8Bytes('{bad'))}.e30.`,
    `${bytesToBase64Url(Uint8Array.of(0xff))}.e30.`,
    `${bytesToBase64Url(utf8Bytes('{"alg":"none"}'))}.e30.AA`,
  ])('rejects malformed JWT input: %s', (token) => {
    expect(parseJwt(token)).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('requires claims JSON to be an object', () => {
    expect(parseJsonObject('{"sub":"alice"}', 'Payload')).toEqual({ ok: true, value: { sub: 'alice' } })
    expect(parseJsonObject('[]', 'Payload')).toMatchObject({ ok: false })
    expect(parseJsonObject('{bad', 'Payload')).toMatchObject({ ok: false })
  })

  it('generates a fresh 256-bit unpadded Base64URL secret', () => {
    const first = generateSecret()
    const second = generateSecret()
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.value).not.toBe(second.value)
    const decoded = base64UrlToBytes(first.value)
    expect(decoded.ok && decoded.value).toHaveLength(32)
  })
})
