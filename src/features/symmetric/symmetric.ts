import { failure, success, type ToolResult } from '../../shared/result'
import { runAdapter } from './adapters'
import { getModeCapability, SYMMETRIC_CAPABILITIES, type CipherMode, type PaddingMode, type SymmetricAlgorithm } from './capabilities'
import { addPkcs7, removePkcs7 } from './padding'

export interface SymmetricCommand {
  operation: 'encrypt' | 'decrypt'
  algorithm: SymmetricAlgorithm
  mode: CipherMode
  padding: PaddingMode
  input: Uint8Array
  key: Uint8Array
  parameter?: Uint8Array
}

export function validateSymmetricCommand(command: SymmetricCommand): ToolResult<SymmetricCommand> {
  const capability = SYMMETRIC_CAPABILITIES[command.algorithm]
  const mode = getModeCapability(command.algorithm, command.mode)
  if (!capability.keyBytes.includes(command.key.length)) {
    return failure('invalid-input', `${command.algorithm} 密钥长度必须为 ${capability.keyBytes.join('、')} 字节。`)
  }
  if (!mode) return failure('invalid-input', `${command.algorithm} 不支持 ${command.mode} 模式。`)
  if (!mode.paddings.includes(command.padding)) return failure('invalid-input', `${command.mode} 模式不支持当前填充方式。`)
  if (mode.parameterBytes !== null && command.parameter?.length !== mode.parameterBytes) {
    return failure('invalid-input', `${mode.parameter} 必须为 ${mode.parameterBytes} 字节。`)
  }
  if (mode.parameterBytes === null && command.parameter?.length) return failure('invalid-input', `${command.mode} 模式不使用 IV。`)
  const blockMode = command.mode === 'CBC' || command.mode === 'ECB'
  const needsAlignedInput = blockMode && (command.operation === 'decrypt' || command.padding === 'none')
  if (needsAlignedInput && command.input.length % capability.blockBytes !== 0) {
    return failure('invalid-input', `${command.mode} 无填充数据长度必须是 ${capability.blockBytes} 字节的整数倍。`)
  }
  if (command.algorithm === 'AES' && command.mode === 'GCM' && command.operation === 'decrypt' && command.input.length < 16) {
    return failure('invalid-input', 'AES-GCM 密文必须包含 16 字节认证标签。')
  }
  return success(command)
}

export async function executeSymmetric(command: SymmetricCommand): Promise<ToolResult<Uint8Array>> {
  const validated = validateSymmetricCommand(command)
  if (!validated.ok) return validated
  const blockSize = SYMMETRIC_CAPABILITIES[command.algorithm].blockBytes
  const adapterInput = command.operation === 'encrypt' && command.padding === 'pkcs7'
    ? addPkcs7(command.input, blockSize)
    : command.input
  try {
    const output = await runAdapter(command.algorithm, command.operation, command.mode, adapterInput, command.key, command.parameter)
    if (command.operation === 'decrypt' && command.padding === 'pkcs7') return removePkcs7(output, blockSize)
    return success(output)
  } catch {
    return failure('crypto-failed', '密码操作失败，请检查密钥、模式、填充、密文和模式参数。')
  }
}
