import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8Bytes } from '../../shared/bytes'
import { failure, success, type ToolResult } from '../../shared/result'

export interface DigestVariants {
  lower: string
  upper: string
}

export const SHA_ALGORITHMS = [
  { id: 'sha1', label: 'SHA-1', webCryptoName: 'SHA-1', hexLength: 40 },
  { id: 'sha256', label: 'SHA-256', webCryptoName: 'SHA-256', hexLength: 64 },
  { id: 'sha384', label: 'SHA-384', webCryptoName: 'SHA-384', hexLength: 96 },
  { id: 'sha512', label: 'SHA-512', webCryptoName: 'SHA-512', hexLength: 128 },
] as const

export type ShaAlgorithmId = typeof SHA_ALGORITHMS[number]['id']
export type ShaDigestBatch = Record<ShaAlgorithmId, DigestVariants>

const variants = (lower: string): DigestVariants => ({ lower, upper: lower.toUpperCase() })

export function calculateMd5(value: string): ToolResult<DigestVariants> {
  return success(variants(bytesToHex(md5(utf8Bytes(value)))))
}

export async function calculateSha(value: string): Promise<ToolResult<ShaDigestBatch>> {
  if (!globalThis.crypto?.subtle) {
    return failure('unsupported', '当前环境不支持 Web Crypto API。请使用现代浏览器和 HTTPS。')
  }

  try {
    const input = utf8Bytes(value)
    const entries = await Promise.all(SHA_ALGORITHMS.map(async (algorithm) => {
      const digest = await crypto.subtle.digest(algorithm.webCryptoName, input)
      return [algorithm.id, variants(bytesToHex(new Uint8Array(digest)))] as const
    }))
    return success(Object.fromEntries(entries) as ShaDigestBatch)
  } catch {
    return failure('crypto-failed', 'SHA 摘要批量计算失败，未保留任何部分结果。请重试或检查浏览器 Web Crypto 支持。')
  }
}
