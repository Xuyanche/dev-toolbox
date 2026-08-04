import { base64UrlToBytes, bytesToBase64Url, bytesToUtf8, utf8Bytes } from '../../shared/bytes'
import { failure, success, type ToolResult } from '../../shared/result'

export type HmacAlgorithm = 'HS256' | 'HS384' | 'HS512'
export type JwtTrustStatus = 'unverified' | 'valid' | 'invalid' | 'unsigned' | 'unsupported'
export type JsonObject = Record<string, unknown>

export interface ParsedJwt {
  header: JsonObject
  payload: JsonObject
  headerSegment: string
  payloadSegment: string
  signatureSegment: string
  signingInput: string
}

export const registeredClaimNames = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'] as const

const hashByAlgorithm: Record<HmacAlgorithm, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isHmacAlgorithm = (value: unknown): value is HmacAlgorithm =>
  typeof value === 'string' && Object.hasOwn(hashByAlgorithm, value)

export function parseJsonObject(value: string, label = 'JSON'): ToolResult<JsonObject> {
  try {
    const parsed: unknown = JSON.parse(value)
    return isObject(parsed)
      ? success(parsed)
      : failure('invalid-input', `${label} 的顶层值必须是 JSON 对象。`)
  } catch {
    return failure('invalid-input', `${label} 不是有效的 JSON。`)
  }
}

function decodeJsonSegment(segment: string, label: string): ToolResult<JsonObject> {
  if (!segment) return failure('invalid-input', `${label} 片段不能为空。`)
  const decoded = base64UrlToBytes(segment)
  if (!decoded.ok) return failure('invalid-input', `${label} ${decoded.message}`)
  const text = bytesToUtf8(decoded.value)
  if (!text.ok) return failure('invalid-input', `${label} 不是有效的 UTF-8 JSON。`)
  return parseJsonObject(text.value, label)
}

export function parseJwt(token: string): ToolResult<ParsedJwt> {
  const segments = token.trim().split('.')
  if (segments.length !== 3) {
    return failure('invalid-input', 'JWT 必须恰好包含三个以句点分隔的片段。')
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments
  const header = decodeJsonSegment(headerSegment, 'Header')
  if (!header.ok) return header
  const payload = decodeJsonSegment(payloadSegment, 'Payload')
  if (!payload.ok) return payload
  const signature = base64UrlToBytes(signatureSegment)
  if (!signature.ok) return failure('invalid-input', `签名 ${signature.message}`)
  if (header.value.alg === 'none' && signatureSegment !== '') {
    return failure('invalid-input', '`alg: none` 的 JWT 必须使用空签名片段。')
  }
  return success({
    header: header.value,
    payload: payload.value,
    headerSegment,
    payloadSegment,
    signatureSegment,
    signingInput: `${headerSegment}.${payloadSegment}`,
  })
}

export function getRegisteredClaims(payload: JsonObject): Partial<Record<(typeof registeredClaimNames)[number], unknown>> {
  return Object.fromEntries(
    registeredClaimNames.filter((name) => Object.hasOwn(payload, name)).map((name) => [name, payload[name]]),
  )
}

export function deriveJwtHeader(secret: string, algorithm: HmacAlgorithm): JsonObject {
  return { alg: secret ? algorithm : 'none', typ: 'JWT' }
}

function requireCrypto(): ToolResult<Crypto> {
  return globalThis.crypto?.subtle
    ? success(globalThis.crypto)
    : failure('unsupported', '当前环境不支持 Web Crypto API。请使用现代浏览器和 HTTPS。')
}

async function importHmacKey(secret: string, algorithm: HmacAlgorithm): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8Bytes(secret),
    { name: 'HMAC', hash: hashByAlgorithm[algorithm] },
    false,
    ['sign', 'verify'],
  )
}

export async function signHmac(signingInput: string, secret: string, algorithm: HmacAlgorithm): Promise<ToolResult<string>> {
  const available = requireCrypto()
  if (!available.ok) return available
  try {
    const key = await importHmacKey(secret, algorithm)
    const signature = await crypto.subtle.sign('HMAC', key, utf8Bytes(signingInput))
    return success(bytesToBase64Url(new Uint8Array(signature)))
  } catch {
    return failure('crypto-failed', 'JWT 签名失败。')
  }
}

export async function verifyJwt(parsed: ParsedJwt, secret = ''): Promise<JwtTrustStatus> {
  const algorithm = parsed.header.alg
  if (algorithm === 'none') return 'unsigned'
  if (!isHmacAlgorithm(algorithm)) return 'unsupported'
  if (!secret) return 'unverified'
  const available = requireCrypto()
  if (!available.ok) return 'unsupported'
  const signature = base64UrlToBytes(parsed.signatureSegment)
  if (!signature.ok) return 'invalid'
  try {
    const key = await importHmacKey(secret, algorithm)
    return await crypto.subtle.verify('HMAC', key, signature.value, utf8Bytes(parsed.signingInput))
      ? 'valid'
      : 'invalid'
  } catch {
    return 'invalid'
  }
}

export async function generateJwt(payload: JsonObject, secret: string, algorithm: HmacAlgorithm): Promise<ToolResult<string>> {
  const header = deriveJwtHeader(secret, algorithm)
  const headerSegment = bytesToBase64Url(utf8Bytes(JSON.stringify(header)))
  const payloadSegment = bytesToBase64Url(utf8Bytes(JSON.stringify(payload)))
  const signingInput = `${headerSegment}.${payloadSegment}`
  if (!secret) return success(`${signingInput}.`, '该令牌没有签名，不得用于身份认证或授权。')
  const signature = await signHmac(signingInput, secret, algorithm)
  return signature.ok ? success(`${signingInput}.${signature.value}`) : signature
}

export function generateSecret(): ToolResult<string> {
  if (!globalThis.crypto?.getRandomValues) {
    return failure('unsupported', '当前环境不支持密码学安全随机数。请使用现代浏览器和 HTTPS。')
  }
  try {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return success(bytesToBase64Url(bytes))
  } catch {
    return failure('crypto-failed', '安全 Secret 生成失败。')
  }
}
