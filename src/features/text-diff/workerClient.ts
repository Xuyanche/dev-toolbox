import type { AnalysisOutput, AnalysisRequest } from './analysis'
import AnalysisWorker from './analysis.worker.ts?worker&inline'

export const ANALYSIS_TIMEOUT = 5000
export interface AnalysisJob { promise: Promise<AnalysisOutput>; cancel: () => void }
export function runAnalysis(request: AnalysisRequest, timeout = ANALYSIS_TIMEOUT): AnalysisJob {
  let cancel = () => {}
  const promise = new Promise<AnalysisOutput>((resolve, reject) => {
    if (typeof Worker === 'undefined') { reject(new Error('浏览器不支持本地后台计算，请使用现代浏览器。')); return }
    let worker: Worker
    try { worker = new AnalysisWorker() }
    catch { reject(new Error('无法启动本地后台计算。请检查浏览器是否允许 Worker；输入及草稿已保留。')); return }
    let ended = false
    const finish = (error?: Error, value?: AnalysisOutput) => {
      if (ended) return
      ended = true
      clearTimeout(timer)
      worker.terminate()
      if (error) reject(error)
      else resolve(value!)
    }
    const timer = setTimeout(() => finish(new Error('计算超过五秒，已停止。请缩小文本后重试；草稿已保留。')), timeout)
    cancel = () => finish(new Error('计算已取消，输入及草稿已保留。'))
    worker.onmessage = event => {
      const data: unknown = event.data
      if (!data || typeof data !== 'object' || !('ok' in data)) { finish(new Error('本地后台计算返回了无效响应；输入及草稿已保留。')); return }
      if (data.ok === true && 'value' in data) finish(undefined, data.value as AnalysisOutput)
      else finish(new Error('message' in data && typeof data.message === 'string' ? data.message : '本地后台计算返回了无效响应；输入及草稿已保留。'))
    }
    worker.onerror = event => {
      const detail = event?.message?.trim()
      finish(new Error(`本地后台模块加载或执行失败${detail ? `：${detail}` : '。开发模式下请先保存输入及草稿，再刷新页面或重启开发服务'}；当前输入及草稿已保留。`))
    }
    worker.onmessageerror = () => finish(new Error('无法读取本地后台计算结果；输入及草稿已保留。'))
    try { worker.postMessage(request) }
    catch { finish(new Error('无法发送本地计算任务；输入及草稿已保留。')) }
  })
  return { promise, cancel: () => cancel() }
}
