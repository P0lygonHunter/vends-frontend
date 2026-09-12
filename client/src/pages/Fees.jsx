import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const blank = { studentId: '', classSectionId: '', academicYearId: '', feeType: 'Tuition', month: '', amount: '', paid: 0, dueDate: '' }

export default function Fees() {
  const schoolId = localStorage.getItem('schoolId')
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [years, setYears] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [feeResponse, studentResponse, classResponse, yearResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/fees/${schoolId}`),
          axios.get(`${API_BASE_URL}/students/${schoolId}`),
          axios.get(`${API_BASE_URL}/classes/${schoolId}`),
          axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
        ]);
        setFees(feeResponse.data);
        setStudents(studentResponse.data);
        setClasses(classResponse.data);
        setYears(yearResponse.data);
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Unable to load fee records.')
      } finally {
        setLoading(false)
      }
    }
    if (schoolId) load();
    else { setError('School information not found. Please login again.'); setLoading(false) }
  }, [schoolId])

  const openForm = fee => {
    setEditing(fee || null);
    setForm(fee ? {
      studentId: fee.studentId?._id || '',
      classSectionId: fee.classSectionId?._id || '',
      academicYearId: fee.academicYearId || '',
      feeType: fee.feeType,
      month: fee.month,
      amount: fee.amount,
      paid: fee.paid,
      dueDate: fee.dueDate?.slice(0, 10) || ''
    } : {
      ...blank,
      academicYearId: years.find(year => year.isCurrent)?._id || ''
    });
    setShowForm(true);
    setError('')
  }

  const saveFee = async event => {
    event.preventDefault();
    try {
      const response = editing
        ? await axios.patch(`${API_BASE_URL}/fees/${editing._id}`, form)
        : await axios.post(`${API_BASE_URL}/fees`, { ...form, schoolId });
      setFees(current => editing ? current.map(fee => fee._id === editing._id ? response.data : fee) : [response.data, ...current]);
      setShowForm(false);
      setEditing(null)
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save fee record.')
    }
  }

  const deleteFee = async id => {
    try {
      await axios.delete(`${API_BASE_URL}/fees/${id}`);
      setFees(current => current.filter(fee => fee._id !== id))
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Unable to delete fee record.')
    }
  }

  const totals = fees.reduce((result, fee) => ({
    amount: result.amount + fee.amount,
    paid: result.paid + fee.paid,
    balance: result.balance + fee.balance
  }), { amount: 0, paid: 0, balance: 0 })

  return (
    <PageLayout
      title="Fees Management"
      subtitle="Track charges, collections, balances and printable receipts."
      action={
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>
          <Plus size={17} /> Add Fee Record
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          ['Total Fees', `PKR ${totals.amount.toLocaleString()}`],
          ['Collected', `PKR ${totals.paid.toLocaleString()}`],
          ['Pending', `PKR ${totals.balance.toLocaleString()}`]
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-sm" style={{ color: '#64748b' }}>{label}</div>
            <div className="font-bold text-2xl mt-3">{value}</div>
            <div className="text-xs mt-1" style={{ color: '#10b981' }}>Live database total</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#e2e8f0' }}>
        {error && <div className="m-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading fee records...</div>
        ) : fees.length === 0 ? (
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>No fee records found. Add the first fee record.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Student', 'Class', 'Fee Type', 'Month', 'Amount', 'Paid', 'Balance', 'Status', 'Actions'].map(label => (
                  <th key={label} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee._id}>
                  <td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>
                    {fee.studentId?.name || 'N/A'}
                    {fee.studentId?.rollNumber && <span className="text-xs block text-slate-400 font-normal">Roll #: {fee.studentId.rollNumber}</span>}
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{fee.classSectionId?.name || '-'}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${fee.feeType === 'School Fee' ? 'bg-blue-50 text-blue-600' : fee.feeType === 'Academy Fee' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-700'}`}>
                      {fee.feeType}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{fee.month}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>PKR {fee.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>PKR {fee.paid.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>PKR {fee.balance.toLocaleString()}</td>
                  <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: fee.status === 'Paid' ? '#ecfdf5' : '#fff7ed', color: fee.status === 'Paid' ? '#059669' : '#c2410c' }}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <div className="flex gap-2">
                      <button onClick={() => openForm(fee)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f1f5f9' }}><Pencil size={15} /></button>
                      <button onClick={() => deleteFee(fee._id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fff1f2', color: '#e11d48' }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <form onSubmit={saveFee} className="bg-white rounded-2xl p-7 w-full max-w-2xl">
            <h3 className="font-bold text-xl mb-6">{editing ? 'Edit Fee Record' : 'Add Fee Record'}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <select required value={form.studentId} onChange={event => {
                const student = students.find(item => item._id === event.target.value);
                setForm({ ...form, studentId: event.target.value, classSectionId: student?.classSectionId?._id || student?.classSectionId || '', academicYearId: student?.academicYearId || '' })
              }} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }}>
                <option value="">Select student</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} {student.rollNumber ? `(Roll: ${student.rollNumber})` : ''}
                  </option>
                ))}
              </select>

              <select value={form.classSectionId} onChange={event => setForm({ ...form, classSectionId: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }}>
                <option value="">Select class</option>
                {classes.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>

              <select required value={form.feeType} onChange={event => setForm({ ...form, feeType: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }}>
                <option value="School Fee">School Fee</option>
                <option value="Academy Fee">Academy Fee</option>
                <option value="Tuition">Tuition</option>
                <option value="Exam Fee">Exam Fee</option>
                <option value="Admission Fee">Admission Fee</option>
              </select>

              <input required placeholder="Month e.g. September 2026" value={form.month} onChange={event => setForm({ ...form, month: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input required type="number" min="0" placeholder="Amount" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input type="number" min="0" placeholder="Paid" value={form.paid} onChange={event => setForm({ ...form, paid: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
              <input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} className="px-3 py-3 rounded-xl border-2 text-sm outline-none sm:col-span-2" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm" style={{ border: '1px solid #e2e8f0' }}>Cancel</button>
              <button className="flex-1 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>Save Fee</button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  )
}