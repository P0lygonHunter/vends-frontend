import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import API_BASE_URL from '../config/api';

const blankForm = {
  title: '',
  classId: '',
  subject: '',
  totalMarks: 100,
  passingMarks: 33,
  examDate: '',
  resultDate: ''
};

export default function ExamsResults() {
  const schoolId = localStorage.getItem('schoolId');
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(blankForm);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [classRes, examRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/exams/${schoolId}`)
      ]);

      if (classRes.status === 'fulfilled') {
        setClasses(Array.isArray(classRes.value.data) ? classRes.value.data : []);
      }
      if (examRes.status === 'fulfilled') {
        setExams(Array.isArray(examRes.value.data) ? examRes.value.data : []);
      }
    } catch (err) {
      setError('Error loading data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const openModal = (exam = null) => {
    setError('');
    if (exam) {
      setEditingExam(exam);
      setForm({
        title: exam.title || '',
        classId: exam.classId?._id || exam.classId || exam.class?._id || exam.class || '',
        subject: exam.subject || '',
        totalMarks: exam.totalMarks || 100,
        passingMarks: exam.passingMarks || 33,
        examDate: exam.examDate ? exam.examDate.split('T')[0] : '',
        resultDate: exam.resultDate ? exam.resultDate.split('T')[0] : ''
      });
    } else {
      setEditingExam(null);
      setForm(blankForm);
    }
    setIsModalOpen(true);
  };

 const saveExam = async (e) => {
  e.preventDefault();
  try {
    setError('');

    const selectedClassObj = classes.find(
      (c) => c._id === form.classId || String(c._id) === String(form.classId)
    );

    const academicYear =
      localStorage.getItem('academicYearId') ||
      selectedClassObj?.academicYear?._id ||
      selectedClassObj?.academicYear ||
      localStorage.getItem('academicYear');

    const payload = {
      title: form.title,
      subject: form.subject,
      class: form.classId,
      classId: form.classId,
      academicYear: academicYear,
      academicYearId: academicYear,
      totalMarks: Number(form.totalMarks),
      passingMarks: Number(form.passingMarks),
      examDate: form.examDate,
      resultDate: form.resultDate || null,
      school: schoolId,
      schoolId: schoolId
    };

    if (editingExam) {
      const res = await axios.patch(`${API_BASE_URL}/exams/${editingExam._id}`, payload);
      setExams((prev) => prev.map((item) => (item._id === editingExam._id ? res.data : item)));
    } else {
      const res = await axios.post(`${API_BASE_URL}/exams`, payload);
      setExams((prev) => [res.data, ...prev]);
    }
    setIsModalOpen(false);
  } catch (err) {
    const serverMsg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'Failed to save exam to database.';
    setError(serverMsg);
  }
};

  const deleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/exams/${id}`);
      setExams((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError('Failed to delete exam from server.');
    }
  };

  return (
    <PageLayout
      title="Exams & Results"
      subtitle="Schedule exams and manage student marks dynamically."
      action={
        <button
          type="button"
          onClick={() => openModal(null)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold cursor-pointer"
          style={{ background: '#4f46e5' }}
        >
          <Plus size={17} /> Add Exam
        </button>
      }
    >
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#e2e8f0' }}>
        {error && <div className="m-4 p-3 rounded-xl text-sm bg-red-50 text-red-600 font-semibold">{error}</div>}

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading exams from server...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Exam Title', 'Class & Section', 'Subject', 'Total Marks', 'Passing Marks', 'Exam Date', 'Result Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-sm text-slate-400">No exams created yet.</td></tr>
              ) : (
                exams.map((item) => (
                  <tr key={item._id} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-5 py-4 text-sm font-bold">{item.title}</td>
                    <td className="px-5 py-4 text-sm">
                      {item.classId?.name || classes.find((c) => c._id === (item.classId?._id || item.classId))?.name || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-sm">{item.subject}</td>
                    <td className="px-5 py-4 text-sm">{item.totalMarks}</td>
                    <td className="px-5 py-4 text-sm">{item.passingMarks}</td>
                    <td className="px-5 py-4 text-sm">{item.examDate ? new Date(item.examDate).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-4 text-sm">{item.resultDate ? new Date(item.resultDate).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openModal(item)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => deleteExam(item._id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <form onSubmit={saveExam} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-xl">{editingExam ? 'Edit Exam' : 'Add New Exam'}</h3>

            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Exam Title</label>
              <input
                required
                placeholder="e.g. Mid-Term Examination 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Target Class & Section</label>
              <select
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 bg-white border-slate-200"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name || `${cls.gradeName} - Section ${cls.section}`} {cls.room ? `(${cls.room})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Subject</label>
              <input
                required
                placeholder="e.g. Mathematics"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Total Marks</label>
                <input
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Passing Marks</label>
                <input
                  type="number"
                  value={form.passingMarks}
                  onChange={(e) => setForm({ ...form, passingMarks: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Exam Date</label>
                <input
                  type="date"
                  required
                  value={form.examDate}
                  onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Result Date</label>
                <input
                  type="date"
                  value={form.resultDate}
                  onChange={(e) => setForm({ ...form, resultDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 border-slate-200 cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-bold bg-indigo-600 cursor-pointer">Save Exam</button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}