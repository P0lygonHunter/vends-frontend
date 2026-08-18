import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldOff, Trash2, Calendar, Users } from 'lucide-react';
import API_BASE_URL from '../config/api';

const ManageSchools = () => {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/admin/schools`);
        setSchools(res.data);
      } catch (err) {
        console.error("Fetch error");
      }
    };
    fetchSchools();
  }, []);

  const updateLimit = async (id, newLimit) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/update-limit/${id}`, { limit: newLimit });
      setSchools(schools.map(s => s._id === id ? { ...s, studentLimit: newLimit } : s));
    } catch (err) { alert("Error updating limit"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-slate-800 mb-10 tracking-tight">Super Admin Control page</h1>

        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-xs tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">School Info</th>
                <th className="px-8 py-5 text-center">Student Limit</th>
                <th className="px-8 py-5 text-center">Trial/Plan Expiry</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((school) => (
                <tr key={school._id} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-800 text-lg">{school.schoolName}</p>
                    <p className="text-slate-400 text-sm font-bold">{school.adminEmail}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-black text-sm">
                        {school.studentLimit} Students
                      </span>
                      <input 
                        type="number" 
                        placeholder="Set New"
                        className="w-20 text-xs p-1 border rounded text-center outline-none focus:border-indigo-500"
                        onBlur={(e) => updateLimit(school._id, e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                       <span className={`font-bold flex items-center gap-1 ${new Date(school.expiryDate) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                        <Calendar size={14}/> {new Date(school.expiryDate).toLocaleDateString()}
                       </span>
                       {new Date(school.expiryDate) < new Date() && <span className="text-[10px] text-red-400 font-black uppercase">Expired</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center gap-3">
                      <button className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${school.isBlocked ? 'bg-green-500 text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}>
                        {school.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageSchools;