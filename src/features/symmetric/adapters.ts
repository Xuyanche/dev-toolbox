import CryptoJS from 'crypto-js'
import sm4 from 'sm-crypto/src/sm4/index.js'
import type { CipherMode, SymmetricAlgorithm } from './capabilities'

function toWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >>> 2] = (words[index >>> 2] ?? 0) | (bytes[index] << (24 - (index % 4) * 8))
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function fromWordArray(value: CryptoJS.lib.WordArray): Uint8Array {
  const bytes = new Uint8Array(value.sigBytes)
  for (let index = 0; index < value.sigBytes; index += 1) {
    bytes[index] = (value.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  }
  return bytes
}

function exactBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer
}

function cryptoJsAdapter(operation: 'encrypt' | 'decrypt', algorithm: 'AES' | 'DES', mode: Exclude<CipherMode, 'GCM'>, input: Uint8Array, key: Uint8Array, parameter?: Uint8Array): Uint8Array {
  const helper = algorithm === 'AES' ? CryptoJS.AES : CryptoJS.DES
  const modes = { CBC: CryptoJS.mode.CBC, CTR: CryptoJS.mode.CTR, ECB: CryptoJS.mode.ECB }
  const config = { mode: modes[mode], padding: CryptoJS.pad.NoPadding, iv: parameter ? toWordArray(parameter) : undefined }
  const keyWords = toWordArray(key)
  if (operation === 'encrypt') return fromWordArray(helper.encrypt(toWordArray(input), keyWords, config).ciphertext)
  const params = CryptoJS.lib.CipherParams.create({ ciphertext: toWordArray(input) })
  return fromWordArray(helper.decrypt(params, keyWords, config))
}

async function aesGcm(operation: 'encrypt' | 'decrypt', input: Uint8Array, key: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto unavailable')
  const cryptoKey = await globalThis.crypto.subtle.importKey('raw', exactBuffer(key), 'AES-GCM', false, [operation])
  const result = operation === 'encrypt'
    ? await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv: exactBuffer(nonce), tagLength: 128 }, cryptoKey, exactBuffer(input))
    : await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: exactBuffer(nonce), tagLength: 128 }, cryptoKey, exactBuffer(input))
  return new Uint8Array(result)
}

function sm4Adapter(operation: 'encrypt' | 'decrypt', mode: 'ECB' | 'CBC', input: Uint8Array, key: Uint8Array, parameter?: Uint8Array): Uint8Array {
  const options = mode === 'CBC'
    ? { mode: 'cbc' as const, iv: Array.from(parameter ?? []), padding: 'none' as const, output: 'array' as const }
    : { padding: 'none' as const, output: 'array' as const }
  const result = operation === 'encrypt'
    ? sm4.encrypt(Array.from(input), Array.from(key), options)
    : sm4.decrypt(Array.from(input), Array.from(key), options)
  return Uint8Array.from(result)
}

export async function runAdapter(algorithm: SymmetricAlgorithm, operation: 'encrypt' | 'decrypt', mode: CipherMode, input: Uint8Array, key: Uint8Array, parameter?: Uint8Array): Promise<Uint8Array> {
  if (algorithm === 'AES' && mode === 'GCM') return aesGcm(operation, input, key, parameter ?? new Uint8Array())
  if (algorithm === 'SM4') return sm4Adapter(operation, mode as 'ECB' | 'CBC', input, key, parameter)
  return cryptoJsAdapter(operation, algorithm as 'AES' | 'DES', mode as 'CBC' | 'CTR' | 'ECB', input, key, parameter)
}
