import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useLanguageStore } from './store/useLanguageStore';
import { useUserStore } from './store/useUserStore';
import MainLayout from './components/layout/MainLayout';
import { MigrationGate } from './components/MigrationGate';
import AmbientBackground from './components/AmbientBackground';
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

  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      backListener.then(l => l.remove());
    };
  }, [navigate]);

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

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <MigrationGate>
      {!isAuthenticated ? (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <AmbientBackground />
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
