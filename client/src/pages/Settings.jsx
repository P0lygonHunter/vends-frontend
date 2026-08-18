import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function Settings() {
  const schoolId = localStorage.getItem('schoolId')

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

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#f8fafc' }}
    >
      <Sidebar schoolName={form.schoolName} />

      <div
        style={{
          marginLeft: '260px',
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

          <TrialBadge />
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
                background: '#1e1b4b',
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
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
                background: saving ? '#818cf8' : '#4f46e5',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes ✓'}
            </button>
          </div>

          {/* ══════════════════════════════════
              CHANGE PASSWORD
          ══════════════════════════════════ */}

          <div
            className="bg-white rounded-2xl border p-8 mt-6"
            style={{ borderColor: '#e2e8f0' }}
          >

            <h3
              className="font-bold text-lg mb-2"
              style={{ fontFamily: 'Syne,sans-serif' }}
            >
              🔐 Change Password
            </h3>

            <p
              className="text-sm mb-6"
              style={{ color: '#64748b' }}
            >
              Update your school admin account password.
            </p>

            {/* PASSWORD ERROR */}

            {passwordError && (
              <div
                className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca'
                }}
              >
                {passwordError}
              </div>
            )}

            {/* ═══════════════════════════════
                CURRENT PASSWORD
            ═══════════════════════════════ */}

            <div className="mb-5">

              <label
                className="text-xs font-semibold mb-1 block"
                style={{ color: '#475569' }}
              >
                Current Password
              </label>

              <div className="relative">

                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />

                <button
                  type="button"
                  aria-label={
                    showCurrentPassword
                      ? 'Hide current password'
                      : 'Show current password'
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    setShowCurrentPassword(prev => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{
                    color: '#64748b',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {showCurrentPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 2l20 20" />
                      <path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" />
                      <path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" />
                      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>

              </div>
            </div>

            {/* ═══════════════════════════════
                NEW PASSWORD
            ═══════════════════════════════ */}

            <div className="mb-5">

              <label
                className="text-xs font-semibold mb-1 block"
                style={{ color: '#475569' }}
              >
                New Password
              </label>

              <div className="relative">

                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />

                <button
                  type="button"
                  aria-label={
                    showNewPassword
                      ? 'Hide new password'
                      : 'Show new password'
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    setShowNewPassword(prev => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{
                    color: '#64748b',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {showNewPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 2l20 20" />
                      <path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" />
                      <path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" />
                      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>

              </div>
            </div>

            {/* ═══════════════════════════════
                CONFIRM PASSWORD
            ═══════════════════════════════ */}

            <div className="mb-6">

              <label
                className="text-xs font-semibold mb-1 block"
                style={{ color: '#475569' }}
              >
                Confirm New Password
              </label>

              <div className="relative">

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-indigo-500 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                />

                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    setShowConfirmPassword(prev => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{
                    color: '#64748b',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {showConfirmPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 2l20 20" />
                      <path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" />
                      <path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" />
                      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>

              </div>
            </div>

            {/* ═══════════════════════════════
                CHANGE PASSWORD BUTTON
            ═══════════════════════════════ */}

            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-all"
              style={{
                background: passwordSaving
                  ? '#6366a5'
                  : '#1e1b4b',
                cursor: passwordSaving
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              {passwordSaving
                ? 'Changing Password...'
                : 'Change Password'}
            </button>

          </div>

        </div>
      </div>
    </div>
  )
}