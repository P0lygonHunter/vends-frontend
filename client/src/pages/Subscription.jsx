import { useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import API_BASE_URL from '../config/api'
import { calendarDaysLeft } from '../utils/subscriptionDays'
import { Check, Clipboard, CreditCard, X } from 'lucide-react'

export default function Subscription() {
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentPlan, setPaymentPlan] = useState(null)
  const [methods, setMethods] = useState([])
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [copied, setCopied] = useState('')
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [pricing, setPricing] = useState({
    freeTrial: 0, starter: 2999, standard: 5999, premium: 12999,
    discountPercent: 0, promoLabel: '', yearlyMonthsFree: 2,
    featuresStarter: [], featuresStandard: [], featuresPremium: [],
  })
  const [catalog, setCatalog] = useState(null)

  const formatPrice = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`

  const normalizePlan = (plan) => {
    if (plan === 'lite') return 'starter'
    if (plan === 'zk') return 'premium'
    return plan || 'free_trial'
  }

  const planInfo = {
    free_trial: {
      name: 'Free Trial',
      price: formatPrice(0),
      period: '/ 30 days',
      color: '#059669',
      bg: '#ecfdf5',
      icon: '🆓',
      description: 'Automatic on signup — not a purchasable plan.',
      features: ['Up to 100 students', 'Core modules', 'Then choose Starter / Standard / Premium'],
    },
    starter: {
      name: 'Starter',
      price: formatPrice(pricing.starter),
      period: '/ month',
      color: '#0ea5e9',
      bg: '#e0f2fe',
      icon: '🚀',
      description: 'For small schools getting started.',
      features: pricing.featuresStarter?.length
        ? pricing.featuresStarter
        : ['Up to 150 students', 'Student & teacher management', 'Attendance', 'Basic fees', 'V-Community'],
    },
    standard: {
      name: 'Standard',
      price: formatPrice(pricing.standard),
      period: '/ month',
      color: '#4f46e5',
      bg: '#e0e7ff',
      icon: '⭐',
      description: 'Best for most growing schools.',
      features: pricing.featuresStandard?.length
        ? pricing.featuresStandard
        : ['Up to 500 students', 'Full fees + verification', 'Exams & report cards', 'Test generator', 'Analytics', 'V-Community'],
    },
    premium: {
      name: 'Premium',
      price: formatPrice(pricing.premium),
      period: '/ month',
      color: '#7c3aed',
      bg: '#ede9fe',
      icon: '👑',
      description: 'For large campuses and full power.',
      features: pricing.featuresPremium?.length
        ? pricing.featuresPremium
        : ['Up to 2,000 students', 'Everything in Standard', 'Priority support', 'Advanced analytics', 'AI-ready'],
    },
  }

  const paidPlanKeys = ['starter', 'standard', 'premium']

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId')
      if (!schoolId) {
        setError('School information not found. Please login again.')
        setLoading(false)
        return
      }

      const [schoolRes, methodsRes, paymentsRes, invoicesRes, pricingRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/school/check/${schoolId}`),
        axios.get(`${API_BASE_URL}/payment-methods`),
        axios.get(`${API_BASE_URL}/payments`).catch(() => ({ data: { payments: [] } })),
        axios.get(`${API_BASE_URL}/invoices`).catch(() => ({ data: { invoices: [] } })),
        axios.get(`${API_BASE_URL}/pricing`).catch(() => ({ data: { pricing: null } })),
      ])

      setSchool(schoolRes.data.school)
      const m = methodsRes.data.methods || []
      setMethods(m)
      if (m.length) setSelectedMethodId(m[0]._id)
      setPayments(paymentsRes.data.payments || [])
      setInvoices(invoicesRes.data.invoices || [])
      if (pricingRes.data?.pricing) {
        const p = pricingRes.data.pricing
        setPricing({
          freeTrial: Number(p.freeTrial) || 0,
          starter: Number(p.starter ?? p.lite) || 2999,
          standard: Number(p.standard) || 5999,
          premium: Number(p.premium ?? p.zk) || 12999,
          discountPercent: Number(p.discountPercent) || 0,
          promoLabel: p.promoLabel || '',
          yearlyMonthsFree: Number(p.yearlyMonthsFree) || 2,
          featuresStarter: p.featuresStarter || [],
          featuresStandard: p.featuresStandard || [],
          featuresPremium: p.featuresPremium || [],
        })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load subscription information.')
    } finally {
      setLoading(false)
    }
  }

  const daysLeft = (expiryDate) => calendarDaysLeft(expiryDate)

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const openPaymentModal = (plan) => {
    setSubmitMsg('')
    setTransactionId('')
    setNotes('')
    setPaymentPlan(plan)
    if (methods.length) setSelectedMethodId(methods[0]._id)
  }

  const selectedMethod = methods.find((m) => m._id === selectedMethodId)

  const copyDetail = async (value, id) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      setError('Please copy the payment detail manually.')
    }
  }

  const submitPayment = async () => {
    setSubmitMsg('')
    if (!selectedMethodId || !transactionId.trim()) {
      setSubmitMsg('Select a payment method and enter transaction ID.')
      return
    }
    try {
      setSubmitting(true)
      await axios.post(`${API_BASE_URL}/payments`, {
        plan: paymentPlan.key,
        methodId: selectedMethodId,
        transactionId: transactionId.trim(),
        notes: notes.trim(),
      })
      setSubmitMsg('Payment submitted. Status: Pending verification.')
      setPaymentPlan(null)
      loadAll()
    } catch (err) {
      setSubmitMsg(err.response?.data?.error || 'Unable to submit payment.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentPlan = planInfo[normalizePlan(school?.plan)] || planInfo.free_trial
  const schoolName = school?.schoolName || localStorage.getItem('schoolName') || 'Your School'

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
        <Sidebar schoolName={schoolName} />
        <div className="app-main flex items-center justify-center text-slate-400">
          Loading subscription...
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar schoolName={schoolName} />
      <div className="app-main" style={{ flex: 1 }}>
        <div className="flex items-center gap-4 px-8 bg-white" style={{ height: '68px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
          <h2 className="flex-1 font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>Subscription</h2>
          <TrialBadge />
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 px-5 py-4 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {submitMsg && !paymentPlan && (
            <div className="mb-6 px-5 py-4 rounded-xl text-sm font-semibold" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              {submitMsg}
            </div>
          )}

          {school && (
            <>
              <div className="bg-white rounded-2xl border p-7 mb-7" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: currentPlan.bg }}>{currentPlan.icon}</div>
                    <div>
                      <h3 className="font-bold text-2xl" style={{ fontFamily: 'Syne,sans-serif' }}>{currentPlan.name}</h3>
                      <p className="text-sm mt-1" style={{ color: '#64748b' }}>{currentPlan.description}</p>
                    </div>
                  </div>
                  {(() => {
                    const d = daysLeft(school.expiryDate)
                    const expired = d <= 0
                    const expiring = d > 0 && d <= 7
                    const label = expired ? 'EXPIRED' : expiring ? 'EXPIRING SOON' : 'ACTIVE'
                    const bg = expired ? '#fef2f2' : expiring ? '#fff7ed' : currentPlan.bg
                    const color = expired ? '#dc2626' : expiring ? '#c2410c' : currentPlan.color
                    return (
                      <span className="px-4 py-2 rounded-full text-xs font-bold" style={{ background: bg, color }}>{label}</span>
                    )
                  })()}
                </div>
                <div className="grid grid-cols-3 gap-5 mt-7 pt-6" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>PLAN PRICE</div>
                    <div className="font-bold text-lg" style={{ color: currentPlan.color }}>{currentPlan.price}<span className="text-xs font-medium ml-1" style={{ color: '#94a3b8' }}>{currentPlan.period}</span></div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>EXPIRES</div>
                    <div className="font-bold text-lg">{formatDate(school.expiryDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>TIME REMAINING</div>
                    <div className="font-bold text-lg" style={{ color: daysLeft(school.expiryDate) <= 7 ? '#dc2626' : '#059669' }}>{daysLeft(school.expiryDate)} days</div>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <h3 className="font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>Choose Your Plan</h3>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>Pay online via JazzCash, EasyPaisa or bank transfer. Plan activates after verification.</p>
              </div>

              {(pricing.promoLabel || pricing.discountPercent > 0 || pricing.yearlyMonthsFree > 0) && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
                  {pricing.promoLabel ? `${pricing.promoLabel} · ` : ''}
                  {pricing.discountPercent > 0 ? `${pricing.discountPercent}% off paid plans · ` : ''}
                  {pricing.yearlyMonthsFree > 0 ? `Yearly: pay for ${12 - pricing.yearlyMonthsFree}, get ${pricing.yearlyMonthsFree} months free` : ''}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {paidPlanKeys.map((planKey) => {
                  const plan = planInfo[planKey]
                  const isCurrent = normalizePlan(school.plan) === planKey
                  const sale = pricing.discountPercent > 0
                    ? Math.round(Number(pricing[planKey] || 0) * (1 - pricing.discountPercent / 100))
                    : null
                  return (
                    <div key={planKey} className="bg-white rounded-2xl border p-6 relative" style={{ borderColor: isCurrent ? plan.color : '#e2e8f0' }}>
                      {isCurrent && <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: plan.bg, color: plan.color }}>CURRENT</div>}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5" style={{ background: plan.bg }}>{plan.icon}</div>
                      <h4 className="font-bold text-lg" style={{ fontFamily: 'Syne,sans-serif' }}>{plan.name}</h4>
                      <div className="mt-3">
                        <span className="font-bold text-2xl" style={{ color: plan.color }}>{plan.price}</span>
                        <span className="text-xs ml-1" style={{ color: '#94a3b8' }}>{plan.period}</span>
                      </div>
                      <p className="text-sm mt-3 leading-6" style={{ color: '#64748b' }}>{plan.description}</p>
                      <div className="mt-5 flex flex-col gap-3">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: plan.bg, color: plan.color }}>✓</span>
                            {feature}
                          </div>
                        ))}
                      </div>
                      <button
                        disabled={planKey === 'free_trial' || (isCurrent && !(planKey !== 'free_trial' && daysLeft(school.expiryDate) <= 14))}
                        onClick={() => openPaymentModal({ key: planKey, ...plan })}
                        className="w-full mt-7 py-3 rounded-xl text-sm font-bold"
                        style={{
                          background: (planKey === 'free_trial' || (isCurrent && daysLeft(school.expiryDate) > 14)) ? '#f1f5f9' : plan.color,
                          color: (planKey === 'free_trial' || (isCurrent && daysLeft(school.expiryDate) > 14)) ? '#94a3b8' : '#fff',
                          cursor: (planKey === 'free_trial' || (isCurrent && daysLeft(school.expiryDate) > 14)) ? 'default' : 'pointer',
                        }}
                      >
                        {isCurrent
                          ? (planKey !== 'free_trial' && daysLeft(school.expiryDate) <= 14
                              ? 'Renew Plan'
                              : 'Current Plan')
                          : planKey === 'free_trial'
                            ? 'Trial Only'
                            : school.plan !== 'free_trial' && planKey === school.plan
                              ? 'Renew Plan'
                              : 'Upgrade Plan'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="mb-7 p-5 rounded-2xl text-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>Subscription lifecycle:</strong>{' '}
                Free Trial → Upgrade → Active plan → Renew before expiry → Expired (features lock until payment approved).
                Use <strong>Renew Plan</strong> when 14 or fewer days remain on a paid plan.
              </div>

              {/* Recent payments */}
              <div className="bg-white rounded-2xl border mb-7" style={{ borderColor: '#e2e8f0' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <h3 className="font-bold text-base">Payment requests</h3>
                </div>
                {payments.length === 0 ? (
                  <div className="px-6 py-10 text-sm text-slate-400">No payment requests yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Plan', 'Amount', 'Method', 'Txn ID', 'Status', 'Date'].map((h) => (
                            <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td className="px-5 py-3 text-sm capitalize">{p.plan}</td>
                            <td className="px-5 py-3 text-sm">PKR {Number(p.amount).toLocaleString('en-PK')}</td>
                            <td className="px-5 py-3 text-sm">{p.methodLabel}</td>
                            <td className="px-5 py-3 text-xs font-mono">{p.transactionId}</td>
                            <td className="px-5 py-3 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                                background: p.status === 'paid' ? '#ecfdf5' : p.status === 'pending' ? '#fff7ed' : '#fef2f2',
                                color: p.status === 'paid' ? '#059669' : p.status === 'pending' ? '#c2410c' : '#dc2626',
                              }}>{p.status}</span>
                            </td>
                            <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{formatDate(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <h3 className="font-bold text-base">Invoices / Receipts</h3>
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Generated automatically when a payment is approved.</p>
                </div>
                {invoices.length === 0 ? (
                  <div className="px-6 py-10 text-sm text-slate-400">No invoices yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Invoice', 'Plan', 'Amount', 'Method', 'Paid on', ''].map((h) => (
                            <th key={h || 'a'} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td className="px-5 py-3 text-sm font-semibold">{inv.invoiceNumber}</td>
                            <td className="px-5 py-3 text-sm">{inv.planLabel}</td>
                            <td className="px-5 py-3 text-sm">PKR {Number(inv.amount).toLocaleString('en-PK')}</td>
                            <td className="px-5 py-3 text-sm">{inv.methodLabel}</td>
                            <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{formatDate(inv.paidAt)}</td>
                            <td className="px-5 py-3">
                              <button onClick={() => setActiveInvoice(inv)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                                View receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {paymentPlan && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(6px)' }} onMouseDown={(e) => e.target === e.currentTarget && setPaymentPlan(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-4 p-6" style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)', color: '#fff' }}>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#c7d2fe' }}><CreditCard size={15} /> Upgrade payment</div>
                <h2 className="font-bold text-2xl mt-2" style={{ fontFamily: 'Syne,sans-serif' }}>Activate {paymentPlan.name}</h2>
                <p className="text-sm mt-2" style={{ color: '#e0e7ff' }}>{paymentPlan.price} {paymentPlan.period}</p>
              </div>
              <button onClick={() => setPaymentPlan(null)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}><X size={18} /></button>
            </div>

            <div className="p-6">
              <div className="p-4 rounded-xl mb-5 text-sm" style={{ background: '#eef2ff', color: '#3730a3' }}>
                1. Choose a payment method and pay the amount.<br />
                2. Enter the transaction / reference ID.<br />
                3. Submit — status stays <strong>Pending</strong> until CEO verifies.<br />
                4. After approval your plan activates and a receipt is generated.
              </div>

              {methods.length === 0 ? (
                <div className="text-sm" style={{ color: '#dc2626' }}>No payment methods configured. Contact support.</div>
              ) : (
                <div className="flex flex-col gap-3 mb-5">
                  {methods.map((m) => (
                    <label key={m._id} className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer" style={{ borderColor: selectedMethodId === m._id ? '#4f46e5' : '#e2e8f0', background: selectedMethodId === m._id ? '#eef2ff' : '#fff' }}>
                      <input type="radio" name="method" checked={selectedMethodId === m._id} onChange={() => setSelectedMethodId(m._id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="font-bold text-sm">{m.label}</div>
                        <div className="text-sm mt-1" style={{ color: '#475569' }}>{m.accountDetail}</div>
                        {m.accountTitle && <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>{m.accountTitle}</div>}
                        {m.instructions && <div className="text-xs mt-2" style={{ color: '#64748b' }}>{m.instructions}</div>}
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); copyDetail(m.accountDetail, m._id) }} className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1" style={{ background: '#f1f5f9', color: '#475569' }}>
                        <Clipboard size={14} /> {copied === m._id ? 'Copied' : 'Copy'}
                      </button>
                    </label>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Transaction / Reference ID</label>
                <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} placeholder="e.g. JC123456789" />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Notes (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} placeholder="Any extra detail" />
              </div>

              {submitMsg && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626' }}>{submitMsg}</div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setPaymentPlan(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ border: '1px solid #e2e8f0', color: '#475569' }}>Cancel</button>
                <button onClick={submitPayment} disabled={submitting || !methods.length} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#4f46e5', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting...' : 'Submit payment request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice receipt modal — thermal-style print (~80mm) */}
      {activeInvoice && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 no-print-overlay" style={{ background: 'rgba(15,23,42,0.62)' }} onMouseDown={(e) => e.target === e.currentTarget && setActiveInvoice(null)}>
          <style>{`
            @media print {
              @page { size: 80mm auto; margin: 4mm; }
              body * { visibility: hidden !important; }
              #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
              #invoice-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 72mm !important;
                max-width: 72mm !important;
                margin: 0 !important;
                padding: 8px !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8" id="invoice-print-area">
            <div className="text-center mb-6">
              <div className="font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>Vends EduCore</div>
              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>Official Payment Receipt</div>
            </div>
            <div className="text-sm flex flex-col gap-2" style={{ color: '#334155' }}>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Invoice</span><strong>{activeInvoice.invoiceNumber}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>School</span><strong>{activeInvoice.schoolName}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Plan</span><strong>{activeInvoice.planLabel}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Amount</span><strong>PKR {Number(activeInvoice.amount).toLocaleString('en-PK')}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Payment</span><strong>{activeInvoice.methodLabel}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Transaction</span><strong className="font-mono text-xs">{activeInvoice.transactionId}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Date</span><strong>{formatDate(activeInvoice.paidAt)}</strong></div>
              <div className="flex justify-between"><span style={{ color: '#94a3b8' }}>Status</span><strong style={{ color: '#059669' }}>{activeInvoice.status}</strong></div>
            </div>
            <div className="flex gap-3 mt-8 no-print">
              <button type="button" onClick={() => setActiveInvoice(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ border: '1px solid #e2e8f0', color: '#475569' }}>Close</button>
              <button type="button" onClick={() => window.print()} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#1e1b4b' }}>Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
