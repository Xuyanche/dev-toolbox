import { useState } from 'react'
import { calculateMd5, calculateSha, SHA_ALGORITHMS, type DigestVariants, type ShaDigestBatch } from './hash'
import { Panel, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'

function DigestResultRow({
  label,
  outputLabel,
  copyLabel,
  value,
  onCopy,
  shaCompatibility = false,
}: {
  label: string
  outputLabel: string
  copyLabel: string
  value: string
  onCopy: () => void
  shaCompatibility?: boolean
}) {
  const compatibilityClass = (className: string) => shaCompatibility ? ` ${className}` : ''

  return (
    <div className={`digest-row${compatibilityClass('sha-digest-row')}`}>
      <span className={`digest-variant-label${compatibilityClass('sha-variant-label')}`}>{label}</span>
      <div className={`digest-field${compatibilityClass('sha-digest-field')}`}>
        <output
          className={`code-output digest-output${compatibilityClass('sha-digest-output')}`}
          aria-label={outputLabel}
        >
          {value || '等待计算'}
        </output>
        <button
          className={`digest-copy-button${compatibilityClass('sha-copy-button')}`}
          type="button"
          aria-label={copyLabel}
          title={`${copyLabel}摘要`}
          disabled={!value}
          onClick={onCopy}
        >
          <svg
            className={`digest-copy-icon${compatibilityClass('sha-copy-icon')}`}
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" />
            <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

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
                <DigestResultRow
                  label="小写摘要"
                  outputLabel={`${entry.label} 小写摘要`}
                  copyLabel={`复制 ${entry.label} 小写`}
                  value={variants?.lower ?? ''}
                  onCopy={() => copyDigest(variants?.lower ?? '', `${entry.label} 小写摘要`, setShaCopyStatus)}
                  shaCompatibility
                />
                <DigestResultRow
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
          <div className="digest-copy-feedback sha-copy-feedback"><StatusMessage status={shaCopyStatus} /></div>
        </div>
      ) : (
        <div className="md5-result-group">
          <Panel title="MD5 摘要">
            <DigestResultRow
              label="小写摘要"
              outputLabel="MD5 小写摘要"
              copyLabel="复制 MD5 小写"
              value={md5Result?.lower ?? ''}
              onCopy={() => copyDigest(md5Result?.lower ?? '', 'MD5 小写摘要', setMd5CopyStatus)}
            />
            <DigestResultRow
              label="大写摘要"
              outputLabel="MD5 大写摘要"
              copyLabel="复制 MD5 大写"
              value={md5Result?.upper ?? ''}
              onCopy={() => copyDigest(md5Result?.upper ?? '', 'MD5 大写摘要', setMd5CopyStatus)}
            />
          </Panel>
          <div className="digest-copy-feedback md5-copy-feedback"><StatusMessage status={md5CopyStatus} /></div>
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
