import { diffLines } from 'diff'
import { piece, type Comparison, type EqualBlock, type Source, type Difference } from './model'

export function compareText(left: Source, right: Source): Comparison {
  // Bound adversarial/reversed files; a whole-document block remains reviewable.
  const detailed = diffLines(left.text, right.text, { timeout: 3500, maxEditLength: 512 })
  const chunks = detailed ?? [
    { value: left.text, removed: true, added: false }, { value: right.text, added: true, removed: false },
  ]
  let l = 0, r = 0
  const differences: Difference[] = []
  const equal: EqualBlock[] = []
  for (let i = 0; i < chunks.length;) {
    const chunk = chunks[i]
    if (!chunk.added && !chunk.removed) {
      equal.push({ id: `equal-${l}-${r}`, left: { from: l, to: l + chunk.value.length }, right: { from: r, to: r + chunk.value.length } })
      l += chunk.value.length
      r += chunk.value.length
      i++
      continue
    }
    const startL = l, startR = r
    while (i < chunks.length && (chunks[i].added || chunks[i].removed)) {
      const change = chunks[i++]
      if (change.removed) l += change.value.length
      if (change.added) r += change.value.length
    }
    const line = left.text.slice(0, startL).split('\n').length
    differences.push({
      id: `text-${startL}-${startR}`, kind: 'text', label: detailed ? `第 ${line} 行 · ${l === startL ? '右侧新增' : r === startR ? '左侧独有' : '内容不同'}` : '差异较多 · 整份文档',
      left: startL === l ? null : piece(left.text, { from: startL, to: l }),
      right: startR === r ? null : piece(right.text, { from: startR, to: r }),
      leftAnchor: startL, rightAnchor: startR,
    })
  }
  if (left.eol !== right.eol) differences.push({
    id: 'eol', kind: 'eol', label: `换行风格：${left.eol} / ${right.eol}`,
    left: { from: 0, to: 0, text: left.eol }, right: { from: 0, to: 0, text: right.eol }, leftAnchor: 0, rightAnchor: 0,
  })
  return { mode: 'text', left, right, differences, equal }
}
