import type { CompleteMessage, ErrorMessage, FromWorker, StartMessage, WorkerStage } from './types'

export interface WorkerLike {
  postMessage(msg: StartMessage, transfer?: Transferable[]): void
  terminate(): void
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null
  onerror: ((e: ErrorEvent) => void) | null
}

export type JobInput = Omit<StartMessage, 'type' | 'jobId'>

export interface JobCallbacks {
  onStage(stage: WorkerStage): void
  onComplete(msg: CompleteMessage): void
  onError(msg: Pick<ErrorMessage, 'code' | 'message'> | { code: 'timeout' | 'crashed'; message: string }): void
}

const defaultFactory = (): WorkerLike =>
  new Worker(new URL('../../workers/vectorizer.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike

/**
 * Owns at most one worker and at most one active job. Cancellation terminates the worker (the only way
 * to stop synchronous tracing); a fresh worker is created lazily for the next job. Messages from any job
 * other than the active one are ignored.
 */
export class VectorizerClient {
  private worker: WorkerLike | null = null
  private activeJob = 0
  private nextJob = 1
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly factory: () => WorkerLike = defaultFactory, private readonly timeoutMs = 120_000) {}

  get busy() { return this.activeJob !== 0 }
  get currentJobId() { return this.activeJob }

  start(input: JobInput, cb: JobCallbacks, transferBuffer = true): number {
    if (this.activeJob !== 0) throw new Error('A conversion is already running.')
    const jobId = this.nextJob++
    this.activeJob = jobId
    const worker = this.worker ?? (this.worker = this.factory())

    worker.onmessage = (e) => {
      const m = e.data
      if (m.jobId !== this.activeJob) return // stale
      if (m.type === 'STAGE') return cb.onStage(m.stage)
      this.finish()
      if (m.type === 'COMPLETE') cb.onComplete(m)
      else cb.onError(m)
    }
    worker.onerror = (e) => {
      if (this.activeJob !== jobId) return
      this.killWorker()
      this.finish()
      cb.onError({ code: 'crashed', message: e.message || 'The tracing worker stopped unexpectedly.' })
    }
    this.timer = setTimeout(() => {
      if (this.activeJob !== jobId) return
      this.killWorker()
      this.finish()
      cb.onError({ code: 'timeout', message: 'This is taking much longer than expected. Try the Low detail level, fewer colours, or a smaller working resolution.' })
    }, this.timeoutMs)

    const msg: StartMessage = { type: 'START', jobId, ...input }
    worker.postMessage(msg, transferBuffer ? [msg.pixels] : [])
    return jobId
  }

  /** Stops the active job immediately. Safe to call when idle. */
  cancel(): void {
    if (this.activeJob === 0) return
    this.killWorker()
    this.finish()
  }

  /** Releases the worker (unmount / reset). */
  dispose(): void {
    this.killWorker()
    this.finish()
  }

  private finish() {
    this.activeJob = 0
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
  }

  private killWorker() {
    if (!this.worker) return
    this.worker.onmessage = null
    this.worker.onerror = null
    this.worker.terminate()
    this.worker = null
  }
}
