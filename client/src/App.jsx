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
import AcademicYears from './pages/AcademicYears'
import Classes from './pages/Classes'
import ClassDetail from './pages/ClassDetail'
import StudentDetail from './pages/StudentDetail'
import Subjects from './pages/Subjects'
import ExamsResults from './pages/ExamsResults'
import Assignments from './pages/Assignments'
import Fees from './pages/Fees'
import Timetable from './pages/Timetable'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import FinancialManagement from './pages/FinancialManagement'
import Employees from './pages/Employees'
import Payroll from './pages/Payroll'
import ExpenseManagement from './pages/ExpenseManagement'
import BalanceSheet from './pages/BalanceSheet'
import TrialBalance from './pages/TrialBalance'
import ProfitLoss from './pages/ProfitLoss'
import ChartOfAccounts from './pages/ChartOfAccounts'

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
        <Route path="/academic-years" element={<AcademicYears />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:id" element={<ClassDetail />} />
        <Route path="/students/:id" element={<StudentDetail />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/exams-results" element={<ExamsResults />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/financial-management" element={<FinancialManagement />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/expenses" element={<ExpenseManagement />} />
        <Route path="/balance-sheet" element={<BalanceSheet />} />
        <Route path="/trial-balance" element={<TrialBalance />} />
        <Route path="/profit-loss" element={<ProfitLoss />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />

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