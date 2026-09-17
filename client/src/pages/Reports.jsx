import { useEffect, useState } from 'react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

export default function Reports() {
  const schoolId = localStorage.getItem('schoolId')
  const [reportType, setReportType] = useState('Student Report')
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [studentList, setStudentList] = useState([])

  useEffect(() => {
    if (!schoolId) return
    axios.get(`${API_BASE_URL}/classes/${schoolId}`).then((r) => setClasses(r.data || [])).catch(() => {})
  }, [schoolId])

  const generate = async () => {
    setError('')
    setReport(null)
    setStudentList([])
    setLoading(true)
    try {
      if (reportType === 'Student Report' || reportType === 'Result Report') {
        if (!rollNumber.trim()) {
          // class-wise list
          const { data } = await axios.get(`${API_BASE_URL}/students/${schoolId}`)
          let list = Array.isArray(data) ? data : []
          if (classId) list = list.filter((s) => String(s.classSectionId?._id || s.classSectionId) === String(classId))
          setStudentList(list)
          setReport({ mode: 'list', title: reportType })
        } else {
          const { data } = await axios.get(`${API_BASE_URL}/exams/${schoolId}/student-report`, {
            params: { rollNumber: rollNumber.trim() }
          })
          setReport({ mode: 'detail', ...data })
        }
      } else if (reportType === 'Attendance Report') {
        if (!rollNumber.trim()) {
          setError('Enter roll number for attendance ratio report (class bulk later).')
        } else {
          const { data } = await axios.get(`${API_BASE_URL}/exams/${schoolId}/student-report`, {
            params: { rollNumber: rollNumber.trim() }
          })
          setReport({ mode: 'detail', ...data })
        }
      } else if (reportType === 'Fee Collection Report') {
        const { data } = await axios.get(`${API_BASE_URL}/fees/${schoolId}`)
        let list = Array.isArray(data) ? data : []
        if (classId) list = list.filter((f) => String(f.classSectionId?._id || f.classSectionId) === String(classId))
        setStudentList(list)
        setReport({ mode: 'fees', title: 'Fee Collection Report' })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to generate report.')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (report?.mode === 'detail' && report.subjects) {
      const lines = [
        'Subject,Exam,Max,Obtained,%,Grade',
        ...report.subjects.map((s) => `"${s.subject}","${s.examName}",${s.maximumMarks},${s.obtainedMarks},${s.percentage},${s.grade}`)
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${report.student?.rollNumber || 'export'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (studentList.length) {
      const lines = report?.mode === 'fees'
        ? ['Student,Type,Month,Amount,Paid,Balance,Status', ...studentList.map((f) => `"${f.studentId?.name || ''}","${f.feeType}","${f.month}",${f.amount},${f.paid},${f.balance},${f.status}`)]
        : ['Roll,Name,Class,Phone,Status', ...studentList.map((s) => `"${s.rollNumber}","${s.name}","${s.classSectionId?.name || s.grade || ''}","${s.phone || ''}","${s.status}"`)]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'report-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <PageLayout
      title="Reports Center"
      subtitle="Generate, filter, print and export school records."
      action={
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="px-4 py-3 rounded-xl text-sm font-bold" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>Export CSV</button>
          <button type="button" onClick={() => window.print()} className="px-4 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>Download PDF</button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-100">{error}</div>
      )}

      <div className="bg-white rounded-2xl border p-5 mb-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <label className="text-xs font-bold">Report Type
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="mt-2 w-full px-3 py-3 rounded-xl border font-normal text-sm" style={{ borderColor: '#e2e8f0' }}>
              <option>Student Report</option>
              <option>Result Report</option>
              <option>Attendance Report</option>
              <option>Fee Collection Report</option>
            </select>
          </label>
          <label className="text-xs font-bold">Class & Section
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-2 w-full px-3 py-3 rounded-xl border font-normal text-sm" style={{ borderColor: '#e2e8f0' }}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">Roll Number
            <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 1042" className="mt-2 w-full px-3 py-3 rounded-xl border font-normal text-sm" style={{ borderColor: '#e2e8f0' }} />
          </label>
          <div className="md:col-span-2 flex items-end">
            <button type="button" disabled={loading} onClick={generate} className="w-full px-4 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#4f46e5' }}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Roll number dalo → us student ke <strong>saare subject marks + attendance ratio</strong> aayenge. Bina roll ke Student Report class list dikhata hai.
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-6 print:shadow-none" style={{ borderColor: '#e2e8f0' }} id="report-print-area">
        {!report && (
          <div className="text-sm p-4 rounded-xl" style={{ background: '#f8fafc', color: '#475569' }}>
            Choose a report type and filters, then generate a printable school report.
          </div>
        )}

        {report?.mode === 'detail' && (
          <>
            <div className="flex items-center justify-between border-b pb-5 mb-4">
              <div>
                <div className="font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>{report.schoolName || 'School'}</div>
                <div className="text-sm text-slate-500 mt-1">{report.student?.academicYear || ''}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{reportType}</div>
                <div className="text-xs text-slate-400">Roll: {report.student?.rollNumber}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
              <div><span className="text-slate-500">Student:</span> <strong>{report.student?.name}</strong></div>
              <div><span className="text-slate-500">Class:</span> <strong>{report.student?.className || '—'}</strong></div>
              <div><span className="text-slate-500">Phone:</span> {report.student?.phone || '—'}</div>
              <div>
                <span className="text-slate-500">Attendance:</span>{' '}
                <strong style={{ color: report.attendance?.rate != null && report.attendance.rate < 75 ? '#dc2626' : '#059669' }}>
                  {report.attendance?.rate != null ? `${report.attendance.rate}%` : 'No records'}
                </strong>
                {report.attendance?.totalDays != null && (
                  <span className="text-xs text-slate-400 ml-2">({report.attendance.present}/{report.attendance.totalDays} days)</span>
                )}
              </div>
            </div>

            {report.subjects?.length > 0 ? (
              <>
                <table className="w-full text-sm mb-4">
                  <thead className="bg-slate-900 text-white text-left text-xs">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Exam</th>
                      <th className="px-3 py-2">Max</th>
                      <th className="px-3 py-2">Obtained</th>
                      <th className="px-3 py-2">%</th>
                      <th className="px-3 py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.subjects.map((s, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: '#f1f5f9' }}>
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{s.subject}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{s.examName}</td>
                        <td className="px-3 py-2">{s.maximumMarks}</td>
                        <td className="px-3 py-2">{s.obtainedMarks}</td>
                        <td className="px-3 py-2">{s.percentage}</td>
                        <td className="px-3 py-2 font-bold">{s.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-4 text-sm p-4 rounded-xl bg-slate-50">
                  <div>Total: <strong>{report.totals?.totalObtained}/{report.totals?.totalMax}</strong></div>
                  <div>Percentage: <strong>{report.totals?.overallPercentage}%</strong></div>
                  <div>Overall Grade: <strong>{report.totals?.overallGrade}</strong></div>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl">No subject marks found. Enter marks from Exams & Results → Enter Marks.</p>
            )}
          </>
        )}

        {report?.mode === 'list' && (
          <>
            <div className="font-bold mb-3">{studentList.length} students in this report</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((s) => (
                  <tr key={s._id} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-3 py-2 font-mono text-xs">{s.rollNumber}</td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2">{s.classSectionId?.name || s.grade || '—'}</td>
                    <td className="px-3 py-2">{s.phone || '—'}</td>
                    <td className="px-3 py-2">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {report?.mode === 'fees' && (
          <>
            <div className="font-bold mb-3">{studentList.length} fee records</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((f) => (
                  <tr key={f._id} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-3 py-2">{f.studentId?.name || '—'}</td>
                    <td className="px-3 py-2">{f.feeType}</td>
                    <td className="px-3 py-2">{f.month}</td>
                    <td className="px-3 py-2">{f.amount}</td>
                    <td className="px-3 py-2">{f.paid}</td>
                    <td className="px-3 py-2">{f.balance}</td>
                    <td className="px-3 py-2">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </PageLayout>
  )
}
