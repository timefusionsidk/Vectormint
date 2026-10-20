import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ImagePlus, Moon, Sun } from 'lucide-react'
import { LogoMark } from './Logo'
import type { Theme } from '@/lib/theme'

export function Nav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const choose = () => {
    if (pathname !== '/') { navigate('/#convert'); return }
    document.getElementById('vm-file')?.click()
  }
  const linkCls = 'hidden min-h-[44px] items-center px-3 text-sm font-medium text-muted hover:text-ink sm:inline-flex'
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4">
        <Link to="/" className="mr-auto flex min-h-[44px] items-center gap-2 font-display text-lg font-bold tracking-tight sm:text-xl">
          <LogoMark /> VectorMint
        </Link>
        <a href="/#convert" className={linkCls}>Convert</a>
        <a href="/#how" className={linkCls}>How It Works</a>
        <a href="/#faq" className={linkCls}>FAQ</a>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button type="button" className="btn btn-primary" onClick={choose}>
          <ImagePlus size={18} className="hidden min-[400px]:block" aria-hidden="true" /> Choose Image
        </button>
      </nav>
    </header>
  )
}
