import { runAnalysis } from './workerClient'
import { sourceFromText, readSource } from './io'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage?: (event: { data: unknown }) => void
  onerror?: (event?: { message?: string }) => void
  onmessageerror?: () => void
  terminate = vi.fn()
  postMessage = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
  reply(value: unknown) { this.onmessage?.({ data: { ok: true, value } }) }
}
const request = { kind: 'compare', mode: 'text', left: sourceFromText('a'), right: sourceFromText('b') } as const

describe('cancelable local worker lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('terminates successful workers and sends only the local request', async () => {
    const job = runAnalysis(request)
    const worker = FakeWorker.instances[0]
    expect(worker.postMessage).toHaveBeenCalledWith(request)
    worker.reply({ differences: [] })
    await expect(job.promise).resolves.toEqual({ differences: [] })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
  it('cancels an old job without allowing a late reply to replace a newer result', async () => {
    const old = runAnalysis(request), oldError = old.promise.catch(error => error.message)
    old.cancel()
    const next = runAnalysis(request)
    FakeWorker.instances[0].reply({ stale: true })
    FakeWorker.instances[1].reply({ fresh: true })
    await expect(oldError).resolves.toContain('取消')
    await expect(next.promise).resolves.toEqual({ fresh: true })
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })
  it('stops a hung computation at the five-second budget', async () => {
    const job = runAnalysis(request), failure = job.promise.catch(error => error.message)
    await vi.advanceTimersByTimeAsync(5000)
    await expect(failure).resolves.toContain('超过五秒')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })
  it('surfaces worker failures and releases its resources', async () => {
    const job = runAnalysis(request), failure = job.promise.catch(error => error.message)
    FakeWorker.instances[0].onerror?.()
    await expect(failure).resolves.toContain('本地后台模块加载或执行失败')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })
  it('shows worker loading details and preserves the current draft', async () => {
    const job = runAnalysis(request), failure = job.promise.catch(error => error.message)
    FakeWorker.instances[0].onerror?.({ message: 'Failed to fetch dynamically imported module' })
    await expect(failure).resolves.toContain('Failed to fetch dynamically imported module')
    await expect(failure).resolves.toContain('当前输入及草稿已保留')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })
  it('releases resources when decoding a message fails', async () => {
    const job = runAnalysis(request), failure = job.promise.catch(error => error.message)
    FakeWorker.instances[0].onmessageerror?.()
    await expect(failure).resolves.toContain('无法读取')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('releases resources when sending a message fails synchronously', async () => {
    vi.stubGlobal('Worker', class extends FakeWorker { postMessage = vi.fn(() => { throw new Error('DataCloneError') }) })
    const job = runAnalysis(request)
    await expect(job.promise).rejects.toThrow('无法发送')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('explains constructor failures instead of leaking a raw exception', async () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('SecurityError') } })
    await expect(runAnalysis(request).promise).rejects.toThrow('浏览器是否允许 Worker')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('rejects invalid replies immediately and releases the worker', async () => {
    const job = runAnalysis(request)
    FakeWorker.instances[0].onmessage?.({ data: null })
    await expect(job.promise).rejects.toThrow('无效响应')
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('UTF-8 file handling', () => {
  it('accepts UTF-8 BOM and arbitrary text extensions', async () => {
    const bytes = new TextEncoder().encode('\uFEFFhello\r\nworld')
    const file = { name: 'settings.custom', size: bytes.length, arrayBuffer: async () => bytes.buffer } as File
    await expect(readSource(file)).resolves.toEqual({ text: 'hello\nworld', name: 'settings.custom', eol: 'CRLF' })
  })
  it('rejects invalid UTF-8 without returning corrupted replacement characters', async () => {
    const file = { name: 'old.txt', size: 2, arrayBuffer: async () => new Uint8Array([0xff, 0xfe]).buffer } as File
    await expect(readSource(file)).rejects.toThrow('UTF-8')
  })
})
