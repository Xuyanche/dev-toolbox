import { bytesToHex, hexToBytes, utf8Bytes } from '../../shared/bytes'
import type { CipherMode, SymmetricAlgorithm } from './capabilities'
import { executeSymmetric, validateSymmetricCommand, type SymmetricCommand } from './symmetric'

function hex(value: string): Uint8Array {
  const result = hexToBytes(value)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

const vectors: Array<{ algorithm: SymmetricAlgorithm; mode: CipherMode; key: string; parameter?: string; plain: string; cipher: string }> = [
  { algorithm: 'AES', mode: 'CBC', key: '2b7e151628aed2a6abf7158809cf4f3c', parameter: '000102030405060708090a0b0c0d0e0f', plain: '6bc1bee22e409f96e93d7e117393172a', cipher: '7649abac8119b246cee98e9b12e9197d' },
  { algorithm: 'AES', mode: 'CTR', key: '2b7e151628aed2a6abf7158809cf4f3c', parameter: 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff', plain: '6bc1bee22e409f96e93d7e117393172a', cipher: '874d6191b620e3261bef6864990db6ce' },
  { algorithm: 'AES', mode: 'GCM', key: '00000000000000000000000000000000', parameter: '000000000000000000000000', plain: '', cipher: '58e2fccefa7e3061367f1d57a4e7455a' },
  { algorithm: 'DES', mode: 'ECB', key: '133457799bbcdff1', plain: '0123456789abcdef', cipher: '85e813540f0ab405' },
  { algorithm: 'DES', mode: 'CBC', key: '0123456789abcdef', parameter: '1234567890abcdef', plain: '4e6f77206973207468652074696d6520', cipher: 'e5c7cdde872bf27c43e934008c389c0f' },
  { algorithm: 'SM4', mode: 'ECB', key: '0123456789abcdeffedcba9876543210', plain: '0123456789abcdeffedcba9876543210', cipher: '681edf34d206965e86b3e94f536e4246' },
  { algorithm: 'SM4', mode: 'CBC', key: '0123456789abcdeffedcba9876543210', parameter: '000102030405060708090a0b0c0d0e0f', plain: '0123456789abcdeffedcba9876543210', cipher: 'a9a268883a336315bac0c9c9ff350ab1' },
]

describe('symmetric adapters', () => {
  it.each(vectors)('matches $algorithm-$mode known vector', async (vector) => {
    const result = await executeSymmetric({ operation: 'encrypt', algorithm: vector.algorithm, mode: vector.mode, padding: 'none', input: hex(vector.plain), key: hex(vector.key), parameter: vector.parameter ? hex(vector.parameter) : undefined })
    expect(result.ok && bytesToHex(result.value)).toBe(vector.cipher)
  })

  it.each(vectors)('decrypts $algorithm-$mode known vector', async (vector) => {
    const result = await executeSymmetric({ operation: 'decrypt', algorithm: vector.algorithm, mode: vector.mode, padding: 'none', input: hex(vector.cipher), key: hex(vector.key), parameter: vector.parameter ? hex(vector.parameter) : undefined })
    expect(result.ok && bytesToHex(result.value)).toBe(vector.plain)
  })

  it('round trips UTF-8 with strict PKCS#7', async () => {
    const base: SymmetricCommand = { operation: 'encrypt', algorithm: 'AES', mode: 'CBC', padding: 'pkcs7', input: utf8Bytes('本地文本'), key: hex('000102030405060708090a0b0c0d0e0f'), parameter: hex('101112131415161718191a1b1c1d1e1f') }
    const encrypted = await executeSymmetric(base)
    expect(encrypted.ok).toBe(true)
    if (!encrypted.ok) return
    const decrypted = await executeSymmetric({ ...base, operation: 'decrypt', input: encrypted.value })
    expect(decrypted.ok && bytesToHex(decrypted.value)).toBe(bytesToHex(base.input))
  })

  it('validates key, mode parameters and block alignment', () => {
    const base: SymmetricCommand = { operation: 'encrypt', algorithm: 'DES', mode: 'CBC', padding: 'none', input: new Uint8Array(8), key: new Uint8Array(8), parameter: new Uint8Array(8) }
    expect(validateSymmetricCommand({ ...base, key: new Uint8Array(7) })).toMatchObject({ ok: false })
    expect(validateSymmetricCommand({ ...base, parameter: new Uint8Array(7) })).toMatchObject({ ok: false })
    expect(validateSymmetricCommand({ ...base, input: new Uint8Array(7) })).toMatchObject({ ok: false })
    expect(validateSymmetricCommand({ ...base, algorithm: 'SM4', mode: 'GCM', key: new Uint8Array(16) })).toMatchObject({ ok: false })
  })

  it('rejects bad padding and GCM authentication without plaintext', async () => {
    const badPadding = await executeSymmetric({ operation: 'decrypt', algorithm: 'DES', mode: 'ECB', padding: 'pkcs7', input: hex('85e813540f0ab405'), key: hex('133457799bbcdff1') })
    expect(badPadding).toMatchObject({ ok: false, code: 'crypto-failed' })
    const badTag = await executeSymmetric({ operation: 'decrypt', algorithm: 'AES', mode: 'GCM', padding: 'none', input: new Uint8Array(16), key: new Uint8Array(16), parameter: new Uint8Array(12) })
    expect(badTag).toMatchObject({ ok: false, code: 'crypto-failed' })
  })
})
