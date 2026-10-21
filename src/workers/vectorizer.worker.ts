import { runVectorize } from '../features/vectorizer/vectorize-core'
import type { FromWorker, ToWorker } from '../features/vectorizer/types'

interface WorkerScope {
  postMessage(message: unknown): void
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null
}
const ctx = self as unknown as WorkerScope

ctx.onmessage = (e) => {
  if (e.data.type === 'START') {
    void runVectorize(e.data, (m: FromWorker) => ctx.postMessage(m))
  }
}
