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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classResponse, yearResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/classes/${schoolId}`),
        axios.get(`${API_BASE_URL}/academic-years/${schoolId}`)
      ]);
      setClasses(classResponse.data);
      setYears(yearResponse.data);
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

  const openForm = (item) => {
    setEditing(item || null);
    setForm(item ? { 
      name: item.name, 
      room: item.room, 
      capacity: item.capacity, 
      status: item.status, 
      academicYearId: item.academicYearId?._id || item.academicYearId 
    } : { 
      ...blank, 
      academicYearId: years.find(year => year.isCurrent)?._id || years[0]?._id || ''
    });
    setError('');
  };

  const saveClass = async (event) => {
    event.preventDefault();
    try {
      const response = editing ? 
        await axios.patch(`${API_BASE_URL}/classes/${editing._id}`, form) : 
        await axios.post(`${API_BASE_URL}/classes`, { ...form, schoolId });
      setClasses(current => 
        editing ? 
          current.map(item => item._id === editing._id ? response.data : item) : 
          [response.data, ...current]
      );
      setEditing(null);
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save class.');
    }
  };

  const deleteClass = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/classes/${id}`);
      setClasses(current => current.filter(item => item._id !== id));
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
          onClick={() => openForm(null)} 
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" 
          style={{ background: '#4f46e5' }}
        >
          <Plus size={17} /> Add Class & Section
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[['Classes', classes.length], ['Active Classes', classes.filter(item => item.status === 'Active').length], ['Academic Years', years.length]].map(([label, value]) => (
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
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading classes...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Class & Section', 'Academic Year', 'Room', 'Capacity', 'Status', 'Actions'].map(label => (
                  <th key={label} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(item => (
                <tr key={item._id}>
                  <td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>{item.name}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{item.academicYearId?.name || 'Unknown year'}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{item.room || '-'}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{item.capacity}</td>
                  <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#ecfdf5', color: '#059669' }}>{item.status}</span>
                  </td>
                  <td className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openForm(item)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center" 
                        style={{ background: '#f1f5f9' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        onClick={() => deleteClass(item._id)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center" 
                        style={{ background: '#fff1f2', color: '#e11d48' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <form onSubmit={saveClass} className="bg-white rounded-2xl p-7 w-full max-w-lg">
            <h3 className="font-bold text-xl mb-6">
              {editing ? 'Edit Class & Section' : 'Add Class & Section'}
            </h3>
            <div className="grid gap-4">
              <input 
                required 
                placeholder="Class 1-A" 
                value={form.name} 
                onChange={event => setForm({ ...form, name: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              />
              <select 
                required 
                value={form.academicYearId} 
                onChange={event => setForm({ ...form, academicYearId: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="">Select academic year</option>
                {years.map(year => (
                  <option key={year._id} value={year._id}>{year.name}</option>
                ))}
              </select>
              <input 
                placeholder="Room A-101" 
                value={form.room} 
                onChange={event => setForm({ ...form, room: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              />
              <input 
                required 
                type="number" 
                min="1" 
                placeholder="40" 
                value={form.capacity} 
                onChange={event => setForm({ ...form, capacity: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              />
              <select 
                value={form.status} 
                onChange={event => setForm({ ...form, status: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setEditing(null)} 
                className="flex-1 py-3 rounded-xl" 
                style={{ border: '1px solid #e2e8f0' }}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-3 rounded-xl text-white font-bold" 
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