import { useEffect, useState } from 'react'

/**
 * Shows when Chrome fires beforeinstallprompt (Android/desktop).
 * iOS has no event — user must use Share → Add to Home Screen.
 */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || hidden) return null

  const install = async () => {
    deferred.prompt()
    try {
      await deferred.userChoice
    } catch (_) {}
    setDeferred(null)
    setHidden(true)
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[200] max-w-md mx-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl print:hidden"
      style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <img src="/pwa-icon-192.png" alt="" className="w-10 h-10 rounded-xl object-cover" />
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-bold">Install Vends EduCore</div>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Add to your home screen for quick access
        </div>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: '#4f46e5' }}
      >
        Install
      </button>
      <button type="button" onClick={() => setHidden(true)} className="text-white/50 text-lg leading-none px-1">
        ×
      </button>
    </div>
  )
}
