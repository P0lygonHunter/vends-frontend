import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

/**
 * Topbar promo chip — visible on all school pages when CEO set a discount/promo.
 * Claim Offer → /subscription
 */
export default function PromoOfferBar() {
  const [promo, setPromo] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    axios
      .get(`${API_BASE_URL}/pricing`)
      .then((res) => {
        if (cancelled) return
        const p = res.data?.pricing || {}
        const pct = Number(p.discountPercent) || 0
        const label = (p.promoLabel || '').trim()
        const yearly = Number(p.yearlyMonthsFree) || 0
        if (pct <= 0 && !label && yearly <= 0) {
          setPromo(null)
          return
        }
        setPromo({
          pct,
          label,
          yearly,
          text: [
            label || null,
            pct > 0 ? `${pct}% off Starter · Standard · Premium` : null,
            yearly > 0 ? `Yearly: ${yearly} months free` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!promo) return null
  // Hide compact chip on subscription page (full banner shows there)
  if (location.pathname === '/subscription') return null

  return (
    <button
      type="button"
      onClick={() => navigate('/subscription')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        maxWidth: 280,
      }}
      title={promo.text}
    >
      <span aria-hidden>🎁</span>
      <span className="truncate">{promo.pct > 0 ? `${promo.pct}% OFF` : promo.label || 'Offer'}</span>
      <span
        className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
        style={{ background: 'rgba(255,255,255,0.25)' }}
      >
        Claim
      </span>
    </button>
  )
}
