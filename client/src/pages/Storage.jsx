import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import API_BASE_URL from '../config/api'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'

function fmtBytes(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

export default function Storage() {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const [summary, setSummary] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [s, f] = await Promise.all([
        axios.get(`${API_BASE_URL}/storage/summary`),
        axios.get(`${API_BASE_URL}/storage/files`),
      ])
      setSummary(s.data)
      setFiles(f.data.files || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load storage.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onDelete = async (file) => {
    const msg = file.kind === 'brand_logo'
      ? 'Remove school app icon to free storage?'
      : `Delete "${file.name}" and free ${fmtBytes(file.sizeBytes)}? This cannot be undone.`
    if (!window.confirm(msg)) return
    setBusyId(file.id)
    try {
      await axios.post(`${API_BASE_URL}/storage/delete-file`, { kind: file.kind, id: file.id })
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const pct = summary?.usedPercent ?? 0
  const barColor = pct >= 95 ? '#dc2626' : pct >= 80 ? '#d97706' : '#0284c7'

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar schoolName={schoolName} />
      <main className="app-main flex-1 min-w-0">
        <header
          className="flex items-center gap-4 px-4 md:px-8 bg-white sticky-topbar"
          style={{ height: 68, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}
        >
          <h1 className="flex-1 font-bold text-xl truncate" style={{ fontFamily: 'Syne,sans-serif' }}>Storage</h1>
          <div className="flex items-center gap-2"><PromoOfferBar /><TrialBadge /></div>
        </header>

        <section className="p-4 md:p-8 max-w-5xl">
          <p className="text-sm text-slate-500 mb-4">
            Live usage from documents, fee screenshots, chat media and branding. Quota = included + add-ons (additive).
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#b91c1c' }}>{error}</div>
          )}
          {loading && !summary ? (
            <p className="text-slate-500">Loading storage…</p>
          ) : summary && (
            <>
              <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '1px solid #e2e8f0' }}>
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Used</div>
                    <div className="text-2xl font-bold" style={{ color: '#0f172a' }}>{fmtBytes(summary.usedBytes)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Allocated</div>
                    <div className="text-2xl font-bold" style={{ color: '#0f172a' }}>{fmtBytes(summary.quotaBytes)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</div>
                    <div className="text-2xl font-bold" style={{ color: barColor }}>{fmtBytes(summary.remainingBytes)}</div>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                  <span>Included: {fmtBytes(summary.includedBytes)}</span>
                  <span>Add-ons: {fmtBytes(summary.addonBytes)}</span>
                  <span>{summary.fileCount} file(s) · {pct}% used</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#0284c7' }}
                  onClick={() => alert('Request more storage from platform admin (CEO). Purchased space is ADDED to your included quota — remaining space is never replaced.')}
                >
                  Get more storage
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: '#e0f2fe', color: '#0369a1' }}
                  onClick={() => alert('Backup is a paid add-on (coming next phase).')}
                >
                  Back up your data
                </button>
                <button type="button" className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600" onClick={load}>
                  Refresh
                </button>
              </div>

              {summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
                <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '1px solid #e2e8f0' }}>
                  <h3 className="font-bold mb-3" style={{ fontFamily: 'Syne,sans-serif' }}>Usage by category</h3>
                  <div className="space-y-2">
                    {Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-semibold">{fmtBytes(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
                  <h3 className="font-bold" style={{ fontFamily: 'Syne,sans-serif' }}>Manage files / Free up space</h3>
                  <span className="text-xs text-slate-500">Live data · safe delete</span>
                </div>
                {files.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No large files tracked yet.</p>
                ) : (
                  <ul className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                    {files.map((f) => (
                      <li key={`${f.kind}-${f.id}`} className="px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{f.name}</div>
                          <div className="text-xs text-slate-500">{f.category} · {fmtBytes(f.sizeBytes)}</div>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() => onDelete(f)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                          style={{ background: '#fef2f2', color: '#b91c1c' }}
                        >
                          {busyId === f.id ? '…' : 'Delete'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
