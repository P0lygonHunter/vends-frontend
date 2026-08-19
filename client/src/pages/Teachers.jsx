import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const colors = ['#4f46e5','#10b981','#f59e0b','#7c3aed','#ef4444','#0ea5e9']

const subjects = [
  'Mathematics','Science','Physics','Chemistry','Biology',
  'English','Urdu','Islamiat','Pakistan Studies',
  'Computer Science','Economics','Accounting',
  'History','Geography','Art & Drawing','Physical Education'
]

export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTeacher, setEditTeacher] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', subject:'', grades:'', phone:'', status:'Active' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const schoolId = localStorage.getItem('schoolId')

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teachers/${schoolId}`)
      setTeachers(res.data)
    } catch (err) {
      console.log(err)
    }
    setLoading(false)
  }

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditTeacher(null)
    setError('')
    setForm({ name:'', email:'', subject:'', grades:'', phone:'', status:'Active' })
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditTeacher(t)
    setError('')
    setForm({ name:t.name, email:t.email, subject:t.subject, grades:t.grades, phone:t.phone, status:t.status })
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name) { setError('Please enter teacher name!'); return }
    if (!form.email || !form.email.includes('@') || !form.email.includes('.')) {
      setError('Please enter a valid email! Example: teacher@school.pk'); return
    }
    if (!form.phone || !/^[0-9+\-\s]{10,15}$/.test(form.phone)) {
      setError('Please enter a valid phone! Example: +92-300-1234567'); return
    }
    if (!form.subject) { setError('Please select a subject!'); return }

    try {
      if (editTeacher) {
        const res = await axios.patch(`${API_BASE_URL}/teachers/${editTeacher._id}`, form)
        setTeachers(teachers.map(t => t._id === editTeacher._id ? res.data : t))
      } else {
        const res = await axios.post(`${API_BASE_URL}/teachers`, { ...form, schoolId })
        setTeachers([...teachers, res.data])
      }
      setShowModal(false)
    } catch (err) {
      setError('Something went wrong. Try again.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/teachers/${id}`)
      setTeachers(teachers.filter(t => t._id !== id))
    } catch (err) {
      console.log(err)
    }
  }

  const statusStyle = (status) => {
    if (status === 'Active') return { background:'#ecfdf5', color:'#059669' }
    if (status === 'On Leave') return { background:'#fffbeb', color:'#d97706' }
    return { background:'#fef2f2', color:'#dc2626' }
  }

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />

      <div style={{marginLeft:'260px', flex:1}}>
        <div className="flex items-center gap-4 px-8 bg-white"
          style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Teacher Management</h2>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{background:'#f1f5f9', border:'1.5px solid #e2e8f0'}}>
            <span>🔍</span>
            <input placeholder="Search teachers..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-48"/>
          </div>

          <TrialBadge />
        </div>

        <div className="p-8">
          <div className="bg-white rounded-2xl border" style={{borderColor:'#e2e8f0'}}>
            <div className="flex items-center gap-3 px-6 py-4" style={{borderBottom:'1px solid #e2e8f0'}}>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{background:'#4f46e5'}}>
                + Add Teacher
              </button>

              <span className="ml-auto text-sm" style={{color:'#94a3b8'}}>
                {filtered.length} teachers found
              </span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading teachers...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                No teachers yet — add your first teacher!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Teacher','Subject','Grades','Phone','Status','Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase"
                          style={{color:'#94a3b8', letterSpacing:'0.8px', borderBottom:'1px solid #e2e8f0'}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((t,i) => (
                      <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{background: colors[i % colors.length]}}>
                              {t.name.split(' ').filter(x => x !== 'Mr.' && x !== 'Ms.' && x !== 'Mrs.').map(x=>x[0]).join('').slice(0,2)}
                            </div>

                            <div>
                              <div className="font-semibold text-sm">{t.name}</div>
                              <div className="text-xs" style={{color:'#94a3b8'}}>{t.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium" style={{borderBottom:'1px solid #f1f5f9'}}>
                          {t.subject}
                        </td>

                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <span className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{background:'#eef2ff', color:'#4f46e5'}}>
                            {t.grades}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm"
                          style={{borderBottom:'1px solid #f1f5f9', color:'#475569'}}>
                          {t.phone}
                        </td>

                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={statusStyle(t.status)}>
                            {t.status}
                          </span>
                        </td>

                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(t)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{background:'#f1f5f9'}}>
                              ✏️
                            </button>

                            <button onClick={() => handleDelete(t._id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{background:'#f1f5f9'}}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-xl mb-6" style={{fontFamily:'Syne,sans-serif'}}>
              {editTeacher ? 'Edit Teacher' : 'Add New Teacher'}
            </h3>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm mb-4"
                style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca'}}>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {[
                {label:'Full Name', key:'name', placeholder:'Mr. Ahmed Khan'},
                {label:'Email', key:'email', placeholder:'teacher@school.pk'},
                {label:'Grades Taught', key:'grades', placeholder:'e.g. 6-8 or All'},
                {label:'Phone', key:'phone', placeholder:'+92-300-0000000'},
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>
                    {f.label}
                  </label>

                  <input
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                    style={{borderColor:'#e2e8f0'}}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>
                  Subject
                </label>

                <select
                  value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                  style={{borderColor:'#e2e8f0'}}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                  style={{borderColor:'#e2e8f0'}}>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{border:'1.5px solid #e2e8f0', color:'#475569'}}>
                Cancel
              </button>

              <button onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                style={{background:'#4f46e5'}}>
                {editTeacher ? 'Save Changes' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}