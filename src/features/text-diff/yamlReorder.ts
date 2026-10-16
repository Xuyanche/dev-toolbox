import { isMap, isNode, isScalar, parseAllDocuments, type YAMLMap } from 'yaml'
import { describeYaml } from './yamlDocument'
import { parseYamlDocument, yamlKeyIdentity, yamlSignature, type ParsedYaml } from './yamlMerge'
import { pathKey, type Diagnostic, type Path, type Source, type Span } from './model'
import { checkInput } from './io'

export interface ReorderedYaml { text: string; skipped: string[] }
export function reorderYaml(left: Source, right: Source): ReorderedYaml {
  checkInput(left.text); checkInput(right.text)
  function read(text: string, side: string): ParsedYaml {
    try { return parseYamlDocument(text, { scalarKeys: true }) }
    catch (error) { throw new Error(`${side} YAML：${error instanceof Error ? error.message : '无法解析'}`) }
  }
  const reference = read(left.text, '左侧'), original = read(right.text, '右侧')
  const independent = describeYaml(right.text, { scalarKeys: true }).comments.filter(comment => comment.placement === 'independent')
  const skipped: string[] = []
  function map(node: YAMLMap, template: YAMLMap, path: Path, labels: Path = []): { range: Span; text: string } | null {
    const names = node.items.map(pair => yamlKeyIdentity(pair.key))
    if (!names.length) return null
    const fields = names.map(name => original.entries[pathKey([...path, name])])
    const range = { from: fields[0].range.from, to: fields.at(-1)!.range.to }
    if (node.flow) { skipped.push(`${labels.join('.') || '顶层'}：流式映射保持原顺序`); return null }
    const fragments = new Map<string, string>()
    const referencePairs = new Map(template.items.map(pair => [yamlKeyIdentity(pair.key), pair]))
    names.forEach((name, i) => {
      const pair = node.items[i], field = fields[i]
      const end = fields[i + 1]?.range.from ?? range.to
      let fragment = right.text.slice(field.range.from, end)
      const sourcePair = referencePairs.get(name)
      if (isMap(pair.value) && isMap(sourcePair?.value)) {
        const child = map(pair.value, sourcePair.value, [...path, name], [...labels, String(isScalar(pair.key) ? pair.key.value : '')])
        if (child) fragment = fragment.slice(0, child.range.from - field.range.from) + child.text + fragment.slice(child.range.to - field.range.from)
      }
      fragments.set(name, fragment)
    })
    const blocked = independent.some(comment => pathKey(comment.path) === pathKey(path) && comment.range.from >= range.from && comment.range.from < range.to)
    const common = template.items.map(pair => yamlKeyIdentity(pair.key)).filter(name => fragments.has(name))
    const commonNames = new Set(common)
    const desired = blocked ? names : [...common, ...names.filter(name => !commonNames.has(name))]
    if (blocked) skipped.push(`${labels.join('.') || '顶层'}：独立分组说明处保持原顺序`)
    let text = desired.map((name, i) => {
      const fragment = fragments.get(name)!
      return i < desired.length - 1 && !fragment.endsWith('\n') ? fragment + '\n' : fragment
    }).join('')
    if (!right.text.slice(range.from, range.to).endsWith('\n') && text.endsWith('\n')) text = text.slice(0, -1)
    return { range, text }
  }
  const change = isMap(original.doc.contents) && isMap(reference.doc.contents) ? map(original.doc.contents, reference.doc.contents, []) : null
  const text = change ? right.text.slice(0, change.range.from) + change.text + right.text.slice(change.range.to) : right.text
  checkInput(text)
  if (yamlSignature(read(text, '重排后右侧').doc.contents, 0, { count: 0 }, true) !== yamlSignature(original.doc.contents, 0, { count: 0 }, true)) throw new Error('重排校验失败，原始内容已保留。')
  return { text, skipped }
}

export function formatYaml(text: string): string {
  const parsed = parseYamlDocument(text, { scalarKeys: true })
  const formatted = parsed.doc.toString({ lineWidth: 0, indent: 2 })
  checkInput(formatted, 2)
  return formatted
}

export function validateYamlText(text: string): { diagnostic: Diagnostic | null } {
  checkInput(text, 2)
  try {
    const docs = parseAllDocuments(text, { intAsBigInt: true, logLevel: 'silent' })
    if (docs.length > 1) return { diagnostic: { message: '当前融合仅校验单文档 YAML。' } }
    const error = docs[0]?.errors[0] ?? docs[0]?.warnings[0]
    if (error) return { diagnostic: { message: error.message, line: error.linePos?.[0].line, col: error.linePos?.[0].col } }
    let count = 0
    function visit(node: unknown, depth: number) {
      if (++count > 50_000 || depth > 100) throw new Error('YAML 超过复杂度限制（100 层 / 50,000 节点）。')
      if (isNode(node) && 'items' in node) for (const item of node.items as unknown[]) {
        if (isNode(item)) visit(item, depth + 1)
        else if (item && typeof item === 'object' && 'value' in item) { visit('key' in item ? item.key : null, depth + 1); visit(item.value, depth + 1) }
      }
    }
    visit(docs[0]?.contents, 0)
    return { diagnostic: null }
  } catch (error) { return { diagnostic: { message: error instanceof Error ? error.message : 'YAML 校验失败。' } } }
}
