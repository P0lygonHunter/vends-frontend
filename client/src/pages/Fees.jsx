import { useEffect, useState, useCallback } from 'react'
import { Pencil, Plus, Trash2, Banknote, CheckCircle, XCircle, Receipt, RefreshCw } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const blank = { studentId: '', classSectionId: '', academicYearId: '', feeType: 'Tuition', month: '', amount: '', paid: 0, dueDate: '' }
const paymentBlank = { amount: '', method: 'Cash', reference: '', screenshot: '' }

export default function Fees() {
  const schoolId = localStorage.getItem('schoolId')
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [years, setYears] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Payment modal
  const [payTarget, setPayTarget] = useState(null)
  const [payForm, setPayForm] = useState(paymentBlank)
  const [payLoading, setPayLoading] = useState(false)

  // Pending verifications
  const [pending, setPending] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)

  // Daily cash
  const [cashReport, setCashReport] = useState(null)
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10))
  const [cashLoading, setCashLoading] = useState(false)

  // Receipt preview
  const [receipt, setReceipt] = useState(null)

  // Parent portal link (for the admin to share with parents)
  const [linkCopied, setLinkCopied] = useState(false)
  const parentPortalLink = schoolId ? `${window.location.origin}/community/${schoolId}/register` : ''
  const copyParentLink = () => {
    navigator.clipboard.writeText(parentPortalLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const loadFees = useCallback(async () => {
    if (!schoolId) return
    try {
      const [feeResponse, studentResponse, classResponse, yearResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/fees/${schoolId}`),
        axios.get(`${API_BASE_URL}/students/${schoolId}`),
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
      ])
      setFees(feeResponse.data)
      setStudents(studentResponse.data)
      setClasses(classResponse.data)
      setYears(yearResponse.data)
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Unable to load fee records.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  const loadPending = useCallback(async () => {
    if (!schoolId) return
    setPendingLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE_URL}/fees/${schoolId}/pending-verifications`)
      setPending(data)
    } catch {
      // silent
    } finally {
      setPendingLoading(false)
    }
  }, [schoolId])

  const loadCashReport = useCallback(async (date) => {
    if (!schoolId) return
    setCashLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE_URL}/fees/${schoolId}/daily-cash`, { params: { date } })
      setCashReport(data)
    } catch {
      setCashReport(null)
    } finally {
      setCashLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (schoolId) {
      loadFees()
      loadPending()
      loadCashReport(cashDate)
    } else {
      setError('School information not found. Please login again.')
      setLoading(false)
    }
  }, [schoolId, loadFees, loadPending, loadCashReport, cashDate])

  const openForm = fee => {
    setEditing(fee || null)
    setForm(fee ? {
      studentId: fee.studentId?._id || '',
      classSectionId: fee.classSectionId?._id || '',
      academicYearId: fee.academicYearId || '',
      feeType: fee.feeType,
      month: fee.month,
      amount: fee.amount,
      paid: fee.paid,
      dueDate: fee.dueDate?.slice(0, 10) || ''
    } : {
      ...blank,
      academicYearId: years.find(year => year.isCurrent)?._id || ''
    })
    setShowForm(true)
    setError('')
  }

  const saveFee = async event => {
    event.preventDefault()
    try {
      const response = editing
        ? await axios.patch(`${API_BASE_URL}/fees/${editing._id}`, form)
        : await axios.post(`${API_BASE_URL}/fees`, { ...form, schoolId })
      setFees(current => editing
        ? current.map(fee => fee._id === editing._id ? response.data : fee)
        : [response.data, ...current])
      setShowForm(false)
      setEditing(null)
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save fee record.')
    }
  }

  const deleteFee = async id => {
    if (!window.confirm('Delete this fee record?')) return
    try {
      await axios.delete(`${API_BASE_URL}/fees/${id}`)
      setFees(current => current.filter(fee => fee._id !== id))
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete.')
    }
  }

  const openPayment = fee => {
    setPayTarget(fee)
    setPayForm({ ...paymentBlank, amount: fee.balance || '' })
    setError('')
  }

  const onScreenshotChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG or WebP images are allowed.')
      return
    }
    if (file.size > 500 * 1024) {
      setError('Screenshot must be under 500KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPayForm(f => ({ ...f, screenshot: reader.result }))
    reader.readAsDataURL(file)
  }

  const submitPayment = async event => {
    event.preventDefault()
    if (!payTarget) return
    setPayLoading(true)
    setError('')
    try {
      const { data } = await axios.post(`${API_BASE_URL}/fees/${payTarget._id}/payments`, payForm)
      if (data.status === 'Completed') {
        await loadFees()
        setReceipt(data)
        loadCashReport(cashDate)
      } else {
        await loadPending()
      }
      setPayTarget(null)
      setPayForm(paymentBlank)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to record payment.')
    } finally {
      setPayLoading(false)
    }
  }

  const approvePayment = async paymentId => {
    try {
      await axios.post(`${API_BASE_URL}/fees/${schoolId}/payments/${paymentId}/approve`)
      await Promise.all([loadFees(), loadPending(), loadCashReport(cashDate)])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to approve.')
    }
  }

  const rejectPayment = async paymentId => {
    const reason = window.prompt('Rejection reason (optional):') || ''
    try {
      await axios.post(`${API_BASE_URL}/fees/${schoolId}/payments/${paymentId}/reject`, { reason })
      await loadPending()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reject.')
    }
  }

  const statusColor = status => {
    if (status === 'Paid') return '#16a34a'
    if (status === 'Overdue') return '#dc2626'
    return '#d97706'
  }

  if (loading) {
    return (
      <PageLayout title="Fees">
        <p className="text-sm text-slate-500">Loading fee records…</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Fees">
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-100">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Parent portal link — share once with parents so they can register and pay fees themselves */}
      <div className="mb-6 rounded-2xl border p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: '#e2e8f0' }}>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">V COMMUNITY — PARENT PORTAL</p>
          <p className="text-sm text-slate-600">
            Share this link with parents once (WhatsApp, notice board, fee slip). They join V Community with their child's roll number + phone, then pay fees and upload screenshots themselves — no more forwarding screenshots to you. Teachers can join too from the same link.
          </p>
          <p className="text-xs mt-1 font-mono break-all" style={{ color: '#4f46e5' }}>{parentPortalLink}</p>
        </div>
        <button
          type="button"
          onClick={copyParentLink}
          className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: linkCopied ? '#059669' : '#4f46e5' }}
        >
          {linkCopied ? 'Copied ✓' : 'Copy Link'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: '#e2e8f0' }}>
          <p className="text-xs text-slate-500 mb-1">Pending Verifications</p>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: '#e2e8f0' }}>
          <p className="text-xs text-slate-500 mb-1">Today Cash Collected</p>
          <p className="text-2xl font-bold text-emerald-600">
            PKR {(cashReport?.totalCash || 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">{cashReport?.count || 0} payments</p>
        </div>
        <div className="rounded-2xl border p-4 bg-white flex items-end justify-between" style={{ borderColor: '#e2e8f0' }}>
          <div>
            <p className="text-xs text-slate-500 mb-1">Cash Report Date</p>
            <input
              type="date"
              value={cashDate}
              onChange={e => setCashDate(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1"
            />
          </div>
          <button
            type="button"
            onClick={() => loadCashReport(cashDate)}
            className="p-2 rounded-lg hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={cashLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Pending Verifications */}
      {pending.length > 0 && (
        <div className="mb-6 rounded-2xl border bg-amber-50/50 overflow-hidden" style={{ borderColor: '#fde68a' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#fde68a' }}>
            <h3 className="font-semibold text-amber-900 text-sm">Pending Verifications ({pending.length})</h3>
            {pendingLoading && <span className="text-xs text-amber-600">Refreshing…</span>}
          </div>
          <div className="divide-y" style={{ borderColor: '#fde68a' }}>
            {pending.map(p => (
              <div key={p._id} className="p-4 flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {p.studentId?.name || 'Student'} {p.studentId?.rollNumber ? `(Roll: ${p.studentId.rollNumber})` : ''}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {p.method} · PKR {Number(p.amount).toLocaleString()} · Ref: {p.reference || '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.feeRecordId?.feeType} · {p.feeRecordId?.month} · {new Date(p.paidAt || p.createdAt).toLocaleString()}
                  </p>
                  {p.screenshot && (
                    <a href={p.screenshot} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline mt-1 inline-block">
                      View screenshot
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => approvePayment(p._id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectPayment(p._id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-semibold bg-red-600 hover:bg-red-700"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily cash detail (collapsible-ish) */}
      {cashReport && cashReport.payments?.length > 0 && (
        <div className="mb-6 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
            <Banknote size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-sm">Cash collected on {cashReport.date}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Fee</th>
                  <th className="px-4 py-2">Receipt</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cashReport.payments.map(p => (
                  <tr key={p._id} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(p.paidAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-2">{p.studentId?.name || '—'} {p.studentId?.rollNumber ? `(${p.studentId.rollNumber})` : ''}</td>
                    <td className="px-4 py-2 text-xs">{p.feeRecordId?.feeType} · {p.feeRecordId?.month}</td>
                    <td className="px-4 py-2 text-xs font-mono">{p.receiptNumber}</td>
                    <td className="px-4 py-2 text-right font-medium">PKR {Number(p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Fee Records</h2>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#4f46e5' }}
        >
          <Plus size={16} /> Add Fee
        </button>
      </div>

      {/* Fee list */}
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        {fees.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No fee records yet. Click “Add Fee” to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type / Month</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.map(fee => (
                  <tr key={fee._id} className="border-t hover:bg-slate-50/50" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{fee.studentId?.name || '—'}</div>
                      <div className="text-xs text-slate-400">{fee.studentId?.rollNumber || fee.classSectionId?.name || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{fee.feeType}</div>
                      <div className="text-xs text-slate-400">{fee.month}</div>
                    </td>
                    <td className="px-4 py-3">PKR {Number(fee.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">PKR {Number(fee.paid).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">PKR {Number(fee.balance).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: statusColor(fee.status) }}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {fee.balance > 0 && (
                          <button
                            type="button"
                            title="Record payment"
                            onClick={() => openPayment(fee)}
                            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700"
                          >
                            <Banknote size={16} />
                          </button>
                        )}
                        <button type="button" title="Edit" onClick={() => openForm(fee)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                          <Pencil size={16} />
                        </button>
                        <button type="button" title="Delete" onClick={() => deleteFee(fee._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Fee Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={saveFee} className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editing ? 'Edit Fee' : 'Add Fee'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none sm:col-span-2" style={{ borderColor: '#e2e8f0' }}>
                <option value="">Select student</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>
                ))}
              </select>
              <select value={form.classSectionId} onChange={e => setForm({ ...form, classSectionId: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }}>
                <option value="">Select class</option>
                {classes.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
              <select required value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }}>
                <option value="School Fee">School Fee</option>
                <option value="Academy Fee">Academy Fee</option>
                <option value="Tuition">Tuition</option>
                <option value="Exam Fee">Exam Fee</option>
                <option value="Admission Fee">Admission Fee</option>
              </select>
              <input required placeholder="Month e.g. September 2026" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input required type="number" min="0" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input type="number" min="0" placeholder="Paid (optional)" value={form.paid} onChange={e => setForm({ ...form, paid: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none sm:col-span-2" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm" style={{ border: '1px solid #e2e8f0' }}>Cancel</button>
              <button className="flex-1 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>Save Fee</button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={submitPayment} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Record Payment</h3>
            <p className="text-sm text-slate-500 mb-4">
              {payTarget.studentId?.name} · Balance: PKR {Number(payTarget.balance).toLocaleString()}
            </p>
            <div className="space-y-3">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                max={payTarget.balance}
                placeholder="Amount"
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              />
              <select
                required
                value={payForm.method}
                onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Other">Other</option>
              </select>
              {payForm.method !== 'Cash' && (
                <>
                  <input
                    placeholder="Transaction / Reference ID"
                    value={payForm.reference}
                    onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Screenshot (optional, max 500KB)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onScreenshotChange} className="w-full text-sm" />
                    {payForm.screenshot && (
                      <img src={payForm.screenshot} alt="Preview" className="mt-2 max-h-32 rounded-lg border" />
                    )}
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    Digital payments go to <strong>Pending Verification</strong>. Approve them from the list above.
                  </p>
                </>
              )}
              {payForm.method === 'Cash' && (
                <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  Cash is marked <strong>Completed</strong> immediately and added to today’s cash report.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setPayTarget(null); setPayForm(paymentBlank) }} className="flex-1 py-3 rounded-xl text-sm" style={{ border: '1px solid #e2e8f0' }}>Cancel</button>
              <button disabled={payLoading} className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#059669' }}>
                {payLoading ? 'Saving…' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Simple receipt modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <Receipt className="mx-auto text-emerald-600 mb-2" size={32} />
            <h3 className="text-lg font-bold mb-1">Payment Received</h3>
            <p className="text-sm text-slate-500 mb-4">Receipt: {receipt.receiptNumber}</p>
            <p className="text-2xl font-bold text-emerald-700 mb-1">PKR {Number(receipt.amount).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mb-6">{receipt.method} · {new Date(receipt.paidAt).toLocaleString()}</p>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold mb-2 border"
            >
              Print Receipt
            </button>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#4f46e5' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
