import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Ít vận động', desc: 'Ngồi nhiều, hầu như chưa tập' },
  { value: 'light', label: 'Vận động nhẹ', desc: 'Đi bộ hoặc tập 1–3 buổi/tuần' },
  { value: 'moderate', label: 'Vận động vừa', desc: 'Tập Gym / chạy bộ 3–5 buổi/tuần' },
  { value: 'active', label: 'Năng động', desc: 'Tập luyện cường độ cao 6–7 buổi/tuần' },
  { value: 'very_active', label: 'Rất năng động', desc: 'Vận động thể chất nhiều mỗi ngày' }
];

const GOAL_OPTIONS = [
  { value: 'cut', label: 'Giảm mỡ', desc: 'Thâm hụt 400 kcal/ngày, giữ cơ' },
  { value: 'maintain', label: 'Duy trì & Khỏe hơn', desc: 'Cân bằng năng lượng theo TDEE' },
  { value: 'bulk', label: 'Tăng cơ', desc: 'Thặng dư 300 kcal/ngày' }
];

function previewMetrics({ gender, age, heightCm, weightKg, activityLevel, goalType }) {
  const h = Number(heightCm) || 170;
  const w = Number(weightKg) || 65;
  const a = Number(age) || 22;
  const bmi = Number((w / ((h / 100) ** 2)).toFixed(1));
  const offsetGender = gender === 'female' ? -161 : gender === 'other' ? -78 : 5;
  const bmr = 10 * w + 6.25 * h - 5 * a + offsetGender;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[activityLevel] || 1.55;
  const tdee = Math.round(bmr * mult);
  const isTeen = a >= 12 && a < 18;
  const rawOffset = { cut: -400, maintain: 0, bulk: 300 }[goalType] ?? 0;
  const offsetGoal = isTeen && goalType === 'cut' ? -250 : rawOffset;
  const targetCalories = Math.max(isTeen ? 1400 : 1200, tdee + offsetGoal);
  return { bmi, tdee, targetCalories, isTeen };
}

export default function OnboardingPage() {
  const { user, profile, updateProfile, logout } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    gender: profile?.gender || 'male',
    age: profile?.age || 22,
    heightCm: profile?.heightCm || 170,
    weightKg: profile?.weightKg || 65,
    activityLevel: profile?.activityLevel || 'moderate',
    goalType: profile?.goalType || 'maintain',
    targetWeightKg: profile?.targetWeightKg || '',
    targetDate: profile?.targetDate || ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => previewMetrics(form), [form]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateProfile(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2.5 text-lg font-medium">
            <span className="grid grid-cols-2 gap-1 w-4 h-4" aria-hidden="true">
              <span className="rounded-full bg-[#22261f]" />
              <span className="rounded-full bg-[#22261f]" />
              <span className="rounded-full bg-[#22261f]" />
              <span className="rounded-full bg-[#2e5b44]" />
            </span>
            Nhịp Khỏe
          </div>
          <button type="button" onClick={logout} className="text-sm text-[#5a5c53] hover:text-[#22261f] cursor-pointer">
            Đăng xuất
          </button>
        </div>

        <div className="nk-card p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-[#2e5b44] mb-1">Thiết lập dưới 1 phút</p>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight mb-2">
            Chỉ số cơ thể và mục tiêu của bạn
          </h1>
          <p className="text-sm text-[#5a5c53] mb-6">
            Dùng để tính chính xác TDEE, lượng calo khuyến nghị và tỷ lệ đạm, tinh bột, chất béo mỗi ngày.
          </p>

          <div className="nk-surface p-4 mb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-[#5a5c53]">BMI ước tính</div>
              <div className="text-xl font-medium font-mono-num mt-0.5">{preview.bmi}</div>
            </div>
            <div>
              <div className="text-xs text-[#5a5c53]">TDEE tiêu hao</div>
              <div className="text-xl font-medium font-mono-num mt-0.5">{preview.tdee} kcal</div>
            </div>
            <div>
              <div className="text-xs text-[#5a5c53]">Mục tiêu ngày</div>
              <div className="text-xl font-medium font-mono-num text-[#2e5b44] mt-0.5">{preview.targetCalories} kcal</div>
            </div>
          </div>

          {preview.isTeen && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <strong>Lưu ý dinh dưỡng tuổi 12–17:</strong> Cơ thể đang trong giai đoạn phát triển nên hệ thống giữ sàn tối thiểu{' '}
              <span className="font-mono-num font-medium">1.400 kcal/ngày</span> và thâm hụt nhẹ (-250 kcal) nếu bạn chọn giảm mỡ.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-gender">Giới tính</label>
                <select
                  id="ob-gender"
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
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-age">Tuổi (từ 12+)</label>
                <input
                  id="ob-age"
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
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-height">Chiều cao (cm)</label>
                <input
                  id="ob-height"
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
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-weight">Cân nặng hiện tại (kg)</label>
                <input
                  id="ob-weight"
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mục tiêu chính</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, goalType: g.value }))}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      form.goalType === g.value
                        ? 'border-[#2e5b44] bg-[#2e5b44]/8'
                        : 'border-black/12 bg-white hover:bg-black/2'
                    }`}
                  >
                    <div className="text-sm font-medium">{g.label}</div>
                    <div className="text-xs text-[#5a5c53] mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="ob-activity">Mức độ vận động hàng tuần</label>
              <select
                id="ob-activity"
                value={form.activityLevel}
                onChange={(e) => setForm((f) => ({ ...f, activityLevel: e.target.value }))}
                className="nk-input"
              >
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-target-w">
                  Cân nặng mục tiêu (kg, tùy chọn)
                </label>
                <input
                  id="ob-target-w"
                  type="number"
                  min={25}
                  max={300}
                  step="0.1"
                  value={form.targetWeightKg}
                  onChange={(e) => setForm((f) => ({ ...f, targetWeightKg: e.target.value }))}
                  placeholder="Ví dụ: 62"
                  className="nk-input font-mono-num"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ob-target-d">
                  Mốc thời gian (tùy chọn)
                </label>
                <input
                  id="ob-target-d"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                  className="nk-input font-mono-num"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#9e2a1f] bg-[#fbe9e7] border border-[#f2c6c2] rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} className="nk-btn-primary w-full">
              {saving ? 'Đang lưu hồ sơ...' : 'Hoàn tất & vào Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
