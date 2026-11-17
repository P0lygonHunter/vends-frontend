import { useEffect, useState, useCallback } from 'react'

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function usePwaInstall() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [ios, setIos] = useState(false)

  useEffect(() => {
    setIos(isIos())
    setInstalled(isStandalone())
    const onBip = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return { ok: false, reason: ios ? 'ios' : 'unavailable' }
    try {
      deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      return { ok: choice.outcome === 'accepted', reason: choice.outcome }
    } catch {
      return { ok: false, reason: 'error' }
    }
  }, [deferred, ios])

  return { canPrompt: !!deferred && !installed, installed, ios, promptInstall }
}
