import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'

export default function Subscription() {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const schoolId = localStorage.getItem('schoolId')

  const [paymentModal, setPaymentModal] = useState(null)
  const [schoolInfo, setSchoolInfo] = useState(null)

  useEffect(() => {
    fetchSchoolInfo()
  }, [])

  const fetchSchoolInfo = async () => {
    if (!schoolId) return

    try {
      const res = await axios.get(`http://localhost:5000/api/school/check/${schoolId}`)
      setSchoolInfo(res.data.school)
    } catch (err) {
      console.log(err)
    }
  }

  const getDaysLeft = () => {
    if (!schoolInfo?.expiryDate) return 0

    const diff = new Date(schoolInfo.expiryDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days > 0 ? days : 0
  }

  const getPlanName = () => {
    if (!schoolInfo?.plan) return 'Free Trial'
    if (schoolInfo.plan === 'free_trial') return 'Free Trial'
    if (schoolInfo.plan === 'lite') return 'Lite Edition'
    if (schoolInfo.plan === 'zk') return 'ZK Edition'
    return schoolInfo.plan
  }

  const currentPlan = getPlanName()
  const daysLeft = getDaysLeft()

  const plans = [
    {
      tier: 'Free Trial',
      price: 'PKR 0',
      period: '/ 30 days',
      desc: 'Perfect for trying out EduCore',
      features: [
        { icon: '✓', text: 'Up to 100 students', ok: true },
        { icon: '✓', text: 'Basic attendance', ok: true },
        { icon: '✓', text: 'Student & teacher list', ok: true },
        { icon: '✓', text: 'Generate 5 test papers/day', ok: true },
        { icon: '✗', text: 'No data export', ok: false },
        { icon: '✗', text: 'No ZK Security', ok: false },
      ],
      btn: 'Current Plan',
      disabled: true,
      tag: null,
      tagColor: null,
      planKey: null,
    },
    {
      tier: 'Lite Edition',
      price: 'PKR 4,999',
      period: '/ month',
      desc: 'For small to medium schools up to 1,000 students',
      features: [
        { icon: '✓', text: 'Up to 1,000 students', ok: true },
        { icon: '✓', text: 'Full attendance system', ok: true },
        { icon: '✓', text: 'Data export (CSV/PDF)', ok: true },
        { icon: '✓', text: 'Analytics dashboard', ok: true },
        { icon: '✓', text: 'Generate Unlimited test papers', ok: true },
        { icon: '✗', text: 'No ZK Security layer', ok: false },
      ],
      btn: 'Subscribe Now',
      disabled: false,
      tag: '⭐ MOST POPULAR',
      tagColor: '#4f46e5',
      planKey: 'lite',
    },
    {
      tier: 'ZK Edition',
      price: 'PKR 14,999',
      period: '/ month',
      desc: 'For large schools & chains requiring enterprise security',
      features: [
        { icon: '✓', text: 'Up to 1,000 students', ok: true },
        { icon: '✓', text: 'All Lite features included', ok: true },
        { icon: '✓', text: 'Generate Unlimited test papers', ok: true },
        { icon: '🔐', text: 'ZK-Circuit Protocol Security', ok: true },
        { icon: '🔐', text: 'Zero-knowledge data proofs', ok: true },
        { icon: '✓', text: 'Priority 24/7 support', ok: true },
      ],
      btn: 'Upgrade to ZK',
      disabled: false,
      tag: '🔐 MAX SECURITY',
      tagColor: '#7c3aed',
      planKey: 'zk',
    },
  ]

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />

      <div style={{marginLeft:'260px', flex:1}}>
        {/* Topbar */}
        <div className="flex items-center gap-4 px-8 bg-white"
          style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Subscription Plans</h2>

          <div className="px-3 py-1 rounded-full text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>
            {currentPlan === 'Free Trial'
              ? `⏳ Trial: ${daysLeft} days left`
              : `💎 ${currentPlan}`}
          </div>
        </div>

        <div className="p-8">
          {/* Hero */}
          <div className="rounded-2xl p-12 text-center text-white mb-8 relative overflow-hidden"
            style={{background:'linear-gradient(135deg,#1e1b4b,#3730a3,#4f46e5)'}}>

            <div className="inline-block px-4 py-1 rounded-full text-xs font-bold mb-4"
              style={{
                background: currentPlan === 'Free Trial' ? '#f59e0b' : '#10b981',
                color:'#1e1b4b'
              }}>
              {currentPlan === 'Free Trial'
                ? `⏳ You are on Free Trial — ${daysLeft} days remaining`
                : `💎 You are on ${currentPlan}`}
            </div>

            <h2 className="font-bold text-4xl mb-3" style={{fontFamily:'Syne,sans-serif'}}>
              Choose Your Plan
            </h2>

            <p className="opacity-80 text-base">
              Scale from small schools to large institutions. All plans include Pakistani rupee billing.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {plans.map((p,i) => (
              <div key={i} className="bg-white rounded-2xl p-8 relative"
                style={{
                  border: p.tag ? `2px solid ${p.tagColor}` : '2px solid #e2e8f0',
                  boxShadow: p.tag ? '0 12px 48px rgba(79,70,229,0.14)' : '0 4px 24px rgba(0,0,0,0.05)'
                }}>

                {p.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold"
                    style={{background: p.tagColor}}>
                    {p.tag}
                  </div>
                )}

                <div className="text-xs font-bold uppercase mb-2"
                  style={{color:'#94a3b8', letterSpacing:'1px'}}>
                  {p.tier}
                </div>

                <div className="font-bold text-4xl mb-1" style={{fontFamily:'Syne,sans-serif'}}>
                  {p.price}
                  <span className="text-base font-normal" style={{color:'#94a3b8'}}>
                    {p.period}
                  </span>
                </div>

                <div className="text-sm mb-6" style={{color:'#475569'}}>
                  {p.desc}
                </div>

                <ul className="mb-8 flex flex-col gap-0">
                  {p.features.map((f,j) => (
                    <li key={j} className="flex items-center gap-2 py-2 text-sm"
                      style={{borderBottom:'1px solid #f1f5f9'}}>
                      <span style={{
                        color: f.icon === '✓' ? '#10b981' : f.icon === '✗' ? '#ef4444' : '#f59e0b'
                      }}>
                        {f.icon}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={p.disabled}
                  onClick={() => !p.disabled && setPaymentModal(p)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: p.disabled ? 'transparent' : p.tagColor || '#4f46e5',
                    color: p.disabled ? p.tagColor || '#4f46e5' : '#fff',
                    border: p.disabled ? `2px solid ${p.tagColor || '#4f46e5'}` : 'none',
                    opacity: p.disabled ? 0.7 : 1,
                    cursor: p.disabled ? 'not-allowed' : 'pointer'
                  }}>
                  {p.btn}
                </button>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border p-6 flex items-center gap-4"
            style={{borderColor:'#e2e8f0'}}>
            <span className="text-4xl">🏦</span>
            <div>
              <div className="font-bold text-base mb-1">Payment Methods</div>
              <div className="text-sm" style={{color:'#475569'}}>
                JazzCash · EasyPaisa · Bank Transfer · HBL · MCB · International Cards (Visa/Mastercard)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT DETAILS MODAL */}
      {paymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)'}}>

          <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center"
            style={{boxShadow:'0 24px 80px rgba(0,0,0,0.3)'}}>

            <div className="text-4xl mb-3">💳</div>

            <h2 className="font-bold text-2xl mb-1"
              style={{fontFamily:'Syne,sans-serif'}}>
              Payment Details
            </h2>

            <p className="text-sm mb-2" style={{color:'#475569'}}>
              To activate <strong>{paymentModal.tier}</strong> — {paymentModal.price}{paymentModal.period}
            </p>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-6"
              style={{
                background: paymentModal.tagColor ? paymentModal.tagColor + '20' : '#eef2ff',
                color: paymentModal.tagColor || '#4f46e5'
              }}>
              {paymentModal.tier}
            </div>

            <div className="text-left rounded-2xl p-5 mb-6"
              style={{background:'#f8fafc', border:'1px solid #e2e8f0'}}>

              <div className="font-bold text-sm mb-4" style={{color:'#1e1b4b'}}>
                📋 Send Payment To:
              </div>

              <div className="flex flex-col gap-3 text-sm" style={{color:'#475569'}}>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'#fff', border:'1px solid #e2e8f0'}}>
                  <span className="text-xl">📱</span>
                  <div>
                    <div className="font-bold text-xs" style={{color:'#94a3b8'}}>JAZZCASH</div>
                    <div className="font-semibold">0300-1234567 (Ahmed Ali)</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'#fff', border:'1px solid #e2e8f0'}}>
                  <span className="text-xl">💚</span>
                  <div>
                    <div className="font-bold text-xs" style={{color:'#94a3b8'}}>EASYPAISA</div>
                    <div className="font-semibold">0311-7654321 (Ahmed Ali)</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'#fff', border:'1px solid #e2e8f0'}}>
                  <span className="text-xl">🏦</span>
                  <div>
                    <div className="font-bold text-xs" style={{color:'#94a3b8'}}>BANK ACCOUNT (HBL)</div>
                    <div className="font-semibold">1234-5678-9012 (Ahmed Ali)</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'#fff', border:'1px solid #e2e8f0'}}>
                  <span className="text-xl">📞</span>
                  <div>
                    <div className="font-bold text-xs" style={{color:'#94a3b8'}}>SUPPORT TEAM</div>
                    <div className="font-semibold">+92-333-9876543 (EduCore Support)</div>
                  </div>
                </div>

              </div>
            </div>

            <p className="text-xs mb-6"
              style={{color:'#94a3b8', lineHeight:'1.6'}}>
              After sending payment, contact our support team with your
              <strong> school email</strong> and <strong>payment screenshot</strong>.
              Your plan will be activated within <strong>2-4 hours</strong>.
            </p>

            <button onClick={() => setPaymentModal(null)}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{background:'#4f46e5', fontFamily:'Syne,sans-serif'}}>
              Close
            </button>

          </div>
        </div>
      )}
    </div>
  )
}