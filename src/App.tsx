import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { useLanguageStore } from './store/useLanguageStore';
import MainLayout from './components/layout/MainLayout';

import { MigrationGate } from './components/MigrationGate';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Nutrition from './pages/Nutrition';
import Profile from './pages/Profile';
import MuscleMapPage from './pages/MuscleMapPage';


function App() {
  const lang = useLanguageStore(s => s.lang);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <MigrationGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workout" element={<Workout />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="profile" element={<Profile />} />
            <Route path="muscles" element={<MuscleMapPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MigrationGate>
  );
}

export default App;
