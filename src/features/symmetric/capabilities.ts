export type SymmetricAlgorithm = 'AES' | 'DES' | 'SM4'
export type CipherMode = 'CBC' | 'CTR' | 'GCM' | 'ECB'
export type PaddingMode = 'pkcs7' | 'none'

export interface ModeCapability {
  mode: CipherMode
  paddings: readonly PaddingMode[]
  parameter: 'IV' | 'counter' | 'nonce' | null
  parameterBytes: number | null
}

export interface AlgorithmCapability {
  keyBytes: readonly number[]
  blockBytes: number
  defaultMode: CipherMode
  modes: readonly ModeCapability[]
}

export const SYMMETRIC_CAPABILITIES: Record<SymmetricAlgorithm, AlgorithmCapability> = {
  AES: {
    keyBytes: [16, 24, 32], blockBytes: 16, defaultMode: 'CBC',
    modes: [
      { mode: 'ECB', paddings: ['pkcs7', 'none'], parameter: null, parameterBytes: null },
      { mode: 'CBC', paddings: ['pkcs7', 'none'], parameter: 'IV', parameterBytes: 16 },
      { mode: 'CTR', paddings: ['none'], parameter: 'counter', parameterBytes: 16 },
      { mode: 'GCM', paddings: ['none'], parameter: 'nonce', parameterBytes: 12 },
    ],
  },
  DES: {
    keyBytes: [8], blockBytes: 8, defaultMode: 'ECB',
    modes: [
      { mode: 'ECB', paddings: ['pkcs7', 'none'], parameter: null, parameterBytes: null },
      { mode: 'CBC', paddings: ['pkcs7', 'none'], parameter: 'IV', parameterBytes: 8 },
    ],
  },
  SM4: {
    keyBytes: [16], blockBytes: 16, defaultMode: 'ECB',
    modes: [
      { mode: 'ECB', paddings: ['pkcs7', 'none'], parameter: null, parameterBytes: null },
      { mode: 'CBC', paddings: ['pkcs7', 'none'], parameter: 'IV', parameterBytes: 16 },
    ],
  },
}

export const getModeCapability = (algorithm: SymmetricAlgorithm, mode: CipherMode) =>
  SYMMETRIC_CAPABILITIES[algorithm].modes.find((entry) => entry.mode === mode)
