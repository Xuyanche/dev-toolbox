import { useState } from 'react'
import { CopyButton, Panel, Segmented, StatusMessage, ToolHeader, type StatusState } from '../../shell/ui'
import { DEFAULT_RANDOM_REQUEST, generateRandomNumbers, MAX_RANDOM_COUNT, type NumberKind } from './randomNumber'

export function RandomNumberGeneratorTool() {
  const [minimum, setMinimum] = useState(String(DEFAULT_RANDOM_REQUEST.minimum))
  const [maximum, setMaximum] = useState(String(DEFAULT_RANDOM_REQUEST.maximum))
  const [count, setCount] = useState(String(DEFAULT_RANDOM_REQUEST.count))
  const [kind, setKind] = useState<NumberKind>(DEFAULT_RANDOM_REQUEST.kind)
  const [unique, setUnique] = useState(DEFAULT_RANDOM_REQUEST.unique)
  const [values, setValues] = useState<number[]>([])
  const [status, setStatus] = useState<StatusState>(null)

  function generate() {
    const result = generateRandomNumbers({ minimum: Number(minimum), maximum: Number(maximum), count: Number(count), kind, unique })
    if (!result.ok) return setStatus({ kind: 'error', message: result.message })
    setValues(result.value)
    const numberLabel = kind === 'integer' ? '整数' : '浮点数'
    setStatus({ kind: 'success', message: `已生成 ${result.value.length} 个${unique ? '唯一' : ''}${numberLabel}。` })
  }

  function clearResults() {
    setValues([])
    setStatus(null)
  }

  const output = values.join('\n')
  return (
    <div className='tool-page'>
      <ToolHeader eyebrow='RANDOM / NUMBER' title='随机数生成器' description='设置范围、数量、数值类型与唯一性，使用浏览器安全随机源批量生成。' />
      <Panel title='生成设置'>
        <div className='settings-grid random-settings'>
          <label className='field'><span className='field-label'>最小值</span><input type='number' value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label>
          <label className='field'><span className='field-label'>最大值</span><input type='number' value={maximum} onChange={(event) => setMaximum(event.target.value)} /></label>
          <label className='field'><span className='field-label'>生成数量</span><input aria-label='生成数量' type='number' min='1' max={MAX_RANDOM_COUNT} value={count} onChange={(event) => setCount(event.target.value)} /><span className='field-hint'>单次最多 {MAX_RANDOM_COUNT.toLocaleString()} 个</span></label>
          <Segmented label='数值类型' value={kind} options={[{ value: 'integer', label: '整数' }, { value: 'float', label: '浮点数' }]} onChange={setKind} />
        </div>
        <label className='check-field'><input type='checkbox' checked={unique} onChange={(event) => setUnique(event.target.checked)} />结果唯一</label>
        <div className='action-row'><button className='button button-primary' type='button' onClick={generate}>生成随机数</button></div>
        <StatusMessage status={status} />
      </Panel>
      <Panel title='生成结果' aside={<div className='result-actions'><CopyButton value={output} label='复制全部结果' /><button className='button button-ghost' type='button' onClick={clearResults} disabled={!values.length}>清空结果</button></div>}>
        <output className='number-results' aria-label='随机数结果'>{values.map((value, index) => <span key={`${index}-${value}`}>{value}</span>)}</output>
      </Panel>
    </div>
  )
}
