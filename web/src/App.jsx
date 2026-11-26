import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { api } from './api/client.js';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import AppShell from './components/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NutritionPage from './pages/NutritionPage.jsx';
import WorkoutsPage from './pages/WorkoutsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function WorkspaceRouter() {
  const { loading, isAuthenticated, user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pendingAdminCount, setPendingAdminCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      setPendingAdminCount(0);
      return;
    }
    api
      .getAdminOverview()
      .then((res) =>
        setPendingAdminCount((res.pendingFoodSubmissions || 0) + (res.pendingExerciseSubmissions || 0))
      )
      .catch(() => {});
  }, [isAuthenticated, user?.role]);

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
      pendingAdminCount={pendingAdminCount}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage selectedDate={selectedDate} onNavigate={setActiveTab} />
      )}
      {activeTab === 'nutrition' && <NutritionPage selectedDate={selectedDate} />}
      {activeTab === 'workouts' && <WorkoutsPage selectedDate={selectedDate} />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'admin' && user?.role === 'admin' && (
        <AdminPage onPendingCountChange={setPendingAdminCount} />
      )}
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
