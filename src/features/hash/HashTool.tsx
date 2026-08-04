import { useState } from 'react'
import { calculateMd5, calculateSha1, type DigestVariants } from './hash'
import { CopyButton, Panel, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'

export function HashTool({ algorithm }: { algorithm: 'MD5' | 'SHA-1' }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<DigestVariants | null>(null)
  const [status, setStatus] = useState<StatusState>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const next = algorithm === 'MD5' ? calculateMd5(input) : await calculateSha1(input)
    setBusy(false)
    if (next.ok) {
      setResult(next.value)
      setStatus({ kind: 'success', message: `${algorithm} 摘要计算完成。` })
    } else {
      setResult(null)
      setStatus({ kind: 'error', message: next.message })
    }
  }

  function clear() {
    setInput('')
    setResult(null)
    setStatus(null)
  }

  return (
    <div className="tool-page">
      <ToolHeader eyebrow="MESSAGE DIGEST" title={`${algorithm} 摘要`} description="输入按 UTF-8 编码，同时展示大写与小写十六进制结果。" />
      <div className="notice notice-warning"><strong>安全提示</strong><span>{algorithm} 已不适合密码存储、数字签名或要求抗碰撞性的安全场景。</span></div>
      <Panel title="原始文本">
        <TextAreaField label="待摘要文本" value={input} onChange={setInput} placeholder="空文本也是有效输入" />
      </Panel>
      <div className="result-stack">
        <Panel title="小写摘要" aside={<CopyButton value={result?.lower ?? ''} label="复制小写" />}>
          <output className="code-output">{result?.lower || '等待计算'}</output>
        </Panel>
        <Panel title="大写摘要" aside={<CopyButton value={result?.upper ?? ''} label="复制大写" />}>
          <output className="code-output">{result?.upper || '等待计算'}</output>
        </Panel>
      </div>
      <div className="action-row">
        <button className="button button-primary" type="button" onClick={run} disabled={busy}>{busy ? '计算中…' : `计算 ${algorithm}`}</button>
        <button className="button button-ghost" type="button" onClick={clear}>清空</button>
      </div>
      <StatusMessage status={status} />
    </div>
  )
}
