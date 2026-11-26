import { useEffect, useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfilePage() {
  const { user, profile, metrics, updateProfile, logout } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    gender: profile?.gender || 'male',
    age: profile?.age || 22,
    heightCm: profile?.heightCm || 170,
    weightKg: profile?.weightKg || 65,
    activityLevel: profile?.activityLevel || 'moderate',
    goalType: profile?.goalType || 'maintain',
    targetWeightKg: profile?.targetWeightKg ?? '',
    targetDate: profile?.targetDate ?? ''
  });
  const [weights, setWeights] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function loadWeights() {
    const res = await api.getWeights(90);
    setWeights([...res.weights].reverse());
  }

  useEffect(() => {
    loadWeights();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await updateProfile(form);
      await loadWeights();
      setMsg('Đã cập nhật hồ sơ & tính lại chỉ số TDEE/BMI.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWeight(id) {
    await api.deleteWeight(id);
    await loadWeights();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Hồ sơ & Chỉ số cơ thể</h1>
          <p className="text-sm text-[#5a5c53]">{user?.email}</p>
        </div>
        <button type="button" onClick={logout} className="nk-btn-secondary bg-white text-[#9e2a1f]">
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>

      {metrics && (
        <div className="nk-surface p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-[#5a5c53]">BMI</div>
            <div className="text-xl font-medium font-mono-num">{metrics.bmi} · {metrics.bmiCategory}</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">BMR</div>
            <div className="text-xl font-medium font-mono-num">{metrics.bmr} kcal</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">TDEE</div>
            <div className="text-xl font-medium font-mono-num">{metrics.tdee} kcal</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">Calo mục tiêu</div>
            <div className="text-xl font-medium font-mono-num text-[#2e5b44]">{metrics.targetCalories} kcal</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="nk-card p-6 space-y-4">
          <h2 className="text-lg font-medium">Chỉnh sửa thông số</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Tên hiển thị</label>
              <input
                type="text"
                required
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="nk-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giới tính</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="nk-input"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tuổi</label>
              <input
                type="number"
                min={12}
                max={100}
                required
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                className="nk-input font-mono-num"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chiều cao (cm)</label>
              <input
                type="number"
                min={80}
                max={250}
                step="0.5"
                required
                value={form.heightCm}
                onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
                className="nk-input font-mono-num"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cân nặng (kg)</label>
              <input
                type="number"
                min={25}
                max={300}
                step="0.1"
                required
                value={form.weightKg}
                onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                className="nk-input font-mono-num"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mức độ vận động</label>
              <select
                value={form.activityLevel}
                onChange={(e) => setForm((f) => ({ ...f, activityLevel: e.target.value }))}
                className="nk-input"
              >
                <option value="sedentary">Ít vận động</option>
                <option value="light">Nhẹ (1-3 buổi/tuần)</option>
                <option value="moderate">Vừa (3-5 buổi/tuần)</option>
                <option value="active">Năng động (6-7 buổi)</option>
                <option value="very_active">Rất năng động</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mục tiêu</label>
              <select
                value={form.goalType}
                onChange={(e) => setForm((f) => ({ ...f, goalType: e.target.value }))}
                className="nk-input"
              >
                <option value="cut">Giảm mỡ (-400 kcal)</option>
                <option value="maintain">Duy trì (0 kcal)</option>
                <option value="bulk">Tăng cơ (+300 kcal)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cân nặng mục tiêu (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.targetWeightKg}
                onChange={(e) => setForm((f) => ({ ...f, targetWeightKg: e.target.value }))}
                className="nk-input font-mono-num"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày hoàn thành dự kiến</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="nk-input font-mono-num"
              />
            </div>
          </div>

          {msg && <p className="text-sm text-[#2e5b44] font-medium">{msg}</p>}
          {err && <p className="text-sm text-[#9e2a1f]">{err}</p>}

          <button type="submit" disabled={saving} className="nk-btn-primary w-full">
            {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
          </button>
        </form>

        <div className="nk-card p-6 space-y-4">
          <h2 className="text-lg font-medium">Lịch sử cân nặng (90 ngày)</h2>
          {weights.length === 0 ? (
            <p className="text-sm text-[#5a5c53]">Chưa có dữ liệu cân nặng.</p>
          ) : (
            <ul className="divide-y divide-black/8 max-h-[420px] overflow-y-auto">
              {weights.map((w) => (
                <li key={w.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono-num font-medium">{w.date}</span>
                    {w.note && <span className="ml-2 text-xs text-[#5a5c53]">{w.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num font-medium text-[#2e5b44]">{w.weightKg} kg</span>
                    <button
                      type="button"
                      aria-label={`Xóa cân nặng ngày ${w.date}`}
                      onClick={() => handleDeleteWeight(w.id)}
                      className="p-1 text-[#5a5c53] hover:text-[#9e2a1f] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
