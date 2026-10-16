import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ChangeSet } from '@codemirror/state'
import { SearchQuery } from '@codemirror/search'
import { ToolHeader } from '../../shell/ui'
import { MergeEditor, type DiffSpan, type EditorCommand, type EditorHandle, type EditorStats } from './MergeEditor'
import { checkInput, detectEol, downloadText, exportText, readSource } from './io'
import { acceptAllPending, acceptEdit, acceptSide, ignoreSide, resetDifference, changeResult, confirmManual, createSession, historyStep, isComplete, pendingCount, rebaseTextSession } from './session'
import { errorMessage, type Comparison, type Session, type Side, type SideDecision, type Source, type Span, type YamlAnalysis } from './model'
import { runAnalysis, type AnalysisJob } from './workerClient'
import type { AnalysisOutput, AnalysisRequest } from './analysis'
import { mapScrollPosition, scrollAnchors, sharedFolds, type Pane } from './viewModel'
import type { ReorderedYaml } from './yamlReorder'
import { MergeIcon } from './MergeIcon'
import { DownloadDialog } from './DownloadDialog'
import './textWorkspace.css'

const EMPTY: Source = { text: '', name: '', eol: 'LF' }
const PANES: Pane[] = ['left', 'result', 'right']
const LABELS = { left: '左侧 YAML', result: '融合结果', right: '右侧 YAML' }
const INITIAL_STATS: EditorStats = { line: 1, column: 1, selected: 0, lines: 1, matches: 0, capped: false }

export function TextMergeWorkspace() {
  const [left, setLeft] = useState<Source>(EMPTY), [right, setRight] = useState<Source>(EMPTY)
  const [session, setSession] = useState<Session | null>(null), [sourceEditing, setSourceEditing] = useState({ left: true, right: true })
  const [active, setActive] = useState<Pane>('left'), [selected, setSelected] = useState(0)
  const [busy, setBusy] = useState(false), [validation, setValidation] = useState<{ text: string; diagnostic: YamlAnalysis['diagnostic'] } | null>(null)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const [locked, setLocked] = useState(true), [hideEqual, setHideEqual] = useState(false), [onlyPending, setOnlyPending] = useState(false), [expanded, setExpanded] = useState(new Set<string>())
  const [wrap, setWrap] = useState(false), [whitespace, setWhitespace] = useState(false), [fontSize, setFontSize] = useState(13), [filename, setFilename] = useState('merged.yaml')
  const [searchOpen, setSearchOpen] = useState(false), [replaceOpen, setReplaceOpen] = useState(false), [searchText, setSearchText] = useState(''), [replacement, setReplacement] = useState('')
  const [scope, setScope] = useState<'current' | 'all'>('current'), [caseSensitive, setCaseSensitive] = useState(false), [wholeWord, setWholeWord] = useState(false), [regexp, setRegexp] = useState(false)
  const [stats, setStats] = useState<Record<Pane, EditorStats>>({ left: INITIAL_STATS, result: INITIAL_STATS, right: INITIAL_STATS })
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null), menuElement = useRef<HTMLDivElement>(null)
  const [download, setDownload] = useState<{ text: string; eol: 'LF' | 'CRLF'; complete: boolean } | null>(null)
  const sourceInputs = useRef<Partial<Record<Side, HTMLInputElement | null>>>({})
  const scrollPositions = useRef<Partial<Record<Pane, { left: number; top: number }>>>({})
  const leftEditor = useRef<EditorHandle>(null), resultEditor = useRef<EditorHandle>(null), rightEditor = useRef<EditorHandle>(null), searchInput = useRef<HTMLInputElement>(null)
  const editors = useMemo(() => ({ left: leftEditor, result: resultEditor, right: rightEditor }), [])
  const revision = useRef(0), job = useRef<AnalysisJob | null>(null), imports = useRef({ left: 0, right: 0 }), scrolling = useRef(false), scrollFrame = useRef(0)
  const navigationRevision = useRef(0)
  const typing = useRef<{ event: string; head: number; time: number } | null>(null)
  const live = useRef({ session, left, right }); live.current = { session, left, right }
  const comparison = session?.comparison, resultText = session?.text
  const stale = Boolean(comparison && (left.text !== comparison.left.text || left.eol !== comparison.left.eol || right.text !== (comparison.originalRight ?? comparison.right).text || right.eol !== (comparison.originalRight ?? comparison.right).eol))
  const pendingValidation = Boolean(session && validation?.text !== session.text), editingSource = Boolean(session && (sourceEditing.left || sourceEditing.right))
  const actionsPaused = !session || busy || stale || editingSource
  const paused = actionsPaused || pendingValidation || Boolean(validation?.diagnostic)
  const complete = Boolean(session && isComplete(session, stale || editingSource, busy || pendingValidation || Boolean(validation?.diagnostic)))
  const reordered = Boolean(comparison?.originalRight && comparison.right.text !== comparison.originalRight.text)
  const pending = session ? pendingCount(session) : 0
  const query = useMemo(() => new SearchQuery({ search: searchOpen ? searchText : '', replace: replacement, caseSensitive, wholeWord, regexp }), [searchOpen, searchText, replacement, caseSensitive, wholeWord, regexp])
  const canEdit = (pane: Pane) => pane === 'result' ? Boolean(session) && !busy : (!session || sourceEditing[pane]) && !busy
  const folds = useMemo(() => session && hideEqual && !stale ? sharedFolds(session, expanded) : { left: [], result: [], right: [] }, [session, hideEqual, stale, expanded])
  const anchors = useMemo(() => session ? scrollAnchors(session) : [], [session])
  const spans = useMemo(() => {
    const output: Record<Pane, DiffSpan[]> = { left: [], right: [], result: [] }
    comparison?.differences.forEach((diff, i) => {
      if (diff.kind === 'eol') return
      const resolution = session!.resolutions[i]
      output.left.push({ ...(diff.left ?? { from: diff.leftAnchor, to: diff.leftAnchor }), resolved: resolution.sides.left !== 'pending' }); output.right.push({ ...(diff.right ?? { from: diff.rightAnchor, to: diff.rightAnchor }), resolved: resolution.sides.right !== 'pending' }); output.result.push({ ...resolution.range, resolved: resolution.decision !== 'pending' })
    }); return output
  }, [comparison, session])
  const adoptions = useMemo(() => {
    const indices = comparison ? comparison.differences.map((_, i) => i).sort((a, b) => Number(b === selected) - Number(a === selected)) : []
    return Object.fromEntries((['left', 'right'] as const).map(side => [side, indices.filter(i => comparison!.differences[i].kind !== 'eol').map(index => ({ index, active: index === selected, state: session!.resolutions[index].sides[side], at: comparison!.differences[index][side]?.from ?? comparison!.differences[index][side === 'left' ? 'leftAnchor' : 'rightAnchor'] }))])) as Record<Side, { at: number; index: number; active: boolean; state: SideDecision }[]>
  }, [comparison, selected, session])
  useEffect(() => {
    if (!menu) return
    menuElement.current?.querySelector<HTMLButtonElement>('button:enabled')?.focus()
    const close = (event: PointerEvent) => { if (!menuElement.current?.contains(event.target as Node)) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])
  useEffect(() => () => { revision.current++; navigationRevision.current++; job.current?.cancel(); cancelAnimationFrame(scrollFrame.current) }, [])
  useEffect(() => {
    if (resultText === undefined) return
    let active = true, task: AnalysisJob | undefined
    const timer = setTimeout(() => {
      task = runAnalysis({ kind: 'validateText', text: resultText })
      void task.promise.then(output => { if (active) setValidation({ text: resultText, diagnostic: (output as YamlAnalysis).diagnostic }) }).catch(error => { if (active) setValidation({ text: resultText, diagnostic: { message: errorMessage(error) } }) })
    }, 150)
    return () => { active = false; clearTimeout(timer); task?.cancel() }
  }, [resultText])
  useEffect(() => { PANES.forEach(pane => editors[pane].current?.search(scope === 'all' || pane === active ? query : new SearchQuery({ search: '' }))) }, [editors, query, scope, active])
  useEffect(() => { const frame = requestAnimationFrame(() => PANES.forEach(pane => editors[pane].current?.view?.requestMeasure())); return () => cancelAnimationFrame(frame) }, [active, editors, sourceEditing, searchOpen, replaceOpen])
  function report(text: string, error = false) { setFeedback({ text, error }) }
  function stop() { revision.current++; job.current?.cancel(); job.current = null; setBusy(false) }
  async function work(request: AnalysisRequest, commit: (output: AnalysisOutput) => void) {
    typing.current = null
    setMenu(null)
    stop(); const version = ++revision.current; setBusy(true); setFeedback(null)
    const task = runAnalysis(request); job.current = task
    try { const output = await task.promise; if (version === revision.current) commit(output) }
    catch (error) { if (version === revision.current) report(errorMessage(error), true) }
    finally { if (version === revision.current) { setBusy(false); job.current = null } }
  }
  function allowReset() { return !live.current.session || window.confirm('重新比较会重置融合草稿与差异决策，请先保存需要的内容。是否继续？') }
  function compare(a = left, b = right, confirmed = false) {
    if (!confirmed && !allowReset()) return
    void work({ kind: 'compare', left: a, right: b, mode: 'text' }, output => {
      setSession(createSession(output as Comparison)); setSourceEditing({ left: false, right: false }); setSelected(0); setExpanded(new Set()); setActive('result'); report('结果沿用左侧，逐项选择差异或直接编辑。右侧可按左侧顺序排列。')
    })
  }
  function updateSource(side: Side, text: string) { imports.current[side]++; stop(); (side === 'left' ? setLeft : setRight)(previous => ({ ...previous, text })); setFeedback(null) }
  async function importFile(side: Side, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    const version = ++imports.current[side]
    try {
      const source = await readSource(file); if (version !== imports.current[side]) return
      stop(); (side === 'left' ? setLeft : setRight)(source); setSourceEditing(previous => ({ ...previous, [side]: true })); report(`已导入 ${file.name}。`)
    } catch (error) { if (version === imports.current[side]) report(errorMessage(error), true) }
  }
  function editResult(_text: string, changes: ChangeSet, userEvent = '') {
    stop()
    const last = typing.current, time = Date.now(), event = /^(input\.type|delete\.)/.test(userEvent) ? userEvent : ''
    let contiguous = false
    if (last) changes.iterChangedRanges((from, to) => { contiguous ||= from === last.head || to === last.head })
    const group = Boolean(event && last?.event === event && (time - last.time < 650 || event.includes('compose')) && contiguous)
    typing.current = event ? { event, time, head: resultEditor.current?.view?.state.selection.main.head ?? 0 } : null
    setSession(previous => { if (!previous) return previous; const next = changeResult(previous, changes); return group ? { ...next, undo: previous.undo } : next }); setFeedback(null)
  }
  function history(direction: 'undo' | 'redo') { typing.current = null; stop(); setSession(previous => previous ? historyStep(previous, direction) : previous) }
  function clear() {
    if (!allowReset()) return
    stop(); imports.current.left++; imports.current.right++; setLeft(EMPTY); setRight(EMPTY); setSession(null); setValidation(null); setSourceEditing({ left: true, right: true }); setFeedback(null); setExpanded(new Set()); setActive('left')
  }
  function locate(index: number) {
    typing.current = null
    const current = live.current.session; if (!current) return
    const diff = current.comparison.differences[index]; if (!diff) return
    setSelected(index)
    // Each pane reveals its own target. Top-of-viewport synchronization must not
    // override these independent positions while CodeMirror measures and scrolls.
    const version = ++navigationRevision.current
    scrolling.current = true
    cancelAnimationFrame(scrollFrame.current)
    let remaining = PANES.length
    const measured = () => {
      if (version !== navigationRevision.current || --remaining) return
      // Scroll events and wrapped/folded viewport measurements can arrive in the
      // following frame. Capture the settled positions before resuming linkage.
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = requestAnimationFrame(() => {
          if (version !== navigationRevision.current) return
          PANES.forEach(pane => { const actual = editors[pane].current?.top(); if (actual) scrollPositions.current[pane] = actual })
          scrolling.current = false
        })
      })
    }
    PANES.forEach(pane => {
      const range = pane === 'result' ? current.resolutions[index].range : diff[pane] ?? { from: diff[pane === 'left' ? 'leftAnchor' : 'rightAnchor'], to: diff[pane === 'left' ? 'leftAnchor' : 'rightAnchor'] }
      const editor = editors[pane].current
      editor?.locate(range)
      if (editor?.view && editor.view.dom.getBoundingClientRect().width) editor.view.requestMeasure({ read: () => null, write: measured })
      else measured()
    })
  }
  function navigate(direction: number) {
    if (!session) return
    const list = session.resolutions.map((item, i) => ({ item, i })).filter(({ item }) => !onlyPending || item.decision === 'pending'); if (!list.length) return
    const at = list.findIndex(item => item.i === selected); locate(list[(at + direction + list.length) % list.length].i)
  }
  function choose(side: Side, index = selected) {
    if (!session || paused || session.resolutions[index]?.decision !== 'pending') return
    if (!session.resolutions[index]?.safe) { report('该差异范围已失效，请手工修改并确认。', true); return }
    if (session.resolutions[index].dirty && !window.confirm('此差异已有手动修改，采用来源会覆盖该块。是否继续？')) return
    try { typing.current = null; setSelected(index); setSession(acceptEdit(session, index, side)); report(`已采用${side === 'left' ? '左侧' : '右侧'}差异 ${index + 1}。`) }
    catch (error) { report(errorMessage(error), true) }
  }
  function chooseAll(side: Side) {
    if (!session || paused || !pending) return
    if (session.resolutions.some(item => item.decision === 'pending' && item.dirty) && !window.confirm('批量采用来源会覆盖未处理差异块中的手动修改，已确认的差异和其他区域保持不变。是否继续？')) return
    try {
      const next = acceptAllPending(session, side)
      typing.current = null; setSession(next)
      report(`已将 ${pending} 处未处理差异全部采用${side === 'left' ? '左侧' : '右侧'}，可一次撤销。`)
    } catch (error) { report(errorMessage(error), true) }
  }
  function sideAction(side: Side, index: number, action: 'accept' | 'ignore', resolve = false) {
    if (!session || actionsPaused || action === 'accept' && paused) return
    const item = session.resolutions[index]
    if (!item || item.decision !== 'pending' || item.sides[side] !== 'pending') return
    if (action === 'accept' && !item.safe) { report('该差异范围已失效，请手工修改并确认。', true); return }
    if (action === 'accept' && item.dirty && !window.confirm('此差异已有手动修改，采用来源会覆盖该块。是否继续？')) return
    const deletes = action === 'ignore' && session.comparison.differences[index].kind !== 'eol' && (resolve || item.sides[side === 'left' ? 'right' : 'left'] === 'ignored') && item.sides[side === 'left' ? 'right' : 'left'] !== 'accepted'
    if (deletes && item.dirty && !window.confirm('两侧都忽略将删除此差异块，包括其中的手动修改。是否继续？')) return
    try {
      typing.current = null; setSelected(index); setSession(action === 'accept' ? acceptSide(session, index, side, resolve) : ignoreSide(session, index, side, resolve))
      report(deletes ? `差异 ${index + 1} 两侧均已忽略，已从融合结果删除，可撤销。` : `${action === 'accept' ? '已采用' : '已忽略'}${side === 'left' ? '左侧' : '右侧'}差异 ${index + 1}。`)
    } catch (error) { report(errorMessage(error), true) }
  }
  function resetCurrent() {
    if (!session || actionsPaused || !session.resolutions[selected]?.safe) return
    if (session.resolutions[selected].dirty && !window.confirm('重置此差异会恢复该块的初始左侧内容，覆盖当前手动修改。是否继续？')) return
    try { typing.current = null; setSession(resetDifference(session, selected)); report('已恢复该块初始内容，两侧重新待处理，可撤销。') }
    catch (error) { report(errorMessage(error), true) }
  }
  function selectAt(pane: Pane, pos: number) {
    if (!session || stale) return
    const index = session.comparison.differences.findIndex((diff, i) => {
      if (diff.kind === 'eol') return false
      const range = pane === 'result' ? session.resolutions[i].range : diff[pane] ?? { from: diff[pane === 'left' ? 'leftAnchor' : 'rightAnchor'], to: diff[pane === 'left' ? 'leftAnchor' : 'rightAnchor'] }; return pos >= range.from && pos <= range.to
    }); if (index >= 0) setSelected(index)
    return index
  }
  function onScroll(pane: Pane) {
    const position = editors[pane].current?.top(); if (!position) return
    const previous = scrollPositions.current[pane] ?? { top: 0, left: 0 }
    scrollPositions.current[pane] = position
    if (!locked || !session || stale || scrolling.current) return
    const vertical = Math.abs(position.top - previous.top) > .5, horizontal = Math.abs(position.left - previous.left) > .5
    if (!vertical && !horizontal) return
    scrolling.current = true
    PANES.filter(target => target !== pane).forEach(target => {
      editors[target].current?.follow(vertical ? mapScrollPosition(anchors, pane, target, position.pos) : undefined, position.offset, horizontal ? position.left : undefined)
      const actual = editors[target].current?.top(); if (actual) scrollPositions.current[target] = actual
    })
    cancelAnimationFrame(scrollFrame.current); scrollFrame.current = requestAnimationFrame(() => { scrolling.current = false })
  }
  function candidate(source: Source, message: string, presentation: 'reordered' | 'formatted' = 'reordered') {
    typing.current = null
    const current = live.current.session
    if (!current) {
      void work({ kind: 'recompare', left, right: source, originalRight: right, result: left.text, initial: true }, output => {
        const next = output as { comparison: Comparison; mapping: Comparison; initial: Comparison }
        setSession(rebaseTextSession(createSession(next.initial), { ...next.comparison, rightPresentation: presentation }, next.mapping)); setSourceEditing({ left: false, right: false }); setSelected(0); report(message)
      }); return
    }
    void work({ kind: 'recompare', left: current.comparison.left, right: source, originalRight: current.comparison.originalRight ?? current.comparison.right, result: current.text }, output => {
      const next = output as { comparison: Comparison; mapping: Comparison }; setSession(rebaseTextSession(current, { ...next.comparison, rightPresentation: presentation }, next.mapping)); setSelected(0); setExpanded(new Set()); report(`${message} 融合草稿已保留，新划分的差异需确认。`)
    })
  }
  function reorder() {
    void work({ kind: 'reorder', left: comparison?.left ?? left, right: comparison?.right ?? right }, output => {
      const value = output as ReorderedYaml; candidate({ ...(comparison?.right ?? right), text: value.text }, value.skipped.length ? `已重排安全区域；${value.skipped.join('；')}。` : '右侧已按左侧字段顺序排列。')
    })
  }
  function format() {
    if (active === 'right' && session && !sourceEditing.right && !stale) {
      void work({ kind: 'format', text: session.comparison.right.text }, output => candidate({ ...session.comparison.right, text: (output as { value: string }).value }, '右侧已格式化。', 'formatted'))
    } else if (canEdit(active)) {
      const pane = active, text = pane === 'result' ? session!.text : pane === 'left' ? left.text : right.text
      void work({ kind: 'format', text }, output => {
        const value = (output as { value: string }).value
        if (pane === 'result') setSession(previous => previous ? changeResult(previous, ChangeSet.of({ from: 0, to: previous.text.length, insert: value }, previous.text.length)) : previous)
        else { checkInput(value); updateSource(pane, value) }
        report('格式化已完成，可撤销。')
      })
    } else report('请先开启当前来源的编辑模式。', true)
  }
  function openSearch(pane = active, replace = false, all = false) {
    setActive(pane); setSearchOpen(true); setReplaceOpen(replace); if (all) setScope('all')
    const editor = editors[pane].current?.view, selection = editor?.state.selection.main
    if (editor && selection && selection.to > selection.from && selection.to - selection.from < 200) setSearchText(editor.state.sliceDoc(selection.from, selection.to))
    requestAnimationFrame(() => { searchInput.current?.focus(); searchInput.current?.select() })
  }
  function searchCommand(name: 'findNext' | 'findPrevious' | 'replaceNext' | 'replaceAll') {
    if (!query.valid || name.startsWith('replace') && !canEdit(active)) return
    let pane = active
    if (scope === 'all' && !stats[pane].matches && name.startsWith('find')) pane = PANES.find(item => stats[item].matches) ?? pane
    setActive(pane); editors[pane].current?.command(name)
    if (name.startsWith('find')) searchInput.current?.focus()
  }
  function command(name: EditorCommand) { editors[active].current?.command(name) }
  function confirmCurrent() { if (actionsPaused || session?.resolutions[selected]?.decision !== 'pending') return; typing.current = null; setSession(previous => previous ? confirmManual(previous, selected) : previous) }
  async function copy() {
    if (!session) return
    try { await navigator.clipboard.writeText(exportText(session.text, session.eol)); report(complete ? '已复制完整结果。' : '已复制完整草稿。') }
    catch { report('无法访问剪贴板，请在融合结果中手动复制。', true) }
  }
  const current = comparison?.differences[selected], resolution = session?.resolutions[selected]
  const resolved = Boolean(resolution && resolution.decision !== 'pending')
  const sideStatus = (side: Side) => !resolution || resolution.sides[side] === 'pending' ? '待处理' : resolution.sides[side] === 'accepted' ? '已采用' : '已忽略'
  const activeSpan = (pane: Pane): Span | undefined => current ? pane === 'result' ? resolution?.range : current[pane] ?? { from: current[pane === 'left' ? 'leftAnchor' : 'rightAnchor'], to: current[pane === 'left' ? 'leftAnchor' : 'rightAnchor'] } : undefined

  return <div className='tool-page text-workspace' onKeyDownCapture={event => {
    if (download) return
    if (event.key === 'F7') { event.preventDefault(); navigate(event.shiftKey ? -1 : 1) }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Tab') { event.preventDefault(); const next = PANES[(PANES.indexOf(active) + 1) % PANES.length]; setActive(next); editors[next].current?.focus() }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd' && current) { event.preventDefault(); const bounds = resultEditor.current?.view?.dom.getBoundingClientRect(); setMenu({ x: Math.min(bounds?.left ?? 0, window.innerWidth - 225), y: Math.min(bounds?.top ?? 0, window.innerHeight - 245) }) }
    if (event.key === 'Escape' && menu) { event.preventDefault(); setMenu(null); resultEditor.current?.focus() }
  }}>
    <ToolHeader eyebrow='TEXT TOOLS / YAML MERGE' title='文本对比' description='直接阅读和融合 YAML。按左侧顺序排列右侧，减少字段乱序带来的干扰。' />
    <div className='text-toolbar'>
      <button className='button button-primary' onClick={() => compare()} disabled={busy}>开始比较</button><button className='text-button' onClick={clear}>清空</button>
      {busy ? <button className='text-button' onClick={() => { stop(); report('计算已取消，草稿保留。') }}>取消计算</button> : null}
      <span className={`text-state ${complete ? 'is-complete' : ''}`}>{busy ? '正在本地计算…' : pendingValidation ? '校验 YAML…' : !session ? '等待比较' : complete ? '合并完成' : `草稿 · 待处理 ${pending} 项`}</span>
      <div className='text-display-tools'><button className='text-button' onClick={() => openSearch()}>搜索</button><label><input type='checkbox' checked={wrap} onChange={event => setWrap(event.target.checked)} />自动换行</label>
        <details className='text-more'><summary>更多</summary><div className='text-more-menu'>
          <button onClick={() => openSearch(active, true)}>搜索替换</button><button onClick={() => command('gotoLine')}>跳转行号</button><button onClick={() => command('foldAll')}>折叠代码</button><button onClick={() => command('unfoldAll')}>展开代码</button><button onClick={() => command('selectNext')}>选择下一个相同词</button><button disabled={!canEdit(active)} onClick={() => command('comment')}>切换注释</button><button disabled={!canEdit(active)} onClick={() => command('indent')}>增加缩进</button><button disabled={!canEdit(active)} onClick={() => command('outdent')}>减少缩进</button><button disabled={!canEdit(active)} onClick={() => command('copyLine')}>复制当前行</button><button disabled={!canEdit(active)} onClick={() => command('moveUp')}>上移当前行</button><button disabled={!canEdit(active)} onClick={() => command('moveDown')}>下移当前行</button><button disabled={busy || !session && !left.text && !right.text} onClick={format}>格式化当前栏 YAML</button>
          <label><input type='checkbox' checked={whitespace} onChange={event => setWhitespace(event.target.checked)} />显示空白字符</label><label>字号<select aria-label='编辑器字号' value={fontSize} onChange={event => setFontSize(Number(event.target.value))}>{[12, 13, 14, 16, 18].map(value => <option key={value}>{value}</option>)}</select></label>
          <p>→ / ← 采用 · × 忽略 · 双侧忽略删除此块<br />Ctrl/Cmd+点击直接解决 · F7 / Shift+F7 定位<br />Ctrl+F 查找 · Ctrl+H 替换<br />Ctrl+Shift+F 搜索三栏 · F3 下一项<br />Ctrl+Alt+G 跳转 · Ctrl+/ 注释<br />Alt+↑/↓ 移动行 · Shift+Alt+↓ 复制行<br />Ctrl+D 多选相同词 · Alt+拖动矩形选择<br />Tab / Shift+Tab 缩进 · Esc 后 Tab 离开编辑器</p>
        </div></details></div>
    </div>
    {searchOpen ? <div className='text-search-panel' role='search' aria-label='编辑器搜索替换' onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); editors[active].current?.focus() }
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); searchCommand(event.shiftKey ? 'findPrevious' : 'findNext') }
    }}><div className='text-search-row'><input ref={searchInput} aria-label='查找内容' placeholder='查找内容' value={searchText} onChange={event => setSearchText(event.target.value)} /><select aria-label='搜索范围' value={scope} onChange={event => setScope(event.target.value as 'current' | 'all')}><option value='current'>当前栏：{LABELS[active]}</option><option value='all'>三栏同时搜索</option></select><button onClick={() => searchCommand('findPrevious')} disabled={!query.valid}>上一匹配</button><button onClick={() => searchCommand('findNext')} disabled={!query.valid}>下一匹配</button><button aria-pressed={replaceOpen} onClick={() => setReplaceOpen(value => !value)}>替换</button><button aria-label='关闭搜索' onClick={() => { setSearchOpen(false); editors[active].current?.focus() }}>×</button></div>
      <div className='text-search-options'><label><input type='checkbox' checked={caseSensitive} onChange={event => setCaseSensitive(event.target.checked)} />区分大小写</label><label><input type='checkbox' checked={wholeWord} onChange={event => setWholeWord(event.target.checked)} />整词</label><label><input type='checkbox' checked={regexp} onChange={event => setRegexp(event.target.checked)} />正则</label><span role='status'>{searchText && !query.valid ? '无效的正则表达式' : (scope === 'all' ? PANES : [active]).map(pane => `${LABELS[pane]} ${stats[pane].matches}${stats[pane].capped ? '+' : ''} 处`).join(' · ')}</span></div>
      {replaceOpen ? <div className='text-search-row'><input aria-label='替换为' placeholder='替换为' value={replacement} onChange={event => setReplacement(event.target.value)} /><button disabled={!canEdit(active) || !query.valid} onClick={() => searchCommand('replaceNext')}>替换当前</button><button disabled={!canEdit(active) || !query.valid} onClick={() => searchCommand('replaceAll')}>全部替换</button><small>替换仅作用于当前可编辑栏：{LABELS[active]}{!canEdit(active) ? '（只读）' : ''}</small></div> : null}
    </div> : null}
    {stale || editingSource ? <div className='text-notice' role='status'>{stale ? '源文件已改变，融合草稿已保留；请重新比较。' : '正在编辑源文件，采用操作暂停。完成编辑后继续或重新比较。'}</div> : null}
    {validation?.diagnostic && validation.text === resultText ? <div className='text-notice is-error' role='alert'>结果 YAML 无效，草稿已保留；请直接修正或撤销：{validation.diagnostic.message}</div> : null}
    <div className='text-difference-toolbar' role='group' aria-label='差异定位与处理'>
      <div className={`text-merge-actions${resolved ? ' is-resolved' : ''}`}>
        <button disabled={paused || !current || resolved} title='使用左侧解决：采用左侧，并忽略右侧' onClick={() => choose('left')}>采用左侧</button>
        <div className='text-diff-tools'><button aria-label='上一处差异' disabled={!comparison?.differences.length || stale} onClick={() => navigate(-1)}>↑</button><button aria-label='下一处差异' disabled={!comparison?.differences.length || stale} onClick={() => navigate(1)}>↓</button><select aria-label='当前差异' disabled={!comparison?.differences.length} value={comparison?.differences.length ? Math.min(selected, comparison.differences.length - 1) : ''} onChange={event => locate(Number(event.target.value))}>{comparison?.differences.length ? comparison.differences.map((diff, index) => <option key={diff.id} value={index}>{index + 1}. {diff.label} · {session?.resolutions[index].decision === 'pending' ? '未处理' : '已确认'}</option>) : <option value=''>无差异</option>}</select></div>
        <button className='text-merge-confirm' disabled={actionsPaused || !current || resolved} onClick={confirmCurrent}>确认手动处理</button><button className='text-merge-reset' disabled={actionsPaused || !current || !resolution?.safe || !resolved && !resolution.dirty && Object.values(resolution.sides).every(state => state === 'pending')} title='恢复此块初始左侧内容，并重新处理两侧' onClick={resetCurrent}>重置此差异</button>
        <button disabled={paused || !current || resolved} title='使用右侧解决：采用右侧，并忽略左侧' onClick={() => choose('right')}>采用右侧</button>
      </div>
      <div className='text-diff-options'>
        <span className='text-diff-summary'>{current ? <><strong>{`差异 ${selected + 1} / ${comparison!.differences.length} · ${resolved ? '✓ 已确认' : resolution?.dirty ? '手改后待确认' : '待处理'}`}</strong><small>左侧{sideStatus('left')} · 右侧{sideStatus('right')}</small></> : session ? '两侧内容相同' : '先输入左右内容并开始比较'}</span>
        <label><input type='checkbox' checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)} />仅定位未处理</label><label><input type='checkbox' checked={locked} onChange={event => setLocked(event.target.checked)} />锁定滚动</label><label><input type='checkbox' checked={hideEqual} onChange={event => setHideEqual(event.target.checked)} />隐藏相同内容</label>
        <div className='text-batch-actions'><span>剩余 {pending} 项</span><button disabled={paused || !pending} title='全部未处理差异采用左侧；保留已确认选择，可一次撤销' onClick={() => chooseAll('left')}>全部采用左侧</button><button disabled={paused || !pending} title='全部未处理差异采用右侧；保留已确认选择，可一次撤销' onClick={() => chooseAll('right')}>全部采用右侧</button></div>
      </div>
    </div>
    <div className='text-pane-tabs' role='tablist' aria-label='比较文档'>{PANES.map(pane => <button role='tab' aria-selected={active === pane} key={pane} onClick={() => setActive(pane)}>{LABELS[pane]}</button>)}</div>
    <div className='text-panes' data-active={active}>{PANES.map(pane => {
      const source = pane === 'left' ? left : right
      const value = pane === 'result' ? session?.text ?? '' : !session || sourceEditing[pane] ? source.text : session.comparison[pane].text
      const state = pane === 'result' ? !session ? '未比较' : complete ? '已完成' : '草稿' : !session || sourceEditing[pane] ? '编辑中' : pane === 'right' && reordered ? comparison?.rightPresentation === 'formatted' ? '已格式化 · 只读' : '已重排 · 只读' : '只读'
      const name = pane === 'result' ? filename : source.name || '未命名'
      return <section className={`text-pane text-pane-${pane}`} key={pane} aria-label={`${LABELS[pane]}编辑区`}>
        <div className='text-pane-heading'>
          <strong>{LABELS[pane]}</strong><span className='text-pane-filename' title={name}>{name}</span><span className='text-pane-state' title={state}>{state}</span>
          <div className='text-pane-icons'>{pane === 'result' ? <>
            <button className='text-icon-button' aria-label='撤销' title='撤销（Ctrl+Z）' disabled={!session?.undo.length || busy} onClick={() => history('undo')}><MergeIcon name='undo' /></button>
            <button className='text-icon-button' aria-label='重做' title='重做（Ctrl+Shift+Z）' disabled={!session?.redo.length || busy} onClick={() => history('redo')}><MergeIcon name='redo' /></button>
            <button className='text-icon-button' aria-label={complete ? '复制结果' : '复制草稿'} title={complete ? '复制结果' : '复制草稿'} disabled={!session} onClick={() => void copy()}><MergeIcon name='copy' /></button>
            <button className='text-icon-button' aria-label={complete ? '下载结果' : '下载草稿'} title='下载：设置文件名与换行符' disabled={!session} onClick={() => session && setDownload({ text: session.text, eol: session.eol, complete })}><MergeIcon name='download' /></button>
          </> : <>
            {pane === 'right' ? <><button className='text-icon-button' aria-label='按左侧顺序排列' title='按左侧顺序排列' disabled={busy || stale || editingSource || !left.text || !right.text} onClick={reorder}><MergeIcon name='reorder' /></button><button className='text-icon-button' aria-label='恢复原始顺序' title='恢复原始顺序' disabled={!reordered || busy || stale || editingSource} onClick={() => candidate(comparison!.originalRight!, '已恢复右侧原始顺序。')}><MergeIcon name='restore' /></button></> : null}
            {session ? <button className='text-icon-button' aria-label={sourceEditing[pane] ? '完成编辑' : '编辑源文件'} title={sourceEditing[pane] ? '完成编辑' : '编辑源文件'} disabled={busy} onClick={() => { setSourceEditing(previous => ({ ...previous, [pane]: !previous[pane] })); setActive(pane) }}><MergeIcon name={sourceEditing[pane] ? 'check' : 'edit'} /></button> : null}
            <button className='text-icon-button' aria-label={`导入${pane === 'left' ? '左侧' : '右侧'}文件`} title='导入 UTF-8 YAML 文件' disabled={busy} onClick={() => sourceInputs.current[pane]?.click()}><MergeIcon name='import' /></button>
            <input hidden ref={element => { sourceInputs.current[pane] = element }} type='file' aria-label={`导入${pane === 'left' ? '左侧' : '右侧'}原文文件`} onChange={event => void importFile(pane, event)} />
          </>}</div>
        </div>
        <MergeEditor ref={editors[pane]} value={value} label={LABELS[pane]} language='yaml' result={pane === 'result'} readOnly={!canEdit(pane)} wrap={wrap} whitespace={whitespace} fontSize={fontSize} spans={spans[pane]} active={activeSpan(pane)} folds={folds[pane]} onChange={pane === 'result' ? editResult : text => updateSource(pane, text)} onScroll={() => onScroll(pane)} onExpand={id => setExpanded(previous => new Set(previous).add(id))} onError={message => report(message, true)} onFocus={() => { if (active !== pane) typing.current = null; setActive(pane) }} onSearch={(replace, all) => openSearch(pane, replace, all)} onStats={value => setStats(previous => ({ ...previous, [pane]: value }))} onSelect={(position, docChanged) => { if (!docChanged) typing.current = null; selectAt(pane, position) }} onUndo={pane === 'result' ? () => history('undo') : undefined} onRedo={pane === 'result' ? () => history('redo') : undefined} onPaste={pane === 'result' ? undefined : raw => (pane === 'left' ? setLeft : setRight)(previous => ({ ...previous, eol: detectEol(raw) }))} adoptions={pane === 'result' ? undefined : adoptions[pane]} adoptLabel={pane === 'left' ? '采用左侧' : '采用右侧'} adoptEdge={pane === 'left' ? 'after' : 'before'} adoptDisabled={paused} ignoreDisabled={actionsPaused} onAdopt={pane === 'result' ? undefined : (index, resolve) => sideAction(pane, index, 'accept', resolve)} onIgnore={pane === 'result' ? undefined : (index, resolve) => sideAction(pane, index, 'ignore', resolve)} onMergeMenu={pane === 'result' ? (x, y, pos) => { if ((selectAt('result', pos) ?? -1) >= 0) setMenu({ x, y }) } : undefined} />
        <div className='text-editor-status'><span>行 {stats[pane].line}，列 {stats[pane].column}</span><span>{stats[pane].selected ? `选中 ${stats[pane].selected} 字符 · ` : ''}{stats[pane].lines} 行</span></div>
      </section>
    })}</div>
    {menu ? <div className='text-merge-menu' ref={menuElement} role='menu' aria-label='差异处理' style={{ left: Math.max(0, Math.min(menu.x, window.innerWidth - 225)), top: Math.max(0, Math.min(menu.y, window.innerHeight - 245)) }} onClick={() => setMenu(null)} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault(); const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:enabled')], at = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (at + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length]?.focus()
    }}><button role='menuitem' disabled={paused || !current || resolved} onClick={() => choose('left')}>使用左侧解决</button><button role='menuitem' disabled={paused || !current || resolved} onClick={() => choose('right')}>使用右侧解决</button><button role='menuitem' disabled={actionsPaused || !current || resolution?.sides.left !== 'pending'} onClick={() => sideAction('left', selected, 'ignore')}>忽略左侧</button><button role='menuitem' disabled={actionsPaused || !current || resolution?.sides.right !== 'pending'} onClick={() => sideAction('right', selected, 'ignore')}>忽略右侧</button><button role='menuitem' disabled={actionsPaused || !current || resolved} onClick={confirmCurrent}>标记为已解决（保留结果）</button><button role='menuitem' disabled={actionsPaused || !current || !resolution?.safe} onClick={resetCurrent}>重置此差异</button></div> : null}
    {download ? <DownloadDialog initialName={!download.complete && filename === 'merged.yaml' ? 'draft-merged.yaml' : filename} initialEol={download.eol} draft={!download.complete} onClose={() => setDownload(null)} onDownload={(name, eol) => { downloadText(exportText(download.text, eol), name); setFilename(name); setDownload(null); report('已下载完整文件。') }} /> : null}
    <div className={`text-feedback ${feedback?.error ? 'is-error' : ''}`} role='status' aria-live='polite'>{feedback?.text ?? '仅在浏览器本地处理 · 折叠不影响完整导出 · 重排和格式化分别操作'}</div>
  </div>
}
