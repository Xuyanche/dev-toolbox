import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8Bytes } from '../../shared/bytes'
import { failure, success, type ToolResult } from '../../shared/result'

export const RSA_PLAINTEXT_LIMIT = 190
const PUBLIC_HEADER = '-----BEGIN PUBLIC KEY-----'
const PUBLIC_FOOTER = '-----END PUBLIC KEY-----'
const PRIVATE_HEADER = '-----BEGIN PRIVATE KEY-----'
const PRIVATE_FOOTER = '-----END PRIVATE KEY-----'

export interface RsaKeyPairPem {
  publicKey: string
  privateKey: string
}

const oaepAlgorithm: RsaHashedImportParams = { name: 'RSA-OAEP', hash: 'SHA-256' }
const pssAlgorithm: RsaHashedImportParams = { name: 'RSA-PSS', hash: 'SHA-256' }

function cryptoAvailable(): ToolResult<SubtleCrypto> {
  return globalThis.crypto?.subtle
    ? success(globalThis.crypto.subtle)
    : failure('unsupported', '当前环境不支持 Web Crypto API。请使用现代浏览器和 HTTPS。')
}

function toPem(buffer: ArrayBuffer, label: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
  const body = bytesToBase64(new Uint8Array(buffer)).match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`
}

function fromPem(pem: string, kind: 'public' | 'private'): ToolResult<Uint8Array> {
  const header = kind === 'public' ? PUBLIC_HEADER : PRIVATE_HEADER
  const footer = kind === 'public' ? PUBLIC_FOOTER : PRIVATE_FOOTER
  const trimmed = pem.trim()
  if (!trimmed.startsWith(header) || !trimmed.endsWith(footer)) {
    return failure('invalid-input', kind === 'public'
      ? '公钥必须是 SPKI PEM（BEGIN PUBLIC KEY）。'
      : '私钥必须是 PKCS#8 PEM（BEGIN PRIVATE KEY）。')
  }
  const body = trimmed.slice(header.length, -footer.length).replace(/\s/g, '')
  if (!body) return failure('invalid-input', 'PEM 密钥内容为空。')
  return base64ToBytes(body)
}

async function importPublic(pem: string, mode: 'encrypt' | 'verify'): Promise<ToolResult<CryptoKey>> {
  const available = cryptoAvailable()
  if (!available.ok) return available
  const der = fromPem(pem, 'public')
  if (!der.ok) return der
  try {
    const key = await available.value.importKey(
      'spki', der.value, mode === 'encrypt' ? oaepAlgorithm : pssAlgorithm, false, [mode],
    )
    return success(key)
  } catch {
    return failure('invalid-input', '公钥格式、类型或 RSA 参数不兼容。')
  }
}

async function importPrivate(pem: string, mode: 'decrypt' | 'sign'): Promise<ToolResult<CryptoKey>> {
  const available = cryptoAvailable()
  if (!available.ok) return available
  const der = fromPem(pem, 'private')
  if (!der.ok) return der
  try {
    const key = await available.value.importKey(
      'pkcs8', der.value, mode === 'decrypt' ? oaepAlgorithm : pssAlgorithm, false, [mode],
    )
    return success(key)
  } catch {
    return failure('invalid-input', '私钥格式、类型或 RSA 参数不兼容。')
  }
}

export async function generateRsaKeyPair(): Promise<ToolResult<RsaKeyPairPem>> {
  const available = cryptoAvailable()
  if (!available.ok) return available
  try {
    const pair = await available.value.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    ) as CryptoKeyPair
    const [publicDer, privateDer] = await Promise.all([
      available.value.exportKey('spki', pair.publicKey),
      available.value.exportKey('pkcs8', pair.privateKey),
    ])
    return success({ publicKey: toPem(publicDer, 'PUBLIC KEY'), privateKey: toPem(privateDer, 'PRIVATE KEY') })
  } catch {
    return failure('crypto-failed', 'RSA 密钥生成失败。')
  }
}

export async function encryptRsa(text: string, publicPem: string): Promise<ToolResult<string>> {
  const data = utf8Bytes(text)
  if (data.byteLength > RSA_PLAINTEXT_LIMIT) {
    return failure('too-long', `明文为 ${data.byteLength} 字节，超过当前参数允许的 ${RSA_PLAINTEXT_LIMIT} 字节。`)
  }
  const key = await importPublic(publicPem, 'encrypt')
  if (!key.ok) return key
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key.value, data)
    return success(bytesToBase64(new Uint8Array(encrypted)))
  } catch {
    return failure('crypto-failed', 'RSA 加密失败。')
  }
}

export async function decryptRsa(ciphertext: string, privatePem: string): Promise<ToolResult<string>> {
  const bytes = base64ToBytes(ciphertext)
  if (!bytes.ok) return bytes
  const key = await importPrivate(privatePem, 'decrypt')
  if (!key.ok) return key
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key.value, bytes.value)
    return bytesToUtf8(new Uint8Array(decrypted))
  } catch {
    return failure('crypto-failed', 'RSA 解密失败：密文可能损坏或与私钥不匹配。')
  }
}

export async function signRsa(text: string, privatePem: string): Promise<ToolResult<string>> {
  const key = await importPrivate(privatePem, 'sign')
  if (!key.ok) return key
  try {
    const signature = await crypto.subtle.sign(
      { name: 'RSA-PSS', saltLength: 32 }, key.value, utf8Bytes(text),
    )
    return success(bytesToBase64(new Uint8Array(signature)))
  } catch {
    return failure('crypto-failed', 'RSA 签名失败。')
  }
}

export async function verifyRsa(
  text: string,
  signature: string,
  publicPem: string,
): Promise<ToolResult<boolean>> {
  const bytes = base64ToBytes(signature)
  if (!bytes.ok) return bytes
  const key = await importPublic(publicPem, 'verify')
  if (!key.ok) return key
  try {
    return success(await crypto.subtle.verify(
      { name: 'RSA-PSS', saltLength: 32 }, key.value, bytes.value, utf8Bytes(text),
    ))
  } catch {
    return failure('crypto-failed', 'RSA 验签操作失败。')
  }
}
