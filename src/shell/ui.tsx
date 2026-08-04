import { useState, type ReactNode } from 'react'

export type StatusState = { kind: 'success' | 'error' | 'info'; message: string } | null

export function ToolHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="tool-header">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  )
}

export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-heading"><h3>{title}</h3>{aside}</div>
      {children}
    </section>
  )
}

export function TextAreaField({
  label,
  labelAside,
  value,
  onChange,
  placeholder,
  readOnly = false,
  rows = 7,
  hint,
}: {
  label: string
  labelAside?: ReactNode
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  rows?: number
  hint?: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-heading">
        <span className="field-label">{label}</span>
        {labelAside ? <span className="field-heading-aside" aria-hidden="true">{labelAside}</span> : null}
      </span>
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={rows}
        spellCheck={false}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function StatusMessage({ status }: { status: StatusState }) {
  return (
    <div className={`status ${status ? `status-${status.kind}` : ''}`} role="status" aria-live="polite">
      {status?.message ?? ''}
    </div>
  )
}

export function CopyButton({ value, label = '复制结果' }: { value: string; label?: string }) {
  const [status, setStatus] = useState<StatusState>(null)

  async function copy() {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setStatus({ kind: 'success', message: '已复制到剪贴板。' })
    } catch {
      setStatus({ kind: 'error', message: '无法访问剪贴板，请手动复制结果。' })
    }
  }

  return (
    <>
      <button className="button button-secondary" type="button" onClick={copy} disabled={!value}>{label}</button>
      <StatusMessage status={status} />
    </>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="segmented">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? 'selected' : ''}>
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
