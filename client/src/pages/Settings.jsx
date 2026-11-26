import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function Settings() {
  const schoolId = localStorage.getItem('schoolId')
  const [adminLinkCopied, setAdminLinkCopied] = useState(false)
  const adminPortalLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?admin=1`
      : '/?admin=1'
  const copyAdminLink = () => {
    navigator.clipboard.writeText(adminPortalLink).then(() => {
      setAdminLinkCopied(true)
      setTimeout(() => setAdminLinkCopied(false), 2000)
    })
  }


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

  // ══════════════════════════════════
  // PASSWORD STATES
  // ══════════════════════════════════

  const [currentPassword, setCurrentPassword] = useState('')
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [newLoginEmail, setNewLoginEmail] = useState('')
  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // ══════════════════════════════════
  // SCHOOL INFORMATION
  // ══════════════════════════════════

  const handle = (e) => {
    const { name, value } = e.target

    setForm(prev => ({
      ...prev,
      [name]: value
    }))
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
        `${API_BASE_URL}/school/update/${schoolId}`,
        form
      )

      const school = res.data.school

      localStorage.setItem('schoolName', school.schoolName || '')
      localStorage.setItem('principalName', school.principalName || '')
      localStorage.setItem('phone', school.phone || '')
      localStorage.setItem('email', school.adminEmail || '')
      setNewLoginEmail(school.adminEmail || '')
      localStorage.setItem('city', school.city || '')
      localStorage.setItem('address', school.address || '')

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

  // ══════════════════════════════════
  // CHANGE PASSWORD
  // ══════════════════════════════════

  const handlePasswordChange = async () => {
    setPasswordSaved(false)
    setPasswordError('')

    if (!schoolId) {
      setPasswordError(
        'School information not found. Please login again.'
      )
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError(
        'New password must be at least 6 characters long.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        'New password and confirm password do not match.'
      )
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        'New password must be different from current password.'
      )
      return
    }

    try {
      setPasswordSaving(true)

      await axios.patch(
        `${API_BASE_URL}/school/change-password/${schoolId}`,
        {
          currentPassword,
          newPassword
        }
      )

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setPasswordSaved(true)

      setTimeout(() => {
        setPasswordSaved(false)
      }, 3000)

    } catch (err) {
      setPasswordError(
        err.response?.data?.error ||
        'Unable to change password. Please try again.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleEmailChange = async () => {
    setEmailError('')
    setEmailSaved(false)
    if (!newLoginEmail || !emailChangePassword) {
      setEmailError('New email and current password are required.')
      return
    }
    try {
      setEmailSaving(true)
      const res = await axios.patch(`${API_BASE_URL}/school/change-email`, {
        newEmail: newLoginEmail,
        currentPassword: emailChangePassword,
      })
      if (res.data.school) {
        localStorage.setItem('email', res.data.school.adminEmail || newLoginEmail)
        setForm((f) => ({ ...f, email: res.data.school.adminEmail || newLoginEmail }))
        setNewLoginEmail(res.data.school.adminEmail || newLoginEmail)
      }
      setEmailChangePassword('')
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 3000)
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Unable to update email.')
    } finally {
      setEmailSaving(false)
    }
  }


  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#f8fafc' }}
    >
      <Sidebar schoolName={form.schoolName} />

      <div
        className="app-main"
        style={{
          flex: 1
        }}
      >

        {/* ══════════════════════════════════
            TOPBAR
        ══════════════════════════════════ */}

        <div
          className="flex items-center gap-4 px-8 bg-white"
          style={{
            height: '68px',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 50
          }}
        >
          <h2
            className="flex-1 font-bold text-xl"
            style={{ fontFamily: 'Syne,sans-serif' }}
          >
            School Settings
          </h2>

          <div className="flex items-center gap-2 flex-wrap justify-end"><PromoOfferBar /><TrialBadge /></div>
        </div>

        {/* ══════════════════════════════════
            CONTENT
        ══════════════════════════════════ */}

        <div className="p-8 max-w-3xl">

          {/* SUCCESS MESSAGE */}

          {saved && (
            <div
              className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
              style={{
                background: '#0c4a6e',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
            >
              <span>✓</span>
              Settings saved successfully!
            </div>
          )}

          {/* SCHOOL ERROR */}

          {error && (
            <div
              className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
            >
              <span>×</span>
              {error}
            </div>
          )}

          {/* PASSWORD SUCCESS */}

          {passwordSaved && (
            <div
              className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
              style={{
                background: '#065f46',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
            >
              <span>✓</span>
              Password changed successfully!
            </div>
          )}

          {/* ══════════════════════════════════
              SCHOOL INFORMATION
          ══════════════════════════════════ */}

          <div
            className="bg-white rounded-2xl border p-8"
            style={{ borderColor: '#e2e8f0' }}
          >
            <h3
              className="font-bold text-lg mb-2"
              style={{ fontFamily: 'Syne,sans-serif' }}
            >
              🏫 School Information
            </h3>

            <p
              className="text-sm mb-6"
              style={{ color: '#64748b' }}
            >
              Manage your school's basic information.
            </p>

            <div className="grid grid-cols-2 gap-5">

              {/* SCHOOL NAME */}

              <div className="col-span-2">
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  School Name
                </label>

                <input
                  name="schoolName"
                  value={form.schoolName}
                  onChange={handle}
                  placeholder="Al-Noor Public School"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {/* PRINCIPAL */}

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  Principal Name
                </label>

                <input
                  name="principalName"
                  value={form.principalName}
                  onChange={handle}
                  placeholder="Mr. Ahmed Khan"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {/* PHONE */}

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  Phone Number
                </label>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handle}
                  placeholder="+92-300-0000000"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {/* EMAIL */}

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  Official Email
                </label>

                <input
                  name="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="principal@school.pk"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {/* CITY */}

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  City
                </label>

                <input
                  name="city"
                  value={form.city}
                  onChange={handle}
                  placeholder="Karachi"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {/* ADDRESS */}

              <div className="col-span-2">
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: '#475569' }}
                >
                  Address
                </label>

                <input
                  name="address"
                  value={form.address}
                  onChange={handle}
                  placeholder="Block 5, Gulshan-e-Iqbal, Karachi"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all"
              style={{
                background: saving ? '#38bdf8' : '#0284c7',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes ✓'}
            </button>
          </div>

          {/* ══════════════════════════════════
              CHANGE PASSWORD
          ══════════════════════════════════ */}

          
          

          {/* ══════════════════════════════════
              SCHOOL ADMIN LOGIN LINK (private)
          ══════════════════════════════════ */}
          <div
            className="bg-white rounded-2xl border p-8 mb-6"
            style={{ borderColor: '#e2e8f0' }}
          >
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>
              School admin login link
            </h3>
            <p className="text-sm mb-3" style={{ color: '#64748b' }}>
              Private link for school staff email login. Do not post this on parent notices or teacher groups.
            </p>
            <p className="text-xs font-mono break-all mb-3" style={{ color: '#0284c7' }}>{adminPortalLink}</p>
            <button
              type="button"
              onClick={copyAdminLink}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: adminLinkCopied ? '#059669' : '#0284c7' }}
            >
              {adminLinkCopied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>

{/* ACCOUNT LOGIN EMAIL */}
          <div
            className="bg-white rounded-2xl border p-7 mb-7"
            style={{ borderColor: '#e2e8f0' }}
          >
            <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Syne,sans-serif' }}>
              Account Login Email
            </h3>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>
              Current login email: <strong>{form.email || '—'}</strong>. Changing this updates the email you use to sign in.
            </p>
            {emailError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {emailError}
              </div>
            )}
            {emailSaved && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                Email updated successfully.
              </div>
            )}
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>New login email</label>
                <input
                  type="email"
                  value={newLoginEmail}
                  onChange={(e) => setNewLoginEmail(e.target.value)}
                  placeholder="new@school.pk"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Current password (confirm)</label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailChangePassword}
                    onChange={(e) => setEmailChangePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 pr-12"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: '#64748b' }}
                  >
                    {showEmailPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEmailChange}
                disabled={emailSaving}
                className="px-6 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: '#0284c7' }}
              >
                {emailSaving ? 'Updating…' : 'Update login email'}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════
              CHANGE PASSWORD FORM
          ══════════════════════════════════ */}
          <div
            className="bg-white rounded-2xl border p-8 mb-6"
            style={{ borderColor: '#e2e8f0' }}
          >
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>
              Change Password
            </h3>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>
              Update your account password. You will need the current password to confirm.
            </p>
            {passwordError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {passwordError}
              </div>
            )}
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Current password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 pr-12"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#64748b' }}>
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>New password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 pr-12"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#64748b' }}>
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-sky-500 pr-12"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#64748b' }}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="px-6 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: '#0c4a6e' }}
              >
                {passwordSaving ? 'Updating…' : 'Change password'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
