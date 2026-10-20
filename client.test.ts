import { describe, expect, it, vi } from 'vitest'
import { VectorizerClient, type WorkerLike } from '../src/features/vectorizer/worker-client'
import { defaultSettings } from '../src/features/vectorizer/presets'
import type { FromWorker } from '../src/features/vectorizer/types'

class Fake implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null
  onerror: WorkerLike['onerror'] = null
  terminated = false
  posted: number[] = []
  postMessage(m: { jobId: number }) { this.posted.push(m.jobId) }
  terminate() { this.terminated = true }
  emit(m: FromWorker) { this.onmessage?.({ data: m } as MessageEvent<FromWorker>) }
}
const input = () => ({ width: 1, height: 1, outWidth: 1, outHeight: 1, pixels: new ArrayBuffer(4), settings: defaultSettings() })
const cbs = () => ({ onStage: vi.fn(), onComplete: vi.fn(), onError: vi.fn() })
const complete = (jobId: number): FromWorker => ({ type: 'COMPLETE', jobId, svg: '<svg/>', pathCount: 1, paletteSize: 1, elapsedMs: 1 })

describe('VectorizerClient', () => {
  it('allows only one active job', () => {
    const c = new VectorizerClient(() => new Fake())
    c.start(input(), cbs(), false)
    expect(() => c.start(input(), cbs(), false)).toThrow()
  })

  it('cancel terminates the worker, ignores stale messages, and a new job succeeds on a fresh worker', () => {
    const workers: Fake[] = []
    const c = new VectorizerClient(() => { const w = new Fake(); workers.push(w); return w })
    const a = cbs()
    const jobA = c.start(input(), a, false)
    workers[0].emit({ type: 'STAGE', jobId: jobA, stage: 'trace' })
    expect(a.onStage).toHaveBeenCalledWith('trace')
    c.cancel()
    expect(workers[0].terminated).toBe(true)
    expect(c.busy).toBe(false)

    const b = cbs()
    const jobB = c.start(input(), b, false)
    expect(workers).toHaveLength(2)
    expect(jobB).not.toBe(jobA)
    workers[0].emit(complete(jobA)) // late message from the cancelled job
    workers[1].emit(complete(jobA)) // stale id on the new worker
    expect(a.onComplete).not.toHaveBeenCalled()
    expect(b.onComplete).not.toHaveBeenCalled()
    workers[1].emit(complete(jobB))
    expect(b.onComplete).toHaveBeenCalledTimes(1)
    expect(c.busy).toBe(false)
  })

  it('reuses the worker between successful jobs and disposes cleanly', () => {
    const workers: Fake[] = []
    const c = new VectorizerClient(() => { const w = new Fake(); workers.push(w); return w })
    const j1 = c.start(input(), cbs(), false); workers[0].emit(complete(j1))
    const j2 = c.start(input(), cbs(), false); workers[0].emit(complete(j2))
    expect(workers).toHaveLength(1)
    c.dispose()
    expect(workers[0].terminated).toBe(true)
  })

  it('times out and terminates', async () => {
    const w = new Fake()
    const c = new VectorizerClient(() => w, 15)
    const cb = cbs()
    c.start(input(), cb, false)
    await new Promise((r) => setTimeout(r, 40))
    expect(w.terminated).toBe(true)
    expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'timeout' }))
    expect(c.busy).toBe(false)
  })
})
