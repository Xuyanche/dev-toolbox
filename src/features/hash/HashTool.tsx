import { useState } from 'react'
import { calculateMd5, calculateSha, SHA_ALGORITHMS, type DigestVariants, type ShaDigestBatch } from './hash'
import { CompactOutputRow, Panel, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'

export function HashTool({ algorithm }: { algorithm: 'MD5' | 'SHA' }) {
  const [input, setInput] = useState('')
  const [md5Result, setMd5Result] = useState<DigestVariants | null>(null)
  const [shaResult, setShaResult] = useState<ShaDigestBatch | null>(null)
  const [md5CopyStatus, setMd5CopyStatus] = useState<StatusState>(null)
  const [shaCopyStatus, setShaCopyStatus] = useState<StatusState>(null)
  const [status, setStatus] = useState<StatusState>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setStatus(null)
    if (algorithm === 'MD5') setMd5CopyStatus(null)
    else setShaCopyStatus(null)
    const next = algorithm === 'MD5' ? calculateMd5(input) : await calculateSha(input)
    setBusy(false)
    if (next.ok) {
      if (algorithm === 'MD5') setMd5Result(next.value as DigestVariants)
      else setShaResult(next.value as ShaDigestBatch)
      setStatus({ kind: 'success', message: `${algorithm} 摘要计算完成。` })
    } else {
      if (algorithm === 'MD5') setMd5Result(null)
      else setShaResult(null)
      setStatus({ kind: 'error', message: next.message })
    }
  }

  function clear() {
    setInput('')
    setMd5Result(null)
    setShaResult(null)
    setMd5CopyStatus(null)
    setShaCopyStatus(null)
    setStatus(null)
  }

  async function copyDigest(value: string, label: string, setCopyStatus: (next: StatusState) => void) {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCopyStatus({ kind: 'success', message: `${label}已复制到剪贴板。` })
    } catch {
      setCopyStatus({ kind: 'error', message: `无法复制 ${label}，请手动复制摘要。` })
    }
  }

  const isSha = algorithm === 'SHA'
  const warning = (
    <div className="notice notice-warning">
      <strong>安全提示</strong>
      <span>{isSha
        ? 'SHA-1 已不适合需要抗碰撞性的安全用途；SHA-256、SHA-384 和 SHA-512 也不应直接用于密码存储。'
        : 'MD5 已不适合密码存储、数字签名或要求抗碰撞性的安全场景。'}</span>
    </div>
  )
  const inputPanel = (
    <Panel title="原始文本">
      <TextAreaField label="待摘要文本" value={input} onChange={setInput} placeholder="空文本也是有效输入" />
    </Panel>
  )
  const actions = (
    <div className="action-row">
      <button className="button button-primary" type="button" onClick={run} disabled={busy}>{busy ? '计算中…' : `计算 ${algorithm}`}</button>
      <button className="button button-ghost" type="button" onClick={clear}>清空</button>
    </div>
  )

  return (
    <div className={`tool-page hash-tool ${isSha ? 'sha-tool' : 'md5-tool'}`}>
      <ToolHeader
        eyebrow="MESSAGE DIGEST"
        title={`${algorithm} 摘要`}
        description={isSha
          ? '输入按 UTF-8 编码，一次计算 SHA-1、SHA-256、SHA-384 和 SHA-512 的大小写十六进制结果。'
          : '输入按 UTF-8 编码，同时展示大写与小写十六进制结果。'}
      />
      {isSha ? (
        <div className="sha-workspace">
          <div className="sha-control-column">
            {warning}
            <div className="sha-input-panel">{inputPanel}</div>
            {actions}
            <div className="sha-operation-feedback"><StatusMessage status={status} /></div>
          </div>
          <div className="sha-result-column">
            <div className="sha-result-grid" data-layout="single-column">
              {SHA_ALGORITHMS.map((entry) => {
                const variants = shaResult?.[entry.id]
                return (
                  <Panel title={entry.label} key={entry.id}>
                    <CompactOutputRow
                      label="小写摘要"
                      outputLabel={`${entry.label} 小写摘要`}
                      copyLabel={`复制 ${entry.label} 小写`}
                      value={variants?.lower ?? ''}
                      onCopy={() => copyDigest(variants?.lower ?? '', `${entry.label} 小写摘要`, setShaCopyStatus)}
                      shaCompatibility
                    />
                    <CompactOutputRow
                      label="大写摘要"
                      outputLabel={`${entry.label} 大写摘要`}
                      copyLabel={`复制 ${entry.label} 大写`}
                      value={variants?.upper ?? ''}
                      onCopy={() => copyDigest(variants?.upper ?? '', `${entry.label} 大写摘要`, setShaCopyStatus)}
                      shaCompatibility
                    />
                  </Panel>
                )
              })}
            </div>
            <div className="digest-copy-feedback sha-copy-feedback"><StatusMessage status={shaCopyStatus} /></div>
          </div>
        </div>
      ) : (
        <>
          {warning}
          {inputPanel}
          <div className="md5-result-group">
            <Panel title="MD5 摘要">
              <CompactOutputRow
                label="小写摘要"
                outputLabel="MD5 小写摘要"
                copyLabel="复制 MD5 小写"
                value={md5Result?.lower ?? ''}
                onCopy={() => copyDigest(md5Result?.lower ?? '', 'MD5 小写摘要', setMd5CopyStatus)}
              />
              <CompactOutputRow
                label="大写摘要"
                outputLabel="MD5 大写摘要"
                copyLabel="复制 MD5 大写"
                value={md5Result?.upper ?? ''}
                onCopy={() => copyDigest(md5Result?.upper ?? '', 'MD5 大写摘要', setMd5CopyStatus)}
              />
            </Panel>
            <div className="digest-copy-feedback md5-copy-feedback"><StatusMessage status={md5CopyStatus} /></div>
          </div>
          {actions}
          <StatusMessage status={status} />
        </>
      )}
    </div>
  )
}
