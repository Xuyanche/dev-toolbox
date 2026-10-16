export type Mode = 'auto' | 'text' | 'yaml'
export type CompareMode = Exclude<Mode, 'auto'>
export type Eol = 'LF' | 'CRLF' | 'mixed'
export type Side = 'left' | 'right'
export type Decision = 'pending' | Side | 'manual' | 'both' | 'ignored'
export type SideDecision = 'pending' | 'accepted' | 'ignored'
export type Path = string[]
export interface Span { from: number; to: number }
export interface Source { text: string; name: string; eol: Eol }
export interface Piece extends Span { text: string }
export interface Difference {
  id: string
  label: string
  kind: 'text' | 'yaml' | 'eol'
  path?: Path
  left: Piece | null
  right: Piece | null
  leftAnchor: number
  rightAnchor: number
}
export interface EqualBlock { id: string; left: Span; right: Span }
export interface Comparison {
  mode: CompareMode
  left: Source
  right: Source
  differences: Difference[]
  equal: EqualBlock[]
  documents?: { left: YamlDocumentView; right: YamlDocumentView }
  originalRight?: Source
  rightPresentation?: 'reordered' | 'formatted'
}
export interface Resolution {
  range: Span
  decision: Decision
  dirty: boolean
  safe: boolean
  present: boolean
  sides: Record<Side, SideDecision>
}
export interface Snapshot {
  comparison: Comparison
  text: string
  resolutions: Resolution[]
  eol: 'LF' | 'CRLF'
  equals: { range: Span; unchanged: boolean }[]
  commentChoices: Record<string, CommentChoice>
}
export interface Session extends Snapshot {
  comparison: Comparison
  undo: Snapshot[]
  redo: Snapshot[]
}
export interface TextEdit extends Span { insert: string }
export interface Diagnostic { message: string; line?: number; col?: number }
export interface YamlEntry {
  path: Path
  range: Span
  valueRange: Span
  keyRange?: Span
  signature: string
  kind: 'map' | 'seq' | 'scalar'
  indent: number
  flow: boolean
  parentFlow: boolean
}
export interface YamlAnalysis {
  entries: Record<string, YamlEntry>
  diagnostic: Diagnostic | null
  view?: YamlDocumentView
}
export interface YamlViewNode {
  id: string
  path: Path
  actionPath: Path
  label: string
  kind: 'map' | 'seq' | 'string' | 'number' | 'boolean' | 'null'
  preview: string
  previewTruncated: boolean
  signature: string
  children: string[]
  line: number
  valueRange: Span
  readonly: boolean
}
export type CommentPlacement = 'before' | 'inline' | 'header' | 'footer' | 'independent'
export interface YamlComment {
  id: string
  path: Path
  placement: CommentPlacement
  text: string
  range: Span
  line: number
  indent: number
  context: string
  attached: boolean
  anchorPath?: Path
}
export interface YamlDocumentView {
  nodes: Record<string, YamlViewNode>
  comments: YamlComment[]
}
export interface CommentChoice {
  path: Path
  placement: CommentPlacement
  text: string
  source?: YamlComment
}
export const pathKey = (path: Path) => JSON.stringify(path)
export const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
export const piece = (text: string, span: Span): Piece => ({ ...span, text: text.slice(span.from, span.to) })
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。'
