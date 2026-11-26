import { useCallback, useEffect, useState } from 'react';
import { Droplets, Dumbbell, Flame, Plus, Scale, Sparkles, Utensils } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_BADGE = {
  on_track: { label: 'Đúng nhịp', cls: 'bg-[#e7f4ec] text-[#17673f]' },
  under: { label: 'Còn dư calo', cls: 'bg-[#e8f0f7] text-[#1e4d78]' },
  over: { label: 'Vượt mục tiêu', cls: 'bg-[#fbe9e7] text-[#9e2a1f]' },
  empty: { label: 'Chưa ghi dữ liệu', cls: 'bg-black/6 text-[#5a5c53]' }
};

function shortDateLabel(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function DashboardPage({ selectedDate, onNavigate }) {
  const { user, refreshProfile } = useAuth();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightMsg, setWeightMsg] = useState('');
  const [waterSaving, setWaterSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard(selectedDate, days);
      setData(res);
      setWeightInput(String(res.profileSummary.weightKg));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, days]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleWeightSubmit(e) {
    e.preventDefault();
    const val = Number(weightInput);
    if (!Number.isFinite(val) || val < 25 || val > 300) return;
    setWeightSaving(true);
    setWeightMsg('');
    try {
      await api.logWeight({ date: selectedDate, weightKg: val, note: 'Ghi nhanh từ Dashboard' });
      await Promise.all([load(), refreshProfile()]);
      setWeightMsg('Đã lưu cân nặng');
      setTimeout(() => setWeightMsg(''), 2500);
    } finally {
      setWeightSaving(false);
    }
  }

  async function handleQuickWater(amountMl) {
    setWaterSaving(true);
    try {
      await api.addWaterLog({ date: selectedDate, amountMl });
      await load();
    } finally {
      setWaterSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="nk-card p-6 h-44 animate-pulse bg-white/60" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { today, profileSummary, streakDays, series } = data;
  const badge = STATUS_BADGE[today.status] || STATUS_BADGE.empty;
  const pctCalories = Math.min(100, Math.round((today.caloriesIn / Math.max(1, today.targetCalories)) * 100));

  const maxCalChart = Math.max(
    today.targetCalories,
    ...series.map((s) => Math.max(s.caloriesIn, s.caloriesOut)),
    1500
  );

  const weightPoints = series.filter((s) => s.weightKg !== null);
  const minW = weightPoints.length ? Math.min(...weightPoints.map((w) => w.weightKg)) - 1.5 : 50;
  const maxW = weightPoints.length ? Math.max(...weightPoints.map((w) => w.weightKg)) + 1.5 : 80;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#5a5c53]">
            Xin chào, {user?.displayName}
          </p>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">
            Tổng quan năng lượng & tiến độ
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => onNavigate('roadmap')} className="nk-btn-secondary bg-white">
            <Sparkles className="w-4 h-4 text-[#2e5b44]" />
            Thiết kế lộ trình
          </button>
          <button type="button" onClick={() => onNavigate('nutrition')} className="nk-btn-primary">
            <Plus className="w-4 h-4" />
            Ghi bữa ăn
          </button>
          <button type="button" onClick={() => onNavigate('workouts')} className="nk-btn-secondary bg-white">
            <Dumbbell className="w-4 h-4" />
            Ghi buổi tập
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calorie Balance */}
        <div className="nk-card p-6 lg:col-span-2 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#5a5c53]">
                <Flame className="w-4 h-4 text-[#2e5b44]" />
                <span>Cán cân Calo ngày {shortDateLabel(selectedDate)}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="text-4xl font-medium font-mono-num tracking-tight">
                  {today.netCalories}
                </span>
                <span className="text-sm text-[#5a5c53] font-mono-num">
                  / {today.targetCalories} kcal mục tiêu
                </span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          <div>
            <div className="h-3 rounded-full bg-[#e2d9cb] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2e5b44] transition-all duration-300"
                style={{ width: `${pctCalories}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white border border-black/8">
                <div className="text-xs text-[#5a5c53]">Nạp vào ({today.mealsCount} món)</div>
                <div className="text-lg font-medium font-mono-num mt-0.5">+{today.caloriesIn}</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-black/8">
                <div className="text-xs text-[#5a5c53]">Tập luyện ({today.workoutMinutes}p)</div>
                <div className="text-lg font-medium font-mono-num text-[#2e5b44] mt-0.5">
                  −{today.caloriesOut}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-black/8">
                <div className="text-xs text-[#5a5c53]">
                  {today.remainingCalories >= 0 ? 'Còn được nạp' : 'Vượt ngưỡng'}
                </div>
                <div className="text-lg font-medium font-mono-num mt-0.5">
                  {Math.abs(today.remainingCalories)} kcal
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Macros + Quick Weight */}
        <div className="nk-card p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-medium">Macro hôm nay</h2>
              <span className="text-xs font-mono-num text-[#5a5c53]">
                Chuỗi {streakDays} ngày
              </span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Đạm (Protein)', val: today.macros.proteinG, target: today.macros.targets.proteinG, color: 'bg-[#2e5b44]' },
                { name: 'Tinh bột (Carbs)', val: today.macros.carbsG, target: today.macros.targets.carbsG, color: 'bg-[#8a6d3b]' },
                { name: 'Chất béo (Fat)', val: today.macros.fatG, target: today.macros.targets.fatG, color: 'bg-[#5a5c53]' }
              ].map((m) => {
                const w = Math.min(100, Math.round((m.val / Math.max(1, m.target)) * 100));
                return (
                  <div key={m.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{m.name}</span>
                      <span className="font-mono-num text-[#5a5c53]">
                        {m.val} / {m.target}g
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e2d9cb] overflow-hidden">
                      <div className={`h-full rounded-full ${m.color}`} style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleWeightSubmit} className="pt-4 border-t border-black/10">
            <div className="flex items-center justify-between text-xs text-[#5a5c53] mb-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#22261f]">
                <Scale className="w-3.5 h-3.5 text-[#2e5b44]" />
                Cân nặng · BMI {profileSummary.bmi} ({profileSummary.bmiCategory})
              </span>
              {weightMsg && <span className="text-[#2e5b44] font-medium">{weightMsg}</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                min={25}
                max={300}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                aria-label="Cập nhật cân nặng (kg)"
                className="nk-input font-mono-num"
              />
              <button type="submit" disabled={weightSaving} className="nk-btn-secondary bg-white shrink-0">
                {weightSaving ? '...' : 'Lưu kg'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-black/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#22261f]">
                <Droplets className="w-3.5 h-3.5 text-[#1e4d78]" />
                Nước uống hôm nay
              </span>
              <span className="font-mono-num text-[#5a5c53]">
                {today.waterMl || 0} / {today.waterTargetMl || 2100} ml
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-[#e2d9cb] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1e4d78] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((today.waterMl || 0) / Math.max(1, today.waterTargetMl || 2100)) * 100))}%`
                  }}
                />
              </div>
              <button
                type="button"
                disabled={waterSaving}
                onClick={() => handleQuickWater(250)}
                className="px-2.5 h-7 rounded-lg bg-[#e8f0f7] text-[#1e4d78] text-xs font-medium hover:bg-[#dce8f3] cursor-pointer shrink-0"
              >
                {waterSaving ? '...' : '+250ml'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="nk-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium">Calo nạp vào & tiêu hao</h2>
              <p className="text-xs text-[#5a5c53]">So sánh trực tiếp với ngưỡng {today.targetCalories} kcal</p>
            </div>
            <div className="flex gap-1 bg-[#efe9e0] p-1 rounded-lg text-xs">
              {[7, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    days === d ? 'bg-white text-[#22261f]' : 'text-[#5a5c53]'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="h-48 flex items-end gap-2 pt-4">
            {series.map((s) => {
              const hIn = Math.round((s.caloriesIn / maxCalChart) * 140);
              const hOut = Math.round((s.caloriesOut / maxCalChart) * 140);
              return (
                <div key={s.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="w-full flex items-end justify-center gap-1 h-[144px]">
                    <div
                      title={`${shortDateLabel(s.date)} nạp: ${s.caloriesIn} kcal`}
                      className="w-2.5 sm:w-3.5 rounded-t bg-[#22261f] transition-all"
                      style={{ height: `${Math.max(3, hIn)}px` }}
                    />
                    <div
                      title={`${shortDateLabel(s.date)} tập: ${s.caloriesOut} kcal`}
                      className="w-2.5 sm:w-3.5 rounded-t bg-[#2e5b44] transition-all"
                      style={{ height: `${Math.max(3, hOut)}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono-num text-[#5a5c53] truncate">
                    {shortDateLabel(s.date)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-5 text-xs text-[#5a5c53]">
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-xs bg-[#22261f] inline-block" /> Calo nạp vào
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-xs bg-[#2e5b44] inline-block" /> Calo tập luyện
            </span>
          </div>
        </div>

        <div className="nk-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium">Biến thiên cân nặng</h2>
              <p className="text-xs text-[#5a5c53]">
                Hiện tại {profileSummary.weightKg} kg
                {profileSummary.targetWeightKg ? ` · Mục tiêu ${profileSummary.targetWeightKg} kg` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-medium text-[#2e5b44] hover:underline cursor-pointer"
            >
              Xem chi tiết
            </button>
          </div>

          {weightPoints.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-sm text-[#5a5c53] nk-surface p-4">
              <p>Chưa có mốc cân nặng trong {days} ngày gần đây.</p>
              <p className="text-xs mt-1">Nhập cân nặng ở thẻ phía trên để bắt đầu vẽ biểu đồ.</p>
            </div>
          ) : (
            <div className="h-48">
              <svg viewBox="0 0 420 150" className="w-full h-full overflow-visible" aria-label="Biểu đồ cân nặng">
                <line x1="0" y1="30" x2="420" y2="30" stroke="rgba(34,38,31,0.08)" />
                <line x1="0" y1="75" x2="420" y2="75" stroke="rgba(34,38,31,0.08)" />
                <line x1="0" y1="120" x2="420" y2="120" stroke="rgba(34,38,31,0.08)" />
                {(() => {
                  const pts = weightPoints.map((p, idx) => {
                    const x = weightPoints.length === 1 ? 210 : 24 + (idx * 372) / (weightPoints.length - 1);
                    const y = 125 - ((p.weightKg - minW) / Math.max(0.5, maxW - minW)) * 100;
                    return { ...p, x, y };
                  });
                  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
                  return (
                    <>
                      {pts.length > 1 && (
                        <polyline fill="none" stroke="#2e5b44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={poly} />
                      )}
                      {pts.map((p) => (
                        <g key={p.date}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#faf7f2" stroke="#2e5b44" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="#22261f" fontFamily="DM Mono, monospace">
                            {p.weightKg}
                          </text>
                          <text x={p.x} y="144" textAnchor="middle" fontSize="10" fill="#5a5c53" fontFamily="DM Mono, monospace">
                            {shortDateLabel(p.date)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Quick summary shortcuts */}
      <div className="nk-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">Mẹo dùng nhanh:</span> Tìm món ăn không cần gõ dấu (ví dụ <code className="font-mono-num bg-white px-1.5 py-0.5 rounded">uc ga</code>, <code className="font-mono-num bg-white px-1.5 py-0.5 rounded">pho bo</code>) hoặc bấm hoàn thành 1 chạm cho cả buổi tập từ Plan.
        </div>
        <div className="flex gap-3 text-xs font-medium shrink-0">
          <button type="button" onClick={() => onNavigate('nutrition')} className="text-[#2e5b44] hover:underline cursor-pointer">
            Mở Nhật ký ăn →
          </button>
          <button type="button" onClick={() => onNavigate('workouts')} className="text-[#2e5b44] hover:underline cursor-pointer">
            Mở Kế hoạch tập →
          </button>
        </div>
      </div>
    </div>
  );
}
