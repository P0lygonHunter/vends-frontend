import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const colors = ['#4f46e5','#ef4444','#10b981','#f59e0b','#7c3aed','#0ea5e9']

export default function Students() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState({
    rollNumber: '', name: '', email: '', age: '', phone: '', status: 'Active',
    classSectionId: '', academicYearId: '', schoolFee: '', academyFee: '',
    feeMonth: 'September 2026', dueDate: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const schoolId = localStorage.getItem('schoolId')

  useEffect(() => {
    const loadStudentsAndClasses = async () => {
      try {
        const [studentRes, classRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/students/${schoolId}`),
          axios.get(`${API_BASE_URL}/classes/${schoolId}`)
        ])
        setStudents(studentRes.data)
        setClasses(classRes.data)
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    }

    if (schoolId) loadStudentsAndClasses()
    else setLoading(false)
  }, [schoolId])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditStudent(null)
    setError('')
    setForm({
      rollNumber: '', name: '', email: '', age: '', phone: '', status: 'Active',
      classSectionId: '', academicYearId: '', schoolFee: '', academyFee: '',
      feeMonth: 'September 2026', dueDate: ''
    })
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditStudent(s)
    setError('')
    setForm({
      rollNumber: s.rollNumber || '', name: s.name, email: s.email, age: s.age,
      phone: s.phone, status: s.status, classSectionId: s.classSectionId?._id || s.classSectionId || '',
      academicYearId: s.academicYearId || '', schoolFee: '', academyFee: '',
      feeMonth: 'September 2026', dueDate: ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.rollNumber) { setError('Please enter Roll Number!'); return }
    if (!form.name) { setError('Please enter student name!'); return }
    if (!form.email || !form.email.includes('@')) { setError('Please enter a valid email!'); return }
    if (!form.phone) { setError('Please enter phone number!'); return }
    if (!form.age || form.age < 3 || form.age > 25) { setError('Please enter valid age between 3 and 25!'); return }

    try {
      if (editStudent) {
        const res = await axios.patch(`${API_BASE_URL}/students/${editStudent._id}`, form)
        setStudents(students.map(s => s._id === editStudent._id ? res.data : s))
      } else {
        const res = await axios.post(`${API_BASE_URL}/students`, { ...form, schoolId })
        setStudents([...students, res.data])
      }
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/students/${id}`)
      setStudents(students.filter(s => s._id !== id))
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />
      <div style={{marginLeft:'260px', flex:1}}>
        <div className="flex items-center gap-4 px-8 bg-white" style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Student Management</h2>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{background:'#f1f5f9', border:'1.5px solid #e2e8f0'}}>
            <span>🔍</span>
            <input placeholder="Search name or roll no..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none text-sm w-48"/>
          </div>
          <TrialBadge />
        </div>

        <div className="p-8">
          <div className="bg-white rounded-2xl border" style={{borderColor:'#e2e8f0'}}>
            <div className="flex items-center gap-3 px-6 py-4" style={{borderBottom:'1px solid #e2e8f0'}}>
              <button onClick={openAdd} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{background:'#4f46e5'}}>
                + Add Student
              </button>
              <span className="ml-auto text-sm" style={{color:'#94a3b8'}}>{filtered.length} students found</span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading students...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No students found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Roll No', 'Student', 'Class & Room', 'Age', 'Phone', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{color:'#94a3b8', borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold" style={{borderBottom:'1px solid #f1f5f9'}}>{s.rollNumber || '-'}</td>
                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background: colors[i % colors.length]}}>
                              {s.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{s.name}</div>
                              <div className="text-xs" style={{color:'#94a3b8'}}>{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{background:'#eef2ff', color:'#4f46e5'}}>
                            {s.classSectionId ? `${s.classSectionId.name} (${s.classSectionId.roomNumber || 'N/A'})` : s.grade || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{borderBottom:'1px solid #f1f5f9'}}>{s.age}</td>
                        <td className="px-5 py-4 text-sm" style={{borderBottom:'1px solid #f1f5f9', color:'#475569'}}>{s.phone}</td>
                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{background: s.status === 'Active' ? '#ecfdf5' : '#fef2f2', color: s.status === 'Active' ? '#059669' : '#dc2626'}}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:'#f1f5f9'}}>✏️</button>
                            <button onClick={() => handleDelete(s._id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:'#f1f5f9'}}>🗑️</button>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4" style={{fontFamily:'Syne,sans-serif'}}>{editStudent ? 'Edit Student' : 'Add New Student'}</h3>
            {error && <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca'}}>{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Roll Number</label>
                <input placeholder="e.g. 101" value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Full Name</label>
                <input placeholder="Ahmed Karimi" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Email</label>
                <input placeholder="ahmed@school.pk" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Phone</label>
                <input placeholder="+92-300-0000000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Age</label>
                <input type="number" placeholder="14" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Suspended</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Class & Room</label>
                <select value={form.classSectionId} onChange={e => {
                  const selected = classes.find(item => item._id === e.target.value);
                  setForm({...form, classSectionId: e.target.value, academicYearId: selected?.academicYearId?._id || selected?.academicYearId || ''})
                }} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}>
                  <option value="">Select Class & Room</option>
                  {classes.map(item => (
                    <option key={item._id} value={item._id}>
                      {item.name} {item.roomNumber ? `(Room: ${item.roomNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!editStudent && (
                <>
                  <div className="col-span-2 pt-2 border-t font-semibold text-xs" style={{color:'#4f46e5'}}>Automatic Fee Linkage</div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>School Fee (PKR)</label>
                    <input type="number" placeholder="e.g. 5000" value={form.schoolFee} onChange={e => setForm({...form, schoolFee: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Academy Fee (PKR)</label>
                    <input type="number" placeholder="e.g. 3000" value={form.academyFee} onChange={e => setForm({...form, academyFee: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Fee Month</label>
                    <input placeholder="e.g. September 2026" value={form.feeMonth} onChange={e => setForm({...form, feeMonth: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Due Date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{borderColor:'#e2e8f0'}}/>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{border:'1.5px solid #e2e8f0', color:'#475569'}}>Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-white text-sm font-bold" style={{background:'#4f46e5'}}>{editStudent ? 'Save Changes' : 'Add Student'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}