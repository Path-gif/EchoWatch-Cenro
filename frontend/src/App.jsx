import React from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import SubmitReport from './pages/SubmitReport'
import MyReports from './pages/MyReports'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Landing from './pages/Landing'
import AdminDashboard from './admin/AdminDashboard'
import AdminUsers from './admin/AdminUsers'
import AdminReports from './admin/AdminReports'
import AdminSettings from './admin/AdminSettings'
import AdminLayout from './admin/AdminLayout'
import AdminRoute from './admin/AdminRoute'
import AdminLogin from './admin/AdminLogin'
import Header from './components/Header'

function ProtectedRoute({ children }) {
  if (!localStorage.getItem('token')) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isAdminLoginRoute = location.pathname === '/admin-login'
  const isLandingRoute = location.pathname === '/'
  const isAuthRoute = ['/login', '/register', '/auth', '/auth/register', '/admin-login', '/admin/login'].includes(location.pathname)
  const showCitizenSidebar = !isAdminRoute && !isAdminLoginRoute && !isLandingRoute && !isAuthRoute

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfdfc]">
      {showCitizenSidebar ? <Header /> : null}
      <main className={showCitizenSidebar ? 'pl-20 pt-20 md:pl-64' : ''}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/register" element={<Navigate to="/register" replace />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/submit" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
          <Route path="/myreports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
          <Route path="/reports" element={<Navigate to="/myreports" replace />} />
          <Route path="/editprofile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile" element={<Navigate to="/editprofile" replace />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/admin-login" replace />} />
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  )
}
