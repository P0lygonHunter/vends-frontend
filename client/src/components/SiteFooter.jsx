import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/refund', label: 'Cancellation & Refund' },
  { to: '/contact', label: 'Contact Us' },
]

/**
 * @param {{ variant?: 'dark' | 'light' | 'sidebar' }} props
 * dark = public login/register bottom bar
 * light = inside app main column
 */
export default function SiteFooter({ variant = 'dark' }) {
  const isDark = variant === 'dark'
  const isLight = variant === 'light'

  const barStyle = isDark
    ? {
        background: '#0c4a6e',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.75)',
      }
    : {
        background: '#0f172a',
        borderTop: '1px solid #e2e8f0',
        color: 'rgba(255,255,255,0.7)',
      }

  const linkClass = isDark || isLight
    ? 'hover:text-white transition-colors'
    : 'hover:text-sky-600 transition-colors'

  return (
    <footer className="w-full mt-auto" style={barStyle}>
      <div
        className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4"
        style={{ maxWidth: 1200 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <img src="/pwa-icon-192.png" alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate" style={{ fontFamily: 'Syne,sans-serif' }}>
              Synapse EduCore
            </div>
            <div className="text-[10px] opacity-60 truncate">School management, made simple</div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          {LINKS.map((l, i) => (
            <span key={l.to} className="inline-flex items-center gap-3">
              {i > 0 && <span className="opacity-30 hidden sm:inline">|</span>}
              <Link to={l.to} className={linkClass} style={{ color: 'inherit' }}>
                {l.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="text-[10px] sm:text-xs opacity-50 text-center sm:text-right">
          © {new Date().getFullYear()} Synapse EduCore. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
