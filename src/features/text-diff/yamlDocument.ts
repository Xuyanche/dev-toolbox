import { Document, isMap, isNode, isScalar, isSeq, Parser, type Node } from 'yaml'
import { parseYamlDocument, yamlAcceptance, yamlKeyIdentity, yamlSignature, type YamlParseOptions } from './yamlMerge'
import { pathKey, type CommentChoice, type CommentPlacement, type Path, type TextEdit, type YamlComment, type YamlDocumentView } from './model'
import type { YamlViewNode } from './model'

const startOfLine = (text: string, pos: number) => text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1
const endOfLine = (text: string, pos: number) => { const end = text.indexOf('\n', pos); return end < 0 ? text.length : end }
const within = (child: Path, parent: Path) => parent.every((part, i) => child[i] === part)
const apply = (text: string, edit: TextEdit) => text.slice(0, edit.from) + edit.insert + text.slice(edit.to)
export function minimalEdit(before: string, after: string): TextEdit {
  let from = 0, a = before.length, b = after.length
  while (from < a && from < b && before[from] === after[from]) from++
  while (a > from && b > from && before[a - 1] === after[b - 1]) { a--; b-- }
  return { from, to: a, insert: after.slice(from, b) }
}

function previewValue(node: Node | null) {
  let length = 0, count = 0, truncated = false
  function visit(value: unknown, depth: number): string {
    if (++count > 24 || length > 160 || depth > 4) { truncated = true; return '…' }
    if (isMap(value) || isSeq(value)) {
      const parts: string[] = []
      for (const item of value.items) {
        if (count >= 24 || length > 160) { parts.push('…'); truncated = true; break }
        let prefix = ''
        if (isMap(value)) {
          const pair = item as { key: unknown; value: unknown }
          const key = isScalar(pair.key) ? String(pair.key.value) : ''
          prefix = /^[\p{L}\p{N}_-]+$/u.test(key) ? key : JSON.stringify(key)
          prefix = prefix.slice(0, 160) + ': '
          length += prefix.length
        }
        parts.push(prefix + visit(isMap(value) ? (item as { value: unknown }).value : item, depth + 1))
        length += 2
      }
      return (isMap(value) ? '{ ' : '[ ') + parts.join(', ') + (isMap(value) ? ' }' : ' ]')
    }
    const raw: unknown = isScalar(value) ? value.value : null
    const output = typeof raw === 'string' ? JSON.stringify(raw.slice(0, 180)) : String(raw)
    if (typeof raw === 'string' && raw.length > 180) truncated = true
    length += output.length
    return output
  }
  const output = visit(node, 0)
  return { preview: output.length > 180 ? output.slice(0, 177) + '…' : output, previewTruncated: truncated || output.length > 180 }
}

export function describeYaml(text: string, options: YamlParseOptions = {}): YamlDocumentView {
  const parsed = parseYamlDocument(text, options)
  const nodes: Record<string, YamlViewNode> = Object.create(null)
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  const lineOf = (pos: number) => {
    let a = 0, b = starts.length
    while (a + 1 < b) { const mid = (a + b) >> 1; if (starts[mid] <= pos) a = mid; else b = mid }
    return a + 1
  }
  const keyLines = new Map<number, YamlViewNode[]>()
  const endLines = new Map<number, YamlViewNode[]>()
  function walk(node: Node | null, path: Path, label: string, atomic?: Path) {
    const id = pathKey(path), entry = parsed.entries[id]
    const range = entry?.valueRange ?? (node?.range ? { from: node.range[0], to: node.range[1] } : { from: 0, to: 0 })
    const value: unknown = isScalar(node) ? node.value : null
    const kind = isMap(node) ? 'map' : isSeq(node) ? 'seq' : value === null ? 'null' : typeof value === 'bigint' || typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string'
    const result: YamlViewNode = {
      id, path, actionPath: atomic ?? path, label, kind, ...previewValue(node),
      signature: entry?.signature ?? yamlSignature(node, 0, { count: 0 }, options.scalarKeys), children: [], line: lineOf(entry?.keyRange?.from ?? range.from), valueRange: range, readonly: Boolean(atomic),
    }
    nodes[id] = result
    const keyLine = lineOf(entry?.keyRange?.from ?? range.from), lastLine = lineOf(Math.max(range.from, range.to - 1))
    keyLines.set(keyLine, [...(keyLines.get(keyLine) ?? []), result])
    endLines.set(lastLine, [...(endLines.get(lastLine) ?? []), result])
    if (isMap(node)) node.items.forEach(pair => {
      const name = isScalar(pair.key) ? String(pair.key.value) : ''
      result.children.push(walk(isNode(pair.value) ? pair.value : null, [...path, options.scalarKeys ? yamlKeyIdentity(pair.key) : name], name, atomic))
    })
    if (isSeq(node)) node.items.forEach((item, i) => result.children.push(walk(isNode(item) ? item : null, [...path, String(i)], `[${i}]`, atomic ?? path)))
    return id
  }
  walk(parsed.doc.contents, [], '根节点')
  const tokens: { offset: number; source: string }[] = []
  function collect(value: unknown) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach(collect); return }
    const token = value as Record<string, unknown>
    if (token.type === 'comment' && typeof token.offset === 'number' && typeof token.source === 'string') tokens.push({ offset: token.offset, source: token.source })
    for (const [key, child] of Object.entries(token)) if (key !== 'source') collect(child)
  }
  for (const token of new Parser().parse(text)) collect(token)
  tokens.sort((a, b) => a.offset - b.offset)
  const groups: typeof tokens[] = []
  for (const token of tokens) {
    const previous = groups.at(-1)?.at(-1)
    const prefix = text.slice(startOfLine(text, token.offset), token.offset)
    if (previous && !prefix.trim() && lineOf(token.offset) === lineOf(previous.offset) + 1 && prefix.length === previous.offset - startOfLine(text, previous.offset)) groups.at(-1)!.push(token)
    else groups.push([token])
  }
  const independentIndices = new Map<string, number>()
  const root = parsed.entries['[]']
  const collections = Object.values(nodes).filter(node => node.kind === 'map' || node.kind === 'seq').sort((a, b) => b.path.length - a.path.length)
  const comments: YamlComment[] = groups.map(group => {
    const first = group[0], last = group.at(-1)!, line = lineOf(first.offset), lineStart = startOfLine(text, first.offset)
    const inline = Boolean(text.slice(lineStart, first.offset).trim())
    const after = lineOf(last.offset) + 1
    let placement: CommentPlacement = 'independent', owner: YamlViewNode | undefined
    if (inline) {
      owner = [...(endLines.get(line) ?? []), ...(keyLines.get(line) ?? [])].filter(node => {
        const entry = parsed.entries[node.id]
        return (entry?.keyRange?.from ?? node.valueRange.from) < first.offset
      }).sort((a, b) => b.path.length - a.path.length)[0]
      if (owner) placement = 'inline'
    } else if (first.offset < root.range.from) placement = 'header'
    else if (first.offset >= root.range.to && !text.slice(last.offset + last.source.length).replace(/^\s*\.\.\./, '').trim()) placement = 'footer'
    else {
      const next = keyLines.get(after)?.filter(node => !node.readonly).sort((a, b) => b.path.length - a.path.length)[0]
      const nextEntry = next && parsed.entries[next.id]
      if (next && nextEntry?.keyRange && nextEntry.indent === first.offset - lineStart && starts[after - 1] !== undefined && text.slice(starts[after - 1], nextEntry.keyRange.from).trim() === '') { owner = next; placement = 'before' }
    }
    const attached = placement === 'inline' || placement === 'before'
    let anchor: YamlViewNode | undefined
    if (placement === 'independent') {
      for (let n = after; n <= starts.length; n++) {
        const content = text.slice(starts[n - 1], n < starts.length ? starts[n] : text.length).trim()
        if (!content || content.startsWith('#')) continue
        anchor = keyLines.get(n)?.filter(node => !node.readonly).sort((a, b) => b.path.length - a.path.length)[0]
        break
      }
    }
    if (!owner) owner = collections.find(node => node.valueRange.from <= first.offset && node.valueRange.to >= first.offset) ?? nodes['[]']
    const path = owner.actionPath
    const scope = `${placement}:${pathKey(path)}${anchor ? `:before:${anchor.id}` : ''}`
    const number = independentIndices.get(scope) ?? 0
    independentIndices.set(scope, number + 1)
    const id = attached ? `${scope}:${number}` : placement === 'header' || placement === 'footer' ? `${placement}:${number}` : `${scope}:${number}`
    const range = inline ? { from: first.offset, to: last.offset + last.source.length } : { from: lineStart, to: Math.min(text.length, endOfLine(text, last.offset) + 1) }
    return { id, path, placement, attached, text: group.map(token => token.source.replace(/^# ?/, '')).join('\n'), range, line, indent: first.offset - lineStart,
      anchorPath: anchor?.path,
      context: placement === 'header' ? '文档开头说明' : placement === 'footer' ? '文档结尾说明' : `${path.length ? path.join(' / ') : '根节点'} · ${attached ? placement === 'inline' ? '同行附属' : '紧邻前置' : `独立注释${anchor ? `，位于 ${anchor.path.join(' / ')} 之前` : '，归属待检查'}`}` }
  })
  return { nodes, comments }
}

function encodedComment(content: string, indent: number) {
  return content.split('\n').map(line => ' '.repeat(indent) + '# ' + line.replace(/\r/g, '')).join('\n')
}
function inlineComment(content: string, column: number) {
  return encodedComment(content, 0).replaceAll('\n', '\n' + ' '.repeat(column))
}

export function changeYamlComment(text: string, id: string, choice: CommentChoice): TextEdit {
  const parsed = parseYamlDocument(text), view = describeYaml(text)
  const current = view.comments.find(comment => comment.id === id)
  let edit: TextEdit
  if (current) {
    if (current.placement === 'inline') {
      let from = current.range.from
      if (!choice.text) while (from > 0 && /[ \t]/.test(text[from - 1])) from--
      edit = { from, to: current.range.to, insert: choice.text ? inlineComment(choice.text, current.indent) : '' }
    } else edit = { ...current.range, insert: choice.text ? encodedComment(choice.text, current.indent) + '\n' : '' }
  } else if (!choice.text) return { from: 0, to: 0, insert: '' }
  else if (choice.placement === 'header') edit = { from: 0, to: 0, insert: encodedComment(choice.text, 0) + '\n' }
  else if (choice.placement === 'footer') edit = { from: text.length, to: text.length, insert: `${text.endsWith('\n') || !text ? '' : '\n'}${encodedComment(choice.text, 0)}\n` }
  else if (choice.placement === 'before' || choice.placement === 'inline') {
    const entry = parsed.entries[pathKey(choice.path)]
    if (!entry?.keyRange) throw new Error('结果字段不存在或注释归属已变化，请先保留字段，或通过原文处理。')
    if (choice.placement === 'before') {
      if (entry.parentFlow) throw new Error('流式映射的前置注释请通过原文编辑，避免影响其他字段。')
      const pos = startOfLine(text, entry.keyRange.from)
      edit = { from: pos, to: pos, insert: encodedComment(choice.text, entry.indent) + '\n' }
    } else {
      const valueLine = startOfLine(text, entry.valueRange.from), keyLine = startOfLine(text, entry.keyRange.from)
      const pos = valueLine > keyLine ? endOfLine(text, entry.keyRange.to) : entry.valueRange.to
      edit = { from: pos, to: pos, insert: ' ' + inlineComment(choice.text, pos - startOfLine(text, pos) + 1) }
    }
  } else {
    const context = choice.source
    const owner = parsed.entries[pathKey(choice.path)]
    if (!context || !owner) throw new Error('独立注释的位置无法安全定位，请在原文中添加。')
    const anchor = context.anchorPath && parsed.entries[pathKey(context.anchorPath)]
    if (context.anchorPath && !anchor) throw new Error('独立注释的邻近字段已不存在，请在原文中处理其位置。')
    const pos = anchor ? startOfLine(text, anchor.range.from) : owner.path.length ? owner.range.from : owner.valueRange.from
    edit = { from: pos, to: pos, insert: encodedComment(choice.text, context.indent) + '\n\n' }
  }
  const next = apply(text, edit)
  if (yamlSignature(parseYamlDocument(next).doc.contents) !== yamlSignature(parsed.doc.contents)) throw new Error('注释修改会改变配置结构，已停止；请通过原文处理。')
  return edit
}

export function yamlNodeChange(text: string, path: Path, options: { source?: string; value?: string; comments?: Record<string, CommentChoice> }): TextEdit {
  const originalNotes = describeYaml(text).comments.filter(comment => !comment.attached && within(comment.path, path))
  let source = options.source
  if (source === undefined) {
    const current = parseYamlDocument(text), value = parseYamlDocument(options.value ?? '')
    const doc = current.doc.clone()
    const node = value.doc.contents?.clone() ?? null
    const old = current.nodes.get(pathKey(path))
    if (node && old) { node.comment ??= old.comment; node.commentBefore ??= old.commentBefore }
    if (path.length) doc.setIn(path, node)
    else doc.contents = node as typeof doc.contents
    source = doc.toString({ lineWidth: 0 })
  }
  let output = apply(text, yamlAcceptance(text, source, path))
  const adoptedNotes = describeYaml(output).comments.filter(comment => !comment.attached && within(comment.path, path))
  for (const note of adoptedNotes) {
    const original = originalNotes.find(item => item.id === note.id)
    if (original?.text === note.text) continue
    output = apply(output, changeYamlComment(output, note.id, { path: note.path, placement: note.placement, text: original?.text ?? '', source: original ?? note }))
  }
  for (const note of originalNotes) if (!describeYaml(output).comments.some(item => item.id === note.id)) {
    output = apply(output, changeYamlComment(output, note.id, { path: note.path, placement: note.placement, text: note.text, source: note }))
  }
  // Preserve explicit field comment policies when replacing the field or a containing subtree.
  for (const [id, choice] of Object.entries(options.comments ?? {})) if (within(choice.path, path) && (choice.placement === 'before' || choice.placement === 'inline')) {
    const entries = parseYamlDocument(output).entries
    if (!entries[pathKey(choice.path)]) continue
    output = apply(output, changeYamlComment(output, id, choice))
  }
  return minimalEdit(text, output)
}

export function documentCommentChoices(view: YamlDocumentView, path: Path) {
  return view.comments.filter(comment => comment.attached && within(comment.path, path))
}

export function readYamlNodeValue(text: string, path: Path) {
  const node = parseYamlDocument(text).nodes.get(pathKey(path))
  if (node === undefined) throw new Error('结果节点不存在，请先采用一侧字段。')
  return { value: new Document(node?.clone() ?? null).toString({ lineWidth: 0 }) }
}
