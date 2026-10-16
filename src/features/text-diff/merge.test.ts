import { ChangeSet } from '@codemirror/state'
import { parse as parseValue } from 'yaml'
import { analyze } from './analysis'
import { sourceFromText, exportText, MAX_BYTES, resolveMode } from './io'
import { compareText } from './textCompare'
import { analyzeYaml, compareYaml, yamlAcceptance } from './yamlMerge'
import { acceptEdit, changeResult, confirmManual, createSession, historyStep, isComplete, pendingCount, reconcileYaml } from './session'
import { YAML_LEFT, YAML_RIGHT, TEXT_LEFT, TEXT_RIGHT } from './fixtures'
import { pathKey, type Session } from './model'

const source = (text: string) => sourceFromText(text)
function yamlSession(left: string, right: string) { return createSession(compareYaml(source(left), source(right))) }
function choose(session: Session, path: string[], side: 'left' | 'right') {
  const i = session.comparison.differences.findIndex(diff => JSON.stringify(diff.path) === JSON.stringify(path))
  const edit = yamlAcceptance(session.text, session.comparison[side].text, path)
  return reconcileYaml(acceptEdit(session, i, side, edit), analyzeYaml(session.text.slice(0, edit.from) + edit.insert + session.text.slice(edit.to)))
}

describe('text comparison and input integrity', () => {
  it('merges separated replacements, insertions and deletions with an explicit decision per block', () => {
    let session = createSession(compareText(source(TEXT_LEFT), source(TEXT_RIGHT)))
    expect(pendingCount(session)).toBeGreaterThan(0)
    expect(session.text).toBe(TEXT_LEFT)
    for (let i = 0; i < session.resolutions.length; i++) session = acceptEdit(session, i, 'right')
    expect(session.text).toBe(TEXT_RIGHT)
    expect(isComplete(session, false, false)).toBe(true)
    expect(session.comparison.differences.length).toBeGreaterThan(0)
  })
  it.each([['', ''], ['', 'right\n'], ['left', ''], ['same\n', 'same\n']])('handles empty and identical inputs %j / %j', (left, right) => {
    let session = createSession(compareText(source(left), source(right)))
    for (let i = 0; i < session.resolutions.length; i++) session = acceptEdit(session, i, 'right')
    expect(session.text).toBe(right)
  })
  it('detects whitespace, final newline and newline style', () => {
    expect(compareText(source(' a\n'), source('a\n')).differences).toHaveLength(1)
    expect(compareText(source('a\n'), source('a')).differences).toHaveLength(1)
    const session = createSession(compareText(source('a\r\nb\r\n'), source('a\nb\n')))
    expect(session.comparison.differences[0].kind).toBe('eol')
    expect(acceptEdit(session, 0, 'right').eol).toBe('LF')
    expect(exportText('a\nb\n', 'CRLF')).toBe('a\r\nb\r\n')
  })
  it('uses filenames only for automatic YAML selection and keeps integer source text', () => {
    expect(resolveMode('auto', source('a: 1'), source('a: 2'))).toBe('text')
    expect(resolveMode('auto', sourceFromText('a: 1', 'CONFIG.YML'), source('a: 2'))).toBe('yaml')
    expect(sourceFromText('\uFEFFa\r\nb').text).toBe('a\nb')
  })
  it('rejects oversized, excessive-line and NUL inputs without changing existing data', () => {
    expect(() => source('x'.repeat(MAX_BYTES + 1))).toThrow('2 MiB')
    expect(() => source('\n'.repeat(20_000))).toThrow('20,000')
    expect(() => source('a\0b')).toThrow('NUL')
  })
})

describe('YAML semantic comparison and source-preserving merge', () => {
  it('combines independently chosen child fields and whole lists while retaining unrelated comments', () => {
    let session = yamlSession(YAML_LEFT, YAML_RIGHT)
    expect(session.comparison.differences.map(diff => diff.path)).toEqual([['server', 'port'], ['logging', 'level'], ['servers'], ['legacy'], ['timeout']])
    session = choose(session, ['server', 'port'], 'right')
    expect(session.text).toContain('# 应用配置 · 本地环境')
    expect(session.text).toContain('# 对外端口\n  port: 9090')
    expect(session.text).toContain('  host: localhost')
    session = choose(session, ['logging', 'level'], 'left')
    session = choose(session, ['servers'], 'right')
    session = choose(session, ['legacy'], 'right')
    session = choose(session, ['timeout'], 'right')
    expect(parseValue(session.text)).toMatchObject({ server: { port: 9090, host: 'localhost' }, logging: { level: 'info' }, timeout: 30 })
    expect(parseValue(session.text).servers).toHaveLength(2)
    expect(parseValue(session.text)).not.toHaveProperty('legacy')
    expect(pendingCount(session)).toBe(0)
  })
  it('ignores order and presentation but distinguishes types, null and large integers', () => {
    expect(compareYaml(source('# left\na: 1\nb: "hello"\n'), source('b: hello\na: 1 # right\n')).differences).toHaveLength(0)
    const comparison = compareYaml(source('a: 1\nb: null\nc: 9007199254740992\n'), source('a: "1"\nc: 9007199254740993\n'))
    expect(comparison.differences.map(diff => diff.path)).toEqual([['a'], ['b'], ['c']])
  })
  it('keeps dotted keys distinct and merges type changes atomically', () => {
    const comparison = compareYaml(source('"a.b": 1\na:\n  b: 2\n'), source('"a.b": 3\na: scalar\n'))
    expect(comparison.differences.map(diff => diff.path)).toEqual([['a.b'], ['a']])
  })
  it('keeps sequence comments, block string values and document footer', () => {
    let session = yamlSession('# left header\nlist:\n  - one\ntext: |\n  old\n# footer\n', 'list:\n  # list note\n  - two # inline\ntext: |\n  two\n  lines\n')
    session = choose(session, ['list'], 'right')
    session = choose(session, ['text'], 'right')
    expect(session.text).toContain('# list note')
    expect(session.text).toContain('# inline')
    expect(session.text).toContain('# footer')
    expect(parseValue(session.text).text).toBe('two\nlines\n')
  })
  it('supports flow maps, insertions, deletion and re-selection', () => {
    let session = yamlSession('a: { x: 1, y: 2 }\nother: true\n', 'a: { x: 3, z: [a, b] }\nother: true\n')
    session = choose(session, ['a', 'x'], 'right')
    session = choose(session, ['a', 'y'], 'right')
    session = choose(session, ['a', 'z'], 'right')
    expect(parseValue(session.text)).toEqual({ a: { x: 3, z: ['a', 'b'] }, other: true })
    session = choose(session, ['a', 'y'], 'left')
    expect(parseValue(session.text).a.y).toBe(2)
  })
  it('keeps an empty map when deleting its last field and can restore it', () => {
    let session = yamlSession('a:\n  only: true\nend: false\n', 'a: {}\nend: false\n')
    session = choose(session, ['a', 'only'], 'right')
    expect(parseValue(session.text)).toEqual({ a: {}, end: false })
    session = choose(session, ['a', 'only'], 'left')
    expect(parseValue(session.text).a.only).toBe(true)
  })
  it('does not concatenate the adopted EOF scalar with a following field', () => {
    const session = choose(yamlSession('a: 1\nb: 2\n', 'a: 3'), ['a'], 'right')
    expect(parseValue(session.text)).toEqual({ a: 3, b: 2 })
  })
  it.each(['a: 1\na: 2\n', 'a: &ref 1\nb: *ref\n', 'a: !custom value\n', 'a: 1\n---\nb: 2\n', '1: hello\n', '<<: { a: 1 }\n', 'a: [\n'])('rejects unsupported/invalid structures explicitly: %j', text => {
    expect(analyzeYaml(text).diagnostic).not.toBeNull()
    expect(() => compareYaml(source(text), source('a: 1'))).toThrow('左侧 YAML')
  })
  it('rejects extreme nesting and preserves a valid root scalar or sequence', () => {
    expect(analyzeYaml('['.repeat(110) + '0' + ']'.repeat(110)).diagnostic?.message).toContain('复杂度')
    expect(choose(yamlSession('[1, 2]\n', '[2, 3]\n'), [], 'right').text).toBe('[2, 3]\n')
    expect(choose(yamlSession('old\n', 'new\n'), [], 'right').text).toBe('new\n')
  })

  it('compares deep valid maps and sequences without repeatedly escaping child signatures', () => {
    const deepMap = Array.from({ length: 80 }, (_, i) => `${'  '.repeat(i)}level${i}:`).join('\n') + `\n${'  '.repeat(80)}value: "a quoted value"\n`
    const deepSequence = '['.repeat(80) + '"a quoted value"' + ']'.repeat(80)
    for (const text of [deepMap, deepSequence]) {
      const checked = analyzeYaml(text)
      expect(checked.diagnostic).toBeNull()
      expect(checked.entries['[]'].signature.length).toBeLessThan(text.length * 5)
      expect(compareYaml(source(text), source(text)).differences).toHaveLength(0)
    }
  })
})

describe('transactional edits and resolution integrity', () => {
  it('preserves an unrelated manual edit and restores metadata on undo/redo', () => {
    let session = createSession(compareText(source('a\nold\nsame\nlast\n'), source('a\nnew\nsame\nnext\n')))
    session = changeResult(session, ChangeSet.of({ from: 2, to: 5, insert: 'custom' }, session.text.length))
    expect(session.resolutions[0].dirty).toBe(true)
    session = confirmManual(session, 0)
    session = acceptEdit(session, 1, 'right')
    expect(session.text).toBe('a\ncustom\nsame\nnext\n')
    expect(session.resolutions.map(item => item.decision)).toEqual(['manual', 'right'])
    session = historyStep(session, 'undo')
    expect(session.text).toContain('last')
    expect(session.resolutions[1].decision).toBe('pending')
    session = historyStep(session, 'redo')
    expect(session.text).toContain('next')
    expect(session.resolutions[1].decision).toBe('right')
  })
  it('pauses mapping after a manual key rename and allows explicit manual confirmation', () => {
    let session = yamlSession('a: 1\nb: 2\n', 'a: 3\nb: 2\n')
    session = changeResult(session, ChangeSet.of({ from: 0, to: 1, insert: 'renamed' }, session.text.length))
    session = reconcileYaml(session, analyzeYaml(session.text))
    expect(session.resolutions[0].safe).toBe(false)
    expect(() => acceptEdit(session, 0, 'right')).toThrow('安全定位')
    session = confirmManual(session, 0)
    expect(isComplete(session, false, false)).toBe(true)
    expect(isComplete(session, true, false)).toBe(false)
    expect(isComplete(session, false, true)).toBe(false)
    expect(session.text).toContain('renamed')
  })
  it('reports invalid intermediate YAML and recovers after repair', () => {
    expect(analyze({ kind: 'validate', text: 'a: [' })).toMatchObject({ diagnostic: { message: expect.any(String) } })
    const result = analyzeYaml('a: [1]\n')
    expect(result.diagnostic).toBeNull()
    expect(result.entries[pathKey(['a'])].kind).toBe('seq')
  })
})
