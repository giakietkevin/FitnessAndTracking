import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Check, Dumbbell, Flame, Sparkles, Target, Utensils } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const GOAL_OPTIONS = [
  { id: 'cut', label: 'Giảm mỡ' },
  { id: 'maintain', label: 'Duy trì & Khỏe' },
  { id: 'bulk', label: 'Tăng cơ' }
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Ít vận động' },
  { id: 'light', label: 'Nhẹ (1–3 buổi)' },
  { id: 'moderate', label: 'Vừa (3–5 buổi)' },
  { id: 'active', label: 'Năng động (6–7 buổi)' },
  { id: 'very_active', label: 'Rất năng động' }
];

function formatViDate(iso) {
  if (!iso || !iso.includes('-')) return iso || '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function RoadmapPage({ selectedDate, onNavigate }) {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    goalType: profile?.goalType || 'maintain',
    activityLevel: profile?.activityLevel || 'moderate',
    targetWeightKg: profile?.targetWeightKg ?? '',
    targetDate: profile?.targetDate ?? '',
    weeklySessions: 4,
    workoutStyle: 'auto'
  });

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [designing, setDesigning] = useState(false);
  const [applying, setApplying] = useState('');
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRoadmap();
      setRoadmap(res.roadmap);
      setForm((prev) => ({
        ...prev,
        goalType: res.roadmap.goalType,
        activityLevel: res.roadmap.activityLevel,
        targetWeightKg: res.roadmap.bodyMetrics.targetWeightKg,
        weeklySessions: res.roadmap.sessionsPerWeek
      }));
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function handleDesign(e) {
    e.preventDefault();
    setDesigning(true);
    setErr('');
    setNotice('');
    try {
      const payload = {
        goalType: form.goalType,
        activityLevel: form.activityLevel,
        targetWeightKg: form.targetWeightKg === '' ? null : Number(form.targetWeightKg),
        targetDate: form.targetDate || null,
        weeklySessions: Number(form.weeklySessions),
        ...(form.workoutStyle !== 'auto' ? { workoutStyle: form.workoutStyle } : {})
      };
      const res = await api.designRoadmap(payload);
      setRoadmap(res.roadmap);
      setNotice('Đã thiết kế lại lộ trình ăn uống, tập luyện và dự kiến mục tiêu phù hợp với bạn.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setDesigning(false);
    }
  }

  async function handleApply({ saveWorkoutPlan = false, logMealsDate = '' }) {
    const key = saveWorkoutPlan && logMealsDate ? 'both' : saveWorkoutPlan ? 'workout' : 'meals';
    setApplying(key);
    setErr('');
    setNotice('');
    try {
      const payload = {
        goalType: form.goalType,
        activityLevel: form.activityLevel,
        targetWeightKg: form.targetWeightKg === '' ? null : Number(form.targetWeightKg),
        targetDate: form.targetDate || null,
        weeklySessions: Number(form.weeklySessions),
        ...(form.workoutStyle !== 'auto' ? { workoutStyle: form.workoutStyle } : {}),
        saveWorkoutPlan,
        logMealsDate: logMealsDate || undefined
      };
      const res = await api.applyRoadmap(payload);
      setRoadmap(res.roadmap);
      await refreshProfile();
      const parts = [];
      if (res.createdPlanId) parts.push('đã tạo lịch tập mới trong mục Tập luyện');
      if (res.loggedMealsCount > 0) parts.push(`đã ghi ${res.loggedMealsCount} món vào Nhật ký ngày ${formatViDate(logMealsDate)}`);
      setNotice(`Áp dụng thành công: ${parts.join(' và ')}.`);
    } catch (error) {
      setErr(error.message);
    } finally {
      setApplying('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#2e5b44]">Cá nhân hóa theo mục tiêu</p>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Thiết kế Lộ trình Ăn uống & Tập luyện</h1>
          <p className="text-sm text-[#5a5c53]">
            Tính toán chi tiết Calo, Đạm / Tinh bột / Chất béo, thực đơn món Việt, lịch tập tuần và dự kiến ngày cán đích.
          </p>
        </div>
      </div>

      {/* Configurator Form */}
      <form onSubmit={handleDesign} className="nk-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#5a5c53] mb-1">Mục tiêu của bạn</label>
            <select
              value={form.goalType}
              onChange={(e) => setForm((f) => ({ ...f, goalType: e.target.value }))}
              className="nk-input"
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5c53] mb-1">Cân nặng mục tiêu (kg)</label>
            <input
              type="number"
              step="0.1"
              min={25}
              max={300}
              value={form.targetWeightKg}
              onChange={(e) => setForm((f) => ({ ...f, targetWeightKg: e.target.value }))}
              placeholder="Ví dụ: 62"
              className="nk-input font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5c53] mb-1">Mức độ vận động</label>
            <select
              value={form.activityLevel}
              onChange={(e) => setForm((f) => ({ ...f, activityLevel: e.target.value }))}
              className="nk-input"
            >
              {ACTIVITY_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5c53] mb-1">Số buổi tập / tuần</label>
            <select
              value={form.weeklySessions}
              onChange={(e) => setForm((f) => ({ ...f, weeklySessions: Number(e.target.value) }))}
              className="nk-input"
            >
              <option value={3}>3 buổi / tuần</option>
              <option value={4}>4 buổi / tuần</option>
              <option value={5}>5 buổi / tuần</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5c53] mb-1">Hình thức tập</label>
            <select
              value={form.workoutStyle}
              onChange={(e) => setForm((f) => ({ ...f, workoutStyle: e.target.value }))}
              className="nk-input"
            >
              <option value="auto">Tự động theo hồ sơ</option>
              <option value="home">Tại nhà (không cần tạ)</option>
              <option value="gym">Phòng Gym</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 text-xs text-[#5a5c53]">
            <span>Ngày mong muốn (tuỳ chọn):</span>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="nk-input w-40 h-9 text-xs font-mono-num"
            />
          </div>
          <button type="submit" disabled={designing} className="nk-btn-primary">
            <Sparkles className="w-4 h-4" />
            {designing ? 'Đang thiết kế...' : 'Thiết kế lộ trình'}
          </button>
        </div>
      </form>

      {err && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[#fbe9e7] border border-[#f2c6c2] text-[#9e2a1f]">
          {err}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl px-4 py-3 text-sm bg-[#2e5b44]/10 border border-[#2e5b44]/25 text-[#2e5b44] flex flex-wrap items-center justify-between gap-2"
        >
          <span>{notice}</span>
          <div className="flex items-center gap-3 text-xs font-medium">
            <button type="button" onClick={() => onNavigate('nutrition')} className="underline cursor-pointer">
              Mở Dinh dưỡng
            </button>
            <button type="button" onClick={() => onNavigate('workouts')} className="underline cursor-pointer">
              Mở Tập luyện
            </button>
          </div>
        </div>
      )}

      {loading && !roadmap ? (
        <div className="nk-card p-10 text-center text-sm text-[#5a5c53]">Đang tính toán lộ trình cá nhân...</div>
      ) : roadmap && (
        <>
          {roadmap.bodyMetrics.isTeen && roadmap.bodyMetrics.teenGuidance && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <strong>Lưu ý dinh dưỡng tuổi 12–17:</strong> {roadmap.bodyMetrics.teenGuidance}
            </div>
          )}

          {roadmap.projection.deadlineWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <strong>Lưu ý tiến độ an toàn:</strong> {roadmap.projection.deadlineWarning}
            </div>
          )}

          {/* 1. Completion Projection & Milestones */}
          <section className="nk-card p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2e5b44]">
                  <Target className="w-4 h-4" />
                  Dự kiến hoàn thành mục tiêu: {roadmap.goalLabel}
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-medium font-mono-num text-[#22261f]">
                    {formatViDate(roadmap.projection.estimatedCompletionDate)}
                  </span>
                  <span className="text-sm font-mono-num text-[#2e5b44] font-medium">
                    (~{roadmap.projection.estimatedWeeks} tuần)
                  </span>
                </div>
                <p className="text-xs text-[#5a5c53] mt-1">{roadmap.projection.timelineNote}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center shrink-0">
                <div className="nk-surface px-3.5 py-2.5">
                  <div className="text-[11px] text-[#5a5c53]">Hiện tại</div>
                  <div className="text-base font-medium font-mono-num">{roadmap.bodyMetrics.currentWeightKg} kg</div>
                </div>
                <div className="nk-surface px-3.5 py-2.5">
                  <div className="text-[11px] text-[#5a5c53]">Mục tiêu</div>
                  <div className="text-base font-medium font-mono-num text-[#2e5b44]">
                    {roadmap.bodyMetrics.targetWeightKg} kg
                  </div>
                </div>
                <div className="nk-surface px-3.5 py-2.5">
                  <div className="text-[11px] text-[#5a5c53]">BMI dự kiến</div>
                  <div className="text-base font-medium font-mono-num">{roadmap.bodyMetrics.targetBmi}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {roadmap.projection.milestones.map((ms) => (
                <div key={ms.step} className="p-4 rounded-xl bg-white border border-black/8 space-y-1">
                  <div className="text-xs font-medium text-[#2e5b44]">{ms.title}</div>
                  <div className="text-lg font-medium font-mono-num">{ms.targetWeight} kg</div>
                  <p className="text-xs text-[#5a5c53]">{ms.focus}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Calories & Full Carb / Fat / Protein Targets */}
          <section className="nk-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#2e5b44]" />
                  Chỉ tiêu Calo & Đạm / Tinh bột / Chất béo mỗi ngày
                </h2>
                <p className="text-xs text-[#5a5c53]">
                  TDEE ước tính <span className="font-mono-num font-medium">{roadmap.bodyMetrics.tdee} kcal</span> · Mục tiêu nạp{' '}
                  <span className="font-mono-num font-medium text-[#2e5b44]">{roadmap.nutritionPlan.targetCalories} kcal/ngày</span> · Nước{' '}
                  <span className="font-mono-num font-medium">{roadmap.nutritionPlan.waterTargetMl} ml/ngày</span>
                </p>
              </div>
            </div>

            <div className="h-3 rounded-full overflow-hidden flex bg-[#e2d9cb]" aria-label="Tỷ lệ phân bổ Macro">
              <div
                className="bg-[#2e5b44] h-full"
                style={{ width: `${roadmap.macroBreakdown.protein.percent}%` }}
                title={`Đạm ${roadmap.macroBreakdown.protein.percent}%`}
              />
              <div
                className="bg-[#8a6d3b] h-full"
                style={{ width: `${roadmap.macroBreakdown.carbs.percent}%` }}
                title={`Tinh bột ${roadmap.macroBreakdown.carbs.percent}%`}
              />
              <div
                className="bg-[#5a5c53] h-full"
                style={{ width: `${roadmap.macroBreakdown.fat.percent}%` }}
                title={`Chất béo ${roadmap.macroBreakdown.fat.percent}%`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl bg-white border border-black/8">
                <div className="flex items-center justify-between text-xs text-[#5a5c53]">
                  <span className="font-medium text-[#2e5b44]">Đạm (Protein)</span>
                  <span className="font-mono-num">{roadmap.macroBreakdown.protein.percent}%</span>
                </div>
                <div className="text-2xl font-medium font-mono-num mt-1">{roadmap.macroBreakdown.protein.grams} g</div>
                <div className="text-xs text-[#5a5c53] font-mono-num mt-0.5">
                  {roadmap.macroBreakdown.protein.calories} kcal · Giữ và phục hồi cơ
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-black/8">
                <div className="flex items-center justify-between text-xs text-[#5a5c53]">
                  <span className="font-medium text-[#8a6d3b]">Tinh bột (Carbs)</span>
                  <span className="font-mono-num">{roadmap.macroBreakdown.carbs.percent}%</span>
                </div>
                <div className="text-2xl font-medium font-mono-num mt-1">{roadmap.macroBreakdown.carbs.grams} g</div>
                <div className="text-xs text-[#5a5c53] font-mono-num mt-0.5">
                  {roadmap.macroBreakdown.carbs.calories} kcal · Năng lượng vận động & học tập
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-black/8">
                <div className="flex items-center justify-between text-xs text-[#5a5c53]">
                  <span className="font-medium text-[#5a5c53]">Chất béo (Fat)</span>
                  <span className="font-mono-num">{roadmap.macroBreakdown.fat.percent}%</span>
                </div>
                <div className="text-2xl font-medium font-mono-num mt-1">{roadmap.macroBreakdown.fat.grams} g</div>
                <div className="text-xs text-[#5a5c53] font-mono-num mt-0.5">
                  {roadmap.macroBreakdown.fat.calories} kcal · Cân bằng hormone & hấp thu
                </div>
              </div>
            </div>
          </section>

          {/* 3. Nutrition Sample Menu */}
          <section className="nk-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#2e5b44]" />
                  Thực đơn mẫu chuẩn Việt Nam (1 ngày)
                </h2>
                <p className="text-xs text-[#5a5c53] font-mono-num">
                  Tổng thực đơn: {roadmap.nutritionPlan.menuTotals.calories} kcal · {roadmap.nutritionPlan.menuTotals.proteinG}g P · {roadmap.nutritionPlan.menuTotals.carbsG}g C · {roadmap.nutritionPlan.menuTotals.fatG}g F
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(applying)}
                onClick={() => handleApply({ logMealsDate: selectedDate })}
                className="nk-btn-secondary bg-white self-start sm:self-auto"
              >
                <Check className="w-4 h-4 text-[#2e5b44]" />
                {applying === 'meals' ? 'Đang ghi...' : `Áp dụng thực đơn vào ${formatViDate(selectedDate)}`}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmap.nutritionPlan.meals.map((meal) => (
                <div key={meal.mealType} className="p-4 rounded-xl bg-white border border-black/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{meal.label}</span>
                    <span className="text-xs font-mono-num text-[#2e5b44] font-medium">
                      {meal.calories} kcal · {meal.proteinG}g P · {meal.carbsG}g C · {meal.fatG}g F
                    </span>
                  </div>
                  <ul className="divide-y divide-black/6 text-xs">
                    {meal.items.map((it, idx) => (
                      <li key={`${it.foodId}-${idx}`} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-sm">{it.foodName}</span>
                          <span className="text-[#5a5c53] ml-1.5 font-mono-num">
                            ({it.servingLabel}{it.servings !== 1 ? ` ×${it.servings}` : ''})
                          </span>
                        </div>
                        <span className="font-mono-num text-[#5a5c53] shrink-0">{it.calories} kcal</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Workout Weekly Schedule */}
          <section className="nk-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[#2e5b44]" />
                  Lộ trình Tập luyện trong tuần ({roadmap.sessionsPerWeek} buổi)
                </h2>
                <p className="text-xs text-[#5a5c53] font-mono-num">
                  Tổng thời lượng: {roadmap.workoutPlan.weeklyMinutes} phút/tuần · Ước tính đốt {roadmap.workoutPlan.weeklyCaloriesBurned} kcal/tuần
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(applying)}
                onClick={() => handleApply({ saveWorkoutPlan: true })}
                className="nk-btn-secondary bg-white self-start sm:self-auto"
              >
                <Check className="w-4 h-4 text-[#2e5b44]" />
                {applying === 'workout' ? 'Đang lưu...' : 'Lưu thành Lịch tập của tôi'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmap.workoutPlan.schedule.map((dayPlan) => (
                <div key={dayPlan.day} className="p-4 rounded-xl bg-white border border-black/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono-num px-2 py-0.5 rounded bg-[#efe9e0] mr-2">
                        {dayPlan.dayLabel}
                      </span>
                      <span className="text-sm font-medium">{dayPlan.focus}</span>
                    </div>
                    <span className="text-xs font-mono-num text-[#2e5b44]">
                      {dayPlan.sessionMinutes}p · −{dayPlan.sessionCalories} kcal
                    </span>
                  </div>
                  <ul className="divide-y divide-black/6 text-xs">
                    {dayPlan.items.map((ex) => (
                      <li key={`${dayPlan.day}-${ex.exerciseId}`} className="py-2 flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{ex.exerciseName}</span>
                        <span className="font-mono-num text-[#5a5c53]">
                          {ex.category === 'strength'
                            ? `${ex.targetSets}×${ex.targetReps} · ${ex.targetDurationMin}p`
                            : `${ex.targetDurationMin} phút`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={Boolean(applying)}
                onClick={() => handleApply({ saveWorkoutPlan: true, logMealsDate: selectedDate })}
                className="nk-btn-primary"
              >
                <CalendarCheck className="w-4 h-4" />
                {applying === 'both'
                  ? 'Đang áp dụng...'
                  : `Áp dụng cả Lịch tập & Thực đơn vào ${formatViDate(selectedDate)}`}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
