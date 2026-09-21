import { useEffect, useState } from 'react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export default function TrialBalance() {
  const schoolId = localStorage.getItem('schoolId')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) return
    axios
      .get(`${API_BASE_URL}/finance/${schoolId}/summary`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load trial balance'))
  }, [schoolId])

  const rows = data?.trialBalance || []
  const totals = data?.totals || { debit: 0, credit: 0 }

  return (
    <PageLayout title="Trial Balance" subtitle="Account debits and credits derived from fee payments, expenses and journal entries.">
      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Account', 'Debit', 'Credit'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center text-sm" style={{ color: '#94a3b8' }}>
                  No ledger activity yet. Completed fee payments and expenses will appear here.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.account}>
                  <td className="px-5 py-3 text-sm font-bold">{row.account}</td>
                  <td className="px-5 py-3 text-sm">{formatPKR(row.debit)}</td>
                  <td className="px-5 py-3 text-sm">{formatPKR(row.credit)}</td>
                </tr>
              ))
            )}
            {rows.length > 0 && (
              <tr style={{ background: '#f8fafc' }}>
                <td className="px-5 py-3 text-sm font-bold">Totals</td>
                <td className="px-5 py-3 text-sm font-bold">{formatPKR(totals.debit)}</td>
                <td className="px-5 py-3 text-sm font-bold">{formatPKR(totals.credit)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}
