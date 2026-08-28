import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import axios from 'axios'
import PageLayout from './PageLayout'
import API_BASE_URL from '../config/api'

const primaryButton = { background: '#4f46e5' }

export default function ModulePage({ title, subtitle, moduleKey = title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), columns, initialRows = [], stats = [], searchPlaceholder = 'Search records...', filters = [], addLabel = 'Add Record', formFields = [], emptyMessage = 'No records found.' }) {
  const [rows, setRows] = useState(initialRows)
  const [loading, setLoading] = useState(Boolean(moduleKey))
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState(() => Object.fromEntries(filters.map(filter => [filter.key, 'All'])))
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (!moduleKey) return
    const schoolId = localStorage.getItem('schoolId')
    if (!schoolId) {
      setLoading(false)
      setError('School information not found. Please login again.')
      return
    }
    axios.get(`${API_BASE_URL}/module-records/${moduleKey}/${schoolId}`)
      .then(response => setRows(response.data.map(record => ({ id: record._id, ...record.data }))))
      .catch(() => setError('Unable to load records from the database.'))
      .finally(() => setLoading(false))
  }, [moduleKey])

  const filteredRows = useMemo(() => rows.filter(row => {
    const haystack = Object.values(row).join(' ').toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const matchesFilters = filters.every(filter => filterValues[filter.key] === 'All' || row[filter.key] === filterValues[filter.key])
    return matchesSearch && matchesFilters
  }), [rows, search, filterValues, filters])

  const saveRow = async event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextRow = Object.fromEntries(form.entries())
    try {
      const schoolId = localStorage.getItem('schoolId')
      if (moduleKey) {
        if (editing?.id) {
          const response = await axios.patch(`${API_BASE_URL}/module-records/${editing.id}`, { schoolId, data: nextRow })
          setRows(current => current.map(row => row.id === editing.id ? { id: response.data._id, ...response.data.data } : row))
        } else {
          const response = await axios.post(`${API_BASE_URL}/module-records`, { schoolId, module: moduleKey, data: nextRow })
          setRows(current => [...current, { id: response.data._id, ...response.data.data }])
        }
      } else if (editing?.id) setRows(current => current.map(row => row.id === editing.id ? { ...row, ...nextRow } : row))
      else setRows(current => [...current, { id: `${Date.now()}`, ...nextRow }])
      setEditing(null)
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save this record.')
    }
  }

  const deleteRow = async id => {
    try {
      if (moduleKey) await axios.delete(`${API_BASE_URL}/module-records/${id}`, { params: { schoolId: localStorage.getItem('schoolId') } })
      setRows(current => current.filter(row => row.id !== id))
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Unable to delete this record.')
    }
  }

  return (
    <PageLayout title={title} subtitle={subtitle} action={
      <button onClick={() => setEditing({})} className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" style={primaryButton}>
        <Plus size={17} /> {addLabel}
      </button>
    }>
      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex items-center justify-between mb-4"><span className="text-sm" style={{ color: '#64748b' }}>{stat.label}</span><span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: stat.color || '#eef2ff', color: '#4f46e5' }}>{stat.badge || 'LIVE'}</span></div>
              <div className="font-bold text-2xl" style={{ fontFamily: 'Syne,sans-serif' }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: '#10b981' }}>{stat.caption || 'Live database total'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex flex-wrap items-center gap-3 p-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border flex-1 min-w-[220px]" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
            <Search size={17} style={{ color: '#94a3b8' }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={searchPlaceholder} className="bg-transparent outline-none text-sm w-full" />
          </div>
          {filters.map(filter => <select key={filter.key} value={filterValues[filter.key]} onChange={event => setFilterValues({ ...filterValues, [filter.key]: event.target.value })} className="px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e2e8f0' }}><option>All</option>{filter.options.map(option => <option key={option}>{option}</option>)}</select>)}
          <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{filteredRows.length} records</span>
        </div>
        {error && <div className="m-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        {loading ? <div className="text-center py-20 text-sm" style={{ color: '#94a3b8' }}>Loading records from database...</div> : filteredRows.length === 0 ? <div className="text-center py-20 text-sm" style={{ color: '#94a3b8' }}>{emptyMessage}</div> : <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr style={{ background: '#f8fafc' }}>{columns.map(column => <th key={column.key} className="text-left px-5 py-3 text-xs font-bold uppercase whitespace-nowrap" style={{ color: '#94a3b8', letterSpacing: '0.7px' }}>{column.label}</th>)}<th className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>Actions</th></tr></thead><tbody>{filteredRows.map(row => <tr key={row.id} className="hover:bg-slate-50"><>{columns.map(column => <td key={column.key} className="px-5 py-4 text-sm whitespace-nowrap" style={{ borderTop: '1px solid #f1f5f9', color: column.emphasis ? '#0f172a' : '#475569', fontWeight: column.emphasis ? 700 : 400 }}>{column.render ? column.render(row) : row[column.key]}</td>)}</><td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}><div className="flex gap-2"><button title="Edit" onClick={() => setEditing(row)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f1f5f9', color: '#475569' }}><Pencil size={15} /></button><button title="Delete" onClick={() => deleteRow(row.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fff1f2', color: '#e11d48' }}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
      </div>

      {editing && <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(5px)' }}><form onSubmit={saveRow} className="bg-white rounded-2xl p-7 w-full max-w-lg shadow-2xl"><div className="flex items-center justify-between mb-6"><h3 className="font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>{editing.id ? `Edit ${title}` : addLabel}</h3><button type="button" onClick={() => setEditing(null)} className="text-slate-400 text-xl">x</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{formFields.map(field => <label key={field.key} className="text-xs font-semibold" style={{ color: '#475569' }}>{field.label}<input name={field.key} defaultValue={editing[field.key] || ''} required={field.required !== false} placeholder={field.placeholder} type={field.type || 'text'} className="mt-2 w-full px-3 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500" style={{ borderColor: '#e2e8f0' }} /></label>)}</div><div className="flex gap-3 mt-7"><button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid #e2e8f0', color: '#475569' }}>Cancel</button><button type="submit" className="flex-1 py-3 rounded-xl text-white text-sm font-bold" style={primaryButton}>Save Record</button></div></form></div>}
    </PageLayout>
  )
}