import { checkInput } from './io'
import { compareText } from './textCompare'
import { analyzeYaml, compareYaml, yamlAcceptance } from './yamlMerge'
import { changeYamlComment, describeYaml, readYamlNodeValue, yamlNodeChange } from './yamlDocument'
import { formatYaml, reorderYaml, validateYamlText, type ReorderedYaml } from './yamlReorder'
import type { CommentChoice, CompareMode, Comparison, Path, Source, TextEdit, YamlAnalysis } from './model'

export type AnalysisRequest =
  | { kind: 'compare'; left: Source; right: Source; mode: CompareMode }
  | { kind: 'validate'; text: string }
  | { kind: 'accept'; text: string; source: string; path: Path }
  | { kind: 'node'; text: string; path: Path; source?: string; value?: string; comments?: Record<string, CommentChoice> }
  | { kind: 'comment'; text: string; id: string; choice: CommentChoice }
  | { kind: 'nodeValue'; text: string; path: Path }
  | { kind: 'validateText'; text: string }
  | { kind: 'format'; text: string }
  | { kind: 'reorder'; left: Source; right: Source }
  | { kind: 'recompare'; left: Source; right: Source; originalRight: Source; result: string; initial?: boolean }
export type AnalysisOutput = Comparison | YamlAnalysis | TextEdit | { value: string } | ReorderedYaml | { comparison: Comparison; mapping: Comparison; initial?: Comparison }
export function analyze(request: AnalysisRequest): AnalysisOutput {
  if (request.kind === 'validateText') return { entries: {}, ...validateYamlText(request.text) }
  if (request.kind === 'format') return { value: formatYaml(request.text) }
  if (request.kind === 'reorder') return reorderYaml(request.left, request.right)
  if (request.kind === 'recompare') {
    checkInput(request.left.text); checkInput(request.right.text); checkInput(request.result, 2)
    return { comparison: { ...compareText(request.left, request.right), originalRight: request.originalRight }, mapping: compareText(request.left, { ...request.left, text: request.result }), ...(request.initial ? { initial: compareText(request.left, request.originalRight) } : {}) }
  }
  if (request.kind === 'validate') {
    checkInput(request.text, 2)
    const result = analyzeYaml(request.text)
    if (!result.diagnostic) result.view = describeYaml(request.text)
    return result
  }
  if (request.kind === 'accept') return yamlAcceptance(request.text, request.source, request.path)
  if (request.kind === 'node') return yamlNodeChange(request.text, request.path, request)
  if (request.kind === 'comment') return changeYamlComment(request.text, request.id, request.choice)
  if (request.kind === 'nodeValue') return readYamlNodeValue(request.text, request.path)
  checkInput(request.left.text)
  checkInput(request.right.text)
  if (request.mode !== 'yaml') return compareText(request.left, request.right)
  const comparison = compareYaml(request.left, request.right)
  comparison.documents = { left: describeYaml(request.left.text), right: describeYaml(request.right.text) }
  return comparison
}
