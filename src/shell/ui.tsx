import { useId, useState, type ReactNode } from 'react'
import { runPrimaryActionShortcut } from '../shared/keyboard'

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
  onPrimaryAction,
  primaryActionDisabled = false,
}: {
  label: string
  labelAside?: ReactNode
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  rows?: number
  hint?: ReactNode
  onPrimaryAction?: () => void
  primaryActionDisabled?: boolean
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
        onKeyDown={(event) => runPrimaryActionShortcut(event, 'ctrl-enter', onPrimaryAction, primaryActionDisabled)}
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

export function CopyIcon({ className = 'field-copy-icon' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" />
      <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5" />
    </svg>
  )
}

export function DeleteIcon({ className = 'field-delete-icon' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M4.5 6h11" />
      <path d="M8 3.5h4l1 2.5H7l1-2.5Z" />
      <path d="M6.5 6 7 16.5h6L13.5 6" />
      <path d="M9 8.5v5.5M11 8.5v5.5" />
    </svg>
  )
}

export function FieldIconButton({
  kind,
  label,
  disabled = false,
  onClick,
  className = '',
  iconClassName,
}: {
  kind: 'copy' | 'delete'
  label: string
  disabled?: boolean
  onClick: () => void
  className?: string
  iconClassName?: string
}) {
  const classes = ['field-heading-icon-button', `field-${kind}-button`, className].filter(Boolean).join(' ')
  return (
    <button className={classes} type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {kind === 'copy'
        ? <CopyIcon className={iconClassName} />
        : <DeleteIcon className={iconClassName} />}
    </button>
  )
}

export function CompactOutputRow({ label, outputLabel, copyLabel, copyTitle = `${copyLabel}摘要`, value, emptyText = '等待计算', onCopy, shaCompatibility = false }: {
  label: string
  outputLabel: string
  copyLabel: string
  copyTitle?: string
  value: string
  emptyText?: string
  onCopy: () => void
  shaCompatibility?: boolean
}) {
  const compatible = (className: string) => shaCompatibility ? ` ${className}` : ''
  return (
    <div className={`digest-row${compatible('sha-digest-row')}`}>
      <span className={`digest-variant-label${compatible('sha-variant-label')}`}>{label}</span>
      <div className={`digest-field${compatible('sha-digest-field')}`}>
        <output
          className={`code-output digest-output${compatible('sha-digest-output')}`}
          aria-label={outputLabel}
          tabIndex={shaCompatibility && value ? 0 : undefined}
        >{value || emptyText}</output>
        <button className={`digest-copy-button${compatible('sha-copy-button')}`} type={'button'} aria-label={copyLabel} title={copyTitle} disabled={!value} onClick={onCopy}>
          <svg className={`digest-copy-icon${compatible('sha-copy-icon')}`} viewBox={'0 0 20 20'} aria-hidden={'true'} focusable={'false'}>
            <rect x={'6.5'} y={'6.5'} width={'9'} height={'10'} rx={'1.5'} />
            <path d={'M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5'} />
          </svg>
        </button>
      </div>
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
  disabled = false,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const groupName = useId()

  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? 'selected' : ''}>
            <input
              type="radio"
              name={groupName}
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
