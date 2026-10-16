import { pathKey, type Path, type Session, type YamlComment, type YamlDocumentView, type YamlViewNode } from './model'

export interface TreeRow {
  id: string
  path: Path
  label: string
  depth: number
  left?: YamlViewNode
  result?: YamlViewNode
  right?: YamlViewNode
  children: string[]
  changed: boolean
  edited: boolean
  commentChanged: boolean
  differenceIndices: number[]
  commentIds: string[]
  descendantDifferences: number
  actionPath: Path
  readonly: boolean
}
export interface CommentRow { id: string; left?: YamlComment; result?: YamlComment; right?: YamlComment; different: boolean }
export function hasVirtualRoot(rows: Map<string, TreeRow>) {
  const root = rows.get('[]')
  return Boolean(root?.children.length && [root.left, root.result, root.right].every(node => !node || node.kind === 'map'))
}
export function initialTreeExpansion(rows: Map<string, TreeRow>) {
  return new Set([...rows.values()].filter(row => row.children.length && (row.depth <= 1 || row.changed || row.commentChanged || row.edited)).map(row => row.id).concat('[]'))
}
export function nodeSourceValue(node: YamlViewNode | undefined, text: string) {
  if (!node) return '（字段不存在）'
  const source = text.slice(node.valueRange.from, node.valueRange.to)
  if (!source.trim()) return 'null'
  if (node.kind !== 'map' && node.kind !== 'seq') return source
  const lines = source.split('\n')
  const lineStart = text.lastIndexOf('\n', Math.max(0, node.valueRange.from - 1)) + 1
  const prefix = text.slice(lineStart, node.valueRange.from)
  const indent = /^(?:\s|-)*$/.test(prefix) ? prefix.length : prefix.match(/^ */)![0].length
  return [lines[0], ...lines.slice(1).map(line => line.slice(Math.min(indent, line.match(/^ */)![0].length)))].join('\n')
}
export function sharedComments(left: YamlDocumentView, result: YamlDocumentView, right: YamlDocumentView): CommentRow[] {
  const rows = new Map<string, CommentRow>()
  for (const [side, document] of [['left', left], ['right', right], ['result', result]] as const) for (const comment of document.comments) {
    const row = rows.get(comment.id) ?? { id: comment.id, different: false }
    row[side] = comment
    rows.set(comment.id, row)
  }
  return [...rows.values()].map(row => ({ ...row, different: (row.left?.text ?? '') !== (row.right?.text ?? '') || (row.result?.text ?? '') !== (row.left?.text ?? '') }))
}
export function sharedTree(session: Session, result: YamlDocumentView): { rows: Map<string, TreeRow>; comments: CommentRow[] } {
  const left = session.comparison.documents!.left, right = session.comparison.documents!.right
  const rows = new Map<string, TreeRow>()
  const childrenByRow = new Map<string, Set<string>>()
  const comments = sharedComments(left, result, right)
  for (const [side, document] of [['left', left], ['right', right], ['result', result]] as const) for (const node of Object.values(document.nodes)) {
    const row = rows.get(node.id) ?? {
      id: node.id, path: node.path, label: node.label, depth: node.path.length, children: [], changed: false, edited: false, commentChanged: false,
      differenceIndices: [], commentIds: [], descendantDifferences: 0, actionPath: node.actionPath, readonly: node.readonly,
    }
    row[side] = node
    row.readonly ||= node.readonly
    if (node.readonly) row.actionPath = node.actionPath
    let children = childrenByRow.get(node.id)
    if (!children) { children = new Set(); childrenByRow.set(node.id, children) }
    for (const child of node.children) if (!children.has(child)) { children.add(child); row.children.push(child) }
    rows.set(node.id, row)
  }
  for (const row of rows.values()) {
    row.changed = row.left?.signature !== row.right?.signature
    row.edited = row.left?.signature !== row.result?.signature
  }
  // Index ancestors once. This avoids scanning every difference for every tree row.
  session.comparison.differences.forEach((diff, index) => {
    if (!diff.path) return
    for (let n = 0; n <= diff.path.length; n++) {
      const row = rows.get(pathKey(diff.path.slice(0, n)))
      if (row) { row.differenceIndices.push(index); row.descendantDifferences++ }
    }
  })
  // Descendants of a one-sided/type-changing object belong to its atomic decision.
  for (const row of rows.values()) for (let n = 0; n < row.path.length; n++) {
    const ancestor = rows.get(pathKey(row.path.slice(0, n)))
    if (ancestor?.differenceIndices.some(i => pathKey(session.comparison.differences[i].path ?? []) === ancestor.id)) {
      row.readonly = true; row.actionPath = ancestor.path; break
    }
  }
  for (const comment of comments) if (comment.different) {
    const value = comment.left ?? comment.right ?? comment.result!
    for (let n = 0; n <= value.path.length; n++) {
      const row = rows.get(pathKey(value.path.slice(0, n)))
      if (row) row.commentChanged = true
    }
    rows.get(pathKey(value.path))?.commentIds.push(comment.id)
  }
  return { rows, comments }
}
export function visibleTreeRows(rows: Map<string, TreeRow>, expanded: Set<string>, hideEqual: boolean, query: string) {
  const output: TreeRow[] = [], needle = query.trim().toLowerCase()
  const matches = new Set<string>()
  if (needle) for (const row of rows.values()) if (row.path.join('.').toLowerCase().includes(needle)) {
    for (let n = 0; n <= row.path.length; n++) matches.add(pathKey(row.path.slice(0, n)))
  }
  function walk(id: string) {
    const row = rows.get(id)
    if (!row || needle && !matches.has(id) || hideEqual && !row.changed && !row.edited && !row.commentChanged) return
    output.push(row)
    if (expanded.has(id) || needle) row.children.forEach(walk)
  }
  if (hasVirtualRoot(rows)) rows.get('[]')!.children.forEach(walk)
  else walk('[]')
  return output
}
