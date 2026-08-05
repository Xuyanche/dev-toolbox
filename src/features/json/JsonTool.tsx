import { useMemo, useState } from 'react'
import { CopyIcon, FieldIconButton, Panel, StatusMessage, ToolHeader, type StatusState } from '../../shell/ui'
import {
  escapeJsonString,
  getJsonNodeCopyValue,
  getJsonType,
  parseJson,
  unescapeJsonString,
  type JsonValue,
  type ParsedJson,
} from './json'

type JsonOperation = 'format' | 'minify'
type StringOperation = 'escape' | 'unescape'

function getTypeLabel(value: JsonValue) {
  const labels = {
    array: '数组',
    object: '对象',
    string: '字符串',
    number: '数字',
    boolean: '布尔值',
    null: 'null',
  } as const
  return labels[getJsonType(value)]
}

function getChildren(value: JsonValue) {
  const type = getJsonType(value)
  if (type === 'array') {
    return (value as JsonValue[]).map((child, index) => ({ key: String(index), label: String(index), value: child }))
  }
  if (type === 'object') {
    return Object.entries(value as Record<string, JsonValue>).map(([key, child]) => ({ key, label: key, value: child }))
  }
  return []
}

function getExpandablePaths(value: JsonValue, path = 'root'): string[] {
  const type = getJsonType(value)
  if (type !== 'array' && type !== 'object') return []

  return [
    path,
    ...getChildren(value).flatMap((child) => getExpandablePaths(child.value, `${path}.${child.key}`)),
  ]
}

function getCollapsedSummary(value: JsonValue) {
  const type = getJsonType(value)
  if (type === 'array') return `Array[${(value as JsonValue[]).length}]`
  if (type === 'object') return `Object{${Object.keys(value as Record<string, JsonValue>).length}}`
  return ''
}

function getPrimitiveText(value: JsonValue) {
  return JSON.stringify(value)
}

function copyLabel(pathLabel: string, value: JsonValue) {
  return `复制 ${getTypeLabel(value)} 节点 ${pathLabel}`
}

function JsonCodeNode({
  name,
  value,
  path,
  depth,
  isLast,
  expanded,
  onToggle,
  onCopy,
}: {
  name: string
  value: JsonValue
  path: string
  depth: number
  isLast: boolean
  expanded: Set<string>
  onToggle: (path: string) => void
  onCopy: (path: string, value: JsonValue) => void
}) {
  const type = getJsonType(value)
  const expandable = type === 'object' || type === 'array'
  const isExpanded = expanded.has(path)
  const children = getChildren(value)
  const openToken = type === 'array' ? '[' : '{'
  const closeToken = type === 'array' ? ']' : '}'
  const suffix = isLast ? '' : ','
  const nodeCopyLabel = copyLabel(name, value)

  if (!expandable) {
    return (
      <li className="json-code-node">
        <div className="json-code-line" style={{ paddingLeft: `${depth * 22}px` }}>
          <span className="json-code-spacer" aria-hidden="true" />
          <button className="json-code-copy" type="button" aria-label={nodeCopyLabel} title={nodeCopyLabel} onClick={() => onCopy(path, value)}>
            <CopyIcon className="json-copy-icon" />
          </button>
          {name !== 'root' ? <><span className="json-code-key">"{name}"</span><span className="json-code-punctuation">: </span></> : null}
          <span className={`json-code-value json-code-value-${type}`}>{getPrimitiveText(value)}</span>
          <span className="json-code-punctuation">{suffix}</span>
        </div>
      </li>
    )
  }

  return (
    <li className="json-code-node">
      <div className="json-code-line" style={{ paddingLeft: `${depth * 22}px` }}>
        <button
          className="json-code-toggle"
          type="button"
          aria-label={`${isExpanded ? '折叠' : '展开'} ${name}`}
          aria-expanded={isExpanded}
          onClick={() => onToggle(path)}
        >
          {isExpanded ? '-' : '+'}
        </button>
        <button className="json-code-copy" type="button" aria-label={nodeCopyLabel} title={nodeCopyLabel} onClick={() => onCopy(path, value)}>
          <CopyIcon className="json-copy-icon" />
        </button>
        {name !== 'root' ? <><span className="json-code-key">"{name}"</span><span className="json-code-punctuation">: </span></> : null}
        <span className="json-code-punctuation">{openToken}</span>
        {!isExpanded ? <span className="json-code-summary">{getCollapsedSummary(value)}</span> : null}
        <span className="json-code-punctuation">{isExpanded ? '' : closeToken}{!isExpanded ? suffix : ''}</span>
      </div>
      {isExpanded ? (
        <>
          <ol className="json-code-children">
            {children.map((child, index) => (
              <JsonCodeNode
                key={`${path}.${child.key}`}
                name={child.label}
                value={child.value}
                path={`${path}.${child.key}`}
                depth={depth + 1}
                isLast={index === children.length - 1}
                expanded={expanded}
                onToggle={onToggle}
                onCopy={onCopy}
              />
            ))}
          </ol>
          <div className="json-code-line" style={{ paddingLeft: `${depth * 22}px` }}>
            <span className="json-code-spacer" aria-hidden="true" />
            <span className="json-code-punctuation">{closeToken}{suffix}</span>
          </div>
        </>
      ) : null}
    </li>
  )
}

export function JsonTool() {
  const [jsonInput, setJsonInput] = useState('')
  const [parsed, setParsed] = useState<ParsedJson | null>(null)
  const [status, setStatus] = useState<StatusState>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))
  const expandablePaths = useMemo(() => (parsed ? getExpandablePaths(parsed.value) : []), [parsed])
  const allTreeNodesCollapsed = expandablePaths.length > 0 && expandablePaths.every((path) => !expanded.has(path))

  function resetTree() {
    setParsed(null)
    setExpanded(new Set(['root']))
  }

  function updateInput(value: string) {
    setJsonInput(value)
    resetTree()
    setStatus(null)
  }

  function runJsonOperation(operation: JsonOperation) {
    resetTree()
    setStatus(null)
    const result = parseJson(jsonInput)
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.message })
      return
    }
    setParsed(result.value)
    setJsonInput(operation === 'format' ? result.value.formatted : result.value.minified)
    setExpanded(new Set(['root']))
    setStatus({
      kind: 'success',
      message: operation === 'format' ? 'JSON 已在输入框内格式化。' : 'JSON 已在输入框内压缩。',
    })
  }

  function runStringOperation(operation: StringOperation) {
    resetTree()
    setStatus(null)
    const result = operation === 'escape' ? escapeJsonString(jsonInput) : unescapeJsonString(jsonInput)
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.message })
      return
    }
    setJsonInput(result.value)
    setStatus({
      kind: 'success',
      message: operation === 'escape' ? 'JSON 字符串已转义。' : 'JSON 字符串已去除转义。',
    })
  }

  function clear() {
    setJsonInput('')
    resetTree()
    setStatus(null)
  }

  function toggleNode(path: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function toggleAllNodes() {
    if (!parsed) return
    if (allTreeNodesCollapsed) {
      setExpanded(new Set(expandablePaths))
      return
    }
    setExpanded(new Set())
  }

  async function copyValue(value: string, successMessage: string) {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setStatus({ kind: 'success', message: successMessage })
    } catch {
      setStatus({ kind: 'error', message: '无法访问剪贴板，请手动复制。' })
    }
  }

  async function copyNode(path: string, value: JsonValue) {
    const pathLabel = path.replace(/^root\.?/, '') || 'root'
    await copyValue(getJsonNodeCopyValue(value), `已复制节点 ${pathLabel}。`)
  }

  return (
    <div className="tool-page json-tool">
      <ToolHeader
        eyebrow="JSON"
        title="JSON 格式化"
        description="在浏览器本地格式化或压缩 JSON、查看树形结构，并直接进行字符串转义和去除转义。"
      />
      <div className="json-workspace" data-layout="tree-right" data-testid="json-workspace">
        <div className="json-text-workspace">
          <Panel title="JSON 输入">
            <div className="field json-input-field">
              <span className="field-heading">
                <span className="field-label">JSON 输入</span>
                <span className="json-input-actions">
                  <FieldIconButton
                    kind="copy"
                    className="json-input-copy"
                    iconClassName="json-copy-icon"
                    label="复制 JSON 输入"
                    disabled={!jsonInput}
                    onClick={() => copyValue(jsonInput, 'JSON 输入已复制到剪贴板。')}
                  />
                </span>
              </span>
              <span className="json-input-frame">
                <textarea
                  aria-label="JSON 输入"
                  value={jsonInput}
                  onChange={(event) => updateInput(event.target.value)}
                  rows={12}
                  placeholder='{"compact":true,"items":[1,2,3]}'
                  spellCheck={false}
                />
              </span>
            </div>
            <div className="action-row json-action-row">
              <button className="button button-primary" type="button" onClick={() => runJsonOperation('format')}>格式化 JSON</button>
              <button className="button button-secondary" type="button" onClick={() => runJsonOperation('minify')}>压缩 JSON</button>
              <button className="button button-secondary" type="button" onClick={() => runStringOperation('escape')}>转义</button>
              <button className="button button-secondary" type="button" onClick={() => runStringOperation('unescape')}>去除转义</button>
              <button className="button button-ghost" type="button" onClick={clear}>清空</button>
            </div>
            <div className="json-status"><StatusMessage status={status} /></div>
          </Panel>
        </div>

        <Panel
          title="树形结构"
          aside={parsed && expandablePaths.length > 0 ? (
            <button className="json-tree-toggle-all" type="button" onClick={toggleAllNodes}>
              {allTreeNodesCollapsed ? '全部展开' : '全部折叠'}
            </button>
          ) : null}
        >
          {parsed ? (
            <ol className="json-code-tree" aria-label="JSON 树形结构">
              <JsonCodeNode
                name="root"
                value={parsed.value}
                path="root"
                depth={0}
                isLast
                expanded={expanded}
                onToggle={toggleNode}
                onCopy={copyNode}
              />
            </ol>
          ) : <p className="json-tree-empty">格式化或压缩 JSON 后，树形结构会显示在这里。</p>}
        </Panel>
      </div>
    </div>
  )
}
