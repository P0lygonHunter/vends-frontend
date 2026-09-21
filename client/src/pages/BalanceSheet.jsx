import { useEffect, useState } from 'react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export default function BalanceSheet() {
  const schoolId = localStorage.getItem('schoolId')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) return
    axios
      .get(`${API_BASE_URL}/finance/${schoolId}/summary`)
      .then((res) => setSummary(res.data.summary))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load balance sheet'))
  }, [schoolId])

  // Simplified school balance sheet view from live activity
  const cashLike = Math.max(0, (summary?.feeIncome || 0) - (summary?.expenseTotal || 0) - (summary?.payrollTotal || 0))
  const receivables = summary?.feeOutstanding || 0
  const assets = cashLike + receivables
  const equity = summary?.netPosition || 0

  return (
    <PageLayout title="Balance Sheet" subtitle="Simplified view from fee collections, outstanding balances and recorded costs.">
      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="font-bold mb-4">Assets</h3>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: '#f1f5f9' }}>
            <span>Cash &amp; bank (collections − costs)</span>
            <strong>{formatPKR(cashLike)}</strong>
          </div>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: '#f1f5f9' }}>
            <span>Fees receivable (outstanding)</span>
            <strong>{formatPKR(receivables)}</strong>
          </div>
          <div className="flex justify-between py-3 text-sm font-bold">
            <span>Total assets</span>
            <span>{formatPKR(assets)}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="font-bold mb-4">Equity</h3>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: '#f1f5f9' }}>
            <span>Net operating position</span>
            <strong style={{ color: equity >= 0 ? '#059669' : '#dc2626' }}>{formatPKR(equity)}</strong>
          </div>
          <p className="text-xs mt-4" style={{ color: '#94a3b8' }}>
            Full liability tracking can be expanded later. Figures update when fees are approved and expenses/payroll are saved.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
