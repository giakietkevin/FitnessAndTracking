import { ValidationError } from '../../middleware/errorHandler.js';

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

export const GOAL_CALORIE_OFFSET = {
  cut: -400,
  maintain: 0,
  bulk: 300
};

export function classifyBmi(bmi) {
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 23) return 'Bình thường';
  if (bmi < 25) return 'Thừa cân nhẹ';
  return 'Thừa cân / Béo phì';
}

export function calculateBodyMetrics({
  gender = 'male',
  age,
  heightCm,
  weightKg,
  activityLevel = 'moderate',
  goalType = 'maintain'
}) {
  const numAge = Number(age);
  const numHeight = Number(heightCm);
  const numWeight = Number(weightKg);

  if (!Number.isFinite(numAge) || numAge < 12 || numAge > 100) {
    throw new ValidationError('Độ tuổi hợp lệ phải từ 12 đến 100.');
  }
  if (!Number.isFinite(numHeight) || numHeight < 80 || numHeight > 250) {
    throw new ValidationError('Chiều cao hợp lệ phải từ 80 cm đến 250 cm.');
  }
  if (!Number.isFinite(numWeight) || numWeight < 25 || numWeight > 300) {
    throw new ValidationError('Cân nặng hợp lệ phải từ 25 kg đến 300 kg.');
  }

  const heightM = numHeight / 100;
  const bmi = Number((numWeight / (heightM * heightM)).toFixed(1));

  const genderOffset = gender === 'female' ? -161 : gender === 'other' ? -78 : 5;
  const rawBmr = 10 * numWeight + 6.25 * numHeight - 5 * numAge + genderOffset;
  const bmr = Math.round(rawBmr);

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;
  const tdee = Math.round(rawBmr * multiplier);

  const isTeen = numAge < 18;
  const rawOffset = GOAL_CALORIE_OFFSET[goalType] ?? 0;
  const effectiveOffset = isTeen && goalType === 'cut' ? -250 : rawOffset;
  const minCalories = isTeen ? 1400 : 1200;
  const targetCalories = Math.max(minCalories, tdee + effectiveOffset);

  const proteinFactor = goalType === 'cut' ? (isTeen ? 1.7 : 2.0) : goalType === 'bulk' ? 1.8 : 1.6;
  const proteinG = Math.round(numWeight * proteinFactor);
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.max(40, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmi,
    bmiCategory: classifyBmi(bmi),
    bmr,
    tdee,
    targetCalories,
    isTeen,
    teenGuidance: isTeen
      ? 'Ở độ tuổi 12–17 đang phát triển, hệ thống giới hạn thâm hụt nhẹ (-250 kcal) và giữ sàn tối thiểu 1.400 kcal/ngày để đảm bảo chiều cao và học tập.'
      : '',
    macroTargets: {
      proteinG,
      carbsG,
      fatG
    }
  };
}
