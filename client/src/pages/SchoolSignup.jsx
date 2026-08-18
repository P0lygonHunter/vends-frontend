import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

const SchoolSignup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ schoolName: '', adminEmail: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    // Email Validation (International Standard)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      setError("Please enter a valid business email address.");
      return;
    }
    setError('');
    setStep(2); // Aglay pop-up/step par le jayein
  };

  const handleFinish = async () => {
    try {
      await axios.post(`${API_BASE_URL}/school/signup`, formData);
      alert("Registration Successful! Your 3-day trial has started.");
      navigate('/login');
    } catch (err) {
      setError("This email is already registered.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-2xl">
        {step === 1 ? (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Create School Account</h2>
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Real Google Email"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold"
                onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Set Secure Password"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button onClick={handleNext} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black">NEXT STEP</button>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Final Details</h2>
            <p className="text-slate-400 text-sm mb-6">Just one more step to launch your portal.</p>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Official School Name"
                className="w-full p-4 bg-slate-50 border-2 border-indigo-500 rounded-2xl outline-none font-bold"
                onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
              />
              <button onClick={handleFinish} className="w-full bg-green-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest">Start Free Trial</button>
              <button onClick={() => setStep(1)} className="w-full text-slate-400 font-bold text-sm">Go Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolSignup;