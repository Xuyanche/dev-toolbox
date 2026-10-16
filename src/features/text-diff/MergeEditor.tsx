import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Annotation, Compartment, EditorState, Prec, RangeSet, StateEffect, StateField, Transaction, type ChangeSet, type Range } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, drawSelection, dropCursor, gutter, highlightActiveLine, highlightActiveLineGutter, highlightWhitespace, keymap, lineNumbers, placeholder, rectangularSelection, type DecorationSet } from '@codemirror/view'
import { copyLineDown, defaultKeymap, history, historyKeymap, indentLess, indentMore, indentWithTab, moveLineDown, moveLineUp, redo, toggleComment, undo } from '@codemirror/commands'
import { bracketMatching, codeFolding, defaultHighlightStyle, foldAll, foldEffect, foldGutter, foldKeymap, foldedRanges, indentOnInput, indentUnit, syntaxHighlighting, unfoldAll, unfoldEffect } from '@codemirror/language'
import { SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, gotoLine, highlightSelectionMatches, openSearchPanel, replaceAll, replaceNext, search, searchKeymap, selectNextOccurrence, setSearchQuery } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { yaml } from '@codemirror/lang-yaml'
import { checkInput } from './io'
import type { SideDecision, Span } from './model'
import type { Fold } from './viewModel'

const external = Annotation.define<boolean>()
export interface DiffSpan extends Span { resolved?: boolean }
interface Adoption { at: number; index: number; state: SideDecision; active: boolean }
interface AdoptionOptions extends Adoption { disabled: boolean; ignoreDisabled: boolean; label: string; adopt: (index: number, resolve: boolean) => void; ignore: (index: number, resolve: boolean) => void }
const setAdoptions = StateEffect.define<AdoptionOptions[]>()
class AdoptMarker extends GutterMarker {
  constructor(readonly options: AdoptionOptions) { super() }
  toDOM() {
    const group = document.createElement('span'), side = this.options.label.includes('左侧') ? '左侧' : '右侧'
    group.className = `cm-merge-side-actions${this.options.active ? ' is-active' : ''}`
    if (this.options.active) group.setAttribute('aria-current', 'true')
    for (const action of side === '左侧' ? ['ignore', 'accept'] as const : ['accept', 'ignore'] as const) {
      const button = document.createElement('button'), label = `${action === 'accept' ? '采用' : '忽略'}${side}差异 ${this.options.index + 1}`
      button.type = 'button'; button.textContent = action === 'ignore' ? '×' : side === '左侧' ? '→' : '←'
      button.disabled = (action === 'ignore' ? this.options.ignoreDisabled : this.options.disabled) || this.options.state !== 'pending'
      button.className = `cm-adopt-button${action === 'ignore' ? ' cm-ignore-button' : ''}`; button.setAttribute('aria-label', label)
      button.title = this.options.state !== 'pending' ? `${side}${this.options.state === 'accepted' ? '已采用' : '已忽略'}` : `${label}；Ctrl/Cmd+点击直接解决整块`
      button.onclick = event => { event.preventDefault(); (action === 'accept' ? this.options.adopt : this.options.ignore)(this.options.index, event.ctrlKey || event.metaKey) }
      group.append(button)
    }
    return group
  }
}
const adoptionMarkers = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(value, transaction) {
    value = value.map(transaction.changes)
    for (const effect of transaction.effects) if (effect.is(setAdoptions)) {
      const seen = new Set<number>()
      value = RangeSet.of(effect.value.flatMap(item => {
        const position = transaction.state.doc.lineAt(Math.min(transaction.state.doc.length, Math.max(0, item.at))).from
        if (seen.has(position)) return []
        seen.add(position)
        return [new AdoptMarker(item).range(position)]
      }), true)
    }
    return value
  },
})
const setMarks = StateEffect.define<{ spans: DiffSpan[]; active?: Span }>()
const marks = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    value = value.map(transaction.changes)
    for (const effect of transaction.effects) if (effect.is(setMarks)) {
      const decorations: Range<Decoration>[] = []
      const lines = new Map<number, { resolved: boolean; active: boolean }>()
      for (const span of effect.value.spans) {
        const from = Math.min(span.from, transaction.state.doc.length), to = Math.min(span.to, transaction.state.doc.length)
        const start = transaction.state.doc.lineAt(Math.max(0, from)).number
        const end = transaction.state.doc.lineAt(Math.max(from, to > from ? to - 1 : to)).number
        for (let n = start; n <= end; n++) {
          const line = transaction.state.doc.line(n)
          const active = Boolean(effect.value.active && line.to >= effect.value.active.from && line.from <= effect.value.active.to)
          const previous = lines.get(line.from)
          lines.set(line.from, { resolved: Boolean(span.resolved) && (previous?.resolved ?? true), active: active || Boolean(previous?.active) })
        }
      }
      lines.forEach((line, from) => decorations.push(Decoration.line({ class: `cm-merge-diff${line.resolved ? ' cm-merge-resolved' : ''}${line.active ? ' cm-merge-active' : ''}` }).range(from)))
      value = Decoration.set(decorations, true)
    }
    return value
  },
  provide: field => EditorView.decorations.from(field),
})

export interface EditorHandle {
  view: EditorView | null
  locate: (span: Span) => void
  top: () => { pos: number; offset: number; left: number; top: number }
  follow: (pos: number | undefined, offset: number, left?: number) => void
  search: (query: SearchQuery) => void
  command: (name: EditorCommand) => void
  focus: () => void
}
export type EditorCommand = 'findNext' | 'findPrevious' | 'replaceNext' | 'replaceAll' | 'gotoLine' | 'foldAll' | 'unfoldAll' | 'indent' | 'outdent' | 'comment' | 'copyLine' | 'moveUp' | 'moveDown' | 'undo' | 'redo' | 'selectNext'
export interface EditorStats { line: number; column: number; selected: number; lines: number; matches: number; capped: boolean }
interface Props {
  value: string
  label: string
  language: 'text' | 'yaml'
  folds: Fold[]
  spans: DiffSpan[]
  active?: Span
  onChange: (text: string, changes: ChangeSet, userEvent?: string) => void
  onScroll: () => void
  onExpand: (id: string) => void
  onError: (message: string) => void
  onUndo?: () => void
  onRedo?: () => void
  onSelect?: (pos: number, docChanged?: boolean) => void
  onPaste?: (raw: string) => void
  result?: boolean
  readOnly?: boolean
  wrap?: boolean
  whitespace?: boolean
  fontSize?: number
  onFocus?: () => void
  onSearch?: (replace: boolean, all?: boolean) => void
  onStats?: (stats: EditorStats) => void
  adoptions?: Adoption[]
  adoptLabel?: string
  adoptEdge?: 'before' | 'after'
  adoptDisabled?: boolean
  ignoreDisabled?: boolean
  onAdopt?: (index: number, resolve: boolean) => void
  onIgnore?: (index: number, resolve: boolean) => void
  onMergeMenu?: (x: number, y: number, pos: number) => void
}

function minimalChange(before: string, after: string) {
  let from = 0
  while (from < before.length && from < after.length && before[from] === after[from]) from++
  let oldEnd = before.length, newEnd = after.length
  while (oldEnd > from && newEnd > from && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd-- }
  return { from, to: oldEnd, insert: after.slice(from, newEnd) }
}

export const MergeEditor = forwardRef<EditorHandle, Props>(function MergeEditor(props, ref) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef(props)
  latest.current = props
  const language = useRef(new Compartment())
  const editing = useRef(new Compartment())
  const presentation = useRef(new Compartment())
  function display() {
    return [latest.current.wrap ? EditorView.lineWrapping : [], latest.current.whitespace ? highlightWhitespace() : [], EditorView.theme({ '&': { fontSize: `${latest.current.fontSize ?? 13}px` } })]
  }

  useImperativeHandle(ref, () => ({
    get view() { return view.current },
    focus() { view.current?.focus() },
    search(query) {
      const editor = view.current; if (!editor) return
      if (query.search) openSearchPanel(editor)
      else closeSearchPanel(editor)
      editor.dispatch({ effects: setSearchQuery.of(query) })
    },
    command(name) {
      const editor = view.current
      if (!editor) return
      const commands = { findNext, findPrevious, replaceNext, replaceAll, gotoLine, foldAll, unfoldAll, indent: indentMore, outdent: indentLess, comment: toggleComment, copyLine: copyLineDown, moveUp: moveLineUp, moveDown: moveLineDown, undo, redo, selectNext: selectNextOccurrence }
      if (name === 'undo' && latest.current.onUndo) latest.current.onUndo()
      else if (name === 'redo' && latest.current.onRedo) latest.current.onRedo()
      else commands[name](editor)
      if (name === 'findNext' || name === 'findPrevious') {
        const selected = editor.state.selection.main, effects: StateEffect<unknown>[] = []
        foldedRanges(editor.state).between(0, editor.state.doc.length, (from, to) => { if (selected.from <= to && selected.to >= from) effects.push(unfoldEffect.of({ from, to })) })
        if (effects.length) editor.dispatch({ effects })
      }
      editor.focus()
    },
    locate(span) {
      const editor = view.current
      if (!editor) return
      const from = Math.max(0, Math.min(span.from, editor.state.doc.length))
      const effects: StateEffect<unknown>[] = []
      foldedRanges(editor.state).between(0, editor.state.doc.length, (a, b) => {
        if (from >= a && from <= b) effects.push(unfoldEffect.of({ from: a, to: b }))
      })
      effects.push(EditorView.scrollIntoView(from, { y: 'center' }))
      editor.dispatch({ effects })
    },
    top() {
      const editor = view.current
      if (!editor) return { pos: 0, offset: 0, left: 0, top: 0 }
      const top = editor.scrollDOM.scrollTop
      const block = editor.lineBlockAtHeight(top)
      return { pos: block.from, offset: top - block.top, left: editor.scrollDOM.scrollLeft, top }
    },
    follow(pos, offset, left) {
      const editor = view.current
      if (!editor || !editor.dom.getBoundingClientRect().width) return
      if (pos !== undefined) {
        const block = editor.lineBlockAt(Math.max(0, Math.min(editor.state.doc.length, pos)))
        editor.scrollDOM.scrollTop = Math.max(0, block.top + Math.min(offset, Math.max(0, block.height - 1)))
      }
      if (left !== undefined) editor.scrollDOM.scrollLeft = left
    },
  }), [])

  useEffect(() => {
    if (!host.current) return
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: latest.current.value,
        extensions: [
          lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), marks, adoptionMarkers,
          gutter({ class: 'cm-adopt-gutter', side: latest.current.adoptEdge, markers: editor => editor.state.field(adoptionMarkers) }),
          EditorState.allowMultipleSelections.of(true), drawSelection(), dropCursor(), rectangularSelection(),
          Prec.highest(EditorView.domEventHandlers({ keydown: event => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f' && latest.current.onSearch) { latest.current.onSearch(false, true); return true }
            return false
          } })),
          search({ createPanel: () => { const dom = document.createElement('div'); dom.hidden = true; return { dom } } }), highlightSelectionMatches(), closeBrackets(), bracketMatching(), indentOnInput(), indentUnit.of('  '), foldGutter(),
          presentation.current.of(display()),
          EditorState.phrases.of({ 'Go to line': '跳转行号', go: '跳转', 'Line number': '行号', Find: '查找', Replace: '替换', next: '下一项', previous: '上一项', all: '全选', 'match case': '区分大小写', regexp: '正则', 'by word': '整词', replace: '替换', 'replace all': '全部替换', close: '关闭' }),
          syntaxHighlighting(defaultHighlightStyle),
          language.current.of(latest.current.language === 'yaml' ? yaml() : []),
          editing.current.of([EditorState.readOnly.of(Boolean(latest.current.readOnly)), EditorView.editable.of(!latest.current.readOnly)]),
          ...(!latest.current.result ? [history(), keymap.of(historyKeymap)] : []),
          placeholder('粘贴文本或导入文件…'),
          EditorView.contentAttributes.of({ 'aria-label': latest.current.label, 'aria-multiline': 'true', spellcheck: 'false', tabindex: '0' }),
          EditorState.transactionFilter.of(transaction => {
            if (transaction.docChanged && !transaction.annotation(external)) {
              try { checkInput(transaction.newDoc.toString(), latest.current.result ? 2 : 1) }
              catch (error) { queueMicrotask(() => latest.current.onError(error instanceof Error ? error.message : '文本超过限制。')); return [] }
            }
            return transaction
          }),
          codeFolding({
            preparePlaceholder: (state, range) => ({
              id: latest.current.folds.find(fold => fold.span.from === range.from)?.id,
              lines: state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number + 1,
            }),
            placeholderDOM: (_editor, onclick, prepared: { id?: string; lines: number }) => {
              const button = document.createElement('button')
              button.type = 'button'
              button.className = 'cm-merge-fold'
              button.textContent = `${prepared.id ? '相同内容' : '已折叠'} · ${prepared.lines} 行 · 展开`
              button.setAttribute('aria-label', `展开${prepared.id ? '相同内容' : '代码'} ${prepared.lines} 行`)
              button.onclick = event => {
                if (prepared.id) latest.current.onExpand(prepared.id)
                onclick(event)
              }
              return button
            },
          }),
          keymap.of([
            { key: 'Mod-f', run: editor => { if (!latest.current.onSearch) return openSearchPanel(editor); latest.current.onSearch(false); return true }, shift: () => { latest.current.onSearch?.(false, true); return true } },
            { key: 'Mod-h', mac: 'Mod-Alt-f', run: () => { latest.current.onSearch?.(true); return true } },
            { key: 'Mod-Shift-f', run: () => { latest.current.onSearch?.(false, true); return true } },
            { key: 'Mod-z', run: () => { if (!latest.current.onUndo) return false; latest.current.onUndo(); return true } },
            { key: 'Mod-Shift-z', run: () => { if (!latest.current.onRedo) return false; latest.current.onRedo(); return true } },
            { key: 'Mod-y', run: () => { if (!latest.current.onRedo) return false; latest.current.onRedo(); return true } },
            indentWithTab, ...searchKeymap, ...closeBracketsKeymap, ...foldKeymap, ...defaultKeymap,
          ]),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !update.transactions.some(transaction => transaction.annotation(external))) {
              latest.current.onChange(update.state.doc.toString(), update.changes, update.transactions.find(transaction => transaction.docChanged)?.annotation(Transaction.userEvent))
            }
            if (update.selectionSet) latest.current.onSelect?.(update.state.selection.main.head, update.docChanged)
            if (latest.current.onStats && (update.docChanged || update.selectionSet || update.transactions.some(transaction => transaction.effects.some(effect => effect.is(setSearchQuery))))) {
              const selection = update.state.selection, line = update.state.doc.lineAt(selection.main.head), query = getSearchQuery(update.state)
              let matches = 0
              if (query.valid) { const cursor = query.getCursor(update.state); while (matches <= 10_000 && !cursor.next().done) matches++ }
              latest.current.onStats({ line: line.number, column: selection.main.head - line.from + 1, selected: selection.ranges.reduce((sum, range) => sum + range.to - range.from, 0), lines: update.state.doc.lines, matches: Math.min(matches, 10_000), capped: matches > 10_000 })
            }
          }),
          EditorView.domEventHandlers({
            contextmenu: (event, editor) => {
              if (!latest.current.onMergeMenu) return false
              const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY })
              if (pos === null) return false
              event.preventDefault(); latest.current.onMergeMenu(event.clientX, event.clientY, pos); return true
            },
            scroll: () => { latest.current.onScroll(); return false },
            focus: () => { latest.current.onFocus?.(); return false },
            paste: event => {
              const raw = event.clipboardData?.getData('text/plain')
              if (raw !== undefined) {
                try { checkInput(raw, latest.current.result ? 2 : 1); latest.current.onPaste?.(raw) }
                catch (error) { event.preventDefault(); latest.current.onError(error instanceof Error ? error.message : '不支持的文本。'); return true }
              }
              return false
            },
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px', backgroundColor: '#fff' },
            '.cm-scroller': { overflow: 'auto', fontFamily: "'Cascadia Code', Consolas, monospace", lineHeight: '1.55' },
            '.cm-content': { padding: '7px 0', minHeight: '100%' },
            '.cm-line': { padding: '0 8px' },
            '.cm-gutters': { borderRight: '1px solid #edf0ec', backgroundColor: '#f8faf7', color: '#8b958e' },
            '.cm-gutters-after': { borderLeft: '1px solid #edf0ec', borderRight: 'none' },
            '.cm-activeLine': { backgroundColor: '#176b4508' },
            '&.cm-focused': { outline: '2px solid #176b4566', outlineOffset: '-2px' },
          }),
        ],
      }),
    })
    view.current = editor
    // CodeMirror hides decorative gutters from assistive tools; adoption is interactive.
    editor.dom.querySelectorAll('.cm-gutters').forEach(element => element.removeAttribute('aria-hidden'))
    editor.dom.querySelectorAll('.cm-gutter:not(.cm-adopt-gutter)').forEach(element => element.setAttribute('aria-hidden', 'true'))
    return () => { editor.destroy(); view.current = null }
  }, [])

  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const previous = editor.state.doc.toString()
    if (previous !== props.value) {
      const change = minimalChange(previous, props.value)
      editor.dispatch({ changes: change, annotations: external.of(true) })
    }
  }, [props.value])
  useEffect(() => { view.current?.dispatch({ effects: language.current.reconfigure(props.language === 'yaml' ? yaml() : []) }) }, [props.language])
  useEffect(() => { view.current?.dispatch({ effects: editing.current.reconfigure([EditorState.readOnly.of(Boolean(props.readOnly)), EditorView.editable.of(!props.readOnly)]) }) }, [props.readOnly])
  useEffect(() => { view.current?.dispatch({ effects: presentation.current.reconfigure(display()) }) }, [props.wrap, props.whitespace, props.fontSize])
  useEffect(() => {
    view.current?.dispatch({ effects: setAdoptions.of((props.adoptions ?? []).map(item => ({ ...item, disabled: Boolean(props.adoptDisabled), ignoreDisabled: Boolean(props.ignoreDisabled), label: props.adoptLabel ?? '采用', adopt: (index, resolve) => latest.current.onAdopt?.(index, resolve), ignore: (index, resolve) => latest.current.onIgnore?.(index, resolve) }))) })
  }, [props.adoptions, props.adoptDisabled, props.ignoreDisabled, props.adoptLabel])
  useEffect(() => {
    const editor = view.current
    if (!editor) return
    editor.dispatch({ effects: setMarks.of({ spans: props.spans, active: props.active }) })
  }, [props.spans, props.active])
  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const effects: StateEffect<unknown>[] = []
    foldedRanges(editor.state).between(0, editor.state.doc.length, (from, to) => { effects.push(unfoldEffect.of({ from, to })) })
    const cursor = editor.state.selection.main.head
    for (const fold of props.folds) {
      if (editor.hasFocus && cursor >= fold.span.from && cursor <= fold.span.to) continue
      if (fold.span.to <= editor.state.doc.length) effects.push(foldEffect.of(fold.span))
    }
    if (effects.length) editor.dispatch({ effects })
  }, [props.folds])

  return <div className='merge-editor' ref={host} />
})
