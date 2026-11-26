import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { login, register, sessionNotice, clearSessionNotice } = useAuth();
  const initialMode = new URLSearchParams(window.location.search).get('mode') === 'login' ? 'login' : 'register';
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between px-5 py-6 md:px-10">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-2.5 text-lg font-medium tracking-tight text-[#22261f]">
          <span className="grid grid-cols-2 gap-1 w-4 h-4" aria-hidden="true">
            <span className="rounded-full bg-[#22261f]" />
            <span className="rounded-full bg-[#22261f]" />
            <span className="rounded-full bg-[#22261f]" />
            <span className="rounded-full bg-[#2e5b44]" />
          </span>
          Nhịp Khỏe
        </a>
        <a href="/" className="text-sm font-medium text-[#5a5c53] hover:text-[#22261f]">
          Về trang giới thiệu
        </a>
      </header>

      <main className="max-w-md w-full mx-auto my-8">
        <div className="nk-card p-7 md:p-8 shadow-sm">
          <div className="flex gap-2 p-1 rounded-xl bg-[#efe9e0] mb-6">
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-[#22261f] shadow-xs' : 'text-[#5a5c53]'
              }`}
            >
              Tạo tài khoản
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-[#22261f] shadow-xs' : 'text-[#5a5c53]'
              }`}
            >
              Đăng nhập
            </button>
          </div>

          <h1 className="text-2xl font-medium tracking-tight mb-1.5">
            {mode === 'register' ? 'Bắt đầu theo dõi sức khỏe' : 'Chào mừng quay lại'}
          </h1>
          <p className="text-sm text-[#5a5c53] mb-6">
            {mode === 'register'
              ? 'Dữ liệu bữa ăn, lịch tập và cân nặng được lưu riêng theo tài khoản của bạn.'
              : 'Đăng nhập để tiếp tục ghi nhận thực đơn và buổi tập hôm nay.'}
          </p>

          {sessionNotice && (
            <div className="mb-4 text-xs text-amber-900 bg-amber-100 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span>{sessionNotice}</span>
              <button type="button" onClick={clearSessionNotice} className="underline shrink-0 cursor-pointer">
                Đóng
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium mb-1.5">
                  Tên hiển thị
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Minh Anh"
                  className="nk-input"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
                className="nk-input"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium mb-1.5">
                Mật khẩu
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="nk-input"
              />
            </div>

            {error && (
              <p className="text-sm text-[#9e2a1f] bg-[#fbe9e7] border border-[#f2c6c2] rounded-xl px-3.5 py-2.5" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="nk-btn-primary w-full">
              {submitting ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản và tiếp tục' : 'Đăng nhập'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {mode === 'login' && (
              <div className="pt-3 border-t border-black/8 flex items-center justify-between gap-2 text-xs text-[#5a5c53]">
                <div>
                  <div>Quản trị viên mặc định:</div>
                  <div className="font-mono-num text-[#22261f]">admin@nhipkhoe.local / admin123</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@nhipkhoe.local');
                    setPassword('admin123');
                    setError('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#efe9e0] text-[#2e5b44] font-medium hover:bg-[#e2d9cb] shrink-0 cursor-pointer"
                >
                  Điền Admin
                </button>
              </div>
            )}
          </form>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#5a5c53]">
        Dành cho người dùng từ 12 tuổi trở lên · Nhịp Khỏe 2026
      </footer>
    </div>
  );
}
