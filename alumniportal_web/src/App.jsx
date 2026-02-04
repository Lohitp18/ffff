import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import SuperAdminLogin from './pages/SuperAdminLogin'
import InstituteAdminLogin from './pages/InstituteAdminLogin'
import Home from './pages/Home'
import Alumni from './pages/Alumni'
import Opportunities from './pages/Opportunities'
import Events from './pages/Events'
import Institutions from './pages/Institutions'
import InstitutionDetail from './pages/InstitutionDetail'
import InstitutionAdmin from './pages/InstitutionAdmin'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Notifications from './pages/Notifications'
import Connections from './pages/Connections'
import UserProfileView from './pages/UserProfileView'
import PostEvent from './pages/PostEvent'
import PostOpportunity from './pages/PostOpportunity'
import InstitutionDashboard from './pages/InstitutionDashboard'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/instituteadmin" element={<InstituteAdminLogin />} />
        <Route path="/institutiondashboard" element={<InstitutionDashboard />} />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/alumni"
          element={
            <PrivateRoute>
              <Alumni />
            </PrivateRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <PrivateRoute>
              <Opportunities />
            </PrivateRoute>
          }
        />
        <Route
          path="/events"
          element={
            <PrivateRoute>
              <Events />
            </PrivateRoute>
          }
        />
        <Route
          path="/institutions"
          element={
            <PrivateRoute>
              <Institutions />
            </PrivateRoute>
          }
        />
        <Route
          path="/institution/:institutionName"
          element={
            <PrivateRoute>
              <InstitutionDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/institutionadmin"
          element={
            <PrivateRoute>
              <InstitutionAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <PrivateRoute>
              <Connections />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/:userId"
          element={
            <PrivateRoute>
              <UserProfileView />
            </PrivateRoute>
          }
        />
        <Route
          path="/post-event"
          element={
            <PrivateRoute>
              <PostEvent />
            </PrivateRoute>
          }
        />
        <Route
          path="/post-opportunity"
          element={
            <PrivateRoute>
              <PostOpportunity />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/signin" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

