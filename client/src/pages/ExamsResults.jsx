import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const blankForm = {
  title: '',
  classId: '',
  academicYearId: '',
  type: 'Term',
  subject: '',
  totalMarks: 100,
  passingMarks: 33,
  examDate: '',
  resultDate: ''
}

export default function ExamsResults() {
  const schoolId = localStorage.getItem('schoolId')
  const [exams, setExams] = useState([])
  const [classes, setClasses] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [form, setForm] = useState(blankForm)

  // Marks entry
  const [marksExam, setMarksExam] = useState(null)
  const [markRows, setMarkRows] = useState([])
  const [marksLoading, setMarksLoading] = useState(false)
  const [marksSaving, setMarksSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [classRes, examRes, yearRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/exams/${schoolId}`),
        axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
      ])
      if (classRes.status === 'fulfilled') setClasses(Array.isArray(classRes.value.data) ? classRes.value.data : [])
      if (examRes.status === 'fulfilled') setExams(Array.isArray(examRes.value.data) ? examRes.value.data : [])
      if (yearRes.status === 'fulfilled') setYears(Array.isArray(yearRes.value.data) ? yearRes.value.data : [])
    } catch {
      setError('Error loading data from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (schoolId) loadData()
  }, [schoolId])

  const openModal = (exam = null) => {
    setError('')
    if (exam) {
      setEditingExam(exam)
      setForm({
        title: exam.name || exam.title || '',
        classId: exam.classSectionId?._id || exam.classSectionId || '',
        academicYearId: exam.academicYearId?._id || exam.academicYearId || '',
        type: exam.type || 'Term',
        subject: exam.subject || '',
        totalMarks: exam.maximumMarks || 100,
        passingMarks: exam.passMarks || 33,
        examDate: exam.startDate ? String(exam.startDate).split('T')[0] : '',
        resultDate: exam.endDate ? String(exam.endDate).split('T')[0] : ''
      })
    } else {
      setEditingExam(null)
      const currentYear = years.find((y) => y.isCurrent)
      setForm({ ...blankForm, academicYearId: currentYear?._id || '' })
    }
    setIsModalOpen(true)
  }

  const saveExam = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        schoolId,
        name: form.title,
        classSectionId: form.classId,
        academicYearId: form.academicYearId || classes.find((c) => c._id === form.classId)?.academicYearId,
        type: form.type,
        subject: form.subject,
        maximumMarks: Number(form.totalMarks),
        passMarks: Number(form.passingMarks),
        startDate: form.examDate,
        endDate: form.resultDate || form.examDate
      }
      if (editingExam) {
        const { data } = await axios.patch(`${API_BASE_URL}/exams/${editingExam._id}`, payload)
        setExams((list) => list.map((x) => (x._id === editingExam._id ? data : x)))
      } else {
        const { data } = await axios.post(`${API_BASE_URL}/exams`, payload)
        setExams((list) => [data, ...list])
      }
      setIsModalOpen(false)
      setSuccess('Exam saved.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save exam.')
    }
  }

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam and its marks?')) return
    try {
      await axios.delete(`${API_BASE_URL}/exams/${id}`)
      setExams((list) => list.filter((x) => x._id !== id))
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete.')
    }
  }

  const openMarks = async (exam) => {
    setMarksExam(exam)
    setMarksLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${API_BASE_URL}/exams/${exam._id}/marks`)
      setMarkRows(
        (data.rows || []).map((r) => ({
          ...r,
          obtainedMarks: r.obtainedMarks === '' || r.obtainedMarks == null ? '' : r.obtainedMarks
        }))
      )
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load marks sheet.')
      setMarksExam(null)
    } finally {
      setMarksLoading(false)
    }
  }

  const saveMarks = async () => {
    if (!marksExam) return
    setMarksSaving(true)
    setError('')
    try {
      const marks = markRows
        .filter((r) => r.obtainedMarks !== '' && r.obtainedMarks != null)
        .map((r) => ({ studentId: r.studentId, obtainedMarks: Number(r.obtainedMarks) }))
      if (marks.length === 0) {
        setError('Enter at least one student mark.')
        setMarksSaving(false)
        return
      }
      await axios.post(`${API_BASE_URL}/exams/${marksExam._id}/marks`, { marks })
      setSuccess(`Marks saved for ${marksExam.subject} (${marks.length} students).`)
      setMarksExam(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save marks.')
    } finally {
      setMarksSaving(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB')
  }

  return (
    <PageLayout
      title="Exams & Results"
      subtitle="Schedule exams and enter student marks per subject."
      action={
        <button type="button" onClick={() => openModal(null)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>
          <Plus size={16} /> Add Exam
        </button>
      }
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-100">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-emerald-700 bg-emerald-50 border border-emerald-100">
          {success}
          <button type="button" className="ml-2 underline" onClick={() => setSuccess('')}>Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        {loading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : exams.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">No exams yet. Add an exam (one row = one subject), then use <strong>Enter Marks</strong>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Exam Title</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Pass</th>
                  <th className="px-4 py-3">Exam Date</th>
                  <th className="px-4 py-3">Result Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam._id} className="border-t hover:bg-slate-50/50" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-4 py-3 font-semibold">{exam.name}</td>
                    <td className="px-4 py-3">{exam.classSectionId?.name || '—'}</td>
                    <td className="px-4 py-3">{exam.subject}</td>
                    <td className="px-4 py-3">{exam.maximumMarks}</td>
                    <td className="px-4 py-3">{exam.passMarks}</td>
                    <td className="px-4 py-3">{formatDate(exam.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(exam.endDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="Enter marks" onClick={() => openMarks(exam)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600">
                          <ClipboardList size={16} />
                        </button>
                        <button type="button" title="Edit" onClick={() => openModal(exam)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                          <Pencil size={16} />
                        </button>
                        <button type="button" title="Delete" onClick={() => deleteExam(exam._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash2 size={16} />
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

      <p className="mt-4 text-xs text-slate-500">
        Tip: Same exam title (e.g. “Mid-Term 2026”) + different subjects = multiple rows. Enter Marks on each subject, then Result Card / Reports will combine them by student roll number.
      </p>

      {/* Add/Edit Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={saveExam} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingExam ? 'Edit Exam' : 'Add New Exam'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Exam Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-Term Examination 2026" className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Class & Section</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200">
                  <option value="">Select Class</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Academic Year</label>
                <select value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Exam Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200">
                  <option>Term</option>
                  <option>Mid-Term</option>
                  <option>Final</option>
                  <option>Test</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Subject</label>
                <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Total Marks</label>
                  <input type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Passing Marks</label>
                  <input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Exam Date</label>
                  <input type="date" required value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Result Date</label>
                  <input type="date" value={form.resultDate} onChange={(e) => setForm({ ...form, resultDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 border-slate-200">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-bold bg-indigo-600">Save Exam</button>
            </div>
          </form>
        </div>
      )}

      {/* Enter Marks Modal */}
      {marksExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Enter Marks</h3>
            <p className="text-sm text-slate-500 mb-4">
              {marksExam.name} · <strong>{marksExam.subject}</strong> · Max {marksExam.maximumMarks}
            </p>
            {marksLoading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Loading students…</p>
            ) : markRows.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl">No students found in this class. Add students to this class first.</p>
            ) : (
              <div className="overflow-x-auto border rounded-xl" style={{ borderColor: '#e2e8f0' }}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Roll</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Obtained</th>
                      <th className="px-3 py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markRows.map((row, idx) => (
                      <tr key={row.studentId} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                        <td className="px-3 py-2 font-mono text-xs">{row.rollNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={marksExam.maximumMarks}
                            value={row.obtainedMarks}
                            onChange={(e) => {
                              const v = e.target.value
                              setMarkRows((list) => list.map((r, i) => (i === idx ? { ...r, obtainedMarks: v } : r)))
                            }}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-200"
                            placeholder="0"
                          />
                          <span className="text-xs text-slate-400 ml-1">/ {marksExam.maximumMarks}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{row.grade || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setMarksExam(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600">Cancel</button>
              <button type="button" disabled={marksSaving || markRows.length === 0} onClick={saveMarks} className="flex-1 py-2.5 rounded-xl text-white font-bold bg-indigo-600 disabled:opacity-50">
                {marksSaving ? 'Saving…' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
