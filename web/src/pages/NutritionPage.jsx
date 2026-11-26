import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Send, Trash2, Utensils, X } from 'lucide-react';
import { api } from '../api/client.js';

const EMPTY_CUSTOM_FOOD = {
  name: '',
  category: 'meal',
  servingLabel: '1 phần',
  gramsPerServing: '100',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  submitForPublic: false,
  submissionNote: ''
};

const SUBMISSION_STATUS_MAP = {
  pending: { text: 'Chờ Admin duyệt', cls: 'bg-amber-100 text-amber-900' },
  approved: { text: 'Đã duyệt vào thư viện chung', cls: 'bg-[#2e5b44]/12 text-[#2e5b44]' },
  rejected: { text: 'Từ chối', cls: 'bg-[#fbe9e7] text-[#9e2a1f]' }
};

const MEALS = [
  { id: 'breakfast', label: 'Bữa sáng', hint: 'Nạp năng lượng đầu ngày' },
  { id: 'lunch', label: 'Bữa trưa', hint: 'Bữa chính giàu đạm & rau' },
  { id: 'dinner', label: 'Bữa tối', hint: 'Nhẹ bụng, đủ dinh dưỡng' },
  { id: 'snack', label: 'Ăn phụ', hint: 'Trái cây, sữa chua, trước/sau tập' }
];

const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'protein', label: 'Đạm' },
  { id: 'carb', label: 'Tinh bột' },
  { id: 'veggie', label: 'Rau củ' },
  { id: 'fruit', label: 'Trái cây' },
  { id: 'meal', label: 'Món hoàn chỉnh' },
  { id: 'dairy', label: 'Sữa' },
  { id: 'drink', label: 'Đồ uống' }
];

export default function NutritionPage({ selectedDate }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, byMeal: {} });
  const [loading, setLoading] = useState(true);

  const [modalMeal, setModalMeal] = useState(null);
  const [modalTab, setModalTab] = useState('search');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [foods, setFoods] = useState([]);
  const [servingsMap, setServingsMap] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [notice, setNotice] = useState('');
  const [submittingFoodId, setSubmittingFoodId] = useState(null);

  const [customFood, setCustomFood] = useState(EMPTY_CUSTOM_FOOD);
  const [customErr, setCustomErr] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, subRes] = await Promise.all([
        api.getFoodLogs(selectedDate),
        api.getMyFoodSubmissions().catch(() => ({ submissions: [] }))
      ]);
      setLogs(logsRes.logs);
      setSummary(logsRes.summary);
      setSubmissions(subRes.submissions || []);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const loadFoods = useCallback(async () => {
    const res = await api.getFoods(query, category);
    setFoods(res.foods);
  }, [query, category]);

  useEffect(() => {
    if (modalMeal) {
      loadFoods();
    }
  }, [modalMeal, loadFoods]);

  async function handleQuickLog(food) {
    const servings = Number(servingsMap[food.id] ?? 1) || 1;
    setBusyId(food.id);
    try {
      await api.createFoodLog({
        date: selectedDate,
        mealType: modalMeal,
        foodId: food.id,
        servings
      });
      await loadLogs();
      setModalMeal(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteLog(id) {
    await api.deleteFoodLog(id);
    await loadLogs();
  }

  async function handleCreateCustomFood(e) {
    e.preventDefault();
    setCustomErr('');
    setNotice('');
    try {
      const { food, submission } = await api.createFood({
        name: customFood.name,
        category: customFood.category,
        servingLabel: customFood.servingLabel,
        gramsPerServing: Number(customFood.gramsPerServing || 100),
        calories: Number(customFood.calories),
        proteinG: Number(customFood.proteinG || 0),
        carbsG: Number(customFood.carbsG || 0),
        fatG: Number(customFood.fatG || 0),
        submitForPublic: Boolean(customFood.submitForPublic),
        submissionNote: customFood.submissionNote
      });
      await api.createFoodLog({
        date: selectedDate,
        mealType: modalMeal,
        foodId: food.id,
        servings: 1
      });
      if (submission) {
        setNotice(`Đã ghi "${food.name}" vào nhật ký và gửi yêu cầu Admin duyệt đưa vào thư viện chung.`);
      }
      setCustomFood(EMPTY_CUSTOM_FOOD);
      await loadLogs();
      setModalMeal(null);
    } catch (err) {
      setCustomErr(err.message);
    }
  }

  async function handleSubmitExistingFood(food) {
    setSubmittingFoodId(food.id);
    setNotice('');
    try {
      await api.submitFoodForApproval({ sourceFoodId: food.id });
      const subRes = await api.getMyFoodSubmissions();
      setSubmissions(subRes.submissions || []);
      setNotice(`Đã gửi "${food.name}" cho Admin xem xét duyệt vào thư viện chung.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSubmittingFoodId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Nhật ký Dinh dưỡng</h1>
          <p className="text-sm text-[#5a5c53]">Ghi nhận bữa ăn nhanh theo khẩu phần, ưu tiên thực phẩm tự nhiên.</p>
        </div>
        <button
          type="button"
          onClick={() => { setModalMeal('lunch'); setModalTab('search'); }}
          className="nk-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Thêm món nhanh
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl px-4 py-3 text-sm bg-[#2e5b44]/10 border border-[#2e5b44]/25 text-[#2e5b44] flex items-center justify-between gap-3"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-xs underline cursor-pointer shrink-0">
            Đóng
          </button>
        </div>
      )}

      {/* Daily Summary Strip */}
      <div className="nk-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-[#5a5c53]">Tổng Calo</div>
          <div className="text-2xl font-medium font-mono-num text-[#2e5b44] mt-0.5">{summary.calories} kcal</div>
        </div>
        <div>
          <div className="text-xs text-[#5a5c53]">Đạm (Protein)</div>
          <div className="text-2xl font-medium font-mono-num mt-0.5">{summary.proteinG} g</div>
        </div>
        <div>
          <div className="text-xs text-[#5a5c53]">Tinh bột (Carbs)</div>
          <div className="text-2xl font-medium font-mono-num mt-0.5">{summary.carbsG} g</div>
        </div>
        <div>
          <div className="text-xs text-[#5a5c53]">Chất béo (Fat)</div>
          <div className="text-2xl font-medium font-mono-num mt-0.5">{summary.fatG} g</div>
        </div>
      </div>

      {/* Meal Sections */}
      {loading && logs.length === 0 ? (
        <div className="nk-card p-8 text-center text-sm text-[#5a5c53]">Đang tải nhật ký bữa ăn...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEALS.map((meal) => {
            const mealLogs = logs.filter((l) => l.mealType === meal.id);
            const mealCals = summary.byMeal?.[meal.id] || 0;
            return (
              <section key={meal.id} className="nk-card p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{meal.label}</h2>
                    <p className="text-xs text-[#5a5c53]">{meal.hint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium font-mono-num">{mealCals} kcal</span>
                    <button
                      type="button"
                      onClick={() => { setModalMeal(meal.id); setModalTab('search'); }}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-xl bg-[#2e5b44]/10 text-[#2e5b44] text-xs font-medium hover:bg-[#2e5b44]/18 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm
                    </button>
                  </div>
                </div>

                {mealLogs.length === 0 ? (
                  <div className="nk-surface p-4 text-xs text-[#5a5c53] flex items-center gap-2">
                    <Utensils className="w-4 h-4 shrink-0" />
                    Chưa có món nào trong {meal.label.toLowerCase()}.
                  </div>
                ) : (
                  <ul className="divide-y divide-black/8">
                    {mealLogs.map((item) => (
                      <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.foodName}
                            {item.servings !== 1 && (
                              <span className="ml-1.5 text-xs font-mono-num text-[#2e5b44]">×{item.servings}</span>
                            )}
                          </div>
                          <div className="text-xs text-[#5a5c53] font-mono-num">
                            {item.servingLabel} · {item.proteinG}g P · {item.carbsG}g C · {item.fatG}g F
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-medium font-mono-num">{item.calories}</span>
                          <button
                            type="button"
                            aria-label={`Xóa ${item.foodName}`}
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
              </section>
            );
          })}
        </div>
      )}

      {/* User Food Submissions Tracking Card */}
      <section className="nk-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Đề xuất món ăn Việt vào thư viện chung</h2>
            <p className="text-xs text-[#5a5c53]">
              Thiếu món quen thuộc? Bạn có thể tạo món mới và gửi Admin duyệt để mọi người cùng dùng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomFood({ ...EMPTY_CUSTOM_FOOD, submitForPublic: true });
              setModalMeal('lunch');
              setModalTab('custom');
            }}
            className="nk-btn-secondary self-start sm:self-auto"
          >
            <Send className="w-4 h-4" />
            Đề xuất món mới
          </button>
        </div>

        {submissions.length > 0 && (
          <ul className="divide-y divide-black/8 pt-1">
            {submissions.map((sub) => {
              const badge = SUBMISSION_STATUS_MAP[sub.status] || SUBMISSION_STATUS_MAP.pending;
              return (
                <li key={sub.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{sub.name}</div>
                    <div className="text-xs text-[#5a5c53] font-mono-num">
                      {sub.servingLabel} · {sub.calories} kcal · {sub.proteinG}g P · {sub.carbsG}g C · {sub.fatG}g F
                    </div>
                    {sub.adminNote && (
                      <div className="text-xs text-[#5a5c53] mt-0.5">Phản hồi Admin: {sub.adminNote}</div>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full self-start sm:self-center ${badge.cls}`}>
                    {badge.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick Food Logger Modal (<= 3 clicks!) */}
      {modalMeal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#faf7f2] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col overflow-hidden border border-black/15 shadow-xl">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium">
                  Thêm món vào {MEALS.find((m) => m.id === modalMeal)?.label}
                </h3>
                <select
                  aria-label="Chọn bữa"
                  value={modalMeal}
                  onChange={(e) => setModalMeal(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-[#efe9e0] border border-black/12 font-medium"
                >
                  {MEALS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setModalMeal(null)}
                className="p-1.5 rounded-lg text-[#5a5c53] hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-3 flex gap-2 border-b border-black/8">
              <button
                type="button"
                onClick={() => setModalTab('search')}
                className={`pb-2.5 px-2 text-sm font-medium border-b-2 cursor-pointer ${
                  modalTab === 'search' ? 'border-[#2e5b44] text-[#2e5b44]' : 'border-transparent text-[#5a5c53]'
                }`}
              >
                Chọn từ thư viện
              </button>
              <button
                type="button"
                onClick={() => setModalTab('custom')}
                className={`pb-2.5 px-2 text-sm font-medium border-b-2 cursor-pointer ${
                  modalTab === 'custom' ? 'border-[#2e5b44] text-[#2e5b44]' : 'border-transparent text-[#5a5c53]'
                }`}
              >
                + Tạo món tự nấu
              </button>
            </div>

            {modalTab === 'search' ? (
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#5a5c53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm món ăn (ví dụ: uc ga, pho bo, com, trung)..."
                    className="nk-input pl-10"
                    autoFocus
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                        category === cat.id
                          ? 'bg-[#22261f] text-[#efe9e0]'
                          : 'bg-[#efe9e0] text-[#5a5c53] hover:text-[#22261f]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <ul className="divide-y divide-black/8">
                  {foods.length === 0 ? (
                    <li className="py-8 text-center text-sm text-[#5a5c53]">
                      Không tìm thấy món phù hợp. Bạn có thể chuyển sang tab “+ Tạo món tự nấu”.
                    </li>
                  ) : (
                    foods.map((food) => {
                      const servings = servingsMap[food.id] ?? 1;
                      const linkedSub = food.isCustom
                        ? submissions.find((s) => s.sourceFoodId === food.id)
                        : null;
                      return (
                        <li key={food.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                              <span>{food.name}</span>
                              {food.isCustom && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2e5b44]/12 text-[#2e5b44]">
                                  Tự tạo
                                </span>
                              )}
                              {food.isCustom && !linkedSub && (
                                <button
                                  type="button"
                                  disabled={submittingFoodId === food.id}
                                  onClick={() => handleSubmitExistingFood(food)}
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-[#efe9e0] text-[#22261f] hover:bg-[#e2d9cb] cursor-pointer"
                                >
                                  {submittingFoodId === food.id ? 'Đang gửi...' : 'Gửi duyệt chung'}
                                </button>
                              )}
                              {linkedSub && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                                    (SUBMISSION_STATUS_MAP[linkedSub.status] || SUBMISSION_STATUS_MAP.pending).cls
                                  }`}
                                >
                                  {(SUBMISSION_STATUS_MAP[linkedSub.status] || SUBMISSION_STATUS_MAP.pending).text}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#5a5c53] font-mono-num">
                              {food.servingLabel} · {food.calories} kcal · {food.proteinG}g P · {food.carbsG}g C · {food.fatG}g F
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Khẩu phần cho ${food.name}`}
                              value={servings}
                              onChange={(e) => setServingsMap((m) => ({ ...m, [food.id]: Number(e.target.value) }))}
                              className="h-9 px-2 rounded-lg bg-white border border-black/15 text-xs font-mono-num"
                            >
                              {[0.5, 1, 1.5, 2, 3].map((s) => (
                                <option key={s} value={s}>×{s}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={busyId === food.id}
                              onClick={() => handleQuickLog(food)}
                              className="px-3.5 h-9 rounded-lg bg-[#2e5b44] text-white text-xs font-medium hover:bg-[#254a37] cursor-pointer"
                            >
                              {busyId === food.id ? '...' : `+ ${Math.round(food.calories * servings)} kcal`}
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomFood} className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Tên món ăn</label>
                    <input
                      type="text"
                      required
                      value={customFood.name}
                      onChange={(e) => setCustomFood((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ví dụ: Bún bò tự nấu"
                      className="nk-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nhóm món</label>
                    <select
                      value={customFood.category}
                      onChange={(e) => setCustomFood((f) => ({ ...f, category: e.target.value }))}
                      className="nk-input"
                    >
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Đơn vị khẩu phần</label>
                    <input
                      type="text"
                      value={customFood.servingLabel}
                      onChange={(e) => setCustomFood((f) => ({ ...f, servingLabel: e.target.value }))}
                      placeholder="1 tô / 100g"
                      className="nk-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Khối lượng (g/ml)</label>
                    <input
                      type="number"
                      min={0}
                      value={customFood.gramsPerServing}
                      onChange={(e) => setCustomFood((f) => ({ ...f, gramsPerServing: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Calo (kcal)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={customFood.calories}
                      onChange={(e) => setCustomFood((f) => ({ ...f, calories: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Đạm / Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={customFood.proteinG}
                      onChange={(e) => setCustomFood((f) => ({ ...f, proteinG: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tinh bột / Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={customFood.carbsG}
                      onChange={(e) => setCustomFood((f) => ({ ...f, carbsG: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Chất béo / Fat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={customFood.fatG}
                      onChange={(e) => setCustomFood((f) => ({ ...f, fatG: e.target.value }))}
                      className="nk-input font-mono-num"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-black/8 space-y-2.5">
                    <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customFood.submitForPublic}
                        onChange={(e) => setCustomFood((f) => ({ ...f, submitForPublic: e.target.checked }))}
                        className="mt-1 accent-[#2e5b44] w-4 h-4"
                      />
                      <span>
                        <span className="font-medium block">Đề xuất đưa vào thư viện chung (Admin duyệt)</span>
                        <span className="text-xs text-[#5a5c53]">
                          Yêu cầu sẽ gửi sang trang Admin để kiểm tra calo và thêm cho tất cả người dùng.
                        </span>
                      </span>
                    </label>
                    {customFood.submitForPublic && (
                      <input
                        type="text"
                        value={customFood.submissionNote}
                        onChange={(e) => setCustomFood((f) => ({ ...f, submissionNote: e.target.value }))}
                        placeholder="Ghi chú cho Admin (ví dụ: món miền Trung, khẩu phần 1 tô vừa)..."
                        className="nk-input"
                      />
                    )}
                  </div>
                </div>

                {customErr && <p className="text-sm text-[#9e2a1f]">{customErr}</p>}

                <button type="submit" className="nk-btn-primary w-full">
                  Lưu món & ghi vào bữa ngay
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
