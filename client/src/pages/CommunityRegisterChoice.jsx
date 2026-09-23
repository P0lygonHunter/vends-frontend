import { useParams, useNavigate, Link } from 'react-router-dom'

export default function CommunityRegisterChoice() {
  const { schoolId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f8fafc' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ background: '#4f46e5' }}>🎓</div>
          <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>V Community</div>
        </div>

        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Create Your Account</h2>
        <p className="text-slate-500 text-sm mb-6">Are you a parent or a teacher?</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/community/${schoolId}/register/parent`)}
            className="w-full py-4 rounded-xl border-2 text-left px-4 transition-all hover:border-indigo-500"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="font-bold text-sm">👨‍👩‍👧 I'm a Parent / Guardian</div>
            <div className="text-xs text-slate-500 mt-0.5">See your child's fees, attendance, and results</div>
          </button>
          <button
            onClick={() => navigate(`/community/${schoolId}/register/teacher`)}
            className="w-full py-4 rounded-xl border-2 text-left px-4 transition-all hover:border-indigo-500"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="font-bold text-sm">🍎 I'm a Teacher</div>
            <div className="text-xs text-slate-500 mt-0.5">Get school announcements and updates</div>
          </button>
        </div>

        <div className="text-center mt-6">
          <span className="text-sm text-slate-500">Already have an account? </span>
          <Link to={`/community/${schoolId}/login`} className="text-sm font-bold" style={{ color: '#4f46e5' }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
