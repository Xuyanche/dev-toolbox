import { failure, success, type ToolResult } from '../../shared/result'

export function addPkcs7(bytes: Uint8Array, blockSize: number): Uint8Array {
  const count = blockSize - (bytes.length % blockSize)
  const result = new Uint8Array(bytes.length + count)
  result.set(bytes)
  result.fill(count, bytes.length)
  return result
}

export function removePkcs7(bytes: Uint8Array, blockSize: number): ToolResult<Uint8Array> {
  const count = bytes.at(-1) ?? 0
  if (!count || count > blockSize || count > bytes.length) return failure('crypto-failed', '解密失败：填充、密钥或模式参数不匹配。')
  for (let index = bytes.length - count; index < bytes.length; index += 1) {
    if (bytes[index] !== count) return failure('crypto-failed', '解密失败：填充、密钥或模式参数不匹配。')
  }
  return success(bytes.slice(0, -count))
}
