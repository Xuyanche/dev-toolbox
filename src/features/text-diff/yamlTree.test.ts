import { parse } from 'yaml'
import { analyze } from './analysis'
import { sourceFromText } from './io'
import { describeYaml, changeYamlComment, yamlNodeChange } from './yamlDocument'
import { applyCommentTransaction, applyNodeTransaction, createSession, historyStep } from './session'
import { initialTreeExpansion, nodeSourceValue, sharedTree, visibleTreeRows } from './treeModel'
import { pathKey, type Comparison, type TextEdit } from './model'

const patch = (text: string, edit: TextEdit) => text.slice(0, edit.from) + edit.insert + text.slice(edit.to)
const comparison = (left: string, right: string) => analyze({ kind: 'compare', mode: 'yaml', left: sourceFromText(left), right: sourceFromText(right) }) as Comparison
const LEFT = '# left document\nserver:\n  # listen port\n  port: 8080 # local only\n  host: localhost\nlogging:\n  level: info\n# footer\n'
const RIGHT = '# right document\nlogging:\n  level: debug\nserver:\n  host: localhost\n  # public port\n  port: 9090 # exposed\n'

describe('shared YAML tree descriptions', () => {
  it('aligns equal paths despite unrelated source positions and orders', () => {
    const session = createSession(comparison(LEFT, RIGHT))
    const model = sharedTree(session, describeYaml(session.text))
    const port = model.rows.get(pathKey(['server', 'port']))!
    expect(port.left?.preview).toBe('8080')
    expect(port.right?.preview).toBe('9090')
    expect(port.left?.line).not.toBe(port.right?.line)
    expect(port.differenceIndices).toHaveLength(1)
    expect(model.rows.get(pathKey(['server']))?.descendantDifferences).toBe(1)
  })
  it('keeps comment-only differences visible while hiding equal config values', () => {
    const session = createSession(comparison('a: 1 # left\nb: true\n', 'b: true\na: 1 # right\n'))
    const model = sharedTree(session, describeYaml(session.text))
    expect(session.comparison.differences).toHaveLength(0)
    const visible = visibleTreeRows(model.rows, new Set(['[]']), true, '')
    expect(visible.map(row => row.path)).toEqual([['a']])
    expect(visible[0].commentChanged).toBe(true)
  })
  it('shows array descendants read-only and targets the whole list', () => {
    const view = describeYaml('servers:\n  - name: one\n    port: 80\n')
    const node = view.nodes[pathKey(['servers', '0', 'name'])]
    expect(node.readonly).toBe(true)
    expect(node.actionPath).toEqual(['servers'])
    expect(node.preview).toBe('"one"')
  })
  it('routes preview children of a one-sided object to the object decision', () => {
    const session = createSession(comparison('keep: 1\n', 'keep: 1\nnew:\n  child: 2\n'))
    const rows = sharedTree(session, describeYaml(session.text)).rows
    expect(rows.get(pathKey(['new', 'child']))?.readonly).toBe(true)
    expect(rows.get(pathKey(['new', 'child']))?.actionPath).toEqual(['new'])
  })
  it('distinguishes absent, null and quoted scalar values', () => {
    const session = createSession(comparison('a: null\nb: "1"\n', 'b: 1\n'))
    const rows = sharedTree(session, describeYaml(session.text)).rows
    expect(rows.get(pathKey(['a']))?.left?.kind).toBe('null')
    expect(rows.get(pathKey(['a']))?.right).toBeUndefined()
    expect(rows.get(pathKey(['b']))?.left?.kind).toBe('string')
    expect(rows.get(pathKey(['b']))?.right?.kind).toBe('number')
  })
  it('renders top-level fields as siblings and independently merges their differences', () => {
    let session = createSession(comparison('server:\n  port: 80\nlogging:\n  level: info\n', 'logging:\n  level: debug\nserver:\n  port: 90\n'))
    const rows = sharedTree(session, describeYaml(session.text)).rows
    const visible = visibleTreeRows(rows, initialTreeExpansion(rows), false, '')
    expect(visible.map(row => row.path)).toEqual([['server'], ['server', 'port'], ['logging'], ['logging', 'level']])
    session = applyNodeTransaction(session, yamlNodeChange(session.text, ['server', 'port'], { source: session.comparison.right.text }), ['server', 'port'], 'right')
    session = applyNodeTransaction(session, yamlNodeChange(session.text, ['logging', 'level'], { source: session.comparison.left.text }), ['logging', 'level'], 'left')
    expect(parse(session.text)).toEqual({ server: { port: 90 }, logging: { level: 'info' } })
  })
  it('previews actual collection values and expands changed list descendants automatically', () => {
    const session = createSession(comparison('list:\n  - name: local\n    port: 80\n', 'list:\n  - name: remote\n    port: 90\n'))
    const rows = sharedTree(session, describeYaml(session.text)).rows
    expect(rows.get(pathKey(['list']))?.left?.preview).toContain('port: 80')
    expect(rows.get(pathKey(['list']))?.right?.preview).toContain('name: "remote"')
    expect(parse(nodeSourceValue(rows.get(pathKey(['list']))?.left, session.text))).toEqual([{ name: 'local', port: 80 }])
    expect(parse(nodeSourceValue(rows.get(pathKey(['list', '0']))?.left, session.text))).toEqual({ name: 'local', port: 80 })
    expect(visibleTreeRows(rows, initialTreeExpansion(rows), false, '').map(row => row.path)).toContainEqual(['list', '0', 'port'])
    expect(rows.get(pathKey(['list', '0', 'port']))?.readonly).toBe(true)
  })
  it('keeps complete long and multiline values available beyond the bounded tree preview', () => {
    const text = `long: "${'x'.repeat(400)}final value"\nblock: |\n  first\n  second\n`
    const view = describeYaml(text), long = view.nodes[pathKey(['long'])], block = view.nodes[pathKey(['block'])]
    expect(long.previewTruncated).toBe(true)
    expect(long.preview).not.toContain('final value')
    expect(nodeSourceValue(long, text)).toContain('final value')
    expect(nodeSourceValue(block, text)).toBe('|\n  first\n  second\n')
    expect(nodeSourceValue(undefined, text)).toBe('（字段不存在）')
  })
  it('keeps scalar and sequence document roots visible', () => {
    for (const [a, b] of [['one', 'two'], ['- a\n', '- b\n']]) {
      const session = createSession(comparison(a, b)), rows = sharedTree(session, describeYaml(session.text)).rows
      expect(visibleTreeRows(rows, initialTreeExpansion(rows), false, '')[0].path).toEqual([])
    }
  })
})

describe('comment attribution and isolated edits', () => {
  it('finds real comments, document notes and ambiguous blocks without reading # inside strings', () => {
    const view = describeYaml('# header\na: "# data" # inline\n\n# group note\n\nb: 2\n# footer\n')
    expect(view.comments.map(item => item.placement)).toEqual(['header', 'inline', 'independent', 'footer'])
    expect(view.comments.map(item => item.text)).not.toContain('data')
    expect(view.comments[2].anchorPath).toEqual(['b'])
  })
  it('changes an attached comment without changing config or decisions and restores it on undo', () => {
    let session = createSession(comparison(LEFT, RIGHT))
    const note = describeYaml(session.text).comments.find(item => item.placement === 'inline')!
    const choice = { path: note.path, placement: note.placement, text: 'custom explanation', source: note }
    session = applyCommentTransaction(session, changeYamlComment(session.text, note.id, choice), note.id, choice)
    expect(parse(session.text)).toEqual(parse(LEFT))
    expect(session.text).toContain('# custom explanation')
    expect(session.resolutions.every(item => item.decision === 'pending')).toBe(true)
    expect(historyStep(session, 'undo').text).toBe(LEFT)
  })
  it('retains an independently chosen annotation when a value or containing subtree is accepted', () => {
    let session = createSession(comparison(LEFT, RIGHT))
    const note = describeYaml(LEFT).comments.find(item => item.placement === 'inline')!
    const choice = { path: note.path, placement: note.placement, text: 'keep my note', source: note }
    session = applyCommentTransaction(session, changeYamlComment(session.text, note.id, choice), note.id, choice)
    const edit = yamlNodeChange(session.text, ['server'], { source: RIGHT, comments: session.commentChoices })
    session = applyNodeTransaction(session, edit, ['server'], 'right')
    expect(parse(session.text).server.port).toBe(9090)
    expect(session.text).toContain('# keep my note')
    expect(session.text).toContain('# public port')
    expect(session.text).toContain('# left document')
    expect(session.resolutions[0].decision).toBe('right')
    expect(historyStep(session, 'undo').text).toContain('port: 8080')
  })
  it('edits document notes and removes field annotations without touching scalar hashes', () => {
    let text = '# header\na: "# value" # annotation\n'
    let note = describeYaml(text).comments[0]
    text = patch(text, changeYamlComment(text, note.id, { path: [], placement: note.placement, text: 'new header\nsecond line', source: note }))
    note = describeYaml(text).comments.find(item => item.attached)!
    text = patch(text, changeYamlComment(text, note.id, { path: note.path, placement: note.placement, text: '', source: note }))
    expect(parse(text)).toEqual({ a: '# value' })
    expect(text).toContain('# new header\n# second line')
    expect(text).not.toContain('annotation')
  })
  it('retains left independent group notes when choosing a whole object', () => {
    const left = 'server:\n  a: 1\n\n  # grouping explanation\n\n  b: 2\n'
    const right = 'server:\n  b: 3\n  a: 4\n'
    const result = patch(left, yamlNodeChange(left, ['server'], { source: right }))
    expect(parse(result)).toEqual({ server: { a: 4, b: 3 } })
    expect(result).toContain('# grouping explanation')
  })
  it('keeps multiline inline annotations as one editable and removable field note', () => {
    let text = 'server:\n  port: 80 # old explanation\n  host: localhost\n'
    const note = describeYaml(text).comments[0]
    const choice = { path: note.path, placement: note.placement, text: 'first line\nsecond line', source: note }
    text = patch(text, changeYamlComment(text, note.id, choice))
    expect(describeYaml(text).comments).toHaveLength(1)
    expect(describeYaml(text).comments[0].text).toBe('first line\nsecond line')
    text = patch(text, yamlNodeChange(text, ['server', 'port'], { source: 'server:\n  port: 90 # replacement\n  host: remote\n', comments: { [note.id]: choice } }))
    expect(describeYaml(text).comments[0].text).toBe('first line\nsecond line')
    text = patch(text, changeYamlComment(text, note.id, { ...choice, text: '' }))
    expect(describeYaml(text).comments).toHaveLength(0)
    expect(parse(text)).toEqual({ server: { port: 90, host: 'localhost' } })
  })
})

describe('typed local node edits', () => {
  it('does not mark a missing sibling as manually edited when deleting an adjacent field', () => {
    let session = createSession(comparison('a: 1\nlegacy: true\n', 'a: 1\ntimeout: 30\n'))
    session = applyNodeTransaction(session, yamlNodeChange(session.text, ['legacy'], { source: session.comparison.right.text }), ['legacy'], 'right')
    expect(session.resolutions[1].dirty).toBe(false)
    session = applyNodeTransaction(session, yamlNodeChange(session.text, ['timeout'], { source: session.comparison.right.text }), ['timeout'], 'right')
    expect(parse(session.text)).toEqual({ a: 1, timeout: 30 })
    expect(session.resolutions.map(item => item.decision)).toEqual(['right', 'right'])
  })
  it('edits scalars as YAML values and keeps sibling source formatting', () => {
    const text = 'port: 8080 # keep\nuntouched: "style"\n'
    const result = patch(text, yamlNodeChange(text, ['port'], { value: '"9090"' }))
    expect(parse(result)).toEqual({ port: '9090', untouched: 'style' })
    expect(result).toContain('untouched: "style"')
    expect(result).toContain('# keep')
  })
  it('edits a whole list and rejects invalid partial YAML', () => {
    const text = 'list: [a, b]\nkeep: true\n'
    expect(parse(patch(text, yamlNodeChange(text, ['list'], { value: '- c\n- d\n' })))).toEqual({ list: ['c', 'd'], keep: true })
    expect(() => yamlNodeChange(text, ['list'], { value: '[' })).toThrow()
  })
})
