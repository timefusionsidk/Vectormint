import { useSyncExternalStore } from 'react'

export type Consent = 'granted' | 'denied' | 'unset'
const KEY = 'vm-consent'
const listeners = new Set<() => void>()

export function getConsent(): Consent {
  try { const v = localStorage.getItem(KEY); return v === 'granted' || v === 'denied' ? v : 'unset' } catch { return 'unset' }
}
export function setConsent(v: Consent) {
  try { if (v === 'unset') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}
export function useConsent(): Consent {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, getConsent, () => 'unset')
}
