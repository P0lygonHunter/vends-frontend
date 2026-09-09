import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import API_BASE_URL from '../config/api';

const blank = { name: '', description: '', status: 'Active' };

export default function Subjects() {
  const schoolId = localStorage.getItem('schoolId');
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/subjects/${schoolId}`);
      setSubjects(response.data);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Unable to load subjects.');
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
      description: item.description, 
      status: item.status 
    } : { 
      ...blank 
    });
    setError('');
  };

  const saveSubject = async (event) => {
    event.preventDefault();
    try {
      const response = editing ? 
        await axios.patch(`${API_BASE_URL}/subjects/${editing._id}`, form) : 
        await axios.post(`${API_BASE_URL}/subjects`, { ...form, schoolId });
      setSubjects(current => 
        editing ? 
          current.map(item => item._id === editing._id ? response.data : item) : 
          [response.data, ...current]
      );
      setEditing(null);
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Unable to save subject.');
    }
  };

  const deleteSubject = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/subjects/${id}`);
      setSubjects(current => current.filter(item => item._id !== id));
    } catch (deleteError) {
      setError(deleteError.response?.data?.error || 'Unable to delete subject.');
    }
  };

  return (
    <PageLayout
      title="Subjects"
      subtitle="Manage subjects offered by the school."
      action={
        <button 
          onClick={() => openForm(null)} 
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold" 
          style={{ background: '#4f46e5' }}
        >
          <Plus size={17} /> Add Subject
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[['Subjects', subjects.length], ['Active Subjects', subjects.filter(item => item.status === 'Active').length]].map(([label, value]) => (
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
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading subjects...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Subject', 'Description', 'Status', 'Actions'].map(label => (
                  <th key={label} className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map(item => (
                <tr key={item._id}>
                  <td className="px-5 py-4 text-sm font-bold" style={{ borderTop: '1px solid #f1f5f9' }}>{item.name}</td>
                  <td className="px-5 py-4 text-sm" style={{ borderTop: '1px solid #f1f5f9' }}>{item.description || '-'}</td>
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
                        onClick={() => deleteSubject(item._id)} 
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
          <form onSubmit={saveSubject} className="bg-white rounded-2xl p-7 w-full max-w-lg">
            <h3 className="font-bold text-xl mb-6">
              {editing?._id ? 'Edit Subject' : 'Add Subject'}
            </h3>
            <div className="grid gap-4">
              <input 
                required 
                placeholder="Mathematics" 
                value={form.name} 
                onChange={event => setForm({ ...form, name: event.target.value })} 
                className="px-3 py-3 rounded-xl border-2" 
                style={{ borderColor: '#e2e8f0' }}
              />
              <textarea
                placeholder="Enter subject description"
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                className="px-3 py-3 rounded-xl border-2"
                style={{ borderColor: '#e2e8f0' }}
              />
              <select
                value={form.status}
                onChange={event => setForm({ ...form, status: event.target.value })}
                className="px-3 py-3 rounded-xl border-2"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#4f46e5' }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}