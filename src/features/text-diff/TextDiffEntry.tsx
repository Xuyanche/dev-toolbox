import { lazy, Suspense } from 'react'

const Workspace = lazy(() => import('./TextDiffTool').then(module => ({ default: module.TextDiffTool })))

export function TextDiffEntry() {
  return <Suspense fallback={<p role='status'>正在准备文本对比工作区…</p>}><Workspace /></Suspense>
}
