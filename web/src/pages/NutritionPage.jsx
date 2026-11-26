import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2, Utensils, X } from 'lucide-react';
import { api } from '../api/client.js';

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

  const [customFood, setCustomFood] = useState({
    name: '',
    category: 'meal',
    servingLabel: '1 phần',
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: ''
  });
  const [customErr, setCustomErr] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFoodLogs(selectedDate);
      setLogs(res.logs);
      setSummary(res.summary);
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
    try {
      const { food } = await api.createFood({
        ...customFood,
        calories: Number(customFood.calories),
        proteinG: Number(customFood.proteinG || 0),
        carbsG: Number(customFood.carbsG || 0),
        fatG: Number(customFood.fatG || 0)
      });
      await api.createFoodLog({
        date: selectedDate,
        mealType: modalMeal,
        foodId: food.id,
        servings: 1
      });
      setCustomFood({ name: '', category: 'meal', servingLabel: '1 phần', calories: '', proteinG: '', carbsG: '', fatG: '' });
      await loadLogs();
      setModalMeal(null);
    } catch (err) {
      setCustomErr(err.message);
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
                      return (
                        <li key={food.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <span>{food.name}</span>
                              {food.isCustom && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2e5b44]/12 text-[#2e5b44]">
                                  Tự tạo
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
