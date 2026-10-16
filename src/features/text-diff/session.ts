import { ChangeSet, Text } from '@codemirror/state'
import { checkInput } from './io'
import { pathKey, type CommentChoice, type Comparison, type Path, type Resolution, type Session, type Side, type Snapshot, type TextEdit, type YamlAnalysis } from './model'

export function createSession(comparison: Comparison): Session {
  return {
    comparison, text: comparison.left.text, eol: comparison.left.eol === 'CRLF' ? 'CRLF' : 'LF', undo: [], redo: [],
    equals: comparison.equal.map(block => ({ range: block.left, unchanged: true })), commentChoices: {},
    resolutions: comparison.differences.map(diff => ({ range: diff.left ? { from: diff.left.from, to: diff.left.to } : { from: diff.leftAnchor, to: diff.leftAnchor }, decision: 'pending', dirty: false, safe: true, present: diff.left !== null, sides: { left: 'pending', right: 'pending' } })),
  }
}
const snapshot = (session: Session): Snapshot => ({ comparison: session.comparison, text: session.text, eol: session.eol, resolutions: session.resolutions.map(item => ({ ...item, range: { ...item.range }, sides: { ...item.sides } })), equals: session.equals.map(item => ({ ...item, range: { ...item.range } })), commentChoices: { ...session.commentChoices } })
const record = (session: Session, next: Snapshot): Session => {
  const undo = [...session.undo.slice(-99), snapshot(session)]
  const weight = (item: Snapshot) => item.text.length + item.comparison.left.text.length + item.comparison.right.text.length
  let characters = undo.reduce((sum, item) => sum + weight(item), 0)
  while (undo.length > 1 && characters > 8 * 1024 * 1024) characters -= weight(undo.shift()!)
  return { ...session, ...next, undo, redo: [] }
}

export function changeResult(session: Session, changes: ChangeSet, chosenIndex?: number | ReadonlySet<number>, decision?: Side): Session {
  const resolutions: Resolution[] = session.resolutions.map((item, i) => {
    const diff = session.comparison.differences[i]
    if (diff.kind === 'eol') return { ...item }
    let touched = false, unsafe = false
    changes.iterChangedRanges((from, to) => {
      const intersects = from === to ? from >= item.range.from && from <= item.range.to : to > item.range.from && from < item.range.to || item.range.from === item.range.to && from <= item.range.from && to >= item.range.to
      touched ||= intersects
      if (intersects && (from < item.range.from || to > item.range.to)) unsafe = true
    })
    const selected = typeof chosenIndex === 'number' ? i === chosenIndex : chosenIndex?.has(i) ?? false
    const range = { from: changes.mapPos(item.range.from, selected || touched ? -1 : 1), to: changes.mapPos(item.range.to, selected || touched ? 1 : -1) }
    range.to = Math.max(range.from, range.to)
    return {
      ...item, range,
      decision: selected ? decision! : touched && chosenIndex === undefined ? 'pending' : item.decision,
      dirty: selected ? false : touched && chosenIndex === undefined || item.dirty,
      safe: selected ? true : item.safe && !unsafe,
      present: selected ? session.comparison.differences[i][decision!] !== null : item.present,
      sides: selected ? { left: decision === 'left' ? 'accepted' : 'ignored', right: decision === 'right' ? 'accepted' : 'ignored' } : touched && chosenIndex === undefined ? { left: 'pending', right: 'pending' } : item.sides,
    }
  })
  const equals = session.equals.map(block => {
    let touched = false
    changes.iterChangedRanges((from, to) => { if (to > block.range.from && from < block.range.to || from === to && from > block.range.from && from < block.range.to) touched = true })
    return { range: { from: changes.mapPos(block.range.from, 1), to: changes.mapPos(block.range.to, -1) }, unchanged: block.unchanged && !touched }
  })
  return record(session, { comparison: session.comparison, text: changes.apply(Text.of(session.text.split('\n'))).toString(), eol: session.eol, resolutions, equals, commentChoices: session.commentChoices })
}

export function acceptEdit(session: Session, index: number, side: 'left' | 'right', edit?: TextEdit): Session {
  const diff = session.comparison.differences[index]
  if (diff.kind === 'eol') {
    return record(session, { ...snapshot(session), eol: session.comparison[side].eol === 'CRLF' ? 'CRLF' : 'LF', resolutions: session.resolutions.map((item, i) => i === index ? { ...item, decision: side, dirty: false, sides: { left: side === 'left' ? 'accepted' : 'ignored', right: side === 'right' ? 'accepted' : 'ignored' } } : item) })
  }
  const current = session.resolutions[index]
  if (!current.safe) throw new Error('该差异无法安全定位，请手动处理并确认。')
  const replacement = edit ?? { ...current.range, insert: diff[side]?.text ?? '' }
  checkInput(session.text.slice(0, replacement.from) + replacement.insert + session.text.slice(replacement.to), 2)
  return changeResult(session, ChangeSet.of(replacement, session.text.length), index, side)
}

export function confirmManual(session: Session, index: number): Session {
  return record(session, { ...snapshot(session), resolutions: session.resolutions.map((item, i) => i === index ? { ...item, decision: 'manual', dirty: false, sides: { left: 'ignored', right: 'ignored' } } : item) })
}

/** Resolve pending blocks together, preserving confirmed choices and unrelated edits. */
export function acceptAllPending(session: Session, side: Side): Session {
  const indices = new Set(session.resolutions.flatMap((item, i) => item.decision === 'pending' ? [i] : []))
  if (!indices.size) return session
  const edits: TextEdit[] = []
  let eol = session.eol
  for (const index of indices) {
    const item = session.resolutions[index], diff = session.comparison.differences[index]
    if (diff.kind === 'eol') { eol = session.comparison[side].eol === 'CRLF' ? 'CRLF' : 'LF'; continue }
    if (!item.safe) throw new Error('存在无法安全定位的差异，请先手动处理并确认；本次批量操作未执行。')
    const overlaps = session.resolutions.some((other, i) => i !== index && session.comparison.differences[i].kind !== 'eol' && (
      item.range.from < other.range.to && other.range.from < item.range.to ||
      item.range.from === item.range.to && other.range.from === other.range.to && item.range.from === other.range.from
    ))
    if (overlaps) throw new Error('差异范围重叠，无法安全批量处理，请先手动处理并确认；本次批量操作未执行。')
    edits.push({ ...item.range, insert: diff[side]?.text ?? '' })
  }
  const changes = ChangeSet.of(edits, session.text.length)
  checkInput(changes.apply(Text.of(session.text.split('\n'))).toString(), 2)
  const next = changeResult(session, changes, indices, side)
  return { ...next, eol, resolutions: next.resolutions.map((item, i) => indices.has(i) ? {
    ...item, decision: side, dirty: false,
    sides: { left: side === 'left' ? 'accepted' : 'ignored', right: side === 'right' ? 'accepted' : 'ignored' },
  } : item) }
}

function sideResolution(item: Resolution, sides: Resolution['sides']): Resolution {
  const decision = sides.left === 'pending' || sides.right === 'pending' ? 'pending' : sides.left === 'accepted' ? sides.right === 'accepted' ? 'both' : 'left' : sides.right === 'accepted' ? 'right' : 'ignored'
  return { ...item, sides, decision, dirty: decision === 'pending' ? item.dirty : false }
}

/** IDEA's gutter accepts one side; the other side still needs accept/ignore. */
export function acceptSide(session: Session, index: number, side: Side, resolve = false): Session {
  const current = session.resolutions[index], diff = session.comparison.differences[index]
  if (!current || current.decision !== 'pending' || current.sides[side] !== 'pending') return session
  if (resolve || diff.kind === 'eol' || !diff.left || !diff.right) return acceptEdit(session, index, side)
  const opposite = side === 'left' ? 'right' : 'left'
  const incoming = diff[side]!.text
  const existing = session.text.slice(current.range.from, current.range.to)
  const append = current.sides[opposite] === 'accepted'
  const insert = append ? existing + (existing && incoming && !existing.endsWith('\n') ? '\n' : '') + incoming : incoming
  const next = acceptEdit(session, index, side, { ...current.range, insert })
  next.resolutions[index] = sideResolution(next.resolutions[index], { ...current.sides, [side]: 'accepted' })
  return next
}

/** A single ignore is provisional; rejecting both sides removes the result block. */
export function ignoreSide(session: Session, index: number, side: Side, resolve = false): Session {
  const current = session.resolutions[index], diff = session.comparison.differences[index]
  if (!current || current.decision !== 'pending' || current.sides[side] !== 'pending') return session
  const sides: Resolution['sides'] = resolve || diff.kind === 'eol' ? { left: current.sides.left === 'accepted' ? 'accepted' : 'ignored', right: current.sides.right === 'accepted' ? 'accepted' : 'ignored' } : { ...current.sides, [side]: 'ignored' }
  if (sides.left === 'ignored' && sides.right === 'ignored' && diff.kind !== 'eol') {
    if (!current.safe) throw new Error('该差异范围已失效，无法安全删除；请手工删除并确认。')
    const next = changeResult(session, ChangeSet.of({ ...current.range, insert: '' }, session.text.length), index, 'left')
    next.resolutions[index] = { ...sideResolution(next.resolutions[index], sides), present: false }
    return next
  }
  return record(session, { ...snapshot(session), resolutions: session.resolutions.map((item, i) => i === index ? sideResolution(item, sides) : item) })
}

export function resetDifference(session: Session, index: number): Session {
  const current = session.resolutions[index], diff = session.comparison.differences[index]
  if (!current?.safe) return session
  const next = acceptEdit(session, index, 'left')
  next.resolutions[index] = { ...next.resolutions[index], decision: 'pending', dirty: false, sides: { left: 'pending', right: 'pending' } }
  if (diff.kind === 'eol') next.eol = session.comparison.left.eol === 'CRLF' ? 'CRLF' : 'LF'
  return next
}
export function changeEol(session: Session, eol: 'LF' | 'CRLF'): Session {
  return record(session, { ...snapshot(session), eol, resolutions: session.resolutions.map((item, i) => session.comparison.differences[i].kind === 'eol' ? { ...item, decision: 'manual', sides: { left: 'ignored', right: 'ignored' } } : item) })
}
export function historyStep(session: Session, direction: 'undo' | 'redo'): Session {
  const stack = session[direction], previous = stack.at(-1)
  if (!previous) return session
  const opposite = direction === 'undo' ? 'redo' : 'undo'
  return { ...session, ...previous, [direction]: stack.slice(0, -1), [opposite]: [...session[opposite], snapshot(session)] }
}

/** Refresh structure ranges after validation, never resurrect a renamed/deleted node using an old offset. */
export function reconcileYaml(session: Session, analysis: YamlAnalysis): Session {
  if (analysis.diagnostic) return session
  const resolutions = session.resolutions.map((item, i) => {
    const diff = session.comparison.differences[i]
    if (diff.kind !== 'yaml' || !diff.path) return item
    const node = analysis.entries[pathKey(diff.path)]
    const parent = analysis.entries[pathKey(diff.path.slice(0, -1))]
    if (node) return { ...item, range: node.range, safe: true }
    const safe = !item.present && !item.dirty && parent?.kind === 'map'
    return { ...item, safe: Boolean(safe), range: safe ? { from: parent.valueRange.to, to: parent.valueRange.to } : item.range }
  })
  return { ...session, resolutions }
}
export function pendingCount(session: Session) { return session.resolutions.filter(item => item.decision === 'pending').length }

export function rebaseTextSession(session: Session, comparison: Comparison, resultMapping: Comparison): Session {
  const changes = ChangeSet.of(resultMapping.differences.filter(diff => diff.kind !== 'eol').map(diff => ({ from: diff.left?.from ?? diff.leftAnchor, to: diff.left?.to ?? diff.leftAnchor, insert: diff.right?.text ?? '' })), comparison.left.text.length)
  const next = createSession(comparison)
  const fingerprint = (diff: Comparison['differences'][number]) => JSON.stringify([diff.kind, diff.left?.text, diff.right?.text])
  const old = new Map<string, Resolution[]>()
  session.comparison.differences.forEach((diff, i) => { const key = fingerprint(diff); old.set(key, [...(old.get(key) ?? []), session.resolutions[i]]) })
  next.resolutions = next.resolutions.map((item, i) => {
    const diff = comparison.differences[i]
    const sourceRange = diff.left ?? { from: diff.leftAnchor, to: diff.leftAnchor }
    const range = { from: changes.mapPos(sourceRange.from, -1), to: changes.mapPos(sourceRange.to, 1) }
    const previous = old.get(fingerprint(diff))?.shift()
    const dirty = session.text.slice(range.from, range.to) !== (diff.left?.text ?? '')
    let safe = previous?.safe ?? true
    if (diff.kind !== 'eol') changes.iterChangedRanges((from, to) => {
      const intersects = to > sourceRange.from && from < sourceRange.to || sourceRange.from === sourceRange.to && from <= sourceRange.from && to >= sourceRange.to
      if (intersects && (from < sourceRange.from || to > sourceRange.to)) safe = false
    })
    return { ...item, range, safe, present: previous?.present ?? item.present, dirty: previous ? previous.dirty : dirty, decision: previous?.decision ?? 'pending', sides: previous ? { ...previous.sides } : item.sides }
  })
  next.equals = next.equals.map(item => ({ range: { from: changes.mapPos(item.range.from, 1), to: changes.mapPos(item.range.to, -1) }, unchanged: !resultMapping.differences.some(diff => diff.kind !== 'eol' && (diff.left?.from ?? diff.leftAnchor) < item.range.to && (diff.left?.to ?? diff.leftAnchor) >= item.range.from) }))
  return record(session, { ...snapshot(next), text: session.text, eol: session.eol })
}
export function isComplete(session: Session, stale: boolean, diagnostic: boolean) {
  return !stale && !diagnostic && pendingCount(session) === 0 && session.resolutions.every(item => item.safe || item.decision === 'manual')
}

export function applyNodeTransaction(session: Session, edit: TextEdit, path: Path, decision: 'left' | 'right' | 'manual'): Session {
  // A validated node operation cannot change configuration outside its subtree.
  // Missing siblings often share an insertion anchor; do not mark them as manual edits.
  const next = changeResult(session, ChangeSet.of(edit, session.text.length), -1)
  next.resolutions = next.resolutions.map((item, i) => {
    const diffPath = session.comparison.differences[i].path
    const inside = diffPath && path.every((part, n) => diffPath[n] === part)
    return inside ? { ...item, decision, dirty: false, safe: true, present: decision === 'manual' ? item.present : session.comparison.differences[i][decision] !== null, sides: { left: decision === 'left' ? 'accepted' : 'ignored', right: decision === 'right' ? 'accepted' : 'ignored' } } : item
  })
  return next
}
export function applyCommentTransaction(session: Session, edit: TextEdit, id: string, choice: CommentChoice): Session {
  const next = changeResult(session, ChangeSet.of(edit, session.text.length))
  // Comment-only edits never reopen a configuration decision.
  next.resolutions = next.resolutions.map((item, i) => ({ ...item, decision: session.resolutions[i].decision, dirty: session.resolutions[i].dirty, safe: session.resolutions[i].safe, sides: { ...session.resolutions[i].sides } }))
  next.commentChoices = { ...session.commentChoices, [id]: choice }
  return next
}
