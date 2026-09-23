import ModulePage, { parseMoney, formatPKR } from '../components/ModulePage'

export default function ExpenseManagement() {
  return (
    <ModulePage
      title="Expense Management"
      subtitle="Record, categorize and review school operating expenses."
      addLabel="Add Expense"
      searchPlaceholder="Search expense, vendor or category..."
      statsFromRows={rows => {
        const now = new Date()
        const thisMonth = rows
          .filter(r => {
            const d = r.date ? new Date(r.date) : null
            return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
          })
          .reduce((sum, r) => sum + parseMoney(r.amount), 0)
        const pendingCount = rows.filter(r => String(r.status || '').toLowerCase() === 'pending').length
        const categoryCount = new Set(rows.map(r => String(r.category || '').trim().toLowerCase()).filter(Boolean)).size
        return [
          { label: 'This Month', value: formatPKR(thisMonth), badge: 'EXP' },
          { label: 'Pending Approval', value: String(pendingCount), badge: 'PD' },
          { label: 'Categories', value: String(categoryCount), badge: 'CAT' },
        ]
      }}
      filters={[{ key: 'status', options: ['Approved', 'Pending', 'Rejected'] }]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description', emphasis: true },
        { key: 'category', label: 'Category' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
      ]}
      initialRows={[]}
      formFields={[
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'description', label: 'Description', placeholder: 'Electricity bill' },
        { key: 'category', label: 'Category', placeholder: 'Utilities' },
        { key: 'vendor', label: 'Vendor', placeholder: 'Provider name' },
        { key: 'amount', label: 'Amount', placeholder: 'PKR 0' },
        { key: 'status', label: 'Status', placeholder: 'Pending' },
      ]}
      emptyMessage="No expenses recorded for this period."
    />
  )
}
