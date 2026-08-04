import { useState } from 'react'
import { calculateMd5, calculateSha, SHA_ALGORITHMS, type DigestVariants, type ShaDigestBatch } from './hash'
import { CopyButton, Panel, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'

export function HashTool({ algorithm }: { algorithm: 'MD5' | 'SHA' }) {
  const [input, setInput] = useState('')
  const [md5Result, setMd5Result] = useState<DigestVariants | null>(null)
  const [shaResult, setShaResult] = useState<ShaDigestBatch | null>(null)
  const [shaCopyStatus, setShaCopyStatus] = useState<StatusState>(null)
  const [status, setStatus] = useState<StatusState>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setStatus(null)
    if (algorithm === 'SHA') setShaCopyStatus(null)
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
    setShaCopyStatus(null)
    setStatus(null)
  }

  async function copyShaDigest(value: string, label: string) {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setShaCopyStatus({ kind: 'success', message: `${label}已复制到剪贴板。` })
    } catch {
      setShaCopyStatus({ kind: 'error', message: `无法复制 ${label}，请手动复制摘要。` })
    }
  }

  const isSha = algorithm === 'SHA'

  return (
    <div className={`tool-page hash-tool ${isSha ? 'sha-tool' : 'md5-tool'}`}>
      <ToolHeader
        eyebrow="MESSAGE DIGEST"
        title={`${algorithm} 摘要`}
        description={isSha
          ? '输入按 UTF-8 编码，一次计算 SHA-1、SHA-256、SHA-384 和 SHA-512 的大小写十六进制结果。'
          : '输入按 UTF-8 编码，同时展示大写与小写十六进制结果。'}
      />
      <div className="notice notice-warning">
        <strong>安全提示</strong>
        <span>{isSha
          ? 'SHA-1 已不适合需要抗碰撞性的安全用途；SHA-256、SHA-384 和 SHA-512 也不应直接用于密码存储。'
          : 'MD5 已不适合密码存储、数字签名或要求抗碰撞性的安全场景。'}</span>
      </div>
      <Panel title="原始文本">
        <TextAreaField label="待摘要文本" value={input} onChange={setInput} placeholder="空文本也是有效输入" />
      </Panel>

      {isSha ? (
        <div className="sha-result-grid" data-layout="single-column">
          {SHA_ALGORITHMS.map((entry) => {
            const variants = shaResult?.[entry.id]
            return (
              <Panel title={entry.label} key={entry.id}>
                <div className="sha-digest-row">
                  <span className="sha-variant-label">小写摘要</span>
                  <div className="sha-digest-field">
                    <output className="code-output sha-digest-output" aria-label={`${entry.label} 小写摘要`}>
                      {variants?.lower || '等待计算'}
                    </output>
                    <button
                      className="sha-copy-button"
                      type="button"
                      aria-label={`复制 ${entry.label} 小写`}
                      title={`复制 ${entry.label} 小写摘要`}
                      disabled={!variants?.lower}
                      onClick={() => copyShaDigest(variants?.lower ?? '', `${entry.label} 小写摘要`)}
                    >
                      <svg className="sha-copy-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" />
                        <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="sha-digest-row">
                  <span className="sha-variant-label">大写摘要</span>
                  <div className="sha-digest-field">
                    <output className="code-output sha-digest-output" aria-label={`${entry.label} 大写摘要`}>
                      {variants?.upper || '等待计算'}
                    </output>
                    <button
                      className="sha-copy-button"
                      type="button"
                      aria-label={`复制 ${entry.label} 大写`}
                      title={`复制 ${entry.label} 大写摘要`}
                      disabled={!variants?.upper}
                      onClick={() => copyShaDigest(variants?.upper ?? '', `${entry.label} 大写摘要`)}
                    >
                      <svg className="sha-copy-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" />
                        <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Panel>
            )
          })}
          <div className="sha-copy-feedback"><StatusMessage status={shaCopyStatus} /></div>
        </div>
      ) : (
        <div className="result-stack">
          <Panel title="小写摘要" aside={<CopyButton value={md5Result?.lower ?? ''} label="复制小写" />}>
            <output className="code-output">{md5Result?.lower || '等待计算'}</output>
          </Panel>
          <Panel title="大写摘要" aside={<CopyButton value={md5Result?.upper ?? ''} label="复制大写" />}>
            <output className="code-output">{md5Result?.upper || '等待计算'}</output>
          </Panel>
        </div>
      )}

      <div className="action-row">
        <button className="button button-primary" type="button" onClick={run} disabled={busy}>{busy ? '计算中…' : `计算 ${algorithm}`}</button>
        <button className="button button-ghost" type="button" onClick={clear}>清空</button>
      </div>
      <StatusMessage status={status} />
    </div>
  )
}
