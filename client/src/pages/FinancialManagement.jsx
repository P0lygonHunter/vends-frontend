import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, BriefcaseBusiness, Calculator, CircleDollarSign, FileText, ReceiptText, Scale } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const modules = [
  { label: 'Employees', description: 'Staff records and salary profiles', path: '/employees', icon: BriefcaseBusiness },
  { label: 'Payroll', description: 'Monthly salary processing', path: '/payroll', icon: ReceiptText },
  { label: 'Expense Management', description: 'Track operational spending', path: '/expenses', icon: CircleDollarSign },
  { label: 'Balance Sheet', description: 'Assets, liabilities and equity', path: '/balance-sheet', icon: Scale },
  { label: 'Trial Balance', description: 'Verify account balances', path: '/trial-balance', icon: Calculator },
  { label: 'Profit & Loss', description: 'Income and expense summary', path: '/profit-loss', icon: BarChart3 },
  { label: 'Chart of Accounts', description: 'Manage ledger categories', path: '/chart-of-accounts', icon: FileText },
]

const formatPKR = (n) =>
  `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export default function FinancialManagement() {
  const navigate = useNavigate()
  const schoolId = localStorage.getItem('schoolId')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    axios
      .get(`${API_BASE_URL}/finance/${schoolId}/summary`)
      .then((res) => setSummary(res.data.summary))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load financial summary'))
      .finally(() => setLoading(false))
  }, [schoolId])

  return (
    <PageLayout
      title="Financial Management"
      subtitle="Employees, payroll, expenses and database-calculated financial statements."
      action={<span className="text-xs font-bold" style={{ color: '#059669' }}>Double-Entry Accounting</span>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <button
              key={module.path}
              type="button"
              onClick={() => navigate(module.path)}
              className="bg-white rounded-2xl border p-5 text-left hover:-translate-y-1 transition-transform"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                  <Icon size={19} />
                </div>
                <div>
                  <div className="font-bold text-sm">{module.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>{module.description}</div>
                </div>
              </div>
              <ArrowRight size={16} className="mt-5" style={{ color: '#4f46e5' }} />
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ecfdf5', color: '#059669' }}>
            <BarChart3 size={19} />
          </div>
          <div>
            <h3 className="font-bold">Financial snapshot</h3>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Live totals from completed fee payments, expenses and payroll records.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['Total Income', loading ? '…' : formatPKR(summary?.totalIncome)],
            ['Total Expenses', loading ? '…' : formatPKR(summary?.totalExpenses)],
            ['Net Position', loading ? '…' : formatPKR(summary?.netPosition)],
          ].map(([label, value]) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: '#f8fafc' }}>
              <div className="text-xs" style={{ color: '#64748b' }}>{label}</div>
              <div className="font-bold text-xl mt-2">{value}</div>
            </div>
          ))}
        </div>

        {!loading && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              ['Fee income', formatPKR(summary.feeIncome)],
              ['Outstanding fees', formatPKR(summary.feeOutstanding)],
              ['Operating expenses', formatPKR(summary.expenseTotal)],
              ['Payroll', formatPKR(summary.payrollTotal)],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-3 rounded-xl text-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#94a3b8' }}>{label}</div>
                <div className="font-bold mt-1">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
