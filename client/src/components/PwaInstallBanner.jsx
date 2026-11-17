import { useState } from 'react'
import usePwaInstall from '../hooks/usePwaInstall'

/**
 * Visible Install control — many Android Chrome builds hide ⋮ → Install until criteria + engagement.
 * We capture beforeinstallprompt and offer a clear button. iOS gets Share → Add to Home Screen guide.
 */
export default function PwaInstallBanner({ compact = false }) {
  const { canPrompt, installed, ios, promptInstall } = usePwaInstall()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [msg, setMsg] = useState('')

  if (installed) return null

  const onClick = async () => {
    setMsg('')
    if (ios) {
      setShowIosHelp(true)
      return
    }
    if (canPrompt) {
      const r = await promptInstall()
      if (!r.ok && r.reason !== 'dismissed') {
        setMsg('Install dialog was blocked. Use browser menu → Install app / Add to Home screen.')
      }
      return
    }
    setMsg(
      'Install option appears after this site is opened in Chrome (not inside Facebook/WhatsApp browser). Tap ⋮ → Install app, or Add to Home screen.'
    )
  }

  return (
    <div className={compact ? 'mt-3' : 'mt-4'}>
      <button
        type="button"
        onClick={onClick}
        className="w-full py-3 rounded-xl text-sm font-bold text-white"
        style={{ background: '#0f172a' }}
      >
        {ios ? 'Add SE Community to Home Screen' : 'Install SE Community app'}
      </button>
      {msg && (
        <p className="text-xs mt-2 text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{msg}</p>
      )}
      {showIosHelp && (
        <div className="text-xs mt-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left">
          <strong>iPhone / iPad (Safari):</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>Tap the <strong>Share</strong> button (square with arrow).</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>.</li>
          </ol>
          <p className="mt-2">Chrome on iOS cannot fully install PWAs — use Safari for best result.</p>
          <button type="button" className="mt-2 font-bold text-sky-700" onClick={() => setShowIosHelp(false)}>
            Close
          </button>
        </div>
      )}
      {!ios && !canPrompt && !msg && (
        <p className="text-[11px] mt-2 text-slate-500 text-center">
          If ⋮ menu has no Install: open in <strong>Chrome</strong> (not Instagram/FB in-app browser), wait a few seconds, or use the button after Chrome is ready.
        </p>
      )}
    </div>
  )
}
