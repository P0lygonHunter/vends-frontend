import ModulePage from '../components/ModulePage'

const initialRows = [
  { id: '2026-27', year: '2026-27', period: 'Apr 01, 2026 - Mar 31, 2027', classes: '6', students: '12', status: 'Active', current: 'Current' }
]

export default function AcademicYears() {
  return <ModulePage
    title="Academic Years"
    subtitle="Manage school sessions while preserving complete historical records."
    addLabel="Add Academic Year"
    searchPlaceholder="Search academic year..."
    stats={[{ label: 'Academic Years', value: '1', badge: 'AY' }, { label: 'Active Years', value: '1', badge: 'ON' }, { label: 'Current Session', value: '2026-27', badge: 'NOW' }]}
    columns={[{ key: 'year', label: 'Academic Year', emphasis: true }, { key: 'period', label: 'Period' }, { key: 'classes', label: 'Classes' }, { key: 'students', label: 'Students' }, { key: 'status', label: 'Status', render: row => <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#ecfdf5', color: '#059669' }}>{row.status}</span> }, { key: 'current', label: 'Current', render: row => <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#eef2ff', color: '#4f46e5' }}>{row.current}</span> }]}
    initialRows={initialRows}
    formFields={[{ key: 'year', label: 'Academic Year', placeholder: '2027-28' }, { key: 'period', label: 'Period', placeholder: 'Apr 01, 2027 - Mar 31, 2028' }, { key: 'status', label: 'Status', placeholder: 'Active' }]}
    emptyMessage="No academic years match these filters."
  />
}