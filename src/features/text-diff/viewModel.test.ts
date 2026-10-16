import { ChangeSet } from '@codemirror/state'
import { sourceFromText } from './io'
import { compareText } from './textCompare'
import { changeResult, createSession } from './session'
import { mapScrollPosition, scrollAnchors, sharedFolds } from './viewModel'

describe('coordinated document views', () => {
  const common = Array.from({ length: 30 }, (_, i) => `common ${i}`).join('\n') + '\n'
  const comparison = compareText(sourceFromText(`${common}old\n${common}`), sourceFromText(`${common}new\nextra\nextra\n${common}`))
  it('maps content anchors across insertions rather than copying scroll pixels', () => {
    const session = createSession(comparison)
    const anchors = scrollAnchors(session)
    const pos = session.text.lastIndexOf('common 20')
    expect(mapScrollPosition(anchors, 'left', 'right', pos)).toBe(comparison.right.text.lastIndexOf('common 20'))
  })
  it('folds three documents together and expands only the chosen shared block', () => {
    const session = createSession(comparison)
    const folds = sharedFolds(session, new Set())
    expect(folds.left).toHaveLength(2)
    expect(folds.result).toHaveLength(2)
    expect(folds.right).toHaveLength(2)
    const expanded = sharedFolds(session, new Set([folds.left[0].id]))
    expect(expanded.left).toHaveLength(1)
    expect(expanded.result).toHaveLength(1)
    expect(expanded.right).toHaveLength(1)
    expect(session.text).toContain('common 20')
  })
  it('never folds result edits just because the two sources match', () => {
    const initial = createSession(comparison)
    const session = changeResult(initial, ChangeSet.of({ from: 80, to: 81, insert: 'manual' }, initial.text.length))
    const folds = sharedFolds(session, new Set())
    expect(folds.left).toHaveLength(1)
    expect(folds.result[0].span.from).toBeGreaterThan(common.length)
  })
  it('emits folds in document order even when the later equal block is larger', () => {
    const short = Array.from({ length: 20 }, (_, i) => `before_${i}: same\n`).join('')
    const long = Array.from({ length: 80 }, (_, i) => `after_${i}: same\n`).join('')
    const session = createSession(compareText(sourceFromText(`${short}a: left\n${long}`), sourceFromText(`${short}a: right\n${long}`)))
    const folds = sharedFolds(session, new Set())
    for (const pane of ['left', 'result', 'right'] as const) {
      expect(folds[pane]).toHaveLength(2)
      expect(folds[pane][0].span.to).toBeLessThan(folds[pane][1].span.from)
    }
  })
})
