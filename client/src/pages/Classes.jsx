import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import API_BASE_URL from '../config/api';

const PREDEFINED_GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Matric (Pre-9th)', 'Matric (9th)', 'Matric (10th)',
  'FSc Pre-Medical (11th)', 'FSc Pre-Medical (12th)',
  'FSc Pre-Engineering (11th)', 'FSc Pre-Engineering (12th)',
  'ICS (11th)', 'ICS (12th)',
  'ICom (11th)', 'ICom (12th)',
  'FA (11th)', 'FA (12th)',
  'FA-IT (11th)', 'FA-IT (12th)',
  'Commerce (11th)', 'Commerce (12th)',
  'Arts (11th)', 'Arts (12th)'
];

const blankForm = {
  gradeName: '',
  section: 'A',
  room: '',
  academicYearId: '',
  capacity: 40,
  status: 'Active'
};

export default function Classes() {
  const schoolId = localStorage.getItem('schoolId');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(blankForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, yearRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
      ]);

      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      const loadedYears = Array.isArray(yearRes.data) ? yearRes.data : [];
      setYears(loadedYears);

      const currentYear = loadedYears.find((y) => y.isCurrent)?._id || loadedYears[0]?._id || '';
      setForm((prev) => ({ ...prev, academicYearId: currentYear }));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load classes data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const openModal = (item = null) => {
    setError('');
    if (item) {
      setEditingClass(item);
      // Agar purani name string ho (e.g. "Grade 1 - Section A") to divide kar lein
      const nameParts = item.name ? item.name.split(' - Section ') : ['', ''];
      setForm({
        gradeName: item.gradeName || nameParts[0] || item.name || '',
        section: item.section || nameParts[1] || 'A',
        room: item.room || '',
        academicYearId: item.academicYearId?._id || item.academicYearId || '',
        capacity: item.capacity || 40,
        status: item.status || 'Active'
      });
    } else {
      setEditingClass(null);
      const currentYear = years.find((y) => y.isCurrent)?._id || years[0]?._id || '';
      setForm({ ...blankForm, academicYearId: currentYear });
    }
    setIsModalOpen(true);
  };

  const saveClass = async (e) => {
    e.preventDefault();
    try {
      const classNameCombined = `${form.gradeName} - Section ${form.section}`;
      const payload = {
        ...form,
        name: classNameCombined,
        schoolId
      };

      if (editingClass) {
        const res = await axios.patch(`${API_BASE_URL}/classes/${editingClass._id}`, payload);
        setClasses((prev) => prev.map((c) => (c._id === editingClass._id ? res.data?.class || res.data : c)));
      } else {
        const res = await axios.post(`${API_BASE_URL}/classes`, payload);
        setClasses((prev) => [res.data?.class || res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save class.');
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/classes/${id}`);
      setClasses((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete class.');
    }
  };

  return (
    <PageLayout
      title="Classes & Sections"
      subtitle="Manage class structure and section assignments."
      action={
        <button
          type="button"
          onClick={() => openModal(null)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold cursor-pointer"
          style={{ background: '#4f46e5' }}
        >
          <Plus size={17} /> Add Class & Section
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-sm" style={{ color: '#64748b' }}>Total Classes & Sections</div>
          <div className="font-bold text-2xl mt-3">{classes.length}</div>
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-sm" style={{ color: '#64748b' }}>Active Sections</div>
          <div className="font-bold text-2xl mt-3">{classes.filter((c) => c.status === 'Active').length}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#e2e8f0' }}>
        {error && <div className="m-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}

        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading classes...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Class & Section', 'Room No', 'Academic Year', 'Capacity', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>No classes added yet.</td></tr>
              ) : (
                classes.map((item) => (
                  <tr key={item._id}>
                    <td className="px-5 py-4 text-sm font-bold">{item.name || `${item.gradeName} (${item.section})`}</td>
                    <td className="px-5 py-4 text-sm font-mono">{item.room || '-'}</td>
                    <td className="px-5 py-4 text-sm">{item.academicYearId?.name || '2026-27'}</td>
                    <td className="px-5 py-4 text-sm">{item.capacity || 40}</td>
                    <td className="px-5 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: item.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: item.status === 'Active' ? '#059669' : '#64748b' }}>
                        {item.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openModal(item)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => deleteClass(item._id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <form onSubmit={saveClass} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-xl">{editingClass ? 'Edit Class & Section' : 'Add Class & Section'}</h3>

            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Select Class / Grade</label>
              <select
                required
                value={form.gradeName}
                onChange={(e) => setForm({ ...form, gradeName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 bg-white"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="">Select Grade</option>
                {PREDEFINED_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Section</label>
                <input
                  required
                  placeholder="e.g. A"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Room No</label>
                <input
                  placeholder="e.g. Room A-101"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Academic Year</label>
              <select
                required
                value={form.academicYearId}
                onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 bg-white"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="">Select Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#64748b' }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-600 bg-white"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 cursor-pointer" style={{ borderColor: '#e2e8f0' }}>Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-bold cursor-pointer" style={{ background: '#4f46e5' }}>Save Class</button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}