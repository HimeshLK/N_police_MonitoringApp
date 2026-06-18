import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DivisionList from './pages/Divisions/DivisionList';
import DivisionForm from './pages/Divisions/DivisionForm';
import OfficerList from './pages/Officers/OfficerList';
import OfficerForm from './pages/Officers/OfficerForm';
import ScheduleList from './pages/Schedules/ScheduleList';
import ScheduleForm from './pages/Schedules/ScheduleForm';
import ConfigList from './pages/Configs/ConfigList';
import ConfigForm from './pages/Configs/ConfigForm';
import RouteList from './pages/Routes/RouteList';
import RouteForm from './pages/Routes/RouteForm';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/divisions" element={<DivisionList />} />
              <Route path="/divisions/new" element={<DivisionForm />} />
              <Route path="/divisions/:id/edit" element={<DivisionForm />} />
              <Route path="/officers" element={<OfficerList />} />
              <Route path="/officers/new" element={<OfficerForm />} />
              <Route path="/officers/:id/edit" element={<OfficerForm />} />
              <Route path="/schedules" element={<ScheduleList />} />
              <Route path="/schedules/new" element={<ScheduleForm />} />
              <Route path="/schedules/:id/edit" element={<ScheduleForm />} />
              <Route path="/configs" element={<ConfigList />} />
              <Route path="/configs/new" element={<ConfigForm />} />
              <Route path="/configs/:id/edit" element={<ConfigForm />} />
              <Route path="/routes" element={<RouteList />} />
              <Route path="/routes/new" element={<RouteForm />} />
              <Route path="/routes/:id/edit" element={<RouteForm />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
