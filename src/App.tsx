import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { ConsentBanner } from '@/components/ConsentBanner'
import Home from '@/pages/Home'
import { Contact, NotFound, Privacy, Terms } from '@/pages/Legal'
import { loadAnalytics } from '@/lib/analytics'
import { useConsent } from '@/lib/consent'
import { useTheme } from '@/lib/theme'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return null
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const consent = useConsent()
  useEffect(() => { if (consent === 'granted') loadAnalytics() }, [consent])
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-3 focus:text-on-accent">Skip to content</a>
      <ScrollToTop />
      <Nav theme={theme} onToggleTheme={toggleTheme} />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ConsentBanner />
    </>
  )
}
