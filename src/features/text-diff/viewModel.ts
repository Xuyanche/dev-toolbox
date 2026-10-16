import type { Session, Span } from './model'

export type Pane = 'left' | 'result' | 'right'
export interface Fold { id: string; span: Span; lines: number }
export interface Anchor { left: Span; result: Span; right: Span }
export function scrollAnchors(session: Session): Anchor[] {
  return [
    ...session.comparison.differences.flatMap((diff, i) => diff.kind === 'eol' ? [] : [{
      left: diff.left ?? { from: diff.leftAnchor, to: diff.leftAnchor },
      right: diff.right ?? { from: diff.rightAnchor, to: diff.rightAnchor }, result: session.resolutions[i].range,
    }]),
    ...session.comparison.equal.flatMap((block, i) => session.equals[i].unchanged ? [{ left: block.left, right: block.right, result: session.equals[i].range }] : []),
    { left: { from: 0, to: 0 }, right: { from: 0, to: 0 }, result: { from: 0, to: 0 } },
    { left: { from: session.comparison.left.text.length, to: session.comparison.left.text.length }, right: { from: session.comparison.right.text.length, to: session.comparison.right.text.length }, result: { from: session.text.length, to: session.text.length } },
  ]
}

export function mapScrollPosition(anchors: Anchor[], from: Pane, to: Pane, pos: number) {
  const ordered = anchors.slice().sort((a, b) => a[from].from - b[from].from || (b[from].to - b[from].from) - (a[from].to - a[from].from))
  const containing = ordered.find(anchor => anchor[from].from <= pos && anchor[from].to > pos)
  if (containing) {
    const a = containing[from], b = containing[to]
    return Math.round(b.from + (pos - a.from) / Math.max(1, a.to - a.from) * (b.to - b.from))
  }
  const before = ordered.filter(anchor => anchor[from].to <= pos).at(-1)
  const after = ordered.find(anchor => anchor[from].from > pos)
  if (!before) return after?.[to].from ?? 0
  if (!after) return before[to].to
  // Reordered YAML keys can invert target anchors; use the nearest stable one.
  if (after[to].from < before[to].to) return pos - before[from].to < after[from].from - pos ? before[to].to : after[to].from
  return Math.round(before[to].to + (pos - before[from].to) / Math.max(1, after[from].from - before[from].to) * (after[to].from - before[to].to))
}

function innerFold(text: string, range: Span): { span: Span; lines: number } | null {
  const from = Math.max(0, range.from), to = Math.min(text.length, range.to)
  const starts = [from]
  for (let i = from; i < to; i++) if (text[i] === '\n' && i + 1 < to) starts.push(i + 1)
  if (starts.length < 9) return null
  const start = starts[3], end = starts[starts.length - 3] - 1
  return end > start ? { span: { from: start, to: end }, lines: starts.length - 6 } : null
}
export function sharedFolds(session: Session, expanded: Set<string>): Record<Pane, Fold[]> {
  const folds: Record<Pane, Fold[]> = { left: [], result: [], right: [] }
  const blocks = session.comparison.equal.map((block, i) => ({ block, result: session.equals[i] }))
    .sort((a, b) => (b.block.left.to - b.block.left.from) - (a.block.left.to - a.block.left.from))
  for (const { block, result } of blocks) {
    if (!result.unchanged || expanded.has(block.id)) continue
    const left = innerFold(session.comparison.left.text, block.left), right = innerFold(session.comparison.right.text, block.right), middle = innerFold(session.text, result.range)
    if (!left || !right || !middle) continue
    const candidates = { left, right, result: middle }
    if ((Object.keys(folds) as Pane[]).some(pane => folds[pane].some(item => candidates[pane].span.from < item.span.to && candidates[pane].span.to > item.span.from))) continue
    for (const pane of Object.keys(folds) as Pane[]) folds[pane].push({ id: block.id, ...candidates[pane] })
  }
  // CodeMirror consumes fold effects as an ordered range set. Block size is
  // useful for selecting folds, but application must follow document order.
  for (const pane of Object.keys(folds) as Pane[]) folds[pane].sort((a, b) => a.span.from - b.span.from)
  return folds
}
