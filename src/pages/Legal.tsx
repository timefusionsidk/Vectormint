import { Link } from 'react-router-dom'
import { config, consentRequired, analyticsConfigured } from '@/lib/config'
import { usePageMeta } from '@/lib/meta'

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="prose-vm mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">{title}</h1>
      {children}
      <p className="mt-10"><Link to="/" className="link">Back to the converter</Link></p>
    </article>
  )
}

export function Privacy() {
  usePageMeta('Privacy | VectorMint', 'How VectorMint handles your images and data: images are processed locally in your browser and never uploaded.', '/privacy')
  return (
    <Page title="Privacy">
      <p>VectorMint is a browser tool. This page describes what the software does.</p>
      <h2>Your images</h2>
      <p>When you choose an image, your browser decodes it, a background worker on your device traces it, and your browser builds the SVG. VectorMint has no backend, database, or conversion API, and it does not send images, pixel data, generated SVGs, filenames, or image details to any server or analytics service.</p>
      <p>Source images and results are held in memory only while you use the page and are released when you replace, clear, or leave. They are not stored in localStorage, IndexedDB, or any cloud service.</p>
      <h2>What is stored in your browser</h2>
      <ul>
        <li>Your light or dark theme choice.</li>
        {consentRequired && <li>Your choice about advertising and statistics.</li>}
      </ul>
      <h2>Ordinary website requests</h2>
      <p>Loading the page requires your browser to request the site’s files from its hosting provider, which may keep standard server logs such as IP address, time, and requested file. Fonts are served from the same site, not from a third party.</p>
      <h2>Advertising and statistics</h2>
      {consentRequired ? (
        <>
          <p>This deployment is configured to use {[config.adsEnabled && 'display advertising', analyticsConfigured && 'anonymous usage statistics'].filter(Boolean).join(' and ')}. Nothing from those providers loads until you choose Accept in the banner, and you can change your choice from the footer. Those providers may set cookies or collect device information under their own policies. The statistics events never include file names, image content, SVG content, or image properties.</p>
        </>
      ) : (
        <p>This deployment does not load advertising or analytics.</p>
      )}
      <h2>Contact</h2>
      <p>See the <Link to="/contact" className="link">Contact page</Link> for how to reach the site operator.</p>
    </Page>
  )
}

export function Terms() {
  usePageMeta('Terms | VectorMint', 'Terms of use for VectorMint, a free browser-based image-to-SVG tool.', '/terms')
  return (
    <Page title="Terms">
      <p>By using VectorMint you agree to these terms.</p>
      <h2>Use of the tool</h2>
      <p>VectorMint is provided free of charge, without accounts, and “as is”, without warranties of any kind. It may change or become unavailable at any time.</p>
      <h2>Your content</h2>
      <p>You are responsible for having the right to convert and use any image you choose. Your images are processed on your device and are not transmitted to the site operator. You keep all rights in your images and in the SVG files you create.</p>
      <h2>Results are approximate</h2>
      <p>Tracing approximates an image with vector paths. It does not guarantee a faithful reproduction, recover original design layers, convert text into editable text, or guarantee a smaller file. Check the output before relying on it.</p>
      <h2>Limitation of liability</h2>
      <p>To the extent permitted by law, the operator is not liable for any loss arising from use of the tool or from the output it produces.</p>
    </Page>
  )
}

export function Contact() {
  usePageMeta('Contact | VectorMint', 'How to contact the VectorMint site operator.', '/contact')
  const has = config.contactEmail || config.contactUrl
  return (
    <Page title="Contact">
      {has ? (
        <>
          <p>For questions, bug reports, or takedown requests:</p>
          <ul>
            {config.contactEmail && <li>Email: <a className="link" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a></li>}
            {config.contactUrl && <li>Online: <a className="link" href={config.contactUrl} rel="noopener noreferrer">{config.contactUrl}</a></li>}
          </ul>
        </>
      ) : (
        <p>Contact details have not been set up for this deployment yet.</p>
      )}
    </Page>
  )
}

export function NotFound() {
  usePageMeta('Page not found | VectorMint', 'This page does not exist.', '/')
  return (
    <Page title="Page not found"><p>That page does not exist.</p></Page>
  )
}
