import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';
import { ACTIVITY_MULTIPLIERS, GOAL_CALORIE_OFFSET, calculateBodyMetrics } from '../identity/calculator.js';
import { computeWaterTargetMl } from '../nutrition/routes.js';

const GOAL_LABELS = {
  cut: 'Giảm mỡ, giữ cơ',
  maintain: 'Duy trì vóc dáng & tăng sức bền',
  bulk: 'Tăng cơ, cải thiện thể hình'
};

const DAY_LABELS = {
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
  Sun: 'Chủ nhật'
};

const MEAL_SLOTS = [
  { mealType: 'breakfast', label: 'Bữa sáng', ratio: 0.25 },
  { mealType: 'lunch', label: 'Bữa trưa', ratio: 0.35 },
  { mealType: 'dinner', label: 'Bữa tối', ratio: 0.3 },
  { mealType: 'snack', label: 'Ăn phụ', ratio: 0.1 }
];

const MENU_TEMPLATES = {
  cut: {
    breakfast: ['Trứng gà luộc', 'Khoai lang luộc', 'Cà phê đen (không đường)'],
    lunch: ['Cơm gạo lứt', 'Ức gà áp chảo', 'Rau muống luộc'],
    dinner: ['Cá thu kho cà', 'Canh cải ngọt thịt bằm', 'Cơm trắng (chén vừa)'],
    snack: ['Sữa chua Hy Lạp không đường', 'Táo tươi']
  },
  maintain: {
    breakfast: ['Phở bò tái chín', 'Trứng gà ốp la'],
    lunch: ['Cơm trắng (chén vừa)', 'Thịt heo nạc luộc', 'Canh bí đỏ thịt bằm', 'Cải thìa xào tỏi'],
    dinner: ['Cơm trắng (chén vừa)', 'Cá diêu hồng hấp gừng', 'Đậu hũ sốt cà chua'],
    snack: ['Chuối tiêu chín', 'Sữa tươi không đường']
  },
  bulk: {
    breakfast: ['Bún bò Huế', 'Trứng gà luộc', 'Sữa đậu nành ít đường'],
    lunch: ['Cơm tấm sườn bì chả', 'Trứng gà ốp la', 'Canh khổ qua nhồi thịt'],
    dinner: ['Cơm trắng (chén vừa)', 'Thịt bò xào hành tây', 'Ức gà áp chảo', 'Bông cải xanh luộc'],
    snack: ['Chuối tiêu chín', 'Yến mạch nấu chín', 'Sữa tươi không đường']
  }
};

const WORKOUT_SPLITS = {
  3: {
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    home: [
      { day: 'Mon', focus: 'Toàn thân & Core', exercises: ['Hít đất (Push-ups)', 'Plank', 'Nhảy dây (Jump Rope)', 'Giãn cơ & Mobility'] },
      { day: 'Wed', focus: 'Cardio & Sức bền', exercises: ['Chạy bộ ngoài trời (Zone 2)', 'Plank', 'Giãn cơ & Mobility'] },
      { day: 'Fri', focus: 'Toàn thân & Phục hồi', exercises: ['Hít đất (Push-ups)', 'Nhảy dây (Jump Rope)', 'Plank', 'Giãn cơ & Mobility'] }
    ],
    gym: [
      { day: 'Mon', focus: 'Thân trên & Core', exercises: ['Bench Press', 'Pull-up / Lat Pulldown', 'Overhead Shoulder Press', 'Plank'] },
      { day: 'Wed', focus: 'Thân dưới & Cardio', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Đi bộ nhanh (Incline Walk)'] },
      { day: 'Fri', focus: 'Toàn thân tổng hợp', exercises: ['Incline Dumbbell Press', 'Barbell / Dumbbell Row', 'Chạy máy Treadmill', 'Giãn cơ & Mobility'] }
    ]
  },
  4: {
    daysOfWeek: ['Mon', 'Tue', 'Thu', 'Sat'],
    home: [
      { day: 'Mon', focus: 'Thân trên (Tại nhà)', exercises: ['Hít đất (Push-ups)', 'Plank', 'Giãn cơ & Mobility'] },
      { day: 'Tue', focus: 'Cardio đốt năng lượng', exercises: ['Chạy bộ ngoài trời (Zone 2)', 'Nhảy dây (Jump Rope)'] },
      { day: 'Thu', focus: 'Core & Sức mạnh', exercises: ['Hít đất (Push-ups)', 'Plank', 'Giãn cơ & Mobility'] },
      { day: 'Sat', focus: 'Cardio nhẹ & Thư giãn', exercises: ['Đạp xe (Cycling)', 'Giãn cơ & Mobility'] }
    ],
    gym: [
      { day: 'Mon', focus: 'Thân trên (Upper A)', exercises: ['Bench Press', 'Barbell / Dumbbell Row', 'Overhead Shoulder Press', 'Plank'] },
      { day: 'Tue', focus: 'Thân dưới (Lower A)', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Đi bộ nhanh (Incline Walk)'] },
      { day: 'Thu', focus: 'Thân trên (Upper B)', exercises: ['Incline Dumbbell Press', 'Pull-up / Lat Pulldown', 'Dumbbell Bicep Curl', 'Tricep Rope Pushdown'] },
      { day: 'Sat', focus: 'Cardio & Phục hồi', exercises: ['Chạy máy Treadmill', 'Plank', 'Giãn cơ & Mobility'] }
    ]
  },
  5: {
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'],
    home: [
      { day: 'Mon', focus: 'Ngực & Tay', exercises: ['Hít đất (Push-ups)', 'Plank'] },
      { day: 'Tue', focus: 'Cardio Zone 2', exercises: ['Chạy bộ ngoài trời (Zone 2)', 'Giãn cơ & Mobility'] },
      { day: 'Wed', focus: 'Core & Nhảy dây', exercises: ['Nhảy dây (Jump Rope)', 'Plank'] },
      { day: 'Fri', focus: 'Toàn thân', exercises: ['Hít đất (Push-ups)', 'Đạp xe (Cycling)', 'Giãn cơ & Mobility'] },
      { day: 'Sat', focus: 'Vận động ngoài trời', exercises: ['Bơi lội (Swimming)', 'Giãn cơ & Mobility'] }
    ],
    gym: [
      { day: 'Mon', focus: 'Đẩy (Ngực - Vai - Tay sau)', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Overhead Shoulder Press', 'Tricep Rope Pushdown'] },
      { day: 'Tue', focus: 'Kéo (Lưng - Tay trước)', exercises: ['Pull-up / Lat Pulldown', 'Barbell / Dumbbell Row', 'Dumbbell Bicep Curl'] },
      { day: 'Wed', focus: 'Chân & Core', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Plank'] },
      { day: 'Fri', focus: 'Cardio & Sức bền', exercises: ['Chạy máy Treadmill', 'Nhảy dây (Jump Rope)', 'Giãn cơ & Mobility'] },
      { day: 'Sat', focus: 'Toàn thân nhẹ', exercises: ['Hít đất (Push-ups)', 'Đi bộ nhanh (Incline Walk)', 'Giãn cơ & Mobility'] }
    ]
  }
};

function addDays(isoDate, offset) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function pickServingsForSlot(foods, slotCalTarget) {
  const baseCal = foods.reduce((s, f) => s + f.calories, 0);
  if (baseCal <= 0) return foods.map((f) => ({ food: f, servings: 1 }));
  const factor = slotCalTarget / baseCal;
  return foods.map((f, idx) => {
    // Adjust main carb/protein dish slightly to align closer to user's calorie budget
    let servings = 1;
    if (idx === 0) {
      if (factor >= 1.65) servings = 2;
      else if (factor >= 1.25) servings = 1.5;
      else if (factor <= 0.65) servings = 0.5;
    } else if (factor >= 1.8) {
      servings = 1.5;
    }
    return { food: f, servings };
  });
}

export function buildPersonalizedRoadmap(db, userId, options = {}) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  if (!profile) {
    throw new NotFoundError('Không tìm thấy hồ sơ người dùng.');
  }

  const goalType = String(options.goalType || profile.goal_type || 'maintain');
  if (GOAL_CALORIE_OFFSET[goalType] === undefined) {
    throw new ValidationError('Mục tiêu không hợp lệ.');
  }

  const activityLevel = String(options.activityLevel || profile.activity_level || 'moderate');
  if (!ACTIVITY_MULTIPLIERS[activityLevel]) {
    throw new ValidationError('Mức độ vận động không hợp lệ.');
  }

  const metrics = calculateBodyMetrics({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    activityLevel,
    goalType
  });

  const currentWeightKg = Number(profile.weight_kg);
  let targetWeightKg = options.targetWeightKg !== undefined && options.targetWeightKg !== '' && options.targetWeightKg !== null
    ? Number(options.targetWeightKg)
    : profile.target_weight_kg;

  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
    targetWeightKg =
      goalType === 'cut'
        ? Math.max(40, Number((currentWeightKg - 4).toFixed(1)))
        : goalType === 'bulk'
          ? Number((currentWeightKg + 4).toFixed(1))
          : currentWeightKg;
  } else if (targetWeightKg < 25 || targetWeightKg > 300) {
    throw new ValidationError('Cân nặng mục tiêu hợp lệ phải từ 25 kg đến 300 kg.');
  }

  const targetDateInput = options.targetDate !== undefined ? options.targetDate : profile.target_date;
  const preferredDate = targetDateInput && /^\d{4}-\d{2}-\d{2}$/.test(String(targetDateInput))
    ? String(targetDateInput)
    : null;

  const weightDiffKg = Number((targetWeightKg - currentWeightKg).toFixed(1));
  const dailyDeltaKcal = metrics.targetCalories - metrics.tdee;
  const weeklyRateKg = dailyDeltaKcal === 0 ? 0 : Number(((dailyDeltaKcal * 7) / 7700).toFixed(2));

  const today = todayIso();
  let estimatedWeeks = 0;
  let estimatedCompletionDate = today;
  let timelineNote = 'Duy trì ổn định cân nặng hiện tại và tăng cường sức bền hàng tuần.';

  const sameDirection =
    (weightDiffKg < -0.2 && weeklyRateKg < 0) || (weightDiffKg > 0.2 && weeklyRateKg > 0);

  if (Math.abs(weightDiffKg) <= 0.2 || goalType === 'maintain') {
    estimatedWeeks = 8;
    estimatedCompletionDate = addDays(today, 56);
    timelineNote = 'Chu kỳ 8 tuần giúp ổn định cân nặng, cải thiện tỷ lệ cơ - mỡ và hình thành thói quen bền vững.';
  } else if (sameDirection) {
    estimatedWeeks = Math.max(1, Math.min(104, Math.ceil(Math.abs(weightDiffKg) / Math.abs(weeklyRateKg))));
    estimatedCompletionDate = addDays(today, estimatedWeeks * 7);
    timelineNote = `Với mức chênh ${Math.abs(dailyDeltaKcal)} kcal/ngày, tốc độ an toàn dự kiến khoảng ${Math.abs(weeklyRateKg)} kg/tuần.`;
  } else {
    // User picked e.g. cut goal while targetWeight > currentWeight
    const defaultRate = goalType === 'cut' ? -0.35 : 0.27;
    estimatedWeeks = Math.max(2, Math.min(104, Math.ceil(Math.abs(weightDiffKg) / Math.abs(defaultRate))));
    estimatedCompletionDate = addDays(today, estimatedWeeks * 7);
    timelineNote = 'Cân nặng mục tiêu đang lệch chiều với chế độ dinh dưỡng đã chọn; bạn nên đồng bộ mục tiêu trong hồ sơ.';
  }

  let deadlineWarning = '';
  if (preferredDate) {
    const msDiff = new Date(`${preferredDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`);
    const daysToPreferred = Math.round(msDiff / 86400000);
    if (daysToPreferred > 0 && Math.abs(weightDiffKg) > 0.2) {
      const reqWeeklyKg = Number((Math.abs(weightDiffKg) / Math.max(1, daysToPreferred / 7)).toFixed(2));
      if (reqWeeklyKg > (metrics.isTeen ? 0.5 : 0.8)) {
        deadlineWarning = `Mốc ngày ${preferredDate} yêu cầu thay đổi ${reqWeeklyKg} kg/tuần, hơi nhanh so với ngưỡng an toàn (${metrics.isTeen ? '≤ 0.5' : '≤ 0.7'} kg/tuần). Khuyến nghị theo mốc dự kiến ${estimatedCompletionDate}.`;
      }
    }
  }

  const heightM = profile.height_cm / 100;
  const targetBmi = Number((targetWeightKg / (heightM * heightM)).toFixed(1));

  const milestones = [
    {
      step: 1,
      title: 'Tuần 1–2 · Làm quen nhịp sinh hoạt',
      targetWeight: currentWeightKg,
      focus: `Ổn định ${metrics.targetCalories} kcal/ngày, đủ ${computeWaterTargetMl(currentWeightKg)} ml nước và đều đặn các buổi tập.`
    },
    {
      step: 2,
      title: `Tuần ${Math.max(2, Math.round(estimatedWeeks / 2))} · Nửa chặng đường`,
      targetWeight: Number((currentWeightKg + weightDiffKg * 0.5).toFixed(1)),
      focus: 'Đánh giá lại số đo/cân nặng để tinh chỉnh mức tạ và khẩu phần.'
    },
    {
      step: 3,
      title: `Tuần ${estimatedWeeks} · Hoàn thành mục tiêu`,
      targetWeight: targetWeightKg,
      focus: `Đạt ${targetWeightKg} kg (BMI dự kiến ${targetBmi}) và chuyển sang giữ phong độ.`
    }
  ];

  // Build Macro Breakdown with kcal & %
  const { proteinG, carbsG, fatG } = metrics.macroTargets;
  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const totalMacroKcal = Math.max(1, proteinKcal + carbsKcal + fatKcal);

  const macroBreakdown = {
    protein: { grams: proteinG, calories: proteinKcal, percent: Math.round((proteinKcal / totalMacroKcal) * 100) },
    carbs: { grams: carbsG, calories: carbsKcal, percent: Math.round((carbsKcal / totalMacroKcal) * 100) },
    fat: { grams: fatG, calories: fatKcal, percent: Math.max(1, 100 - Math.round((proteinKcal / totalMacroKcal) * 100) - Math.round((carbsKcal / totalMacroKcal) * 100)) }
  };

  // Build Vietnamese Nutrition Menu from real DB foods
  const allSharedFoods = db.prepare('SELECT * FROM foods WHERE user_id IS NULL').all();
  const foodByName = new Map(allSharedFoods.map((f) => [f.name, f]));
  const templateNames = MENU_TEMPLATES[goalType] || MENU_TEMPLATES.maintain;

  const meals = MEAL_SLOTS.map((slot) => {
    const desiredNames = templateNames[slot.mealType] || [];
    const matched = desiredNames.map((n) => foodByName.get(n)).filter(Boolean);
    const fallbackFoods = matched.length > 0 ? matched : allSharedFoods.slice(0, 2);
    const picked = pickServingsForSlot(fallbackFoods, metrics.targetCalories * slot.ratio);

    const items = picked.map(({ food, servings }) => ({
      foodId: food.id,
      foodName: food.name,
      servingLabel: food.serving_label,
      servings,
      calories: Math.round(food.calories * servings),
      proteinG: Number((food.protein_g * servings).toFixed(1)),
      carbsG: Number((food.carbs_g * servings).toFixed(1)),
      fatG: Number((food.fat_g * servings).toFixed(1))
    }));

    return {
      mealType: slot.mealType,
      label: slot.label,
      targetCalories: Math.round(metrics.targetCalories * slot.ratio),
      calories: items.reduce((s, i) => s + i.calories, 0),
      proteinG: Number(items.reduce((s, i) => s + i.proteinG, 0).toFixed(1)),
      carbsG: Number(items.reduce((s, i) => s + i.carbsG, 0).toFixed(1)),
      fatG: Number(items.reduce((s, i) => s + i.fatG, 0).toFixed(1)),
      items
    };
  });

  const menuTotals = {
    calories: meals.reduce((s, m) => s + m.calories, 0),
    proteinG: Number(meals.reduce((s, m) => s + m.proteinG, 0).toFixed(1)),
    carbsG: Number(meals.reduce((s, m) => s + m.carbsG, 0).toFixed(1)),
    fatG: Number(meals.reduce((s, m) => s + m.fatG, 0).toFixed(1))
  };

  // Build Workout Roadmap from real DB exercises
  const sessionsPerWeek = [3, 4, 5].includes(Number(options.weeklySessions))
    ? Number(options.weeklySessions)
    : activityLevel === 'sedentary' || activityLevel === 'light'
      ? 3
      : activityLevel === 'very_active' || activityLevel === 'active'
        ? 5
        : 4;

  const style = options.workoutStyle === 'home' || options.workoutStyle === 'gym'
    ? options.workoutStyle
    : metrics.isTeen || activityLevel === 'sedentary'
      ? 'home'
      : 'gym';

  const split = WORKOUT_SPLITS[sessionsPerWeek] || WORKOUT_SPLITS[4];
  const scheduleDefs = split[style] || split.gym;

  const allSharedEx = db.prepare('SELECT * FROM exercises WHERE user_id IS NULL').all();
  const exByName = new Map(allSharedEx.map((ex) => [ex.name, ex]));

  const weeklySchedule = scheduleDefs.map((dayDef) => {
    const items = dayDef.exercises.map((exName) => {
      const ex = exByName.get(exName) || allSharedEx[0];
      const durationMin = ex.default_duration_min || (ex.category === 'strength' ? 15 : 25);
      const estimatedCalories = Math.round((ex.met_value || 5) * currentWeightKg * (durationMin / 60));
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        muscleGroup: ex.muscle_group,
        targetSets: ex.category === 'strength' ? ex.default_sets : null,
        targetReps: ex.category === 'strength' ? ex.default_reps : null,
        targetDurationMin: durationMin,
        estimatedCalories
      };
    });
    const sessionMinutes = items.reduce((s, i) => s + i.targetDurationMin, 0);
    const sessionCalories = items.reduce((s, i) => s + i.estimatedCalories, 0);
    return {
      day: dayDef.day,
      dayLabel: DAY_LABELS[dayDef.day] || dayDef.day,
      focus: dayDef.focus,
      sessionMinutes,
      sessionCalories,
      items
    };
  });

  // Deduplicated flat list for saving as a reusable workout_plan
  const uniquePlanItems = [];
  const seenEx = new Set();
  for (const s of weeklySchedule) {
    for (const item of s.items) {
      if (!seenEx.has(item.exerciseId)) {
        seenEx.add(item.exerciseId);
        uniquePlanItems.push(item);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    goalType,
    goalLabel: GOAL_LABELS[goalType],
    activityLevel,
    workoutStyle: style,
    sessionsPerWeek,
    bodyMetrics: {
      ...metrics,
      currentWeightKg,
      targetWeightKg,
      targetBmi,
      waterTargetMl: computeWaterTargetMl(currentWeightKg)
    },
    macroBreakdown,
    projection: {
      weightDiffKg,
      dailyDeltaKcal,
      weeklyRateKg,
      estimatedWeeks,
      estimatedCompletionDate,
      preferredDate,
      deadlineWarning,
      timelineNote,
      milestones
    },
    nutritionPlan: {
      targetCalories: metrics.targetCalories,
      waterTargetMl: computeWaterTargetMl(currentWeightKg),
      menuTotals,
      meals
    },
    workoutPlan: {
      planName: `Lộ trình ${GOAL_LABELS[goalType]} (${sessionsPerWeek} buổi/tuần)`,
      daysOfWeek: split.daysOfWeek,
      weeklyMinutes: weeklySchedule.reduce((s, d) => s + d.sessionMinutes, 0),
      weeklyCaloriesBurned: weeklySchedule.reduce((s, d) => s + d.sessionCalories, 0),
      schedule: weeklySchedule,
      planItems: uniquePlanItems
    }
  };
}
