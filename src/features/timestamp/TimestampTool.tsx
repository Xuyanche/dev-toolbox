import { useEffect, useState } from 'react'
import { CompactOutputRow, CopyButton, Panel, Segmented, StatusMessage, ToolHeader, type StatusState } from '../../shell/ui'
import { runPrimaryActionShortcut } from '../../shared/keyboard'
import {
  formatIsoDate,
  formatTimestamp,
  parseCustomDate,
  parseIsoDate,
  type DateFormatMode,
  type TimeUnit,
  type TimeZoneMode,
} from './timestamp'

type TimestampLineFieldProps = {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  hint?: string
  onPrimaryAction?: () => void
}

function TimestampLineField({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  hint,
  onPrimaryAction,
}: TimestampLineFieldProps) {
  return (
    <label className="field timestamp-line-field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        aria-label={label}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        onKeyDown={(event) => runPrimaryActionShortcut(event, 'enter', onPrimaryAction)}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function TimestampTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [direction, setDirection] = useState<'timestamp-to-date' | 'date-to-timestamp'>('timestamp-to-date')
  const [unit, setUnit] = useState<TimeUnit>('milliseconds')
  const [zone, setZone] = useState<TimeZoneMode>('local')
  const [mode, setMode] = useState<DateFormatMode>('iso')
  const [format, setFormat] = useState('YYYY-MM-DD HH:mm:ss.SSS')
  const [offset, setOffset] = useState('')
  const [status, setStatus] = useState<StatusState>(null)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [currentTimeCopyStatus, setCurrentTimeCopyStatus] = useState<StatusState>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function run() {
    const result = direction === 'timestamp-to-date'
      ? formatTimestamp(input, unit, zone, mode, format)
      : mode === 'iso'
        ? parseIsoDate(input, zone, unit)
        : parseCustomDate(input, format, zone, unit)

    if (!result.ok) {
      setOutput('')
      setOffset('')
      setStatus({ kind: 'error', message: result.message })
      return
    }
    if (typeof result.value === 'string') {
      setOutput(result.value)
      setOffset('')
    } else {
      setOutput(result.value.text)
      setOffset(result.value.offset)
    }
    setStatus(result.warning
      ? { kind: 'info', message: result.warning }
      : { kind: 'success', message: '时间转换完成。' })
  }

  function swap() {
    setInput(output)
    setOutput(input)
    setDirection(direction === 'timestamp-to-date' ? 'date-to-timestamp' : 'timestamp-to-date')
    setOffset('')
    setStatus(null)
  }

  function clear() {
    setInput('')
    setOutput('')
    setOffset('')
    setStatus(null)
  }

  async function copyCurrentTime(value: string, label: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCurrentTimeCopyStatus({ kind: 'success', message: `${label}已复制到剪贴板。` })
    } catch {
      setCurrentTimeCopyStatus({ kind: 'error', message: `无法复制${label}，请手动复制。` })
    }
  }

  const inputLabel = direction === 'timestamp-to-date' ? 'Unix 时间戳' : mode === 'iso' ? 'ISO 8601 日期时间' : '日期文本'
  const placeholder = direction === 'timestamp-to-date'
    ? unit === 'milliseconds' ? '例如 1785857445123' : '例如 1785857445'
    : mode === 'iso' ? '例如 2026-08-04T15:30:45.123+08:00' : `例如按 ${format} 输入`
  const currentLocalIso = formatIsoDate(currentDate, 'local')
  const currentGmtIso = formatIsoDate(currentDate, 'utc')
  const currentTimestamp = String(currentDate.getTime())

  return (
    <div className="tool-page">
      <ToolHeader eyebrow="TIME / ISO 8601" title="时间戳转换" description="严格地在 Unix 时间戳、自定义日期格式和带时区的 ISO 8601 日期时间之间转换。" />
      <div className="settings-grid">
        <Segmented label="转换方向" value={direction} onChange={setDirection} options={[{ value: 'timestamp-to-date', label: '时间戳 → 日期' }, { value: 'date-to-timestamp', label: '日期 → 时间戳' }]} />
        <Segmented label="时间戳单位" value={unit} onChange={setUnit} options={[{ value: 'milliseconds', label: '毫秒' }, { value: 'seconds', label: '秒' }]} />
        <Segmented label="默认时区" value={zone} onChange={setZone} options={[{ value: 'local', label: '浏览器本地' }, { value: 'utc', label: 'UTC' }]} />
        <Segmented label="日期模式" value={mode} onChange={setMode} options={[{ value: 'iso', label: 'ISO 8601' }, { value: 'custom', label: '自定义格式' }]} />
      </div>

      {mode === 'custom' ? (
        <label className="field compact-field">
          <span className="field-label">自定义格式</span>
          <input value={format} onChange={(event) => setFormat(event.target.value)} spellCheck={false} />
          <span className="field-hint">支持：YYYY MM DD HH mm ss SSS，以及普通分隔符</span>
        </label>
      ) : (
        <div className="notice notice-info"><strong>ISO 8601</strong><span>支持日期、完整时间、三位毫秒、Z、±HH:mm；显式偏移优先于默认时区。</span></div>
      )}

      <div className="two-column timestamp-conversion-grid">
        <Panel title="输入">
          <TimestampLineField label={inputLabel} value={input} onChange={setInput} placeholder={placeholder} onPrimaryAction={run} />
        </Panel>
        <Panel title="输出">
          <TimestampLineField label={direction === 'timestamp-to-date' ? '日期时间' : 'Unix 时间戳'} value={output} readOnly placeholder="转换结果" hint={offset ? `解析/显示偏移：${offset}` : undefined} />
        </Panel>
      </div>
      <div className="action-row">
        <button className="button button-primary" type="button" onClick={run}>开始转换</button>
        <button className="button button-secondary" type="button" onClick={swap} disabled={!output}>交换</button>
        <CopyButton value={output} />
        <button className="button button-ghost" type="button" onClick={clear}>清空</button>
      </div>
      <StatusMessage status={status} />
      <div className="current-time-group">
        <Panel title="当前时间对照">
          <CompactOutputRow
            label="ISO 格式当前时间（本地）"
            outputLabel="ISO 格式当前时间（本地）"
            copyLabel="复制 ISO 格式当前时间（本地）"
            copyTitle="复制 ISO 格式当前时间（本地）"
            value={currentLocalIso}
            onCopy={() => copyCurrentTime(currentLocalIso, 'ISO 格式当前时间（本地）')}
          />
          <CompactOutputRow
            label="ISO 格式当前时间（GMT）"
            outputLabel="ISO 格式当前时间（GMT）"
            copyLabel="复制 ISO 格式当前时间（GMT）"
            copyTitle="复制 ISO 格式当前时间（GMT）"
            value={currentGmtIso}
            onCopy={() => copyCurrentTime(currentGmtIso, 'ISO 格式当前时间（GMT）')}
          />
          <CompactOutputRow
            label="时间戳"
            outputLabel="当前 Unix 毫秒时间戳"
            copyLabel="复制当前 Unix 毫秒时间戳"
            copyTitle="复制当前 Unix 毫秒时间戳"
            value={currentTimestamp}
            onCopy={() => copyCurrentTime(currentTimestamp, '当前 Unix 毫秒时间戳')}
          />
        </Panel>
        <div className="digest-copy-feedback current-time-copy-feedback"><StatusMessage status={currentTimeCopyStatus} /></div>
      </div>
    </div>
  )
}
