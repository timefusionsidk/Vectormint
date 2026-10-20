import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Worker } from 'node:worker_threads'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { defaultSettings, withDetail, withPreset } from '../src/features/vectorizer/presets'
import type { FromWorker } from '../src/features/vectorizer/types'
import { heavy, twoColour } from './support/fixtures'

/**
 * Runs the real pipeline inside real worker threads and terminates one mid-trace.
 * Worker.terminate() on a node worker_thread has the same semantics as a browser Worker:
 * synchronous JS is interrupted and the thread is torn down.
 */
let script = ''
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vm-worker-'))
  script = join(dir, 'worker.mjs')
  const bundle = await rolldown({ input: 'tests/support/node-worker-entry.ts', platform: 'node' })
  await bundle.write({ file: script, format: 'esm', codeSplitting: false })
}, 60000)

const spawn = () => {
  const w = new Worker(script)
  const seen: FromWorker[] = []
  w.on('message', (m: FromWorker) => seen.push(m))
  return { w, seen }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const start = (fx: { width: number; height: number; data: Uint8ClampedArray }, jobId: number, settings = defaultSettings()) => ({
  type: 'START', jobId, width: fx.width, height: fx.height, outWidth: fx.width, outHeight: fx.height,
  pixels: fx.data.slice().buffer, settings,
})

describe('cancellation with real threads', () => {
  const live: Worker[] = []
  afterAll(() => { live.forEach((w) => void w.terminate()) })

  it('terminate stops a long synchronous trace; a fresh worker then succeeds', async () => {
    const slow = withDetail(withPreset(defaultSettings(), 'illustration'), 'high')
    const a = spawn(); live.push(a.w)
    const exited = new Promise<number>((res) => a.w.on('exit', res))
    const msg = start(heavy(1500), 1, { ...slow, colors: 32 })
    a.w.postMessage(msg, [msg.pixels])

    const t0 = Date.now()
    while (!a.seen.some((m) => m.type === 'STAGE' && m.stage === 'trace') && Date.now() - t0 < 30000) await sleep(20)
    expect(a.seen.some((m) => m.type === 'STAGE' && m.stage === 'trace')).toBe(true)
    await sleep(150) // let it get deep into synchronous tracing

    const tTerm = Date.now()
    await a.w.terminate()
    await exited
    const stopMs = Date.now() - tTerm
    expect(stopMs).toBeLessThan(2000)
    await sleep(500)
    expect(a.seen.some((m) => m.type === 'COMPLETE')).toBe(false)

    const b = spawn(); live.push(b.w)
    const small = start(twoColour(), 2)
    b.w.postMessage(small, [small.pixels])
    const t1 = Date.now()
    while (!b.seen.some((m) => m.type === 'COMPLETE') && Date.now() - t1 < 30000) await sleep(20)
    const done = b.seen.find((m) => m.type === 'COMPLETE')
    expect(done).toBeTruthy()
    expect((done as { jobId: number }).jobId).toBe(2)
  }, 90000)
})
