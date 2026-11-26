import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
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

function makeDraft(sub) {
  return {
    name: sub.name,
    category: sub.category || 'meal',
    servingLabel: sub.servingLabel || '1 phần',
    gramsPerServing: sub.gramsPerServing ?? 100,
    calories: sub.calories,
    proteinG: sub.proteinG,
    carbsG: sub.carbsG,
    fatG: sub.fatG,
    isNatural: sub.isNatural ?? true,
    adminNote: sub.adminNote || ''
  };
}

export default function AdminPage({ onPendingCountChange }) {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFoodSubmissions(statusFilter);
      setSubmissions(res.submissions);
      setCounts(res.counts);
      onPendingCountChange?.(res.counts.pending);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const sub of res.submissions) {
          if (!next[sub.id]) {
            next[sub.id] = makeDraft(sub);
          }
        }
        return next;
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onPendingCountChange]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  }

  async function handleApprove(sub) {
    const draft = drafts[sub.id] || makeDraft(sub);
    setBusyId(sub.id);
    setFeedback(null);
    try {
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
      setFeedback({
        type: 'success',
        text: `Đã duyệt "${draft.name}" và thêm vào danh sách món ăn chung cho toàn bộ người dùng.`
      });
      await loadQueue();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(sub) {
    const draft = drafts[sub.id] || makeDraft(sub);
    setBusyId(sub.id);
    setFeedback(null);
    try {
      await api.rejectFoodSubmission(sub.id, draft.adminNote || '');
      setFeedback({
        type: 'success',
        text: `Đã từ chối đề xuất "${sub.name}".`
      });
      await loadQueue();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2e5b44] mb-1">
            <ShieldCheck className="w-4 h-4" />
            Quản trị danh mục món ăn
          </div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Kiểm duyệt món ăn mới</h1>
          <p className="text-sm text-[#5a5c53]">
            Xem xét, hiệu chỉnh thông số calo/macro và quyết định đưa món do người dùng đề xuất vào danh sách chung.
          </p>
        </div>

        <button type="button" onClick={loadQueue} className="nk-btn-secondary self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer inline-flex items-center gap-2 ${
                active
                  ? 'bg-[#22261f] text-[#efe9e0]'
                  : 'bg-white border border-black/10 text-[#5a5c53] hover:text-[#22261f]'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono-num ${
                  active ? 'bg-white/15 text-[#efe9e0]' : 'bg-[#efe9e0] text-[#22261f]'
                }`}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

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
        <div className="nk-card p-8 text-center text-sm text-[#5a5c53]">Đang tải danh sách yêu cầu...</div>
      ) : submissions.length === 0 ? (
        <div className="nk-card p-10 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-[#2e5b44] mx-auto opacity-80" />
          <div className="text-base font-medium">Không có yêu cầu nào trong mục này</div>
          <p className="text-sm text-[#5a5c53]">
            Khi người dùng gửi đề xuất món ăn mới ở trang Dinh dưỡng, yêu cầu sẽ hiển thị tại đây để bạn duyệt.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const draft = drafts[sub.id] || makeDraft(sub);
            const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
            const isPending = sub.status === 'pending';

            return (
              <article key={sub.id} className="nk-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-black/8 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium">{sub.name}</h2>
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-xs text-[#5a5c53] mt-1">
                      Người gửi: <span className="font-medium text-[#22261f]">{sub.submitterName}</span> ({sub.submitterEmail}) ·{' '}
                      <span className="font-mono-num">{sub.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                    </p>
                    {sub.note && (
                      <p className="text-xs text-[#22261f] bg-[#efe9e0] rounded-lg px-3 py-1.5 mt-2 inline-block">
                        Ghi chú người gửi: {sub.note}
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-mono-num text-[#5a5c53] shrink-0">
                    Mã đề xuất #{sub.id}
                  </div>
                </div>

                {isPending ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Tên chuẩn hóa khi thêm chung</label>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => updateDraft(sub.id, 'name', e.target.value)}
                          className="nk-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Nhóm món</label>
                        <select
                          value={draft.category}
                          onChange={(e) => updateDraft(sub.id, 'category', e.target.value)}
                          className="nk-input"
                        >
                          {FOOD_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Khẩu phần</label>
                        <input
                          type="text"
                          value={draft.servingLabel}
                          onChange={(e) => updateDraft(sub.id, 'servingLabel', e.target.value)}
                          className="nk-input"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Khối lượng (g/ml)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.gramsPerServing}
                          onChange={(e) => updateDraft(sub.id, 'gramsPerServing', e.target.value)}
                          className="nk-input font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Calo (kcal)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.calories}
                          onChange={(e) => updateDraft(sub.id, 'calories', e.target.value)}
                          className="nk-input font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Đạm / Carbs / Béo (g)</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            aria-label="Đạm"
                            value={draft.proteinG}
                            onChange={(e) => updateDraft(sub.id, 'proteinG', e.target.value)}
                            className="nk-input font-mono-num px-2 text-center"
                          />
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            aria-label="Tinh bột"
                            value={draft.carbsG}
                            onChange={(e) => updateDraft(sub.id, 'carbsG', e.target.value)}
                            className="nk-input font-mono-num px-2 text-center"
                          />
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            aria-label="Chất béo"
                            value={draft.fatG}
                            onChange={(e) => updateDraft(sub.id, 'fatG', e.target.value)}
                            className="nk-input font-mono-num px-2 text-center"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a5c53] mb-1">Phản hồi Admin (tuỳ chọn)</label>
                        <input
                          type="text"
                          value={draft.adminNote}
                          onChange={(e) => updateDraft(sub.id, 'adminNote', e.target.value)}
                          placeholder="Lý do từ chối hoặc ghi chú chuẩn hóa..."
                          className="nk-input"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        disabled={busyId === sub.id}
                        onClick={() => handleReject(sub)}
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl border border-[#f2c6c2] bg-[#fbe9e7] text-[#9e2a1f] text-sm font-medium hover:bg-[#f8dcd8] cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Từ chối
                      </button>
                      <button
                        type="button"
                        disabled={busyId === sub.id}
                        onClick={() => handleApprove(sub)}
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#2e5b44] text-white text-sm font-medium hover:bg-[#254a37] cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {busyId === sub.id ? 'Đang xử lý...' : 'Duyệt & thêm vào danh sách chung'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5a5c53] font-mono-num">
                    <div>
                      {sub.servingLabel} ({sub.gramsPerServing}g) · {sub.calories} kcal · {sub.proteinG}g P · {sub.carbsG}g C · {sub.fatG}g F
                    </div>
                    {sub.adminNote && (
                      <div className="font-sans text-[#22261f]">
                        Phản hồi Admin: {sub.adminNote}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
