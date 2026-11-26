import { useCallback, useEffect, useState } from 'react';
import { Check, Dumbbell, Plus, Send, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';

const EX_SUB_STATUS = {
  pending: { text: 'Chờ Admin duyệt', cls: 'bg-amber-100 text-amber-900' },
  approved: { text: 'Đã duyệt chung', cls: 'bg-[#2e5b44]/12 text-[#2e5b44]' },
  rejected: { text: 'Từ chối', cls: 'bg-[#fbe9e7] text-[#9e2a1f]' }
};

const DAYS = [
  { id: 'Mon', label: 'T2' },
  { id: 'Tue', label: 'T3' },
  { id: 'Wed', label: 'T4' },
  { id: 'Thu', label: 'T5' },
  { id: 'Fri', label: 'T6' },
  { id: 'Sat', label: 'T7' },
  { id: 'Sun', label: 'CN' }
];

const CAT_LABELS = {
  strength: 'Kháng lực / Gym',
  cardio: 'Cardio',
  mobility: 'Giãn cơ'
};

export default function WorkoutsPage({ selectedDate }) {
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ count: 0, totalDurationMin: 0, totalCaloriesBurned: 0 });
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    goal: 'cut',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    notes: '',
    items: []
  });
  const [planErr, setPlanErr] = useState('');

  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    exerciseId: '',
    title: '',
    category: 'strength',
    sets: 3,
    reps: 10,
    weightKg: '',
    durationMin: 25,
    distanceKm: ''
  });
  const [logErr, setLogErr] = useState('');
  const [exSubmissions, setExSubmissions] = useState([]);
  const [showExModal, setShowExModal] = useState(false);
  const [exForm, setExForm] = useState({
    name: '',
    category: 'strength',
    muscleGroup: 'full_body',
    metValue: 5.5,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationMin: 20,
    submitForPublic: true,
    submissionNote: ''
  });
  const [exErr, setExErr] = useState('');
  const [exNotice, setExNotice] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, lRes, eRes, subRes] = await Promise.all([
        api.getWorkoutPlans(),
        api.getWorkoutLogs(selectedDate),
        api.getExercises(),
        api.getMyExerciseSubmissions().catch(() => ({ submissions: [] }))
      ]);
      setPlans(pRes.plans);
      setLogs(lRes.logs);
      setSummary(lRes.summary);
      setExercises(eRes.exercises);
      setExSubmissions(subRes.submissions || []);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function togglePlanDay(dayId) {
    setPlanForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(dayId)
        ? f.daysOfWeek.filter((d) => d !== dayId)
        : [...f.daysOfWeek, dayId]
    }));
  }

  function addExerciseToPlan(ex) {
    setPlanForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          targetSets: ex.category === 'strength' ? ex.defaultSets : null,
          targetReps: ex.category === 'strength' ? ex.defaultReps : null,
          targetWeightKg: null,
          targetDurationMin: ex.defaultDurationMin
        }
      ]
    }));
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    setPlanErr('');
    try {
      await api.createWorkoutPlan(planForm);
      setPlanForm({ name: '', goal: 'cut', daysOfWeek: ['Mon', 'Wed', 'Fri'], notes: '', items: [] });
      setShowPlanModal(false);
      await loadAll();
    } catch (err) {
      setPlanErr(err.message);
    }
  }

  async function handleCompletePlan(planId) {
    await api.completeWorkoutPlan(planId, selectedDate);
    await loadAll();
  }

  async function handleDeletePlan(planId) {
    await api.deleteWorkoutPlan(planId);
    await loadAll();
  }

  function handleSelectExerciseForLog(exId) {
    const ex = exercises.find((e) => String(e.id) === String(exId));
    if (!ex) {
      setLogForm((f) => ({ ...f, exerciseId: '' }));
      return;
    }
    setLogForm((f) => ({
      ...f,
      exerciseId: ex.id,
      title: ex.name,
      category: ex.category,
      sets: ex.defaultSets || 3,
      reps: ex.defaultReps || 10,
      durationMin: ex.defaultDurationMin || 20
    }));
  }

  async function handleSaveWorkoutLog(e) {
    e.preventDefault();
    setLogErr('');
    try {
      await api.createWorkoutLog({
        date: selectedDate,
        exerciseId: logForm.exerciseId || null,
        title: logForm.title,
        category: logForm.category,
        sets: logForm.category === 'strength' ? Number(logForm.sets) : null,
        reps: logForm.category === 'strength' ? Number(logForm.reps) : null,
        weightKg: logForm.category === 'strength' && logForm.weightKg !== '' ? Number(logForm.weightKg) : null,
        durationMin: Number(logForm.durationMin),
        distanceKm: logForm.category === 'cardio' && logForm.distanceKm !== '' ? Number(logForm.distanceKm) : null
      });
      setShowLogModal(false);
      await loadAll();
    } catch (err) {
      setLogErr(err.message);
    }
  }

  async function handleDeleteLog(id) {
    await api.deleteWorkoutLog(id);
    await loadAll();
  }

  async function handleCreateExercise(e) {
    e.preventDefault();
    setExErr('');
    setExNotice('');
    try {
      const res = await api.createExercise({
        name: exForm.name,
        category: exForm.category,
        muscleGroup: exForm.muscleGroup,
        metValue: Number(exForm.metValue),
        defaultSets: Number(exForm.defaultSets),
        defaultReps: Number(exForm.defaultReps),
        defaultDurationMin: Number(exForm.defaultDurationMin),
        submitForPublic: Boolean(exForm.submitForPublic),
        submissionNote: exForm.submissionNote
      });
      setShowExModal(false);
      setExForm({
        name: '',
        category: 'strength',
        muscleGroup: 'full_body',
        metValue: 5.5,
        defaultSets: 3,
        defaultReps: 10,
        defaultDurationMin: 20,
        submitForPublic: true,
        submissionNote: ''
      });
      await loadAll();
      setExNotice(
        res.submission
          ? `Đã thêm "${res.exercise.name}" và gửi Admin duyệt vào thư viện bài tập chung.`
          : `Đã thêm bài tập riêng "${res.exercise.name}".`
      );
    } catch (err) {
      setExErr(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Kế hoạch & Nhật ký tập luyện</h1>
          <p className="text-sm text-[#5a5c53]">Tạo lịch tập tuần cho Gym hoặc chạy bộ, hoàn thành cả buổi chỉ với 1 chạm.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => setShowExModal(true)} className="nk-btn-secondary bg-white">
            <Send className="w-4 h-4" />
            Đề xuất bài tập
          </button>
          <button type="button" onClick={() => setShowPlanModal(true)} className="nk-btn-secondary bg-white">
            <Plus className="w-4 h-4" />
            Tạo Plan tuần
          </button>
          <button type="button" onClick={() => setShowLogModal(true)} className="nk-btn-primary">
            <Plus className="w-4 h-4" />
            Log bài tập lẻ
          </button>
        </div>
      </div>

      {exNotice && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[#2e5b44]/10 border border-[#2e5b44]/25 text-[#2e5b44] flex items-center justify-between gap-2">
          <span>{exNotice}</span>
          <button type="button" onClick={() => setExNotice('')} className="text-xs underline cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="nk-card p-5 grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-[#5a5c53]">Bài tập hôm nay</div>
          <div className="text-2xl font-medium font-mono-num mt-0.5">{summary.count} bài</div>
        </div>
        <div>
          <div className="text-xs text-[#5a5c53]">Thời lượng</div>
          <div className="text-2xl font-medium font-mono-num mt-0.5">{summary.totalDurationMin} phút</div>
        </div>
        <div>
          <div className="text-xs text-[#5a5c53]">Ước tính tiêu hao</div>
          <div className="text-2xl font-medium font-mono-num text-[#2e5b44] mt-0.5">{summary.totalCaloriesBurned} kcal</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plans */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Lịch tập của bạn</h2>
          {loading && plans.length === 0 ? (
            <div className="nk-card p-6 text-sm text-[#5a5c53]">Đang tải...</div>
          ) : plans.length === 0 ? (
            <div className="nk-card p-6 text-sm text-[#5a5c53] space-y-3">
              <p>Bạn chưa tạo kế hoạch tập luyện nào.</p>
              <button type="button" onClick={() => setShowPlanModal(true)} className="nk-btn-secondary bg-white">
                <Plus className="w-4 h-4" /> Tạo kế hoạch đầu tiên
              </button>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="nk-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium">{plan.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {plan.daysOfWeek.map((d) => (
                        <span key={d} className="px-2 py-0.5 rounded-md bg-[#efe9e0] text-xs font-mono-num">
                          {DAYS.find((x) => x.id === d)?.label || d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCompletePlan(plan.id)}
                      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#2e5b44] text-white text-xs font-medium hover:bg-[#254a37] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Hoàn thành hôm nay
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ${plan.name}`}
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 text-[#5a5c53] hover:text-[#9e2a1f] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ul className="divide-y divide-black/8 text-sm">
                  {plan.items.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                      <span>{it.exerciseName}</span>
                      <span className="text-xs font-mono-num text-[#5a5c53]">
                        {it.category === 'strength'
                          ? `${it.targetSets || 3}×${it.targetReps || 10}${it.targetWeightKg ? ` · ${it.targetWeightKg}kg` : ''}`
                          : `${it.targetDurationMin || 25} phút`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Daily Logs */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Đã tập ngày {selectedDate}</h2>
          <div className="nk-card p-5">
            {logs.length === 0 ? (
              <div className="nk-surface p-5 text-sm text-[#5a5c53] flex items-center gap-2.5">
                <Dumbbell className="w-4 h-4 shrink-0" />
                Chưa có buổi tập nào được ghi cho ngày này.
              </div>
            ) : (
              <ul className="divide-y divide-black/8">
                {logs.map((item) => (
                  <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-[#5a5c53] font-mono-num">
                        {CAT_LABELS[item.category]}
                        {item.sets && item.reps ? ` · ${item.sets}×${item.reps}` : ''}
                        {item.weightKg ? ` · ${item.weightKg}kg` : ''}
                        {item.distanceKm ? ` · ${item.distanceKm}km` : ''}
                        {` · ${item.durationMin} phút`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-medium font-mono-num text-[#2e5b44]">
                        −{item.caloriesBurned} kcal
                      </span>
                      <button
                        type="button"
                        aria-label={`Xóa ${item.title}`}
                        onClick={() => handleDeleteLog(item.id)}
                        className="p-1.5 text-[#5a5c53] hover:text-[#9e2a1f] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* User Exercise Submissions Tracking */}
      {exSubmissions.length > 0 && (
        <section className="nk-card p-5 space-y-2.5">
          <h2 className="text-base font-medium">Đề xuất bài tập của bạn</h2>
          <ul className="divide-y divide-black/8">
            {exSubmissions.map((sub) => {
              const badge = EX_SUB_STATUS[sub.status] || EX_SUB_STATUS.pending;
              return (
                <li key={sub.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{sub.name}</div>
                    <div className="text-xs text-[#5a5c53] font-mono-num">
                      {CAT_LABELS[sub.category]} · MET {sub.metValue} · {sub.defaultDurationMin} phút
                    </div>
                    {sub.adminNote && <div className="text-xs text-[#5a5c53]">Admin: {sub.adminNote}</div>}
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full self-start sm:self-center ${badge.cls}`}>
                    {badge.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Create Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#faf7f2] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden border border-black/15 shadow-xl">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="text-lg font-medium">Tạo kế hoạch tập luyện</h3>
              <button type="button" onClick={() => setShowPlanModal(false)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên buổi tập / Plan</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Upper Body + Chạy nhẹ"
                  className="nk-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Ngày tập trong tuần</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const on = planForm.daysOfWeek.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => togglePlanDay(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                          on ? 'bg-[#2e5b44] text-white' : 'bg-[#efe9e0] text-[#5a5c53]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Chọn bài tập thêm vào plan</label>
                <div className="max-h-40 overflow-y-auto border border-black/12 rounded-xl bg-white divide-y divide-black/6">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                      <span>{ex.name} <small className="text-[#5a5c53]">({CAT_LABELS[ex.category]})</small></span>
                      <button
                        type="button"
                        onClick={() => addExerciseToPlan(ex)}
                        className="px-2.5 py-1 rounded-lg bg-[#efe9e0] text-xs font-medium hover:bg-[#e2d9cb] cursor-pointer"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {planForm.items.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Bài tập đã chọn ({planForm.items.length})</div>
                  {planForm.items.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-black/10 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{it.exerciseName}</span>
                      <div className="flex items-center gap-2">
                        {it.category === 'strength' ? (
                          <>
                            <input
                              type="number"
                              min={1}
                              value={it.targetSets || 3}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setPlanForm((f) => ({
                                  ...f,
                                  items: f.items.map((x, i) => (i === idx ? { ...x, targetSets: v } : x))
                                }));
                              }}
                              className="w-14 h-8 px-2 border rounded-lg text-xs font-mono-num"
                              title="Số hiệp"
                            />
                            <span className="text-xs">×</span>
                            <input
                              type="number"
                              min={1}
                              value={it.targetReps || 10}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setPlanForm((f) => ({
                                  ...f,
                                  items: f.items.map((x, i) => (i === idx ? { ...x, targetReps: v } : x))
                                }));
                              }}
                              className="w-14 h-8 px-2 border rounded-lg text-xs font-mono-num"
                              title="Số lần"
                            />
                            <input
                              type="number"
                              placeholder="kg"
                              value={it.targetWeightKg || ''}
                              onChange={(e) => {
                                const v = e.target.value ? Number(e.target.value) : null;
                                setPlanForm((f) => ({
                                  ...f,
                                  items: f.items.map((x, i) => (i === idx ? { ...x, targetWeightKg: v } : x))
                                }));
                              }}
                              className="w-16 h-8 px-2 border rounded-lg text-xs font-mono-num"
                              title="Mức tạ (kg)"
                            />
                          </>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={it.targetDurationMin || 25}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setPlanForm((f) => ({
                                ...f,
                                items: f.items.map((x, i) => (i === idx ? { ...x, targetDurationMin: v } : x))
                              }));
                            }}
                            className="w-20 h-8 px-2 border rounded-lg text-xs font-mono-num"
                            title="Phút"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setPlanForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          className="text-xs text-[#9e2a1f] px-1.5 cursor-pointer"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {planErr && <p className="text-sm text-[#9e2a1f]">{planErr}</p>}

              <button type="submit" className="nk-btn-primary w-full">
                Lưu kế hoạch tập luyện
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Log Exercise Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#faf7f2] w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden border border-black/15 shadow-xl">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="text-lg font-medium">Ghi nhận bài tập</h3>
              <button type="button" onClick={() => setShowLogModal(false)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveWorkoutLog} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chọn từ thư viện (hoặc tự nhập bên dưới)</label>
                <select
                  value={logForm.exerciseId}
                  onChange={(e) => handleSelectExerciseForLog(e.target.value)}
                  className="nk-input"
                >
                  <option value="">-- Nhập bài tập tùy ý --</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({CAT_LABELS[ex.category]})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Tên bài tập</label>
                  <input
                    type="text"
                    required
                    value={logForm.title}
                    onChange={(e) => setLogForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ví dụ: Chạy bộ công viên"
                    className="nk-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phân loại</label>
                  <select
                    value={logForm.category}
                    onChange={(e) => setLogForm((f) => ({ ...f, category: e.target.value }))}
                    className="nk-input"
                  >
                    <option value="strength">Kháng lực / Gym</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobility">Giãn cơ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    required
                    value={logForm.durationMin}
                    onChange={(e) => setLogForm((f) => ({ ...f, durationMin: e.target.value }))}
                    className="nk-input font-mono-num"
                  />
                </div>
                {logForm.category === 'strength' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số hiệp (Sets)</label>
                      <input
                        type="number"
                        min={1}
                        value={logForm.sets}
                        onChange={(e) => setLogForm((f) => ({ ...f, sets: e.target.value }))}
                        className="nk-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số lần (Reps)</label>
                      <input
                        type="number"
                        min={1}
                        value={logForm.reps}
                        onChange={(e) => setLogForm((f) => ({ ...f, reps: e.target.value }))}
                        className="nk-input font-mono-num"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Mức tạ (kg, tùy chọn)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={logForm.weightKg}
                        onChange={(e) => setLogForm((f) => ({ ...f, weightKg: e.target.value }))}
                        className="nk-input font-mono-num"
                      />
                    </div>
                  </>
                )}
                {logForm.category === 'cardio' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Quãng đường (km, tùy chọn)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={logForm.distanceKm}
                      onChange={(e) => setLogForm((f) => ({ ...f, distanceKm: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                )}
              </div>

              {logErr && <p className="text-sm text-[#9e2a1f]">{logErr}</p>}

              <button type="submit" className="nk-btn-primary w-full">
                Lưu buổi tập (tự tính calo)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Propose / Create Exercise Modal */}
      {showExModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#faf7f2] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden border border-black/15 shadow-xl">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="text-lg font-medium">Thêm & Đề xuất bài tập mới</h3>
              <button type="button" onClick={() => setShowExModal(false)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExercise} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên bài tập</label>
                <input
                  type="text"
                  required
                  value={exForm.name}
                  onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Đạp xe địa hình / Burpee"
                  className="nk-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại bài</label>
                  <select
                    value={exForm.category}
                    onChange={(e) => setExForm((f) => ({ ...f, category: e.target.value }))}
                    className="nk-input"
                  >
                    <option value="strength">Kháng lực / Gym</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobility">Giãn cơ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nhóm cơ / Vùng</label>
                  <input
                    type="text"
                    value={exForm.muscleGroup}
                    onChange={(e) => setExForm((f) => ({ ...f, muscleGroup: e.target.value }))}
                    placeholder="full_body, chest, legs..."
                    className="nk-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chỉ số MET</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={20}
                    value={exForm.metValue}
                    onChange={(e) => setExForm((f) => ({ ...f, metValue: e.target.value }))}
                    className="nk-input font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thời lượng gợi ý (phút)</label>
                  <input
                    type="number"
                    min={5}
                    value={exForm.defaultDurationMin}
                    onChange={(e) => setExForm((f) => ({ ...f, defaultDurationMin: e.target.value }))}
                    className="nk-input font-mono-num"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-sm pt-2 border-t border-black/8 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exForm.submitForPublic}
                  onChange={(e) => setExForm((f) => ({ ...f, submitForPublic: e.target.checked }))}
                  className="mt-1 accent-[#2e5b44] w-4 h-4"
                />
                <span>
                  <span className="font-medium block">Đề xuất đưa vào thư viện chung (Admin duyệt)</span>
                  <span className="text-xs text-[#5a5c53]">Giúp mọi người dùng có thêm bài tập này để lập plan.</span>
                </span>
              </label>

              {exForm.submitForPublic && (
                <input
                  type="text"
                  value={exForm.submissionNote}
                  onChange={(e) => setExForm((f) => ({ ...f, submissionNote: e.target.value }))}
                  placeholder="Ghi chú thêm cho Admin (tuỳ chọn)..."
                  className="nk-input"
                />
              )}

              {exErr && <p className="text-sm text-[#9e2a1f]">{exErr}</p>}
              <button type="submit" className="nk-btn-primary w-full">
                Lưu bài tập
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
