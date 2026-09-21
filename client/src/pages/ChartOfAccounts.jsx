import { useEffect, useState } from 'react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash and Bank', type: 'Asset' },
  { code: '1100', name: 'Fees Receivable', type: 'Asset' },
  { code: '4000', name: 'Tuition Income', type: 'Income' },
  { code: '5000', name: 'Operating Expenses', type: 'Expense' },
  { code: '5100', name: 'Salaries Expense', type: 'Expense' },
]

export default function ChartOfAccounts() {
  const schoolId = localStorage.getItem('schoolId')
  const [balances, setBalances] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) return
    axios
      .get(`${API_BASE_URL}/finance/${schoolId}/summary`)
      .then((res) => {
        const map = {}
        for (const row of res.data.trialBalance || []) {
          map[row.account] = row
        }
        setBalances(map)
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'))
  }, [schoolId])

  return (
    <PageLayout title="Chart of Accounts" subtitle="Standard school ledger accounts with live balances from activity.">
      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Code', 'Account', 'Type', 'Debit', 'Credit'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEFAULT_ACCOUNTS.map((acc) => {
              const b = balances[acc.name] || { debit: 0, credit: 0 }
              return (
                <tr key={acc.code}>
                  <td className="px-5 py-3 text-sm font-mono">{acc.code}</td>
                  <td className="px-5 py-3 text-sm font-bold">{acc.name}</td>
                  <td className="px-5 py-3 text-sm">{acc.type}</td>
                  <td className="px-5 py-3 text-sm">{formatPKR(b.debit)}</td>
                  <td className="px-5 py-3 text-sm">{formatPKR(b.credit)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}
