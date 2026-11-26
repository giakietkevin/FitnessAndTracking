import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import AppShell from './components/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NutritionPage from './pages/NutritionPage.jsx';
import WorkoutsPage from './pages/WorkoutsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function WorkspaceRouter() {
  const { loading, isAuthenticated, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[#5a5c53]">
        Đang tải không gian theo dõi...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (profile && !profile.onboarded) {
    return <OnboardingPage />;
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage selectedDate={selectedDate} onNavigate={setActiveTab} />
      )}
      {activeTab === 'nutrition' && <NutritionPage selectedDate={selectedDate} />}
      {activeTab === 'workouts' && <WorkoutsPage selectedDate={selectedDate} />}
      {activeTab === 'profile' && <ProfilePage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceRouter />
    </AuthProvider>
  );
}
