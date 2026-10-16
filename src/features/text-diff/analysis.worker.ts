import { analyze, type AnalysisRequest } from './analysis'
import { errorMessage } from './model'

// Dedicated worker per operation: termination also interrupts pathological parsing/diff work.
const worker = globalThis as unknown as { onmessage: (event: MessageEvent<AnalysisRequest>) => void; postMessage: (value: unknown) => void }
worker.onmessage = event => {
  try { worker.postMessage({ ok: true, value: analyze(event.data) }) }
  catch (error) { worker.postMessage({ ok: false, message: errorMessage(error) }) }
}
