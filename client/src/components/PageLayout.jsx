import Sidebar from './Sidebar'
import TrialBadge from './TrialBadge'

export default function PageLayout({ title, subtitle, action, children }) {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar schoolName={schoolName} />
      <main style={{ marginLeft: '260px', flex: 1, minWidth: 0 }}>
        <header
          className="flex items-center gap-4 px-8 bg-white"
          style={{ height: '68px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}
        >
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl truncate" style={{ fontFamily: 'Syne,sans-serif' }}>{title}</h1>
          </div>
          <div className="hidden lg:block px-4 py-2 rounded-xl text-sm" style={{ background: '#f8fafc', color: '#475569' }}>
            Academic Year 2026-27
          </div>
          <TrialBadge />
        </header>

        <section className="p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#6366f1' }}>Dashboard / {title}</div>
              <h2 className="font-bold text-3xl" style={{ fontFamily: 'Syne,sans-serif', color: '#0f172a' }}>{title}</h2>
              {subtitle && <p className="mt-1 text-sm" style={{ color: '#64748b' }}>{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </section>
      </main>
    </div>
  )
}