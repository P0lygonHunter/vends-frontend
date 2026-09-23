import ModulePage, { parseMoney, formatPKR } from '../components/ModulePage'

export default function Payroll() {
  return (
    <ModulePage
      title="Payroll"
      subtitle="Prepare monthly salaries, deductions and payment records."
      addLabel="Create Payroll"
      searchPlaceholder="Search employee or payroll month..."
      statsFromRows={rows => {
        const gross = rows.reduce((sum, r) => sum + parseMoney(r.salary), 0)
        const paid = rows.filter(r => String(r.status || '').toLowerCase() === 'paid').reduce((sum, r) => sum + parseMoney(r.net), 0)
        const pending = rows.filter(r => String(r.status || '').toLowerCase() !== 'paid').reduce((sum, r) => sum + parseMoney(r.net), 0)
        return [
          { label: 'Gross Payroll', value: formatPKR(gross), badge: 'PAY' },
          { label: 'Paid', value: formatPKR(paid), badge: 'OK' },
          { label: 'Pending', value: formatPKR(pending), badge: 'PD' },
        ]
      }}
      filters={[{ key: 'status', options: ['Paid', 'Pending', 'Draft'] }]}
      columns={[
        { key: 'month', label: 'Month', emphasis: true },
        { key: 'employee', label: 'Employee' },
        { key: 'salary', label: 'Gross Salary' },
        { key: 'deductions', label: 'Deductions' },
        { key: 'net', label: 'Net Pay' },
        { key: 'status', label: 'Status' },
      ]}
      initialRows={[]}
      formFields={[
        { key: 'month', label: 'Payroll Month', placeholder: 'August 2026' },
        { key: 'employee', label: 'Employee', placeholder: 'Ahmed Raza' },
        { key: 'salary', label: 'Gross Salary', placeholder: 'PKR 50,000' },
        { key: 'deductions', label: 'Deductions', placeholder: 'PKR 0' },
        { key: 'net', label: 'Net Pay', placeholder: 'PKR 50,000' },
        { key: 'status', label: 'Status', placeholder: 'Draft' },
      ]}
    />
  )
}
