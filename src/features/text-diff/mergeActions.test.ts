import { ChangeSet } from '@codemirror/state'
import { parse } from 'yaml'
import { MAX_BYTES, sourceFromText } from './io'
import { compareText } from './textCompare'
import { acceptAllPending, acceptEdit, acceptSide, changeResult, confirmManual, createSession, historyStep, ignoreSide, isComplete, pendingCount, rebaseTextSession, resetDifference } from './session'

const start = (left = 'items:\n  - left\nkeep: true\n', right = 'items:\n  - right\nkeep: true\n') => createSession(compareText(sourceFromText(left), sourceFromText(right)))

describe('IDE style per-side merge actions', () => {
  it.each(['left', 'right'] as const)('resolves all pending changes from %s in one reversible transaction', side => {
    const initial = start('a: left\nkeep: true\nremove: yes\nend: true\n', 'a: right\nkeep: true\nend: true\nadded: yes\n')
    const next = acceptAllPending(initial, side)
    expect(next.text).toBe(initial.comparison[side].text)
    expect(pendingCount(next)).toBe(0)
    expect(next.resolutions.every(item => item.decision === side && !item.dirty && item.safe)).toBe(true)
    expect(next.undo).toHaveLength(1)
    const undone = historyStep(next, 'undo')
    expect(undone.text).toBe(initial.text)
    expect(undone.resolutions).toEqual(initial.resolutions)
    expect(historyStep(undone, 'redo').resolutions).toEqual(next.resolutions)
    expect(historyStep(undone, 'redo').text).toBe(next.text)
    expect(acceptAllPending(next, side)).toBe(next)
  })

  it('keeps confirmed choices and manual edits outside pending blocks', () => {
    const initial = start('a: left\nkeep: true\nb: left\nend: true\nc: left\n', 'a: right\nkeep: true\nb: right\nend: true\nc: right\n')
    const confirmed = confirmManual(acceptEdit(initial, 0, 'left'), 1)
    const at = confirmed.text.indexOf('true')
    const manual = changeResult(confirmed, ChangeSet.of({ from: at, to: at + 4, insert: 'false' }, confirmed.text.length))
    const next = acceptAllPending(manual, 'right')
    expect(parse(next.text)).toEqual({ a: 'left', keep: false, b: 'left', end: true, c: 'right' })
    expect(next.resolutions.slice(0, 2)).toEqual(manual.resolutions.slice(0, 2))
    expect(next.undo.length).toBe(manual.undo.length + 1)
  })

  it('replaces a partially accepted block rather than appending during bulk resolution', () => {
    const partial = acceptSide(start(), 0, 'left'), next = acceptAllPending(partial, 'right')
    expect(parse(next.text).items).toEqual(['right'])
    expect(next.resolutions[0].sides).toEqual({ left: 'ignored', right: 'accepted' })
    expect(historyStep(next, 'undo').resolutions).toEqual(partial.resolutions)
  })

  it('keeps a confirmed deletion and maps later bulk edits accurately', () => {
    const initial = start('a: left\nkeep: true\nb: left\n', 'a: right\nkeep: true\nb: right\n')
    const deleted = ignoreSide(ignoreSide(initial, 0, 'left'), 0, 'right')
    const next = acceptAllPending(deleted, 'right')
    expect(parse(next.text)).toEqual({ keep: true, b: 'right' })
    expect(next.resolutions[0]).toEqual(deleted.resolutions[0])
    expect(next.text.slice(next.resolutions[1].range.from, next.resolutions[1].range.to)).toBe('b: right\n')
  })

  it('records line ending and content choices together and undoes both', () => {
    const initial = start('a: left\r\nkeep: true\r\n', 'a: right\nkeep: true\n'), next = acceptAllPending(initial, 'right')
    expect(next.eol).toBe('LF')
    expect(next.text).toBe(initial.comparison.right.text)
    expect(pendingCount(next)).toBe(0)
    expect(historyStep(next, 'undo').eol).toBe('CRLF')
    expect(historyStep(next, 'undo').resolutions).toEqual(initial.resolutions)
  })

  it('refuses the entire batch if a pending range is unsafe', () => {
    const initial = start('a: left\nkeep: true\nb: left\n', 'a: right\nkeep: true\nb: right\n')
    const at = initial.text.indexOf('b:')
    const edited = changeResult(initial, ChangeSet.of({ from: at - 2, to: at + 2, insert: '\nb:' }, initial.text.length))
    expect(edited.resolutions[1].safe).toBe(false)
    expect(() => acceptAllPending(edited, 'right')).toThrow('批量操作未执行')
    expect(edited.text).toContain('a: left')
    expect(edited.resolutions[0].decision).toBe('pending')
  })

  it('rejects an oversized combined result without changing the draft or history', () => {
    const initial = start('a: left\nkeep: true\nb: left\n', `a: ${'r'.repeat(MAX_BYTES - 100)}\nkeep: true\nb: right\n`)
    const at = initial.text.indexOf('true')
    const edited = changeResult(initial, ChangeSet.of({ from: at, to: at + 4, insert: 'm'.repeat(MAX_BYTES + 200) }, initial.text.length))
    expect(() => acceptAllPending(edited, 'right')).toThrow('4 MiB')
    expect(pendingCount(edited)).toBe(2)
    expect(edited.undo).toHaveLength(1)
  })

  it('refuses overlapping ranges after reordering a draft that replaced multiple blocks', () => {
    const initial = start('a: left\nkeep: true\nb: left\n', 'a: right\nkeep: true\nb: right\n')
    const edited = changeResult(initial, ChangeSet.of({ from: 0, to: initial.text.length, insert: 'custom: true\n' }, initial.text.length))
    const rebased = rebaseTextSession(edited, initial.comparison, compareText(initial.comparison.left, sourceFromText(edited.text)))
    expect(rebased.resolutions[0].range).toEqual(rebased.resolutions[1].range)
    expect(() => acceptAllPending(rebased, 'right')).toThrow('批量操作未执行')
    expect(rebased.text).toBe('custom: true\n')
    expect(rebased.undo).toHaveLength(2)
  })

  it('does not revive an unsafe manual range during reorder or permit deleting other blocks', () => {
    const initial = start('a: left\nkeep: true\nb: left\n', 'a: right\nkeep: true\nb: right\n')
    const edited = changeResult(initial, ChangeSet.of({ from: 0, to: initial.text.length, insert: 'custom: true\n' }, initial.text.length))
    const rebased = rebaseTextSession(edited, initial.comparison, compareText(initial.comparison.left, sourceFromText(edited.text)))
    expect(rebased.resolutions.every(item => !item.safe && item.dirty)).toBe(true)
    expect(() => acceptEdit(rebased, 0, 'right')).toThrow('安全定位')
    expect(() => ignoreSide(ignoreSide(rebased, 0, 'left'), 0, 'right')).toThrow('无法安全删除')
    const confirmed = confirmManual(confirmManual(rebased, 0), 1)
    expect(confirmed.text).toBe('custom: true\n')
    expect(isComplete(confirmed, false, false)).toBe(true)
    expect(historyStep(rebased, 'undo').resolutions).toEqual(edited.resolutions)
  })

  it('preserves a confirmed deletion when the same block is rebased', () => {
    const initial = start(), deleted = ignoreSide(ignoreSide(initial, 0, 'left'), 0, 'right')
    const rebased = rebaseTextSession(deleted, initial.comparison, compareText(initial.comparison.left, sourceFromText(deleted.text)))
    expect(rebased.resolutions[0].present).toBe(false)
    expect(rebased.resolutions[0].decision).toBe('ignored')
    expect(rebased.text).toBe(deleted.text)
  })

  it('accepts one side without silently deciding the other', () => {
    const initial = start(), next = acceptSide(initial, 0, 'right')
    expect(parse(next.text).items).toEqual(['right'])
    expect(next.resolutions[0].sides).toEqual({ left: 'pending', right: 'accepted' })
    expect(pendingCount(next)).toBe(1)
    expect(isComplete(next, false, false)).toBe(false)
    expect(initial.resolutions[0].sides).toEqual({ left: 'pending', right: 'pending' })
    expect(acceptSide(next, 0, 'right')).toBe(next)
    expect(ignoreSide(next, 0, 'right')).toBe(next)
  })

  it.each(['left', 'right'] as const)('ignores %s without changing the result, then accepts the other side', side => {
    const initial = start(), ignored = ignoreSide(initial, 0, side)
    expect(ignored.text).toBe(initial.text)
    expect(ignored.resolutions[0].sides[side]).toBe('ignored')
    expect(pendingCount(ignored)).toBe(1)
    const other = side === 'left' ? 'right' : 'left', finished = acceptSide(ignored, 0, other)
    expect(finished.text).toBe(initial.comparison[other].text)
    expect(finished.resolutions[0].decision).toBe(other)
    expect(isComplete(finished, false, false)).toBe(true)
  })

  it.each(['left', 'right'] as const)('appends the second accepted side in click order starting with %s', first => {
    const second = first === 'left' ? 'right' : 'left'
    const next = acceptSide(acceptSide(start(), 0, first), 0, second)
    expect(parse(next.text)).toEqual({ items: [first, second], keep: true })
    expect(next.resolutions[0].decision).toBe('both')
    expect(next.resolutions[0].sides).toEqual({ left: 'accepted', right: 'accepted' })
    expect(pendingCount(next)).toBe(0)
  })

  it('separates two accepted final lines when the inputs have no final newline', () => {
    const next = acceptSide(acceptSide(start('- left', '- right'), 0, 'right'), 0, 'left')
    expect(next.text).toBe('- right\n- left')
    expect(parse(next.text)).toEqual(['right', 'left'])
  })

  it('rejects appending beyond the result limit without losing the partial decision', () => {
    const initial = start(), padding = '#'.repeat(MAX_BYTES * 2 - initial.text.length)
    const manual = changeResult(initial, ChangeSet.of({ from: initial.text.length, insert: padding }, initial.text.length))
    const partial = acceptSide(manual, 0, 'left')
    expect(() => acceptSide(partial, 0, 'right')).toThrow('4 MiB')
    expect(partial.text).toHaveLength(MAX_BYTES * 2)
    expect(partial.resolutions[0].sides).toEqual({ left: 'accepted', right: 'pending' })
    expect(partial.undo).toHaveLength(2)
  })

  it('removes the result block when both sides are ignored, including manual contents', () => {
    const initial = start(), at = initial.text.indexOf('left')
    const manual = changeResult(initial, ChangeSet.of({ from: at, to: at + 4, insert: 'manual' }, initial.text.length))
    const next = ignoreSide(ignoreSide(manual, 0, 'left'), 0, 'right')
    expect(parse(next.text)).toEqual({ items: null, keep: true })
    expect(next.text).not.toContain('manual')
    expect(next.resolutions[0].decision).toBe('ignored')
    expect(next.resolutions[0].dirty).toBe(false)
  })

  it('supports the resolve whole conflict modifier and the bottom one-step shortcuts', () => {
    const initial = start()
    expect(acceptSide(initial, 0, 'right', true).resolutions[0].sides).toEqual({ left: 'ignored', right: 'accepted' })
    expect(ignoreSide(initial, 0, 'right', true).resolutions[0].decision).toBe('ignored')
    expect(ignoreSide(initial, 0, 'right', true).text).toBe('items:\nkeep: true\n')
    expect(acceptEdit(initial, 0, 'left').resolutions[0].sides).toEqual({ left: 'accepted', right: 'ignored' })
    expect(confirmManual(initial, 0).resolutions[0].sides).toEqual({ left: 'ignored', right: 'ignored' })
  })

  it.each([['keep: true\n', 'items: []\nkeep: true\n'], ['items: []\nkeep: true\n', 'keep: true\n']])('finishes a one-sided addition or deletion with one gutter action', (left, right) => {
    const initial = start(left, right)
    expect(acceptSide(initial, 0, 'right').text).toBe(right)
    expect(pendingCount(acceptSide(initial, 0, 'right'))).toBe(0)
    const ignored = ignoreSide(initial, 0, 'right')
    expect(ignored.text).toBe(left)
    expect(pendingCount(ignored)).toBe(1)
    expect(ignoreSide(ignored, 0, 'left').text).toBe('keep: true\n')
    expect(pendingCount(ignoreSide(ignored, 0, 'left'))).toBe(0)
  })

  it('undoes and redoes side decisions even when they did not edit text', () => {
    const partial = acceptSide(start(), 0, 'right'), finished = ignoreSide(partial, 0, 'left')
    const undone = historyStep(finished, 'undo')
    expect(undone.resolutions[0]).toEqual(partial.resolutions[0])
    expect(undone.text).toBe(finished.text)
    expect(historyStep(undone, 'redo').resolutions[0]).toEqual(finished.resolutions[0])
    expect(historyStep(undone, 'undo').resolutions[0].sides).toEqual({ left: 'pending', right: 'pending' })
  })

  it.each(['left', 'right'] as const)('deletes a rejected block after ignoring %s first and maps later decisions safely', first => {
    const initial = start('remove: left\nkeep: true\nb: 2\n', 'remove: right\nkeep: true\nb: 3\n')
    const partial = ignoreSide(initial, 0, first)
    expect(partial.text).toBe(initial.text)
    const deleted = ignoreSide(partial, 0, first === 'left' ? 'right' : 'left')
    expect(deleted.text).toBe('keep: true\nb: 2\n')
    expect(deleted.resolutions[0].present).toBe(false)
    expect(historyStep(deleted, 'undo').resolutions).toEqual(partial.resolutions)
    expect(historyStep(deleted, 'undo').text).toBe(initial.text)
    expect(historyStep(historyStep(deleted, 'undo'), 'redo').text).toBe(deleted.text)
    expect(acceptEdit(deleted, 1, 'right').text).toBe('keep: true\nb: 3\n')
    expect(resetDifference(deleted, 0).text).toBe(initial.text)
  })

  it('does not delete an unsafe range when both sides are ignored', () => {
    const initial = start('a: left\nkeep: true\n', 'a: right\nkeep: true\n')
    const manual = changeResult(initial, ChangeSet.of({ from: 0, to: initial.resolutions[0].range.to + 2, insert: 'custom: true\n' }, initial.text.length))
    const partial = ignoreSide(manual, 0, 'left')
    expect(() => ignoreSide(partial, 0, 'right')).toThrow('无法安全删除')
    expect(partial.text).toBe(manual.text)
    expect(partial.resolutions[0].sides.right).toBe('pending')
  })

  it('reopens both side controls when a resolved result block is manually edited', () => {
    const finished = acceptEdit(start(), 0, 'right'), at = finished.text.indexOf('right')
    const edited = changeResult(finished, ChangeSet.of({ from: at, to: at + 5, insert: 'custom' }, finished.text.length))
    expect(edited.resolutions[0].sides).toEqual({ left: 'pending', right: 'pending' })
    expect(edited.resolutions[0].decision).toBe('pending')
    expect(edited.resolutions[0].dirty).toBe(true)
    expect(historyStep(edited, 'undo').resolutions[0]).toEqual(finished.resolutions[0])
  })

  it('resets only the selected block and makes the reset undoable', () => {
    const initial = start('a: 1\nkeep: true\nb: 2\n', 'a: 3\nkeep: true\nb: 4\n')
    const finished = acceptEdit(acceptEdit(initial, 0, 'right'), 1, 'right'), reset = resetDifference(finished, 0)
    expect(parse(reset.text)).toEqual({ a: 1, keep: true, b: 4 })
    expect(reset.resolutions[0].sides).toEqual({ left: 'pending', right: 'pending' })
    expect(reset.resolutions[1].decision).toBe('right')
    expect(historyStep(reset, 'undo').text).toBe(finished.text)
    expect(historyStep(reset, 'undo').resolutions).toEqual(finished.resolutions)
  })

  it('preserves partial side decisions when reordering leaves the same difference', () => {
    const initial = start(), partial = ignoreSide(initial, 0, 'left')
    const next = rebaseTextSession(partial, initial.comparison, compareText(initial.comparison.left, sourceFromText(partial.text)))
    expect(next.resolutions[0].sides).toEqual(partial.resolutions[0].sides)
    expect(next.resolutions[0].decision).toBe('pending')
    expect(acceptSide(next, 0, 'right').resolutions[0].decision).toBe('right')
  })

  it('treats line ending decisions as one-step operations that can be reset', () => {
    const initial = start('a: 1\r\n', 'a: 1\n'), next = acceptSide(initial, 0, 'right')
    expect(next.eol).toBe('LF')
    expect(next.resolutions[0].sides).toEqual({ left: 'ignored', right: 'accepted' })
    expect(resetDifference(next, 0).eol).toBe('CRLF')
    expect(pendingCount(resetDifference(next, 0))).toBe(1)
  })
})
