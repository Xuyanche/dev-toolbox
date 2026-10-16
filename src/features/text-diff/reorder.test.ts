import { ChangeSet } from '@codemirror/state'
import { parse, parseDocument } from 'yaml'
import { analyze } from './analysis'
import { sourceFromText } from './io'
import { acceptEdit, changeResult, createSession, historyStep, rebaseTextSession } from './session'
import { compareText } from './textCompare'
import { formatYaml, reorderYaml, validateYamlText } from './yamlReorder'
import type { Comparison } from './model'

const reorder = (left: string, right: string) => reorderYaml(sourceFromText(left), sourceFromText(right))
describe('YAML source-preserving order assistance', () => {
  it('recursively follows the left mapping order without inheriting left values', () => {
    const left = 'server:\n  port: 80\n  host: local\nlogging:\n  level: info\n'
    const right = 'logging:\n  level: debug\nserver:\n  host: remote\n  port: 90\n'
    const output = reorder(left, right)
    expect(output.text).toBe('server:\n  port: 90\n  host: remote\nlogging:\n  level: debug\n')
    expect(parse(output.text)).toEqual(parse(right)); expect(output.skipped).toEqual([])
  })
  it('appends right-only keys in original relative order without adding left-only keys', () => {
    expect(reorder('a: 1\nleft_only: true\nb: 2\n', 'extra_z: 3\nb: 4\nextra_a: 5\na: 6\n').text).toBe('a: 6\nb: 4\nextra_z: 3\nextra_a: 5\n')
  })
  it('does not reorder lists or mapping entries within their items', () => {
    const list = 'list:\n  - z: 8\n    a: 9\n  - z: 6\n    a: 7\n'
    expect(reorder('list:\n  - a: 1\n    z: 2\nkeep: true\n', 'keep: false\n' + list).text).toBe(list + 'keep: false\n')
  })
  it('moves attached comments with fields and preserves header, footer, quotes and block strings', () => {
    const right = '# right document\nb: "right" # inline\n# attached to a\na: |\n  first\n  second\n# document footer\n'
    const output = reorder('a: |\n  left\nb: left\n', right).text
    expect(output).toBe('# right document\n# attached to a\na: |\n  first\n  second\nb: "right" # inline\n# document footer\n')
    expect(parse(output)).toEqual(parse(right))
  })
  it('keeps independent notes as barriers but can reorder safe nested maps', () => {
    const right = 'b: 2\n\n# grouping explanation\n\na:\n  y: 3\n  x: 4\n'
    const output = reorder('a:\n  x: 1\n  y: 2\nb: 3\n', right)
    expect(output.text).toBe('b: 2\n\n# grouping explanation\n\na:\n  x: 4\n  y: 3\n')
    expect(output.skipped[0]).toContain('独立分组说明')
  })
  it('skips flow mapping order and preserves exact field forms', () => {
    const output = reorder('a: { x: 1, y: 2 }\nb: true\n', 'b: false\na: { y: 03, x: "1" }\n')
    expect(output.text).toBe('a: { y: 03, x: "1" }\nb: false\n')
    expect(output.skipped[0]).toContain('流式映射')
  })
  it('handles missing final newline and empty values without joining fields', () => {
    expect(reorder('a: null\nb: 1\n', 'b: 2\na:').text).toBe('a:\nb: 2')
    expect(reorder('a: 1\nb: 2\n', 'b: 3\na: 4').text).toBe('a: 4\nb: 3')
  })
  it('retains large integer and quoted-key paths and rejects unsafe semantic constructs', () => {
    const text = 'b: 9223372036854775809\n"a.b": "001"\n'
    expect(reorder('"a.b": 1\nb: 1\n', text).text).toContain('9223372036854775809')
    expect(() => reorder('a: 1', 'a: &ref 1\nb: *ref\n')).toThrow(/锚点/)
    expect(() => reorder('a: 1', 'a: 1\na: 2\n')).toThrow()
  })
  it('reorders integer keys recursively and carries their attached comments', () => {
    const left = 'routes:\n  200:\n    name: first\n    enabled: true\n  404: missing\n'
    const right = 'routes:\n  404: absent\n  # successful route\n  200:\n    enabled: false\n    name: second # route name\n'
    const output = reorder(left, right)
    expect(output.text).toBe('routes:\n  # successful route\n  200:\n    name: second # route name\n    enabled: false\n  404: absent\n')
    expect(parse(output.text)).toEqual(parse(right))
  })
  it('distinguishes numeric keys from identically spelled string keys and moves the correct child maps', () => {
    const left = '1:\n  a: left\n  b: left\n"1":\n  b: left\n  a: left\n'
    const right = '"1":\n  a: string-a\n  b: string-b\n1:\n  b: number-b\n  a: number-a\n'
    const output = reorder(left, right).text
    expect(output).toBe('1:\n  a: number-a\n  b: number-b\n"1":\n  b: string-b\n  a: string-a\n')
    const values = parseDocument(output).toJS({ mapAsMap: true }) as Map<unknown, unknown>
    expect(values.size).toBe(2)
    expect(values.get(1)).toEqual(new Map([['a', 'number-a'], ['b', 'number-b']]))
    expect(values.get('1')).toEqual(new Map([['b', 'string-b'], ['a', 'string-a']]))
  })
  it('supports boolean and null keys without conflating quoted strings', () => {
    const left = 'true: left\n"true": left\nnull: left\n"null": left\n'
    const right = '"null": string-null\nnull: actual-null\n"true": string-true\ntrue: actual-true\n'
    expect(reorder(left, right).text).toBe('true: actual-true\n"true": string-true\nnull: actual-null\n"null": string-null\n')
  })
  it('matches integer spellings by value while retaining source spelling and precision', () => {
    const left = '16: left\n9007199254740993: left\n9007199254740992: left\n'
    const right = '9007199254740992: first\n9007199254740993: second\n0x10: third\n'
    expect(reorder(left, right).text).toBe('0x10: third\n9007199254740993: second\n9007199254740992: first\n')
  })
  it('retains scalar keys inside unchanged sequences and flow mappings', () => {
    const right = 'list:\n  - 1: right\n    "1": string\nflow: { 2: right, 1: left }\n'
    const output = reorder('flow: { 1: left, 2: right }\nlist:\n  - "1": left\n    1: left\n', right)
    expect(output.text).toBe('flow: { 2: right, 1: left }\nlist:\n  - 1: right\n    "1": string\n')
    expect(output.skipped).toEqual(['flow：流式映射保持原顺序'])
  })
  it('reports the actual side and position of an unsupported complex key', () => {
    expect(() => reorder('a: 1\n', 'a: 2\nnested:\n  ? [x, y]\n  : value\n')).toThrow(/右侧 YAML：.*复杂键.*第 3 行，第 5 列/)
    expect(() => reorder('a: 1\nnested:\n  value: &ref 3\n', 'a: 2\n')).toThrow(/左侧 YAML：.*锚点.*第 3 行/)
  })
  it('formats mappings containing typed keys without merging them', () => {
    const output = formatYaml('1:   number\n"1":   string\n')
    expect(output).toBe('1: number\n"1": string\n')
    expect((parseDocument(output).toJS({ mapAsMap: true }) as Map<unknown, unknown>).size).toBe(2)
  })
  it('formats explicitly and keeps syntax validation separate from supported reordering', () => {
    expect(formatYaml('a:   { b: 1 }\n')).toContain('a: { b: 1 }')
    expect(validateYamlText('a: &ref 1\nb: *ref\n').diagnostic).toBeNull()
    expect(validateYamlText('a: [').diagnostic).not.toBeNull()
  })
})
describe('right candidate snapshots and result history', () => {
  const left = sourceFromText('a: 1\nb: 2\n'), original = sourceFromText('b: 3\na: 4\n')
  it('keeps a manual draft across reorder and one undo restores the original candidate', () => {
    let session = createSession(compareText(left, original))
    session = changeResult(session, ChangeSet.of({ from: session.text.length, insert: 'custom: true\n' }, session.text.length))
    const text = session.text, candidate = { ...original, text: reorderYaml(left, original).text }
    session = rebaseTextSession(session, { ...compareText(left, candidate), originalRight: original }, compareText(left, { ...left, text }))
    expect(session.text).toBe(text); expect(session.comparison.right.text.startsWith('a: 4')).toBe(true)
    const undo = historyStep(session, 'undo')
    expect(undo.text).toBe(text); expect(undo.comparison.right).toEqual(original)
    expect(historyStep(undo, 'undo').text).toBe(left.text)
    expect(historyStep(undo, 'redo').comparison.right).toEqual(candidate)
  })
  it('locates new differences in a manually changed result and preserves unrelated edits', () => {
    let session = createSession(compareText(left, original))
    const manual = 'custom: true\na: 10\nb: 2\n'
    session = changeResult(session, ChangeSet.of({ from: 0, to: session.text.length, insert: manual }, session.text.length))
    const candidate = { ...original, text: 'a: 1\nb: 3\n' }
    session = rebaseTextSession(session, { ...compareText(left, candidate), originalRight: original }, compareText(left, { ...left, text: manual }))
    expect(session.resolutions).toHaveLength(1)
    session = acceptEdit(session, 0, 'right')
    expect(session.text).toBe('custom: true\na: 10\nb: 3\n')
  })
  it('routes the new background operations through the same worker analysis boundary', () => {
    const reordered = analyze({ kind: 'reorder', left, right: original }) as { text: string }
    const output = analyze({ kind: 'recompare', left, right: { ...original, text: reordered.text }, originalRight: original, result: left.text }) as { comparison: Comparison; mapping: Comparison }
    expect(output.comparison.originalRight).toEqual(original); expect(output.mapping.differences).toHaveLength(0)
  })
  it('supports undo even when reordering is the first operation before comparing', () => {
    const candidate = { ...original, text: reorderYaml(left, original).text }
    const output = analyze({ kind: 'recompare', left, right: candidate, originalRight: original, result: left.text, initial: true }) as { comparison: Comparison; mapping: Comparison; initial: Comparison }
    const session = rebaseTextSession(createSession(output.initial), output.comparison, output.mapping)
    expect(historyStep(session, 'undo').comparison.right.text).toBe(original.text)
    expect(historyStep(session, 'undo').text).toBe(left.text)
  })
  it('bounds reversed large line comparisons while retaining the entire text in a decision block', () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `field_${i}: ${i}`)
    const a = sourceFromText(lines.join('\n')), b = sourceFromText(lines.reverse().join('\n'))
    const comparison = compareText(a, b)
    expect(comparison.differences).toHaveLength(1)
    expect(comparison.differences[0].label).toContain('整份文档')
    expect(acceptEdit(createSession(comparison), 0, 'right').text).toBe(b.text)
  })
})
