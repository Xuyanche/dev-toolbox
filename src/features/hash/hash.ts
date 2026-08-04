import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8Bytes } from '../../shared/bytes'
import { failure, success, type ToolResult } from '../../shared/result'

export interface DigestVariants {
  lower: string
  upper: string
}

const variants = (lower: string): DigestVariants => ({ lower, upper: lower.toUpperCase() })

export function calculateMd5(value: string): ToolResult<DigestVariants> {
  return success(variants(bytesToHex(md5(utf8Bytes(value)))))
}

export async function calculateSha1(value: string): Promise<ToolResult<DigestVariants>> {
  if (!globalThis.crypto?.subtle) {
    return failure('unsupported', '当前环境不支持 Web Crypto API。请使用现代浏览器和 HTTPS。')
  }
  try {
    const digest = await crypto.subtle.digest('SHA-1', utf8Bytes(value))
    return success(variants(bytesToHex(new Uint8Array(digest))))
  } catch {
    return failure('crypto-failed', 'SHA-1 计算失败。')
  }
}
