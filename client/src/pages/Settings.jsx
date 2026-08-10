import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'

export default function Settings() {
  const [form, setForm] = useState({
    schoolName: localStorage.getItem('schoolName') || '',
    principalName: localStorage.getItem('principalName') || '',
    phone: localStorage.getItem('phone') || '',
    email: localStorage.getItem('email') || '',
    city: localStorage.getItem('city') || '',
    address: localStorage.getItem('address') || '',
  })

  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSave = async () => {
    setSaved(false)
    setError('')

    const schoolId = localStorage.getItem('schoolId')

    if (!schoolId) {
      setError('School information not found. Please login again.')
      return
    }

    try {
      setSaving(true)

      const res = await axios.patch(
        `http://localhost:5000/api/school/update/${schoolId}`,
        form
      )

      const school = res.data.school

      localStorage.setItem('schoolName', school.schoolName)
      localStorage.setItem('principalName', school.principalName)
      localStorage.setItem('phone', school.phone)
      localStorage.setItem('email', school.adminEmail)
      localStorage.setItem('city', school.city)
      localStorage.setItem('address', school.address)

      setForm({
        schoolName: school.schoolName || '',
        principalName: school.principalName || '',
        phone: school.phone || '',
        email: school.adminEmail || '',
        city: school.city || '',
        address: school.address || '',
      })

      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Something went wrong. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={form.schoolName} />

      <div style={{marginLeft:'260px', flex:1}}>
        {/* Topbar */}
        <div className="flex items-center gap-4 px-8 bg-white"
          style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>School Settings</h2>

          <TrialBadge />
        </div>

        <div className="p-8 max-w-2xl">
          {saved && (
            <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
              style={{background:'#1e1b4b', boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
              ✅ Settings saved successfully!
            </div>
          )}

          {error && (
            <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
              style={{
                background:'#fef2f2',
                color:'#dc2626',
                border:'1px solid #fecaca',
                boxShadow:'0 8px 32px rgba(0,0,0,0.1)'
              }}>
              ❌ {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border p-8" style={{borderColor:'#e2e8f0'}}>
            <h3 className="font-bold text-lg mb-6" style={{fontFamily:'Syne,sans-serif'}}>
              🏫 School Information
            </h3>

            <div className="grid grid-cols-2 gap-5">
              {[
                {label:'School Name', name:'schoolName', placeholder:'Al-Noor Public School'},
                {label:'Principal Name', name:'principalName', placeholder:'Mr. Ahmed Khan'},
                {label:'Phone Number', name:'phone', placeholder:'+92-300-0000000'},
                {label:'Official Email', name:'email', placeholder:'principal@school.pk'},
                {label:'City', name:'city', placeholder:'Karachi'},
              ].map(f => (
                <div key={f.name} className={f.name === 'schoolName' ? 'col-span-2' : ''}>
                  <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>
                    {f.label}
                  </label>

                  <input
                    name={f.name}
                    value={form[f.name]}
                    onChange={handle}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                    style={{borderColor:'#e2e8f0'}}
                  />
                </div>
              ))}

              <div className="col-span-2">
                <label className="text-xs font-semibold mb-1 block" style={{color:'#475569'}}>
                  Address
                </label>

                <input
                  name="address"
                  value={form.address}
                  onChange={handle}
                  placeholder="Block 5, Gulshan-e-Iqbal, Karachi"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                  style={{borderColor:'#e2e8f0'}}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 px-8 py-3 rounded-xl text-white font-bold text-sm"
              style={{
                background: saving ? '#818cf8' : '#4f46e5',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}