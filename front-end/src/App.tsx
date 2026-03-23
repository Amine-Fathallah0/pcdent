import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import DentistDashboard from './pages/DentistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import RegisterDentist from './pages/RegisterDentist';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-dentist" element={<RegisterDentist />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/dentist" element={<DentistDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
