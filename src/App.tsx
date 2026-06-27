import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useLanguageStore } from './store/useLanguageStore';
import { useUserStore } from './store/useUserStore';
import MainLayout from './components/layout/MainLayout';
import { MigrationGate } from './components/MigrationGate';

import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Nutrition from './pages/Nutrition';
import Profile from './pages/Profile';
import CalendarPage from './pages/Calendar';
import DeviceLive from './pages/DeviceLive';
import MuscleMapPage from './pages/MuscleMapPage';

function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', () => {
      // Allow back navigation to Dashboard, otherwise exit
      if (location.pathname === '/dashboard' || location.pathname === '/' || location.pathname === '/auth') {
        CapacitorApp.exitApp();
      } else {
        // From any other tab, pressing back goes to dashboard
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="workout" element={<Workout />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="profile" element={<Profile />} />
        <Route path="muscles" element={<MuscleMapPage />} />
        <Route path="device-live" element={<DeviceLive />} />
      </Route>
    </Routes>
  );
}

function App() {
  const lang = useLanguageStore(s => s.lang);
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const loadUser = useUserStore(s => s.loadUser);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const storedId = localStorage.getItem('omni_active_user');
    if (storedId) {
      loadUser(storedId);
    }
  }, [loadUser]);

  return (
    <MigrationGate>
      {!isAuthenticated ? (
        <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
          <Auth />
        </div>
      ) : (
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      )}
    </MigrationGate>
  );
}

export default App;
