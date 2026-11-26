import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import usePwaInstall from '../hooks/usePwaInstall'

/**
 * Install control for SE Community (parents/teachers) and post-login school admin.
 * - variant="card" (default): full-width button under forms
 * - variant="float": bottom sheet style popup (hard to miss on mobile)
 * Never show on public school login/register (callers must not mount there).
 */
export default function PwaInstallBanner({ compact = false, variant = 'card', autoOpen = false }) {
  const { canPrompt, installed, ios, promptInstall } = usePwaInstall()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [msg, setMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const path = location?.pathname || ''

  useEffect(() => {
    if (installed || dismissed) return
    if (!autoOpen && variant !== 'float') return
    const key = 'sePwaInstallHintShown'
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch (_) {}
    const t = setTimeout(() => setOpen(true), 1200)
    return () => clearTimeout(t)
  }, [autoOpen, variant, installed, dismissed])

  if (path.startsWith('/ceo')) return null
  if (installed || dismissed) return null

  const onClick = async () => {
    setMsg('')
    if (ios) {
      setShowIosHelp(true)
      setOpen(true)
      return
    }
    if (canPrompt) {
      const r = await promptInstall()
      if (!r.ok && r.reason !== 'dismissed') {
        setMsg('Install was blocked. In Chrome tap ⋮ → Install app / Add to Home screen.')
      }
      return
    }
    setMsg(
      'Open this page in Chrome (not WhatsApp/Facebook in-app browser), wait a moment, then tap Install — or use ⋮ → Install app.'
    )
    setOpen(true)
  }

  const card = (
    <div className={compact ? 'mt-3' : 'mt-4'}>
      <button
        type="button"
        onClick={onClick}
        className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)' }}
      >
        {ios ? 'Add SE Community to Home Screen' : 'Install SE Community app'}
      </button>
      {msg && (
        <p className="text-xs mt-2 text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-left">{msg}</p>
      )}
      {showIosHelp && (
        <div className="text-xs mt-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left">
          <strong>iPhone / iPad (Safari):</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>Tap the <strong>Share</strong> button (square with arrow).</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>.</li>
          </ol>
          <button type="button" className="mt-2 font-bold text-sky-700" onClick={() => setShowIosHelp(false)}>
            Close
          </button>
        </div>
      )}
      {!ios && !canPrompt && !msg && (
        <p className="text-[11px] mt-2 text-slate-500 text-center">
          Best in <strong>Chrome</strong>. WhatsApp/FB browser often blocks Install — open the link in Chrome.
        </p>
      )}
    </div>
  )

  if (variant === 'float') {
    return (
      <>
        {card}
        {open && (
          <div className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
            <div
              className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-sky-100 bg-white p-4 shadow-2xl"
              style={{ boxShadow: '0 -8px 40px rgba(2,132,199,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <img src="/pwa-icon-192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Syne,sans-serif' }}>
                    Install SE Community
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Add this app to your home screen for faster login, fees, and school messages — no app store needed.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-slate-400 text-lg leading-none px-1"
                  aria-label="Dismiss"
                  onClick={() => { setDismissed(true); setOpen(false) }}
                >
                  ×
                </button>
              </div>
              <button
                type="button"
                onClick={onClick}
                className="mt-3 w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: '#0284c7' }}
              >
                {ios ? 'How to add to Home Screen' : canPrompt ? 'Install now' : 'Install / Add to Home Screen'}
              </button>
              {msg && <p className="text-xs mt-2 text-amber-800">{msg}</p>}
              {showIosHelp && (
                <ol className="list-decimal ml-4 mt-2 text-xs text-slate-600 space-y-1 text-left">
                  <li>Tap Share (square with arrow)</li>
                  <li>Add to Home Screen</li>
                  <li>Tap Add</li>
                </ol>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  return card
}
