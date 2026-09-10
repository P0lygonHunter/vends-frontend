import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import API_BASE_URL from '../config/api';

const blank = { name: '', room: '', capacity: 40, status: 'Active', academicYearId: '' };

export default function Classes() {
  const schoolId = localStorage.getItem('schoolId');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classResponse, yearResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
      ]);
      setClasses(Array.isArray(classResponse.data) ? classResponse.data : []);
      setYears(Array.isArray(yearResponse.data) ? yearResponse.data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Unable to load classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadData();
    } else {
      setError('School information not found. Please login again.');
      setLoading(false);
    }
  }, [schoolId]);

  const openForm = (item = null) => {
    setError('');
    if (item) {
      setEditing(item);
      setForm({
        name: item.name || '',
        room: item.room || '',
        capacity: item.capacity || 40,
        status: item.status || 'Active',
        academicYearId: item.academicYearId?._id || item.academicYearId || ''
      });
    } else {
      setEditing({ _isNew: true });
      const defaultYearId = years.find((year) => year.isCurrent)?._id || years[0]?._id || '';
      setForm({ ...blank, academicYearId: defaultYearId });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditing(null);
    setForm({ ...blank });
    setError('');
  };

  const saveClass = async (event) => {
    event.preventDefault();
    try {
      const isEditMode = editing && !editing._isNew;

      const response = isEditMode
        ? await axios.patch(`${API_BASE_URL}/classes/${editing._id}`, form)
        : await axios.post(`${API_BASE_URL}/classes`, { ...form, schoolId });

      const savedData = response.data?.class || response.data;

      setClasses((current) =>
        isEditMode
          ? current.map((item) => (item._id === editing._id ? savedData : item))
          : [savedData, ...current]
      );

      closeForm();
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save class.');
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/classes/${id}`);
      setClasses((current) => current.filter((item) => item._id !== id));
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Unable to delete class.');
    }
  };

  return (
    <PageLayout
      title="Classes & Sections"
      subtitle="Manage class offerings, rooms, capacity and academic-year assignments."
      action={
        <button
          type="button"
          onClick={() => openForm(null)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold cursor-pointer"
          style={{ background: '#4f46e5' }}
        >
          <Plus size={17} /> Add Class & Section
        </button>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          ['Classes', classes.length],
          ['Active Classes', classes.filter((item) => item.status === 'Active').length],
          ['Academic Years', years.length]
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-sm" style={{ color: '#64748b' }}>{label}</div>
            <div className="font-bold text-2xl mt-3">{value}</div>
            <div className="text-xs mt-1" style={{ color: '#10b981' }}>Live database total</div>
          </div>
        ))}
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#e2e8f0' }}>
        {error && !isOpen && (
          <div className="m-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading classes...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Class & Section', 'Academic Year', 'Room', 'Capacity', 'Status', 'Actions'].map((label) => (
                  <th key={label} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>
                    No classes found.
                  </td>
                </tr>
              ) : (
                classes.map((item) => (
                  <tr key={item._id}>
                    <td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>
                      {item.academicYearId?.name || 'Unknown year'}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>
                      {item.room || '-'}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>
                      {item.capacity}
                    </td>
                    <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={
                          item.status === 'Active'
                            ? { background: '#ecfdf5', color: '#059669' }
                            : { background: '#f1f5f9', color: '#64748b' }
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openForm(item)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: '#f1f5f9' }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClass(item._id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: '#fff1f2', color: '#e11d48' }}
                        >
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

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <form onSubmit={saveClass} className="bg-white rounded-2xl p-7 w-full max-w-lg shadow-xl">
            <h3 className="font-bold text-xl mb-6">
              {editing && !editing._isNew ? 'Edit Class & Section' : 'Add Class & Section'}
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase" style={{ color: '#64748b' }}>Class & Section Name</label>
                <input
                  required
                  placeholder="e.g. Class 1-A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border-2 outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase" style={{ color: '#64748b' }}>Academic Year</label>
                <select
                  required
                  value={form.academicYearId}
                  onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border-2 outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="">Select academic year</option>
                  {years.map((year) => (
                    <option key={year._id} value={year._id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase" style={{ color: '#64748b' }}>Room</label>
                <input
                  placeholder="e.g. Room A-101"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border-2 outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase" style={{ color: '#64748b' }}>Capacity</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="40"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border-2 outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase" style={{ color: '#64748b' }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border-2 outline-none focus:border-indigo-600"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer"
                style={{ border: '1px solid #e2e8f0', color: '#64748b' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer"
                style={{ background: '#4f46e5' }}
              >
                Save Class
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}