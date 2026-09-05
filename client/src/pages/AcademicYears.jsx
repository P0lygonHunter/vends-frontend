import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const emptyForm = { name: '', startDate: '', endDate: '', status: 'Active', isCurrent: false }

export default function AcademicYears() {
  const schoolId = localStorage.getItem('schoolId')
  const [years, setYears] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!schoolId) { setError('School information not found. Please login again.'); setLoading(false); return }
    const load = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
        setYears(response.data)
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Unable to load academic years.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [schoolId])

  const openForm = year => {
    setEditing(year || null)
    setShowForm(true)
    setForm(year ? { name: year.name, startDate: year.startDate?.slice(0, 10), endDate: year.endDate?.slice(0, 10), status: year.status, isCurrent: year.isCurrent } : emptyForm)
    setError('')
  }

  const saveYear = async event => {
    event.preventDefault()
    try {
      const response = editing
        ? await axios.patch(`${API_BASE_URL}/academic-years/${editing._id}`, form)
        : await axios.post(`${API_BASE_URL}/academic-years`, { ...form, schoolId })
      setYears(current => editing ? current.map(year => year._id === editing._id ? response.data : year) : [response.data, ...current])
      setEditing(null)
      setShowForm(false)
      setForm(emptyForm)
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save academic year.')
    }
  }

  const deleteYear = async id => {
    try {
      await axios.delete(`${API_BASE_URL}/academic-years/${id}`)
      setYears(current => current.filter(year => year._id !== id))
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Unable to delete academic year.')
    }
  }

  const setCurrentYear = async year => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/academic-years/${year._id}`, { isCurrent: true })
      setYears(current => current.map(item => item._id === response.data._id ? response.data : { ...item, isCurrent: false }))
    } catch (currentError) {
      setError(currentError.response?.data?.error || 'Unable to set current academic year.')
    }
  }

  const visibleYears = years.filter(year => `${year.name} ${year.status}`.toLowerCase().includes(search.toLowerCase()))

  return <PageLayout title="Academic Years" subtitle="Manage school sessions while preserving complete historical records." action={<button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}><Plus size={17} /> Add Academic Year</button>}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">{[['Academic Years', years.length], ['Active Years', years.filter(year => year.status === 'Active').length], ['Current Session', years.find(year => year.isCurrent)?.name || 'Not set']].map(([label, value]) => <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}><div className="text-sm" style={{ color: '#64748b' }}>{label}</div><div className="font-bold text-2xl mt-3" style={{ fontFamily: 'Syne,sans-serif' }}>{value}</div><div className="text-xs mt-1" style={{ color: '#10b981' }}>Live database total</div></div>)}</div>
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}><div className="p-4 border-b flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}><Search size={17} style={{ color: '#94a3b8' }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search academic year..." className="outline-none text-sm flex-1" /><span className="text-xs" style={{ color: '#94a3b8' }}>{visibleYears.length} records</span></div>{error && <div className="m-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}{loading ? <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading academic years...</div> : visibleYears.length === 0 ? <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>No academic years found. Add your first session.</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: '#f8fafc' }}>{['Academic Year', 'Period', 'Status', 'Current', 'Actions'].map(label => <th key={label} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{label}</th>)}</tr></thead><tbody>{visibleYears.map(year => <tr key={year._id}><td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>{year.name}</td><td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9', color: '#475569' }}>{new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}</td><td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}><span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: year.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: year.status === 'Active' ? '#059669' : '#64748b' }}>{year.status}</span></td><td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>{year.isCurrent ? <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#eef2ff', color: '#4f46e5' }}>Current</span> : <button onClick={() => setCurrentYear(year)} className="text-xs font-bold" style={{ color: '#4f46e5' }}>Set current</button>}</td><td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}><div className="flex gap-2"><button onClick={() => openForm(year)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f1f5f9' }}><Pencil size={15} /></button><button onClick={() => deleteYear(year._id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fff1f2', color: '#e11d48' }}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}</div>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}><form onSubmit={saveYear} className="bg-white rounded-2xl p-7 w-full max-w-lg"><h3 className="font-bold text-xl mb-6" style={{ fontFamily: 'Syne,sans-serif' }}>{editing ? 'Edit Academic Year' : 'Add Academic Year'}</h3><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold">Academic Year<input required name="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="2026-27" className="mt-2 w-full px-3 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} /></label><label className="text-xs font-bold">Start Date<input required name="startDate" type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} className="mt-2 w-full px-3 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} /></label><label className="text-xs font-bold">End Date<input required name="endDate" type="date" value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })} className="mt-2 w-full px-3 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} /></label><label className="text-xs font-bold">Status<select name="status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="mt-2 w-full px-3 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }}><option>Active</option><option>Inactive</option></select></label></div><label className="flex items-center gap-2 mt-5 text-sm"><input type="checkbox" checked={form.isCurrent} onChange={event => setForm({ ...form, isCurrent: event.target.checked })} /> Set as current academic year</label><div className="flex gap-3 mt-7"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>Cancel</button><button className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: '#4f46e5' }}>Save Year</button></div></form></div>}
  </PageLayout>
}
