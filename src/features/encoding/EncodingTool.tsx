import { useState } from 'react'
import { decodeBase64, decodeUnicode, decodeUrl, encodeBase64, encodeUnicode, encodeUrl, type UrlMode } from './encoding'
import { CopyButton, Panel, Segmented, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'

type EncodingKind = 'base64' | 'unicode' | 'url'

const toolCopy: Record<EncodingKind, { title: string; description: string; placeholder: string }> = {
  base64: { title: 'Base64 编解码', description: '以 UTF-8 字节进行标准 Base64 双向转换。', placeholder: '输入文本或 Base64…' },
  unicode: { title: 'Unicode 编解码', description: '在普通文本与 JavaScript/JSON 兼容的 \\uXXXX 转义序列之间转换。', placeholder: '输入文本或 \\uXXXX 转义序列…' },
  url: { title: 'URL 编解码', description: '分别处理完整 URL 与 URL 组件的百分号编码。', placeholder: '输入 URL 或需要编码的文本…' },
}

export function EncodingTool({ kind }: { kind: EncodingKind }) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')
  const [urlMode, setUrlMode] = useState<UrlMode>('component')
  const [status, setStatus] = useState<StatusState>(null)

  function run() {
    const result = kind === 'base64'
      ? direction === 'encode' ? encodeBase64(input) : decodeBase64(input)
      : kind === 'unicode'
        ? direction === 'encode' ? encodeUnicode(input) : decodeUnicode(input)
        : direction === 'encode' ? encodeUrl(input, urlMode) : decodeUrl(input, urlMode)
    if (result.ok) {
      setOutput(result.value)
      setStatus({ kind: 'success', message: direction === 'encode' ? '编码完成。' : '解码完成。' })
    } else {
      setOutput('')
      setStatus({ kind: 'error', message: result.message })
    }
  }

  function clear() {
    setInput('')
    setOutput('')
    setStatus(null)
  }

  function swap() {
    setInput(output)
    setOutput(input)
    setDirection(direction === 'encode' ? 'decode' : 'encode')
    setStatus(null)
  }

  return (
    <div className="tool-page">
      <ToolHeader
        eyebrow="ENCODE / DECODE"
        title={toolCopy[kind].title}
        description={toolCopy[kind].description}
      />
      <div className="settings-row">
        <Segmented label="操作" value={direction} onChange={setDirection} options={[{ value: 'encode', label: '编码' }, { value: 'decode', label: '解码' }]} />
        {kind === 'url' ? <Segmented label="URL 模式" value={urlMode} onChange={setUrlMode} options={[{ value: 'component', label: 'URL 组件' }, { value: 'complete', label: '完整 URL' }]} /> : null}
      </div>
      <div className="two-column">
        <Panel title="输入">
          <TextAreaField label="待处理文本" value={input} onChange={setInput} placeholder={toolCopy[kind].placeholder} />
        </Panel>
        <Panel title="输出">
          <TextAreaField label="转换结果" value={output} readOnly placeholder="结果会显示在这里" />
        </Panel>
      </div>
      <div className="action-row">
        <button className="button button-primary" type="button" onClick={run}>{direction === 'encode' ? '开始编码' : '开始解码'}</button>
        <button className="button button-secondary" type="button" onClick={swap} disabled={!output}>交换</button>
        <CopyButton value={output} />
        <button className="button button-ghost" type="button" onClick={clear}>清空</button>
      </div>
      <StatusMessage status={status} />
    </div>
  )
}
