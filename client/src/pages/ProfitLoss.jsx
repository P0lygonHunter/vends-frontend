import { useEffect, useState } from 'react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export default function ProfitLoss() {
  const schoolId = localStorage.getItem('schoolId')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) return
    axios
      .get(`${API_BASE_URL}/finance/${schoolId}/summary`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load report'))
  }, [schoolId])

  const s = data?.summary

  return (
    <PageLayout title="Profit & Loss" subtitle="Income from completed fee payments minus expenses and payroll.">
      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase" style={{ color: '#64748b' }}>Total Income</div>
          <div className="font-bold text-2xl mt-2" style={{ color: '#059669' }}>{formatPKR(s?.totalIncome)}</div>
          <div className="text-xs mt-2" style={{ color: '#94a3b8' }}>Fees + manual income entries</div>
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase" style={{ color: '#64748b' }}>Total Expenses</div>
          <div className="font-bold text-2xl mt-2" style={{ color: '#dc2626' }}>{formatPKR(s?.totalExpenses)}</div>
          <div className="text-xs mt-2" style={{ color: '#94a3b8' }}>Operating expenses + payroll</div>
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase" style={{ color: '#64748b' }}>Net Profit / Loss</div>
          <div className="font-bold text-2xl mt-2" style={{ color: (s?.netPosition || 0) >= 0 ? '#059669' : '#dc2626' }}>
            {formatPKR(s?.netPosition)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Line', 'Amount'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Fee income (completed payments)', s?.feeIncome],
              ['Manual income entries', s?.manualIncome],
              ['Operating expenses', s?.expenseTotal],
              ['Payroll', s?.payrollTotal],
              ['Manual expense entries', s?.manualExpense],
            ].map(([label, amount]) => (
              <tr key={label}>
                <td className="px-5 py-3 text-sm font-medium">{label}</td>
                <td className="px-5 py-3 text-sm">{formatPKR(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}
