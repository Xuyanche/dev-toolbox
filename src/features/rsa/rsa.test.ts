import {
  decryptRsa,
  encryptRsa,
  generateRsaKeyPair,
  RSA_PLAINTEXT_LIMIT,
  signRsa,
  verifyRsa,
} from './rsa'

describe('RSA operations', () => {
  it('generates PEM keys, encrypts, decrypts, signs and verifies', async () => {
    const generated = await generateRsaKeyPair()
    expect(generated.ok).toBe(true)
    if (!generated.ok) return
    expect(generated.value.publicKey).toContain('BEGIN PUBLIC KEY')
    expect(generated.value.privateKey).toContain('BEGIN PRIVATE KEY')

    const encrypted = await encryptRsa('你好 RSA', generated.value.publicKey)
    expect(encrypted.ok).toBe(true)
    if (!encrypted.ok) return
    await expect(decryptRsa(encrypted.value, generated.value.privateKey))
      .resolves.toEqual({ ok: true, value: '你好 RSA' })

    const signed = await signRsa('message', generated.value.privateKey)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return
    await expect(verifyRsa('message', signed.value, generated.value.publicKey))
      .resolves.toEqual({ ok: true, value: true })
    await expect(verifyRsa('modified', signed.value, generated.value.publicKey))
      .resolves.toEqual({ ok: true, value: false })
  }, 20_000)

  it('rejects oversized plaintext and invalid keys', async () => {
    await expect(encryptRsa('a'.repeat(RSA_PLAINTEXT_LIMIT + 1), 'unused'))
      .resolves.toMatchObject({ ok: false, code: 'too-long' })
    await expect(encryptRsa('short', 'not a key'))
      .resolves.toMatchObject({ ok: false, code: 'invalid-input' })
  })
})
