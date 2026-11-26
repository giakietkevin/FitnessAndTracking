import { Activity, ChevronLeft, ChevronRight, Dumbbell, Flame, LogOut, ShieldCheck, User, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const BASE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: Flame },
  { id: 'nutrition', label: 'Dinh dưỡng', shortLabel: 'Dinh dưỡng', icon: Utensils },
  { id: 'workouts', label: 'Tập luyện', shortLabel: 'Tập luyện', icon: Dumbbell },
  { id: 'profile', label: 'Hồ sơ', shortLabel: 'Hồ sơ', icon: User }
];

function shiftDate(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatViDate(iso) {
  const today = new Date().toISOString().slice(0, 10);
  if (iso === today) return 'Hôm nay';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function AppShell({
  activeTab,
  onTabChange,
  selectedDate,
  onDateChange,
  pendingAdminCount = 0,
  children
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin
    ? [
        ...BASE_NAV_ITEMS,
        {
          id: 'admin',
          label: 'Admin duyệt món',
          shortLabel: 'Duyệt món',
          icon: ShieldCheck,
          badge: pendingAdminCount
        }
      ]
    : BASE_NAV_ITEMS;

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-10">
      <header className="sticky top-0 z-20 bg-[#efe9e0]/95 backdrop-blur-sm border-b border-black/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className="inline-flex items-center gap-2.5 text-lg font-medium tracking-tight text-[#22261f] cursor-pointer"
            >
              <span className="grid grid-cols-2 gap-1 w-4 h-4" aria-hidden="true">
                <span className="rounded-full bg-[#22261f]" />
                <span className="rounded-full bg-[#22261f]" />
                <span className="rounded-full bg-[#22261f]" />
                <span className="rounded-full bg-[#2e5b44]" />
              </span>
              Nhịp Khỏe
            </button>

            <nav className="hidden md:flex items-center gap-1" aria-label="Chức năng chính">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                      active
                        ? 'bg-[#22261f] text-[#efe9e0]'
                        : 'text-[#5a5c53] hover:text-[#22261f] hover:bg-black/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        className={`text-[11px] font-mono-num px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-[#efe9e0] text-[#22261f]' : 'bg-[#2e5b44] text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center bg-white border border-black/12 rounded-xl px-1.5 h-10">
              <button
                type="button"
                aria-label="Ngày trước"
                onClick={() => onDateChange(shiftDate(selectedDate, -1))}
                className="p-1.5 text-[#5a5c53] hover:text-[#22261f] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                aria-label="Chọn ngày"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="text-xs md:text-sm font-medium font-mono-num bg-transparent border-0 focus:outline-none px-1 w-[112px] text-center"
              />
              <span className="hidden sm:inline text-xs text-[#2e5b44] font-medium pr-1.5">
                {formatViDate(selectedDate)}
              </span>
              <button
                type="button"
                aria-label="Ngày tiếp theo"
                onClick={() => onDateChange(shiftDate(selectedDate, 1))}
                className="p-1.5 text-[#5a5c53] hover:text-[#22261f] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <a
              href="/"
              title="Trang giới thiệu"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-medium text-[#5a5c53] hover:text-[#22261f] hover:bg-black/5"
            >
              <Activity className="w-3.5 h-3.5" />
              Giới thiệu
            </a>

            <button
              type="button"
              onClick={logout}
              title={`Đăng xuất (${user?.displayName || ''})`}
              className="hidden md:inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-medium text-[#5a5c53] hover:text-[#9e2a1f] hover:bg-black/5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Thoát
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 pt-6">
        {children}
      </main>

      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#faf7f2] border-t border-black/12 grid ${
          isAdmin ? 'grid-cols-5' : 'grid-cols-4'
        } h-16 px-2`}
        aria-label="Điều hướng di động"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                active ? 'text-[#2e5b44]' : 'text-[#5a5c53]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.shortLabel || item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-1.5 right-3 min-w-4 h-4 px-1 rounded-full bg-[#2e5b44] text-white text-[10px] font-mono-num flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
