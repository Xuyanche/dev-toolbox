declare module 'sm-crypto/src/sm4/index.js' {
  type Sm4Input = string | number[] | Uint8Array
  interface Sm4Options {
    padding?: 'pkcs#5' | 'pkcs#7' | 'none'
    mode?: 'cbc'
    iv?: string | number[] | Uint8Array
    output?: 'string' | 'array'
  }
  const sm4: {
    encrypt(input: Sm4Input, key: string | number[] | Uint8Array, options?: Sm4Options & { output?: 'string' }): string
    encrypt(input: Sm4Input, key: string | number[] | Uint8Array, options: Sm4Options & { output: 'array' }): number[]
    decrypt(input: Sm4Input, key: string | number[] | Uint8Array, options?: Sm4Options & { output?: 'string' }): string
    decrypt(input: Sm4Input, key: string | number[] | Uint8Array, options: Sm4Options & { output: 'array' }): number[]
  }
  export default sm4
}
