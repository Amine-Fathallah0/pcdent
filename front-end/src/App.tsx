import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import DentistDashboard from './pages/DentistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RegisterDentist from './pages/RegisterDentist';
import { useAuth } from './context/AuthContext';

type AllowedRole = 'patient' | 'dentist' | 'admin';

const ProtectedRoute = ({
  allowedRole,
  element,
}: {
  allowedRole: AllowedRole;
  element: ReactElement;
}) => {
  const { user, isAuthenticated, isValidating } = useAuth();

  if (isValidating) {
    return null; // brief blank while token is validated on mount
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return element;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register-dentist" element={<RegisterDentist />} />
        <Route
          path="/patient"
          element={<ProtectedRoute allowedRole="patient" element={<PatientDashboard />} />}
        />
        <Route
          path="/dentist"
          element={<ProtectedRoute allowedRole="dentist" element={<DentistDashboard />} />}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRole="admin" element={<AdminDashboard />} />}
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
