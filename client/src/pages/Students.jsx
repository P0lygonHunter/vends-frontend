import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const colors = ['#4f46e5','#ef4444','#10b981','#f59e0b','#7c3aed','#0ea5e9']

const grades = [
'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
'Grade 6','Grade 7','Grade 8','Matric (Pre-9th)',
'Matric (9th)','Matric (10th)',
'FSc Pre-Medical (11th)','FSc Pre-Medical (12th)',
'FSc Pre-Engineering (11th)','FSc Pre-Engineering (12th)',
'ICS (11th)','ICS (12th)','ICom (11th)','ICom (12th)',
'FA (11th)','FA (12th)','FA-IT (11th)','FA-IT (12th)',
'Commerce (11th)','Commerce (12th)','Arts (11th)','Arts (12th)',
]

export default function Students() {
const [students, setStudents] = useState([])
const [search, setSearch] = useState('')
const [showModal, setShowModal] = useState(false)
const [editStudent, setEditStudent] = useState(null)
const [form, setForm] = useState({ name:'', email:'', grade:'Grade 1', age:'', phone:'', status:'Active' })
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

const schoolName = localStorage.getItem('schoolName') || 'Your School'
const schoolId = localStorage.getItem('schoolId')

useEffect(() => { fetchStudents() }, [])

const fetchStudents = async () => {
try {
const res = await axios.get(`${API_BASE_URL}/students/${schoolId}`)
setStudents(res.data)
} catch (err) {
console.log(err)
}
setLoading(false)
}

const filtered = students.filter(s =>
s.name.toLowerCase().includes(search.toLowerCase()) ||
s.email.toLowerCase().includes(search.toLowerCase())
)

const openAdd = () => {
setEditStudent(null)
setError('')
setForm({ name:'', email:'', grade:'Grade 1', age:'', phone:'', status:'Active' })
setShowModal(true)
}

const openEdit = (s) => {
setEditStudent(s)
setError('')
setForm({ name:s.name, email:s.email, grade:s.grade, age:s.age, phone:s.phone, status:s.status })
setShowModal(true)
}

const handleSave = async () => {
setError('')
if (!form.name) { setError('Please enter student name!'); return }
if (!form.email || !form.email.includes('@') || !form.email.includes('.')) {
setError('Please enter a valid email! Example: ahmed@school.pk'); return
}
if (!form.phone || !/^[0-9+-\s]{10,15}$/.test(form.phone)) { setError('Please enter a valid phone! Example: +92-300-1234567'); return } if (!form.age || isNaN(form.age) || form.age < 3 || form.age > 25) { setError('Please enter a valid age between 3 and 25!'); return } try {
if (editStudent) {
const res = await axios.patch(`${API_BASE_URL}/students/${editStudent._id}`, form)
setStudents(students.map(s => s._id === editStudent._id ? res.data : s))
} else {
const res = await axios.post(`${API_BASE_URL}/students`, { ...form, schoolId })
setStudents([...students, res.data])
}
setShowModal(false)
} catch (err) {
const msg = err.response?.data?.error || 'Something went wrong. Try again.'
setError(msg)
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
<h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Student Management</h2>
<div className="flex items-center gap-3 px-4 py-2 rounded-xl"
style={{background:'#f1f5f9', border:'1.5px solid #e2e8f0'}}>
<span>🔍</span>
<input placeholder="Search students..."
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
+ Add Student
</button>
<span className="ml-auto text-sm" style={{color:'#94a3b8'}}>
{filtered.length} students found
</span>
</div>

{loading ? (
<div className="text-center py-16 text-slate-400">Loading students...</div>
) : filtered.length === 0 ? (
<div className="text-center py-16 text-slate-400">
No students yet — add your first student!
</div>
) : (
<div className="overflow-x-auto">
<table className="w-full border-collapse">
<thead>
<tr style={{background:'#f8fafc'}}>
{['Student','Grade','Age','Phone','Status','Actions'].map(h => (
<th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase"
style={{color:'#94a3b8', letterSpacing:'0.8px', borderBottom:'1px solid #e2e8f0'}}>
{h}
</th>
))}
</tr>
</thead>
<tbody>
{filtered.map((s,i) => (
<tr key={s._id} className="hover:bg-slate-50 transition-colors">
<td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
style={{background: colors[i % colors.length]}}>
{s.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
</div>
<div>
<div className="font-semibold text-sm">{s.name}</div>
<div className="text-xs" style={{color:'#94a3b8'}}>{s.email}</div>
</div>
</div>
</td>
<td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
<span className="px-3 py-1 rounded-full text-xs font-bold"
style={{background:'#eef2ff', color:'#4f46e5'}}>{s.grade}</span>
</td>
<td className="px-5 py-4 text-sm" style={{borderBottom:'1px solid #f1f5f9'}}>{s.age}</td>
<td className="px-5 py-4 text-sm" style={{borderBottom:'1px solid #f1f5f9', color:'#475569'}}>{s.phone}</td>
<td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
<span className="px-3 py-1 rounded-full text-xs font-bold" style={statusStyle(s.status)}>
{s.status}
</span>
</td>
<td className="px-5 py-4" style={{borderBottom:'1px solid #f1f5f9'}}>
<div className="flex gap-2">
<button onClick={() => openEdit(s)}
className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
style={{background:'#f1f5f9'}}>✏️</button>
<button onClick={() => handleDelete(s._id)}
className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
style={{background:'#f1f5f9'}}>🗑️</button>
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
{editStudent ? 'Edit Student' : 'Add New Student'}
</h3>

{error && (
<div className="px-4 py-3 rounded-xl text-sm mb-4"
style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca'}}>
{error}
</div>
)}

<div className="flex flex-col gap-4">
{[
{label:'Full Name', key:'name', placeholder:'Ahmed Karimi'},
{label:'Email', key:'email', placeholder:'ahmed@school.pk'},
{label:'Age', key:'age', placeholder:'14', type:'number'},
{label:'Phone', key:'phone', placeholder:'+92-300-0000000'},
 ].map(f => (
<div key={f.key}>
<label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>{f.label}</label>
<input
type={f.type || 'text'}
placeholder={f.placeholder}
value={form[f.key]}
onChange={e => setForm({...form, [f.key]: e.target.value})}
className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
style={{borderColor:'#e2e8f0'}}/>
</div>
))}
<div>
<label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Grade</label>
<select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}
className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
style={{borderColor:'#e2e8f0'}}>
{grades.map(g => <option key={g}>{g}</option>)}
</select>
</div>
<div>
<label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>Status</label>
<select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
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
{editStudent ? 'Save Changes' : 'Add Student'}
</button>
</div>
</div>
</div>
)}
</div>
)
}