import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Auth Pages
import Login from './pages/Login'
import Register from './pages/Register'

// Main Application Pages
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Attendance from './pages/Attendance'
import Subscription from './pages/Subscription'
import Settings from './pages/Settings'

// Management Pages
import CEOLogin from './pages/CEOLogin'
import CEODashboard from './pages/CEODashboard'

// Tools & Generators
import TestGenerator from './pages/TestGenerator'
import ResultCardGenerator from './pages/ResultCardGenerator'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main Application Pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings" element={<Settings />} />

        {/* Management Routes */}
        <Route path="/ceo/login" element={<CEOLogin />} />
        <Route path="/ceo/dashboard" element={<CEODashboard />} />

        {/* Tools & Generators */}
        <Route path="/test-generator" element={<TestGenerator />} />

        {/* FIXED: Path updated to match Sidebar navigation (/result-generator) */}
        <Route path="/result-generator" element={<ResultCardGenerator />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App