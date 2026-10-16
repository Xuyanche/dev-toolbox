import { Document, isAlias, isMap, isNode, isScalar, isSeq, LineCounter, parseAllDocuments, YAMLMap, type Node, type Pair } from 'yaml'
import { pathKey, piece, type Comparison, type Diagnostic, type Path, type Source, type Span, type TextEdit, type YamlAnalysis, type YamlEntry } from './model'

const lineStart = (text: string, pos: number) => text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1
const kind = (node: unknown) => isMap(node) ? 'map' : isSeq(node) ? 'seq' : 'scalar'
const nodeRange = (node: unknown): Span => isNode(node) && node.range ? { from: node.range[0], to: node.range[2] } : { from: 0, to: 0 }
const labelPath = (path: Path) => path.length ? path.map(key => /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(key) ? key : `[${JSON.stringify(key)}]`).join('.') : '根节点'

export interface ParsedYaml {
  doc: Document.Parsed
  entries: Record<string, YamlEntry>
  nodes: Map<string, Node | null>
  pairs: Map<string, Pair>
}
export interface YamlParseOptions { scalarKeys?: boolean }
class YamlStructureError extends Error {
  constructor(message: string, readonly offset?: number) { super(message) }
}
/** Typed identities keep numeric/boolean/null keys distinct from quoted strings. */
export function yamlKeyIdentity(key: unknown): string {
  const value: unknown = isScalar(key) ? key.value : null
  return JSON.stringify([typeof value, typeof value === 'bigint' || typeof value === 'number' ? String(value) : value])
}

export function yamlSignature(node: unknown, depth = 0, budget = { count: 0 }, scalarKeys = false): string {
  const offset = isNode(node) ? node.range?.[0] : undefined
  if (depth > 100 || ++budget.count > 50_000) throw new YamlStructureError('YAML 超过复杂度限制（100 层 / 50,000 节点），请缩小配置。', offset)
  if (isAlias(node) || isNode(node) && 'anchor' in node && node.anchor) throw new YamlStructureError('结构模式暂不支持锚点和别名；请查看原文并修正。', offset)
  if (isNode(node) && node.tag && !/^tag:yaml\.org,2002:(str|int|float|bool|null|map|seq)$/.test(node.tag)) {
    throw new YamlStructureError('结构模式暂不支持自定义标签；请查看原文并修正。', offset)
  }
  if (isMap(node)) {
    const values = node.items.map(pair => {
      const keyOffset = isNode(pair.key) ? pair.key.range?.[0] : offset
      if (!isScalar(pair.key)) throw new YamlStructureError('结构变换暂不支持列表或对象作为复杂键；请通过原文处理。', keyOffset)
      if (!scalarKeys && typeof pair.key.value !== 'string') throw new YamlStructureError('结构模式仅支持字符串键；请查看原文并修正。', keyOffset)
      if (pair.key.value === '<<' && pair.key.type === 'PLAIN') throw new YamlStructureError('结构模式暂不支持 << 合并键；请查看原文并修正。', keyOffset)
      yamlSignature(pair.key, depth + 1, budget, scalarKeys)
      return [scalarKeys ? yamlKeyIdentity(pair.key) : String(pair.key.value), yamlSignature(pair.value, depth + 1, budget, scalarKeys)] as const
    }).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
    // Child signatures are already canonical. Encoding them again at every level
    // would double escaping repeatedly and grow exponentially on deeply nested YAML.
    return `map:{${values.map(([key, value]) => `${JSON.stringify(key)}:${value}`).join(',')}}`
  }
  if (isSeq(node)) return `seq:[${node.items.map(item => yamlSignature(item, depth + 1, budget, scalarKeys)).join(',')}]`
  const value: unknown = isScalar(node) ? node.value : null
  if (typeof value === 'bigint') return `int:${value}`
  if (typeof value === 'number') return `float:${String(value)}`
  return `${typeof value}:${JSON.stringify(value)}`
}

function precedingComments(text: string, start: number, lowerBound: number) {
  let from = lineStart(text, start)
  while (from > lowerBound) {
    const previous = lineStart(text, from - 1)
    const line = text.slice(previous, from).trim()
    if (!line.startsWith('#')) break
    if (previous < lowerBound) break
    from = previous
  }
  return from
}

export function parseYamlDocument(text: string, options: YamlParseOptions = {}): ParsedYaml {
  const lineCounter = new LineCounter()
  const docs = parseAllDocuments(text, { keepSourceTokens: true, intAsBigInt: true, schema: 'core', lineCounter, logLevel: 'silent' })
  if (docs.length > 1) throw new Error('结构模式暂不支持多文档 YAML；请查看原文并修正。')
  const doc = docs[0] ?? new Document(null) as Document.Parsed
  const issue = doc.errors[0] ?? doc.warnings[0]
  if (issue) throw new Error(issue.message)
  // Validate the entire tree, including keys and list items that are merged atomically.
  const signature = (node: unknown) => yamlSignature(node, 0, { count: 0 }, options.scalarKeys)
  try { signature(doc.contents) } catch (error) {
    const pos = lineCounter.linePos(error instanceof YamlStructureError && error.offset !== undefined ? error.offset : doc.contents?.range?.[0] ?? 0)
    throw new Error(`${error instanceof Error ? error.message : '不支持的 YAML'}（第 ${pos.line} 行，第 ${pos.col} 列）`)
  }
  const entries: Record<string, YamlEntry> = Object.create(null)
  const nodes = new Map<string, Node | null>()
  const pairs = new Map<string, Pair>()
  function walk(node: Node | null, path: Path, pair?: Pair, parent?: Node, index = 0) {
    const fullRange = nodeRange(node)
    const valueRange = isNode(node) && node.range ? { from: node.range[0], to: node.range[1] } : fullRange
    const keyNode = pair && isNode(pair.key) ? pair.key : null
    const keyRange = keyNode?.range ? { from: keyNode.range[0], to: keyNode.range[1] } : undefined
    let range = { ...fullRange }
    const parentFlow = isMap(parent) && Boolean(parent.flow)
    const indent = keyRange ? keyRange.from - lineStart(text, keyRange.from) : valueRange.from - lineStart(text, valueRange.from)
    if (keyRange) {
      const lowerBound = !path.slice(0, -1).length && index === 0 ? keyRange.from :
        isMap(parent) && index > 0 ? nodeRange(parent.items[index - 1].value).to :
          lineStart(text, keyRange.from) > 0 ? lineStart(text, keyRange.from) - 1 : 0
      // First child comments are stored on the parent collection. Scan only its own indentation.
      const firstChildLower = path.length > 1 && index === 0 ? (() => {
        const parentPair = pairs.get(pathKey(path.slice(0, -1)))
        const keyEnd = isNode(parentPair?.key) ? parentPair.key.range?.[1] ?? 0 : 0
        return text.indexOf('\n', keyEnd) + 1
      })() : lowerBound
      range = { from: parentFlow ? keyRange.from : precedingComments(text, keyRange.from, firstChildLower), to: Math.max(fullRange.to, keyRange.to) }
      if (!parentFlow) {
        // Empty values have a zero-length node; include their colon and newline.
        if (!node || valueRange.to <= keyRange.to) {
          const end = text.indexOf('\n', keyRange.to)
          range.to = end < 0 ? text.length : end + 1
        }
      }
    }
    const entry: YamlEntry = { path, range, valueRange, keyRange, indent, parentFlow, flow: (isMap(node) || isSeq(node)) && Boolean(node.flow), kind: kind(node), signature: signature(node) }
    entries[pathKey(path)] = entry
    nodes.set(pathKey(path), node)
    if (pair) pairs.set(pathKey(path), pair)
    if (isMap(node)) node.items.forEach((item, i) => {
      const key = options.scalarKeys ? yamlKeyIdentity(item.key) : isScalar(item.key) ? String(item.key.value) : ''
      walk(isNode(item.value) ? item.value : null, [...path, key], item, node, i)
    })
  }
  walk(doc.contents, [])
  return { doc, entries, nodes, pairs }
}

const parse = parseYamlDocument

export function analyzeYaml(text: string): YamlAnalysis {
  try { return { entries: parse(text).entries, diagnostic: null } } catch (error) {
    const message = error instanceof Error ? error.message : 'YAML 解析失败。'
    const match = message.match(/(?:at line |第 )(\d+)(?:, column | 行，第 )(\d+)/)
    const diagnostic: Diagnostic = { message, ...(match ? { line: Number(match[1]), col: Number(match[2]) } : {}) }
    return { entries: {}, diagnostic }
  }
}

export function compareYaml(left: Source, right: Source): Comparison {
  let l: ParsedYaml, r: ParsedYaml
  try { l = parse(left.text) } catch (e) { throw new Error(`左侧 YAML：${e instanceof Error ? e.message : '解析失败'}`) }
  try { r = parse(right.text) } catch (e) { throw new Error(`右侧 YAML：${e instanceof Error ? e.message : '解析失败'}`) }
  const comparison: Comparison = { mode: 'yaml', left, right, differences: [], equal: [] }
  function visit(path: Path) {
    const a = l.entries[pathKey(path)], b = r.entries[pathKey(path)]
    if (a && b && a.signature === b.signature) {
      comparison.equal.push({ id: `yaml-equal-${pathKey(path)}`, left: a.range, right: b.range })
      return
    }
    if (a?.kind === 'map' && b?.kind === 'map') {
      const leftNode = l.nodes.get(pathKey(path)), rightNode = r.nodes.get(pathKey(path))
      const keys = new Set([...(isMap(leftNode) ? leftNode.items : []), ...(isMap(rightNode) ? rightNode.items : [])]
        .map(pair => isScalar(pair.key) ? String(pair.key.value) : ''))
      for (const key of keys) visit([...path, key])
      return
    }
    const parentL = l.entries[pathKey(path.slice(0, -1))], parentR = r.entries[pathKey(path.slice(0, -1))]
    comparison.differences.push({
      id: `yaml-${pathKey(path)}`, label: labelPath(path), kind: 'yaml', path,
      left: a ? piece(left.text, a.range) : null, right: b ? piece(right.text, b.range) : null,
      leftAnchor: a?.range.from ?? parentL?.valueRange.to ?? 0,
      rightAnchor: b?.range.from ?? parentR?.valueRange.to ?? 0,
    })
  }
  visit([])
  return comparison
}

function shiftIndent(fragment: string, from: number, to: number) {
  return fragment.split('\n').map(line => line.trim() ? ' '.repeat(to) + line.slice(Math.min(from, line.match(/^ */)?.[0].length ?? 0)) : line).join('\n')
}
function serializedPair(parsed: ParsedYaml, path: Path, flow: boolean) {
  const pair = parsed.pairs.get(pathKey(path))?.clone()
  if (!pair) throw new Error('无法定位源字段。')
  // A leading root comment belongs to the document, not an adopted field.
  if (path.length === 1 && [...parsed.pairs.keys()][0] === pathKey(path) && isNode(pair.key)) pair.key.commentBefore = null
  const map = new YAMLMap()
  map.flow = flow
  map.items.push(pair)
  const doc = new Document(map)
  let text = doc.toString({ lineWidth: 0 })
  if (flow) text = text.trim().replace(/^\{\s?/, '').replace(/\s?\}$/, '')
  return text
}

/** Return a local edit only after the resulting document parses and has the chosen semantic value. */
export function yamlAcceptance(text: string, source: string, path: Path): TextEdit {
  const current = parse(text), desired = parse(source)
  const target = current.entries[pathKey(path)], chosen = desired.entries[pathKey(path)]
  const parentPath = path.slice(0, -1)
  const parent = current.entries[pathKey(parentPath)]
  let edit: TextEdit
  if (path.length === 0) {
    edit = { ...current.entries['[]'].range, insert: chosen ? source.slice(chosen.range.from, chosen.range.to) : '' }
  } else if (!chosen && !target) {
    edit = { from: parent?.valueRange.to ?? 0, to: parent?.valueRange.to ?? 0, insert: '' }
  } else if (!parent || parent.kind !== 'map') {
    throw new Error('目标父级已改变，无法安全定位；请手动处理并确认。')
  } else if (parent.flow) {
    const map = current.nodes.get(pathKey(parentPath))
    if (!isMap(map)) throw new Error('无法定位映射。')
    const idx = map.items.findIndex(pair => isScalar(pair.key) && pair.key.value === path.at(-1))
    if (target && chosen) {
      edit = { from: target.range.from, to: target.range.to, insert: serializedPair(desired, path, true) }
    } else if (target) {
      const next = map.items[idx + 1], previous = map.items[idx - 1]
      const nextStart = next && isNode(next.key) ? next.key.range?.[0] : undefined
      const prevEnd = previous && isNode(previous.value) ? previous.value.range?.[2] : undefined
      if (nextStart !== undefined) edit = { from: target.range.from, to: nextStart, insert: '' }
      else if (prevEnd !== undefined) edit = { from: prevEnd, to: target.range.to, insert: '' }
      else edit = { ...target.range, insert: '' }
    } else {
      const pos = parent.valueRange.to - 1
      edit = { from: pos, to: pos, insert: `${map.items.length ? ', ' : ''}${serializedPair(desired, path, true)}` }
    }
  } else if (!chosen && target) {
    const map = current.nodes.get(pathKey(parentPath))
    if (isMap(map) && map.items.length === 1) {
      // Preserve the parent mapping's type after its last field is removed.
      edit = { ...parent.valueRange, insert: '{}\n' }
    } else edit = { ...target.range, insert: '' }
  } else if (chosen) {
    let fragment = chosen.parentFlow ? serializedPair(desired, path, false) : source.slice(chosen.range.from, chosen.range.to)
    const indent = target?.indent ?? (() => {
      const first = Object.values(current.entries).find(entry => entry.path.length === parentPath.length + 1 && parentPath.every((key, i) => entry.path[i] === key))
      return first?.indent ?? parent.indent + (parentPath.length ? 2 : 0)
    })()
    fragment = shiftIndent(fragment, chosen.parentFlow ? 0 : chosen.indent, indent)
    if (target) edit = { ...target.range, insert: fragment + (target.range.to < text.length && text[target.range.to - 1] === '\n' && !fragment.endsWith('\n') ? '\n' : '') }
    else {
      // Insert before the map's trailing comment and before any following sibling.
      const pos = parent.valueRange.to
      edit = { from: pos, to: pos, insert: `${pos > 0 && text[pos - 1] !== '\n' ? '\n' : ''}${fragment}${fragment.endsWith('\n') ? '' : '\n'}` }
    }
  } else throw new Error('无法构建字段操作。')
  const output = text.slice(0, edit.from) + edit.insert + text.slice(edit.to)
  const parsed = parse(output)
  const result = parsed.entries[pathKey(path)]
  if ((chosen?.signature ?? null) !== (result?.signature ?? null)) throw new Error('该操作无法保持预期 YAML 结构，请手动处理并确认。')
  // Semantic integrity outside the selected subtree is a hard precondition, including user edits.
  for (const entry of Object.values(current.entries)) {
    if (path.every((key, i) => entry.path[i] === key) || entry.path.every((key, i) => path[i] === key)) continue
    if (parsed.entries[pathKey(entry.path)]?.signature !== entry.signature) throw new Error('操作会影响其他字段，已停止；请手动处理。')
  }
  return edit
}

