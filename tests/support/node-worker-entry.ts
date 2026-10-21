import { parentPort } from 'node:worker_threads'
import { runVectorize } from '../../src/features/vectorizer/vectorize-core'
import type { StartMessage } from '../../src/features/vectorizer/types'

parentPort!.on('message', (m: StartMessage) => {
  void runVectorize(m, (out) => parentPort!.postMessage(out))
})
