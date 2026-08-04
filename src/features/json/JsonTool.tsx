import { useMemo, useState } from 'react'
import { Panel, Segmented, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'
import {
  escapeJsonString,
  getJsonNodeCopyValue,
  getJsonType,
  parseJson,
  unescapeJsonString,
  type JsonValue,
  type ParsedJson,
} from './json'

type JsonMode = 'format' | 'escape'
type EscapeDirection = 'escape' | 'unescape'

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
  if (typeof value === 'string') return JSON.stringify(value)
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

  if (!expandable) {
    return (
      <li className="json-code-node">
        <div className="json-code-line" style={{ paddingLeft: `${depth * 22}px` }}>
          <span className="json-code-spacer" aria-hidden="true" />
          <button className="json-code-copy" type="button" aria-label={copyLabel(name, value)} onClick={() => onCopy(path, value)}>复制</button>
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
        <button className="json-code-copy" type="button" aria-label={copyLabel(name, value)} onClick={() => onCopy(path, value)}>复制</button>
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
  const [mode, setMode] = useState<JsonMode>('format')

  const [jsonInput, setJsonInput] = useState('')
  const [parsed, setParsed] = useState<ParsedJson | null>(null)
  const [formatStatus, setFormatStatus] = useState<StatusState>(null)
  const [formatCopyStatus, setFormatCopyStatus] = useState<StatusState>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const [escapeInput, setEscapeInput] = useState('')
  const [escapeOutput, setEscapeOutput] = useState('')
  const [escapeDirection, setEscapeDirection] = useState<EscapeDirection>('escape')
  const [escapeStatus, setEscapeStatus] = useState<StatusState>(null)
  const expandablePaths = useMemo(() => (parsed ? getExpandablePaths(parsed.value) : []), [parsed])
  const allTreeNodesCollapsed = expandablePaths.length > 0 && expandablePaths.every((path) => !expanded.has(path))

  function runFormat() {
    setParsed(null)
    setFormatStatus(null)
    setFormatCopyStatus(null)
    setCopiedPath(null)
    const result = parseJson(jsonInput)
    if (!result.ok) {
      setFormatStatus({ kind: 'error', message: result.message })
      return
    }
    setParsed(result.value)
    setJsonInput(result.value.formatted)
    setExpanded(new Set(['root']))
    setFormatStatus({ kind: 'success', message: 'JSON 已在输入框内格式化。' })
  }

  function clearFormat() {
    setJsonInput('')
    setParsed(null)
    setFormatStatus(null)
    setFormatCopyStatus(null)
    setCopiedPath(null)
    setExpanded(new Set(['root']))
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
    setCopiedPath(null)
    if (allTreeNodesCollapsed) {
      setExpanded(new Set(expandablePaths))
      return
    }
    setExpanded(new Set())
  }

  async function copyValue(value: string, onStatus: (status: StatusState) => void) {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      onStatus({ kind: 'success', message: '已复制到剪贴板。' })
    } catch {
      onStatus({ kind: 'error', message: '无法访问剪贴板，请手动复制。' })
    }
  }

  async function copyFormatted() {
    if (!parsed) return
    await copyValue(parsed.formatted, setFormatCopyStatus)
  }

  async function copyMinified() {
    if (!parsed) return
    await copyValue(parsed.minified, setFormatCopyStatus)
  }

  async function copyNode(path: string, value: JsonValue) {
    await copyValue(getJsonNodeCopyValue(value), (status) => {
      setCopiedPath(status?.kind === 'success' ? path : null)
      setFormatCopyStatus(status)
    })
  }

  function runEscape() {
    setEscapeOutput('')
    setEscapeStatus(null)
    const result = escapeDirection === 'escape' ? escapeJsonString(escapeInput) : unescapeJsonString(escapeInput)
    if (!result.ok) {
      setEscapeStatus({ kind: 'error', message: result.message })
      return
    }
    setEscapeOutput(result.value)
    setEscapeStatus({ kind: 'success', message: escapeDirection === 'escape' ? 'JSON 字符串已转义。' : 'JSON 字符串已去除转义。' })
  }

  function clearEscape() {
    setEscapeInput('')
    setEscapeOutput('')
    setEscapeStatus(null)
  }

  return (
    <div className="tool-page json-tool">
      <ToolHeader
        eyebrow="JSON"
        title="JSON 格式化"
        description="在本地直接格式化输入框中的 JSON，右侧以代码树查看并折叠任意层级，也可以进行 JSON 字符串转义和去除转义。"
      />
      <div className="notice notice-info"><strong>本地处理</strong><span>JSON 输入、树状态和转义内容只保存在当前浏览器会话中。</span></div>
      <div className="settings-row">
        <Segmented
          label="JSON 模式"
          value={mode}
          onChange={setMode}
          options={[{ value: 'format', label: '格式化 / 树状' }, { value: 'escape', label: '转义 / 去除转义' }]}
        />
      </div>

      {mode === 'format' ? (
        <div data-testid="json-format-mode">
          <div className="json-workspace" data-layout="tree-right">
            <div className="json-text-workspace">
              <Panel title="JSON 输入">
                <TextAreaField
                  label="JSON 输入"
                  value={jsonInput}
                  onChange={setJsonInput}
                  rows={22}
                  placeholder='{"compact":true,"items":[1,2,3]}'
                  hint="点击格式化后会直接替换此输入框内容。"
                />
                <div className="action-row">
                  <button className="button button-primary" type="button" onClick={runFormat}>格式化 JSON</button>
                  <button className="button button-secondary" type="button" onClick={copyFormatted} disabled={!parsed}>复制格式化结果</button>
                  <button className="button button-secondary" type="button" onClick={copyMinified} disabled={!parsed}>复制压缩结果</button>
                  <button className="button button-ghost" type="button" onClick={clearFormat}>清空</button>
                </div>
                <StatusMessage status={formatStatus} />
                <StatusMessage status={formatCopyStatus} />
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
              {copiedPath ? <div className="json-tree-feedback" role="status" aria-live="polite">已复制节点 {copiedPath.replace(/^root\.?/, '') || 'root'}</div> : null}
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
              ) : <p className="json-tree-empty">格式化 JSON 后，树形结构会显示在这里。</p>}
            </Panel>
          </div>
        </div>
      ) : (
        <div data-testid="json-escape-mode">
          <div className="settings-row">
            <Segmented
              label="转义操作"
              value={escapeDirection}
              onChange={setEscapeDirection}
              options={[{ value: 'escape', label: '转义' }, { value: 'unescape', label: '去除转义' }]}
            />
          </div>
          <div className="two-column">
            <Panel title="输入">
              <TextAreaField
                label="JSON 字符串输入"
                value={escapeInput}
                onChange={setEscapeInput}
                rows={10}
                placeholder={escapeDirection === 'escape' ? '包含 "引号" 和换行的文本' : 'line 1\\n\\"quoted\\"'}
              />
            </Panel>
            <Panel title="输出">
              <TextAreaField
                label="JSON 字符串输出"
                value={escapeOutput}
                readOnly
                rows={10}
                placeholder="转换结果会显示在这里"
              />
            </Panel>
          </div>
          <div className="action-row">
            <button className="button button-primary" type="button" onClick={runEscape}>
              {escapeDirection === 'escape' ? '转义 JSON 字符串' : '去除 JSON 字符串转义'}
            </button>
            <button className="button button-secondary" type="button" onClick={() => copyValue(escapeOutput, setEscapeStatus)} disabled={!escapeOutput}>复制结果</button>
            <button className="button button-ghost" type="button" onClick={clearEscape}>清空</button>
          </div>
          <StatusMessage status={escapeStatus} />
        </div>
      )}
    </div>
  )
}
