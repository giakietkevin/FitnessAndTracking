import { useCallback, useEffect, useState } from 'react';
import { Check, Dumbbell, RefreshCw, Save, Search, ShieldCheck, Trash2, Utensils, X, XCircle } from 'lucide-react';
import { api } from '../api/client.js';

const FOOD_CATEGORIES = [
  { id: 'meal', label: 'Món hoàn chỉnh' },
  { id: 'protein', label: 'Đạm' },
  { id: 'carb', label: 'Tinh bột' },
  { id: 'veggie', label: 'Rau củ' },
  { id: 'fruit', label: 'Trái cây' },
  { id: 'dairy', label: 'Sữa' },
  { id: 'drink', label: 'Đồ uống' },
  { id: 'general', label: 'Khác' }
];

const EXERCISE_CATEGORIES = [
  { id: 'strength', label: 'Kháng lực / Gym' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'mobility', label: 'Giãn cơ' }
];

const STATUS_FILTERS = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' }
];

const STATUS_BADGE = {
  pending: { text: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  approved: { text: 'Đã duyệt vào thư viện chung', cls: 'bg-[#2e5b44]/12 text-[#2e5b44] border-[#2e5b44]/25' },
  rejected: { text: 'Đã từ chối', cls: 'bg-[#fbe9e7] text-[#9e2a1f] border-[#f2c6c2]' }
};

function makeFoodDraft(item) {
  return {
    name: item.name,
    category: item.category || 'meal',
    servingLabel: item.servingLabel || '1 phần',
    gramsPerServing: item.gramsPerServing ?? 100,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    isNatural: item.isNatural ?? true,
    adminNote: item.adminNote || ''
  };
}

function makeExerciseDraft(item) {
  return {
    name: item.name,
    category: item.category || 'strength',
    muscleGroup: item.muscleGroup || 'full_body',
    metValue: item.metValue ?? 5.0,
    defaultSets: item.defaultSets ?? 3,
    defaultReps: item.defaultReps ?? 10,
    defaultDurationMin: item.defaultDurationMin ?? 20,
    adminNote: item.adminNote || ''
  };
}

export default function AdminPage({ onPendingCountChange }) {
  const [section, setSection] = useState('foods-queue');
  const [overview, setOverview] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const [foodSubs, setFoodSubs] = useState([]);
  const [foodCounts, setFoodCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [foodDrafts, setFoodDrafts] = useState({});

  const [exSubs, setExSubs] = useState([]);
  const [exCounts, setExCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [exDrafts, setExDrafts] = useState({});

  const [catalogType, setCatalogType] = useState('foods');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [sharedFoods, setSharedFoods] = useState([]);
  const [sharedExercises, setSharedExercises] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadOverview = useCallback(async () => {
    const ov = await api.getAdminOverview();
    setOverview(ov);
    onPendingCountChange?.((ov.pendingFoodSubmissions || 0) + (ov.pendingExerciseSubmissions || 0));
  }, [onPendingCountChange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadOverview();
      if (section === 'foods-queue') {
        const res = await api.getAdminFoodSubmissions(statusFilter);
        setFoodSubs(res.submissions);
        setFoodCounts(res.counts);
        setFoodDrafts((prev) => {
          const next = { ...prev };
          for (const s of res.submissions) {
            if (!next[s.id]) next[s.id] = makeFoodDraft(s);
          }
          return next;
        });
      } else if (section === 'exercises-queue') {
        const res = await api.getAdminExerciseSubmissions(statusFilter);
        setExSubs(res.submissions);
        setExCounts(res.counts);
        setExDrafts((prev) => {
          const next = { ...prev };
          for (const s of res.submissions) {
            if (!next[s.id]) next[s.id] = makeExerciseDraft(s);
          }
          return next;
        });
      } else {
        const [fRes, eRes] = await Promise.all([
          api.getFoods(catalogQuery, 'all'),
          api.getExercises(catalogQuery, '')
        ]);
        setSharedFoods(fRes.foods.filter((f) => !f.isCustom));
        setSharedExercises(eRes.exercises.filter((ex) => !ex.isCustom));
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [section, statusFilter, catalogQuery, loadOverview]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleFoodAction(sub, action) {
    const draft = foodDrafts[sub.id] || makeFoodDraft(sub);
    setBusyKey(`food-${sub.id}`);
    setFeedback(null);
    try {
      if (action === 'approve') {
        await api.approveFoodSubmission(sub.id, {
          name: draft.name,
          category: draft.category,
          servingLabel: draft.servingLabel,
          gramsPerServing: Number(draft.gramsPerServing || 0),
          calories: Number(draft.calories),
          proteinG: Number(draft.proteinG || 0),
          carbsG: Number(draft.carbsG || 0),
          fatG: Number(draft.fatG || 0),
          isNatural: Boolean(draft.isNatural),
          adminNote: draft.adminNote || ''
        });
        setFeedback({ type: 'success', text: `Đã duyệt món "${draft.name}" vào thư viện chung.` });
      } else {
        await api.rejectFoodSubmission(sub.id, draft.adminNote || '');
        setFeedback({ type: 'success', text: `Đã từ chối đề xuất "${sub.name}".` });
      }
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleExerciseAction(sub, action) {
    const draft = exDrafts[sub.id] || makeExerciseDraft(sub);
    setBusyKey(`ex-${sub.id}`);
    setFeedback(null);
    try {
      if (action === 'approve') {
        await api.approveExerciseSubmission(sub.id, {
          name: draft.name,
          category: draft.category,
          muscleGroup: draft.muscleGroup,
          metValue: Number(draft.metValue),
          defaultSets: Number(draft.defaultSets),
          defaultReps: Number(draft.defaultReps),
          defaultDurationMin: Number(draft.defaultDurationMin),
          adminNote: draft.adminNote || ''
        });
        setFeedback({ type: 'success', text: `Đã duyệt bài tập "${draft.name}" vào thư viện chung.` });
      } else {
        await api.rejectExerciseSubmission(sub.id, draft.adminNote || '');
        setFeedback({ type: 'success', text: `Đã từ chối đề xuất "${sub.name}".` });
      }
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveCatalogEdit(e) {
    e.preventDefault();
    if (!editingItem) return;
    setBusyKey(`cat-${editingItem.kind}-${editingItem.id}`);
    setFeedback(null);
    try {
      if (editingItem.kind === 'food') {
        await api.updateAdminFood(editingItem.id, {
          name: editingItem.draft.name,
          category: editingItem.draft.category,
          servingLabel: editingItem.draft.servingLabel,
          gramsPerServing: Number(editingItem.draft.gramsPerServing),
          calories: Number(editingItem.draft.calories),
          proteinG: Number(editingItem.draft.proteinG),
          carbsG: Number(editingItem.draft.carbsG),
          fatG: Number(editingItem.draft.fatG)
        });
      } else {
        await api.updateAdminExercise(editingItem.id, {
          name: editingItem.draft.name,
          category: editingItem.draft.category,
          muscleGroup: editingItem.draft.muscleGroup,
          metValue: Number(editingItem.draft.metValue),
          defaultSets: Number(editingItem.draft.defaultSets),
          defaultReps: Number(editingItem.draft.defaultReps),
          defaultDurationMin: Number(editingItem.draft.defaultDurationMin)
        });
      }
      setFeedback({ type: 'success', text: `Đã cập nhật "${editingItem.draft.name}".` });
      setEditingItem(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteCatalog(kind, item) {
    setBusyKey(`del-${kind}-${item.id}`);
    setFeedback(null);
    try {
      if (kind === 'food') {
        await api.deleteAdminFood(item.id);
      } else {
        await api.deleteAdminExercise(item.id);
      }
      setFeedback({ type: 'success', text: `Đã xóa "${item.name}" khỏi thư viện chung.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2e5b44] mb-1">
            <ShieldCheck className="w-4 h-4" />
            Trung tâm kiểm duyệt & danh mục chung
          </div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Quản trị hệ thống</h1>
          <p className="text-sm text-[#5a5c53]">
            Duyệt đóng góp món ăn, bài tập từ người dùng và quản lý kho dữ liệu chuẩn chung.
          </p>
        </div>

        <button type="button" onClick={loadData} className="nk-btn-secondary self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Overview Stats Strip */}
      {overview && (
        <div className="nk-card p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <div className="text-xs text-[#5a5c53]">Người dùng</div>
            <div className="text-xl font-medium font-mono-num mt-0.5">{overview.usersCount}</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">Món ăn chung</div>
            <div className="text-xl font-medium font-mono-num mt-0.5">{overview.sharedFoodsCount}</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">Bài tập chung</div>
            <div className="text-xl font-medium font-mono-num mt-0.5">{overview.sharedExercisesCount}</div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">Chờ duyệt (Món / Bài)</div>
            <div className="text-xl font-medium font-mono-num text-[#2e5b44] mt-0.5">
              {overview.pendingFoodSubmissions} / {overview.pendingExerciseSubmissions}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#5a5c53]">Log 7 ngày (Ăn / Tập)</div>
            <div className="text-xl font-medium font-mono-num mt-0.5">
              {overview.foodLogsLast7Days} / {overview.workoutLogsLast7Days}
            </div>
          </div>
        </div>
      )}

      {/* Main Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-black/10 pb-3">
        {[
          { id: 'foods-queue', label: `Duyệt món ăn (${overview?.pendingFoodSubmissions ?? foodCounts.pending})`, icon: Utensils },
          { id: 'exercises-queue', label: `Duyệt bài tập (${overview?.pendingExerciseSubmissions ?? exCounts.pending})`, icon: Dumbbell },
          { id: 'catalog', label: 'Kho món & bài tập chung', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium transition cursor-pointer ${
                active ? 'bg-[#2e5b44] text-white' : 'bg-white border border-black/10 text-[#5a5c53] hover:text-[#22261f]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section !== 'catalog' && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            const counts = section === 'foods-queue' ? foodCounts : exCounts;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer inline-flex items-center gap-2 ${
                  active
                    ? 'bg-[#22261f] text-[#efe9e0]'
                    : 'bg-white border border-black/10 text-[#5a5c53] hover:text-[#22261f]'
                }`}
              >
                <span>{f.label}</span>
                <span className="font-mono-num opacity-80">({counts[f.id] ?? 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm border ${
            feedback.type === 'error'
              ? 'bg-[#fbe9e7] border-[#f2c6c2] text-[#9e2a1f]'
              : 'bg-[#2e5b44]/10 border-[#2e5b44]/25 text-[#2e5b44]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="nk-card p-8 text-center text-sm text-[#5a5c53]">Đang tải dữ liệu quản trị...</div>
      ) : section === 'foods-queue' ? (
        foodSubs.length === 0 ? (
          <div className="nk-card p-10 text-center space-y-2">
            <Utensils className="w-8 h-8 text-[#2e5b44] mx-auto opacity-80" />
            <div className="text-base font-medium">Không có yêu cầu món ăn nào ở mục này</div>
          </div>
        ) : (
          <div className="space-y-4">
            {foodSubs.map((sub) => {
              const draft = foodDrafts[sub.id] || makeFoodDraft(sub);
              const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
              const isPending = sub.status === 'pending';
              const updateFoodDraft = (field, val) =>
                setFoodDrafts((p) => ({ ...p, [sub.id]: { ...draft, [field]: val } }));

              return (
                <article key={sub.id} className="nk-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-black/8 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-medium">{sub.name}</h2>
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-xs text-[#5a5c53] mt-1">
                        Người gửi: <span className="font-medium text-[#22261f]">{sub.submitterName}</span> ({sub.submitterEmail})
                      </p>
                      {sub.note && <p className="text-xs bg-[#efe9e0] rounded-lg px-3 py-1 mt-1.5 inline-block">{sub.note}</p>}
                    </div>
                    <span className="text-xs font-mono-num text-[#5a5c53]">#{sub.id}</span>
                  </div>

                  {isPending ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-[#5a5c53] mb-1">Tên chuẩn hóa</label>
                          <input type="text" value={draft.name} onChange={(e) => updateFoodDraft('name', e.target.value)} className="nk-input" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Nhóm</label>
                          <select value={draft.category} onChange={(e) => updateFoodDraft('category', e.target.value)} className="nk-input">
                            {FOOD_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Khẩu phần</label>
                          <input type="text" value={draft.servingLabel} onChange={(e) => updateFoodDraft('servingLabel', e.target.value)} className="nk-input" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Khối lượng (g)</label>
                          <input type="number" min={0} value={draft.gramsPerServing} onChange={(e) => updateFoodDraft('gramsPerServing', e.target.value)} className="nk-input font-mono-num" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Calo (kcal)</label>
                          <input type="number" min={0} value={draft.calories} onChange={(e) => updateFoodDraft('calories', e.target.value)} className="nk-input font-mono-num" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">P / C / F (g)</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input type="number" step="0.1" value={draft.proteinG} onChange={(e) => updateFoodDraft('proteinG', e.target.value)} className="nk-input font-mono-num px-2 text-center" />
                            <input type="number" step="0.1" value={draft.carbsG} onChange={(e) => updateFoodDraft('carbsG', e.target.value)} className="nk-input font-mono-num px-2 text-center" />
                            <input type="number" step="0.1" value={draft.fatG} onChange={(e) => updateFoodDraft('fatG', e.target.value)} className="nk-input font-mono-num px-2 text-center" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Phản hồi Admin</label>
                          <input type="text" value={draft.adminNote} onChange={(e) => updateFoodDraft('adminNote', e.target.value)} placeholder="Ghi chú..." className="nk-input" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button type="button" disabled={busyKey === `food-${sub.id}`} onClick={() => handleFoodAction(sub, 'reject')} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#fbe9e7] text-[#9e2a1f] border border-[#f2c6c2] text-sm font-medium cursor-pointer">
                          <XCircle className="w-4 h-4" /> Từ chối
                        </button>
                        <button type="button" disabled={busyKey === `food-${sub.id}`} onClick={() => handleFoodAction(sub, 'approve')} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#2e5b44] text-white text-sm font-medium cursor-pointer">
                          <Check className="w-4 h-4" /> Duyệt & thêm chung
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-[#5a5c53] font-mono-num">
                      {sub.servingLabel} · {sub.calories} kcal · {sub.proteinG}g P · {sub.carbsG}g C · {sub.fatG}g F
                      {sub.adminNote && <span className="font-sans ml-3 text-[#22261f]">Phản hồi: {sub.adminNote}</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : section === 'exercises-queue' ? (
        exSubs.length === 0 ? (
          <div className="nk-card p-10 text-center space-y-2">
            <Dumbbell className="w-8 h-8 text-[#2e5b44] mx-auto opacity-80" />
            <div className="text-base font-medium">Không có đề xuất bài tập nào ở mục này</div>
          </div>
        ) : (
          <div className="space-y-4">
            {exSubs.map((sub) => {
              const draft = exDrafts[sub.id] || makeExerciseDraft(sub);
              const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
              const isPending = sub.status === 'pending';
              const updateExDraft = (field, val) =>
                setExDrafts((p) => ({ ...p, [sub.id]: { ...draft, [field]: val } }));

              return (
                <article key={sub.id} className="nk-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-black/8 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-medium">{sub.name}</h2>
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <p className="text-xs text-[#5a5c53] mt-1">
                        Người gửi: <span className="font-medium text-[#22261f]">{sub.submitterName}</span> ({sub.submitterEmail})
                      </p>
                      {sub.note && <p className="text-xs bg-[#efe9e0] rounded-lg px-3 py-1 mt-1.5 inline-block">{sub.note}</p>}
                    </div>
                    <span className="text-xs font-mono-num text-[#5a5c53]">#{sub.id}</span>
                  </div>

                  {isPending ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-[#5a5c53] mb-1">Tên bài tập</label>
                          <input type="text" value={draft.name} onChange={(e) => updateExDraft('name', e.target.value)} className="nk-input" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Loại bài</label>
                          <select value={draft.category} onChange={(e) => updateExDraft('category', e.target.value)} className="nk-input">
                            {EXERCISE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Nhóm cơ</label>
                          <input type="text" value={draft.muscleGroup} onChange={(e) => updateExDraft('muscleGroup', e.target.value)} className="nk-input" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">MET</label>
                          <input type="number" step="0.1" value={draft.metValue} onChange={(e) => updateExDraft('metValue', e.target.value)} className="nk-input font-mono-num" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5a5c53] mb-1">Thời lượng gợi ý (phút)</label>
                          <input type="number" min={1} value={draft.defaultDurationMin} onChange={(e) => updateExDraft('defaultDurationMin', e.target.value)} className="nk-input font-mono-num" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-[#5a5c53] mb-1">Phản hồi Admin</label>
                          <input type="text" value={draft.adminNote} onChange={(e) => updateExDraft('adminNote', e.target.value)} placeholder="Ghi chú..." className="nk-input" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button type="button" disabled={busyKey === `ex-${sub.id}`} onClick={() => handleExerciseAction(sub, 'reject')} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#fbe9e7] text-[#9e2a1f] border border-[#f2c6c2] text-sm font-medium cursor-pointer">
                          <XCircle className="w-4 h-4" /> Từ chối
                        </button>
                        <button type="button" disabled={busyKey === `ex-${sub.id}`} onClick={() => handleExerciseAction(sub, 'approve')} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#2e5b44] text-white text-sm font-medium cursor-pointer">
                          <Check className="w-4 h-4" /> Duyệt & thêm chung
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-[#5a5c53] font-mono-num">
                      {sub.category} · MET {sub.metValue} · {sub.defaultDurationMin} phút
                      {sub.adminNote && <span className="font-sans ml-3 text-[#22261f]">Phản hồi: {sub.adminNote}</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCatalogType('foods'); setEditingItem(null); }}
                className={`px-3.5 h-10 rounded-xl text-sm font-medium cursor-pointer ${
                  catalogType === 'foods' ? 'bg-[#22261f] text-[#efe9e0]' : 'bg-white border border-black/10 text-[#5a5c53]'
                }`}
              >
                Món ăn chung ({sharedFoods.length})
              </button>
              <button
                type="button"
                onClick={() => { setCatalogType('exercises'); setEditingItem(null); }}
                className={`px-3.5 h-10 rounded-xl text-sm font-medium cursor-pointer ${
                  catalogType === 'exercises' ? 'bg-[#22261f] text-[#efe9e0]' : 'bg-white border border-black/10 text-[#5a5c53]'
                }`}
              >
                Bài tập chung ({sharedExercises.length})
              </button>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#5a5c53] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Tìm trong thư viện chung..."
                spellCheck={false}
                className="nk-input pl-10 pr-10"
              />
              {catalogQuery && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => setCatalogQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#5a5c53] hover:text-[#22261f] hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {editingItem && (
            <form onSubmit={handleSaveCatalogEdit} className="nk-card p-5 space-y-3 border-2 border-[#2e5b44]/30">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">Chỉnh sửa: {editingItem.draft.name}</h3>
                <button type="button" onClick={() => setEditingItem(null)} className="text-xs underline text-[#5a5c53] cursor-pointer">
                  Hủy
                </button>
              </div>
              {editingItem.kind === 'food' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input type="text" required value={editingItem.draft.name} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, name: e.target.value } }))} className="nk-input col-span-2" />
                  <input type="text" value={editingItem.draft.servingLabel} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, servingLabel: e.target.value } }))} className="nk-input" />
                  <input type="number" min={0} value={editingItem.draft.calories} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, calories: e.target.value } }))} className="nk-input font-mono-num" />
                  <input type="number" step="0.1" value={editingItem.draft.proteinG} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, proteinG: e.target.value } }))} className="nk-input font-mono-num" placeholder="P" />
                  <input type="number" step="0.1" value={editingItem.draft.carbsG} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, carbsG: e.target.value } }))} className="nk-input font-mono-num" placeholder="C" />
                  <input type="number" step="0.1" value={editingItem.draft.fatG} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, fatG: e.target.value } }))} className="nk-input font-mono-num" placeholder="F" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input type="text" required value={editingItem.draft.name} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, name: e.target.value } }))} className="nk-input col-span-2" />
                  <input type="number" step="0.1" value={editingItem.draft.metValue} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, metValue: e.target.value } }))} className="nk-input font-mono-num" />
                  <input type="number" min={1} value={editingItem.draft.defaultDurationMin} onChange={(e) => setEditingItem((it) => ({ ...it, draft: { ...it.draft, defaultDurationMin: e.target.value } }))} className="nk-input font-mono-num" />
                </div>
              )}
              <button type="submit" className="nk-btn-primary">
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </form>
          )}

          <div className="nk-card divide-y divide-black/8">
            {(catalogType === 'foods' ? sharedFoods : sharedExercises).map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-[#5a5c53] font-mono-num">
                    {catalogType === 'foods'
                      ? `${item.servingLabel} · ${item.calories} kcal · ${item.proteinG}g P · ${item.carbsG}g C · ${item.fatG}g F`
                      : `${item.category} · ${item.muscleGroup} · MET ${item.metValue} · ${item.defaultDurationMin} phút`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        kind: catalogType === 'foods' ? 'food' : 'exercise',
                        id: item.id,
                        draft: catalogType === 'foods' ? makeFoodDraft(item) : makeExerciseDraft(item)
                      })
                    }
                    className="px-3 h-8 rounded-lg bg-[#efe9e0] text-xs font-medium text-[#22261f] hover:bg-[#e2d9cb] cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `del-${catalogType === 'foods' ? 'food' : 'exercise'}-${item.id}`}
                    onClick={() => handleDeleteCatalog(catalogType === 'foods' ? 'food' : 'exercise', item)}
                    className="p-1.5 text-[#5a5c53] hover:text-[#9e2a1f] cursor-pointer"
                    aria-label={`Xóa ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
