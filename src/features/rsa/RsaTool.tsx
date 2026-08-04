import { useState } from 'react'
import { utf8Bytes } from '../../shared/bytes'
import { CopyButton, Panel, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'
import { decryptRsa, encryptRsa, generateRsaKeyPair, RSA_PLAINTEXT_LIMIT, signRsa, verifyRsa } from './rsa'

export function RsaTool() {
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [plainText, setPlainText] = useState('')
  const [cipherText, setCipherText] = useState('')
  const [signText, setSignText] = useState('')
  const [signature, setSignature] = useState('')
  const [status, setStatus] = useState<StatusState>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const byteLength = utf8Bytes(plainText).byteLength

  async function execute(label: string, operation: () => Promise<ReturnTypeResult>, onSuccess: (value: string | boolean) => void) {
    setBusy(label)
    const result = await operation()
    setBusy(null)
    if (result.ok) {
      onSuccess(result.value)
      setStatus({ kind: 'success', message: `${label}完成。` })
    } else {
      setStatus({ kind: 'error', message: result.message })
    }
  }

  async function generate() {
    setBusy('密钥生成')
    const result = await generateRsaKeyPair()
    setBusy(null)
    if (result.ok) {
      setPublicKey(result.value.publicKey)
      setPrivateKey(result.value.privateKey)
      setStatus({ kind: 'success', message: '已在浏览器本地生成 2048 位 RSA 密钥对。' })
    } else setStatus({ kind: 'error', message: result.message })
  }

  async function verify() {
    setBusy('验签')
    const result = await verifyRsa(signText, signature, publicKey)
    setBusy(null)
    if (!result.ok) setStatus({ kind: 'error', message: result.message })
    else setStatus({ kind: result.value ? 'success' : 'error', message: result.value ? '验签成功：消息和签名匹配。' : '验签失败：消息或签名已改变。' })
  }

  function clear() {
    setPublicKey('')
    setPrivateKey('')
    setPlainText('')
    setCipherText('')
    setSignText('')
    setSignature('')
    setStatus(null)
  }

  return (
    <div className="tool-page">
      <ToolHeader eyebrow="RSA · WEB CRYPTO" title="RSA 密码工具" description="使用 RSA-OAEP/SHA-256 加解密，并使用 RSA-PSS/SHA-256 签名验签。" />
      <div className="notice notice-warning">
        <strong>仅限开发用途</strong>
        <span>私钥会以明文显示但不会持久化；请勿把此页面当作安全密钥库。RSA 只适合短文本。</span>
      </div>

      <Panel title="01 · 密钥材料" aside={<button className="button button-primary" type="button" onClick={generate} disabled={busy !== null}>{busy === '密钥生成' ? '生成中…' : '生成 2048 位密钥'}</button>}>
        <div className="two-column">
          <div>
            <TextAreaField label="SPKI 公钥 PEM" value={publicKey} onChange={setPublicKey} rows={9} placeholder="-----BEGIN PUBLIC KEY-----" />
            <CopyButton value={publicKey} label="复制公钥" />
          </div>
          <div>
            <TextAreaField label="PKCS#8 私钥 PEM" value={privateKey} onChange={setPrivateKey} rows={9} placeholder="-----BEGIN PRIVATE KEY-----" />
            <CopyButton value={privateKey} label="复制私钥" />
          </div>
        </div>
      </Panel>

      <Panel title="02 · 公钥加密 / 私钥解密">
        <div className="two-column">
          <TextAreaField
            label="明文"
            value={plainText}
            onChange={setPlainText}
            placeholder="输入 UTF-8 短文本"
            labelAside={<span className={byteLength > RSA_PLAINTEXT_LIMIT ? 'danger-text' : ''}>{byteLength} / {RSA_PLAINTEXT_LIMIT} 字节</span>}
          />
          <TextAreaField label="Base64 密文" value={cipherText} onChange={setCipherText} placeholder="加密结果或待解密密文" />
        </div>
        <div className="action-row">
          <button className="button button-primary" type="button" disabled={busy !== null || !publicKey || byteLength > RSA_PLAINTEXT_LIMIT} onClick={() => execute('加密', () => encryptRsa(plainText, publicKey), (value) => setCipherText(String(value)))}>公钥加密</button>
          <button className="button button-secondary" type="button" disabled={busy !== null || !privateKey || !cipherText} onClick={() => execute('解密', () => decryptRsa(cipherText, privateKey), (value) => setPlainText(String(value)))}>私钥解密</button>
          <CopyButton value={cipherText} label="复制密文" />
        </div>
      </Panel>

      <Panel title="03 · 私钥签名 / 公钥验签">
        <div className="two-column">
          <TextAreaField label="消息" value={signText} onChange={setSignText} placeholder="输入需要签名或验签的消息" />
          <TextAreaField label="Base64 签名" value={signature} onChange={setSignature} placeholder="签名结果或待验证签名" />
        </div>
        <div className="action-row">
          <button className="button button-primary" type="button" disabled={busy !== null || !privateKey} onClick={() => execute('签名', () => signRsa(signText, privateKey), (value) => setSignature(String(value)))}>私钥签名</button>
          <button className="button button-secondary" type="button" disabled={busy !== null || !publicKey || !signature} onClick={verify}>公钥验签</button>
          <CopyButton value={signature} label="复制签名" />
        </div>
      </Panel>

      <div className="action-row"><button className="button button-ghost" type="button" onClick={clear}>清空 RSA 工具</button></div>
      <StatusMessage status={status} />
    </div>
  )
}

type ReturnTypeResult =
  | { ok: true; value: string | boolean; warning?: string }
  | { ok: false; code: string; message: string }
