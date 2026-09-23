import ModulePage, { parseMoney, formatPKR } from '../components/ModulePage'

export default function Employees() {
  return (
    <ModulePage
      title="Employees"
      subtitle="Manage employees linked to teacher profiles and payroll."
      addLabel="Add Employee"
      searchPlaceholder="Search employee, department or ID..."
      statsFromRows={rows => [
        { label: 'Employees', value: String(rows.length), badge: 'EM' },
        { label: 'Active Staff', value: String(rows.filter(r => String(r.status || '').toLowerCase() === 'active').length), badge: 'ON' },
        { label: 'Monthly Payroll', value: formatPKR(rows.reduce((sum, r) => sum + parseMoney(r.salary), 0)), badge: 'PAY' },
      ]}
      columns={[
        { key: 'employeeId', label: 'Employee ID', emphasis: true },
        { key: 'name', label: 'Name', emphasis: true },
        { key: 'department', label: 'Department / Subject' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'salary', label: 'Latest Salary' },
      ]}
      initialRows={[]}
      formFields={[
        { key: 'employeeId', label: 'Employee ID', placeholder: 'EMP-001' },
        { key: 'name', label: 'Employee Name', placeholder: 'Ahmed Raza' },
        { key: 'department', label: 'Department / Subject', placeholder: 'English' },
        { key: 'phone', label: 'Phone', placeholder: '0300 1234567' },
        { key: 'salary', label: 'Latest Salary', placeholder: 'PKR 50,000' },
        { key: 'status', label: 'Status', placeholder: 'Active' },
      ]}
    />
  )
}
