import bcrypt from 'bcryptjs';

export const SEED_FOODS = [
  // === Tinh bột / Cơm / Cháo / Xôi / Bánh mì (carb) ===
  { name: 'Cơm trắng', category: 'carb', servingLabel: '1 chén vừa (150g)', gramsPerServing: 150, calories: 195, proteinG: 4.0, carbsG: 42.0, fatG: 0.4, isNatural: 1 },
  { name: 'Cơm gạo lứt', category: 'carb', servingLabel: '1 chén vừa (150g)', gramsPerServing: 150, calories: 168, proteinG: 3.9, carbsG: 35.0, fatG: 1.4, isNatural: 1 },
  { name: 'Cháo trắng', category: 'carb', servingLabel: '1 tô (300g)', gramsPerServing: 300, calories: 140, proteinG: 3.0, carbsG: 31.0, fatG: 0.3, isNatural: 1 },
  { name: 'Xôi trắng', category: 'carb', servingLabel: '1 gói (150g)', gramsPerServing: 150, calories: 270, proteinG: 5.2, carbsG: 59.0, fatG: 1.0, isNatural: 1 },
  { name: 'Xôi xéo hành phi', category: 'meal', servingLabel: '1 gói vừa (200g)', gramsPerServing: 200, calories: 420, proteinG: 10.0, carbsG: 66.0, fatG: 12.0, isNatural: 1 },
  { name: 'Xôi gấc', category: 'carb', servingLabel: '1 đĩa nhỏ (150g)', gramsPerServing: 150, calories: 310, proteinG: 5.5, carbsG: 61.0, fatG: 4.5, isNatural: 1 },
  { name: 'Xôi gà xé', category: 'meal', servingLabel: '1 hộp (250g)', gramsPerServing: 250, calories: 490, proteinG: 22.0, carbsG: 64.0, fatG: 15.0, isNatural: 1 },
  { name: 'Khoai lang luộc', category: 'carb', servingLabel: '1 củ vừa (130g)', gramsPerServing: 130, calories: 112, proteinG: 2.0, carbsG: 26.0, fatG: 0.1, isNatural: 1 },
  { name: 'Bắp ngô luộc', category: 'carb', servingLabel: '1 trái (150g)', gramsPerServing: 150, calories: 144, proteinG: 4.8, carbsG: 31.0, fatG: 1.8, isNatural: 1 },
  { name: 'Khoai tây luộc', category: 'carb', servingLabel: '150g', gramsPerServing: 150, calories: 130, proteinG: 3.0, carbsG: 30.0, fatG: 0.2, isNatural: 1 },
  { name: 'Yến mạch cán dẹt', category: 'carb', servingLabel: '40g khô', gramsPerServing: 40, calories: 155, proteinG: 5.4, carbsG: 27.0, fatG: 2.8, isNatural: 1 },
  { name: 'Bánh mì nguyên cám', category: 'carb', servingLabel: '2 lát (60g)', gramsPerServing: 60, calories: 148, proteinG: 6.4, carbsG: 26.0, fatG: 2.2, isNatural: 1 },
  { name: 'Bánh mì ổ không nhân', category: 'carb', servingLabel: '1 ổ (90g)', gramsPerServing: 90, calories: 235, proteinG: 7.5, carbsG: 48.0, fatG: 1.5, isNatural: 1 },
  { name: 'Bún tươi (sợi bún)', category: 'carb', servingLabel: '100g', gramsPerServing: 100, calories: 110, proteinG: 2.0, carbsG: 25.0, fatG: 0.2, isNatural: 1 },
  { name: 'Miến dong chín', category: 'carb', servingLabel: '100g', gramsPerServing: 100, calories: 112, proteinG: 0.5, carbsG: 27.5, fatG: 0.1, isNatural: 1 },

  // === Thịt / Cá / Trứng / Đạm gia đình (protein) ===
  { name: 'Ức gà luộc / áp chảo', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 165, proteinG: 31.0, carbsG: 0.0, fatG: 3.6, isNatural: 1 },
  { name: 'Đùi gà bỏ da luộc', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 177, proteinG: 24.0, carbsG: 0.0, fatG: 8.2, isNatural: 1 },
  { name: 'Cánh gà nướng', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 220, proteinG: 21.0, carbsG: 1.0, fatG: 14.0, isNatural: 1 },
  { name: 'Thịt nạc vai heo luộc', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 198, proteinG: 25.0, carbsG: 0.0, fatG: 10.5, isNatural: 1 },
  { name: 'Thịt ba rọi kho tàu', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 310, proteinG: 16.0, carbsG: 5.5, fatG: 25.0, isNatural: 1 },
  { name: 'Sườn non xào chua ngọt', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 265, proteinG: 18.0, carbsG: 11.0, fatG: 16.5, isNatural: 1 },
  { name: 'Chả lụa (giò lụa)', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 215, proteinG: 19.0, carbsG: 3.0, fatG: 14.0, isNatural: 0 },
  { name: 'Thịt bò nạc', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 187, proteinG: 26.0, carbsG: 0.0, fatG: 8.5, isNatural: 1 },
  { name: 'Thịt bò xào hành tây', category: 'protein', servingLabel: '1 đĩa vừa (150g)', gramsPerServing: 150, calories: 260, proteinG: 27.0, carbsG: 8.0, fatG: 13.0, isNatural: 1 },
  { name: 'Cá hồi áp chảo', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 208, proteinG: 20.4, carbsG: 0.0, fatG: 13.4, isNatural: 1 },
  { name: 'Cá lóc kho tộ', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 155, proteinG: 21.0, carbsG: 4.5, fatG: 5.8, isNatural: 1 },
  { name: 'Cá thu sốt cà chua', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 190, proteinG: 20.0, carbsG: 4.0, fatG: 10.5, isNatural: 1 },
  { name: 'Cá diêu hồng hấp gừng', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 128, proteinG: 22.0, carbsG: 1.0, fatG: 3.5, isNatural: 1 },
  { name: 'Cá cơm khô rim mặn ngọt', category: 'protein', servingLabel: '50g', gramsPerServing: 50, calories: 145, proteinG: 19.0, carbsG: 7.5, fatG: 4.2, isNatural: 1 },
  { name: 'Tôm hấp', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 99, proteinG: 24.0, carbsG: 0.2, fatG: 0.3, isNatural: 1 },
  { name: 'Mực hấp gừng', category: 'protein', servingLabel: '100g', gramsPerServing: 100, calories: 92, proteinG: 18.0, carbsG: 3.0, fatG: 1.4, isNatural: 1 },
  { name: 'Trứng gà luộc', category: 'protein', servingLabel: '1 quả (50g)', gramsPerServing: 50, calories: 78, proteinG: 6.3, carbsG: 0.6, fatG: 5.3, isNatural: 1 },
  { name: 'Trứng gà ốp la', category: 'protein', servingLabel: '1 quả', gramsPerServing: 55, calories: 105, proteinG: 6.3, carbsG: 0.6, fatG: 8.4, isNatural: 1 },
  { name: 'Trứng vịt lộn', category: 'protein', servingLabel: '1 quả', gramsPerServing: 70, calories: 132, proteinG: 10.5, carbsG: 1.5, fatG: 9.0, isNatural: 1 },
  { name: 'Đậu phụ trắng', category: 'protein', servingLabel: '1 bìa (100g)', gramsPerServing: 100, calories: 76, proteinG: 8.0, carbsG: 1.9, fatG: 4.8, isNatural: 1 },
  { name: 'Đậu phụ sốt cà chua', category: 'protein', servingLabel: '1 đĩa (150g)', gramsPerServing: 150, calories: 165, proteinG: 10.5, carbsG: 7.0, fatG: 10.5, isNatural: 1 },
  { name: 'Whey Protein (1 muỗng)', category: 'protein', servingLabel: '1 scoop (30g)', gramsPerServing: 30, calories: 120, proteinG: 24.0, carbsG: 3.0, fatG: 1.5, isNatural: 0 },

  // === Món nước / Món ăn hoàn chỉnh Việt Nam (meal) ===
  { name: 'Phở bò tái', category: 'meal', servingLabel: '1 tô vừa', gramsPerServing: 500, calories: 430, proteinG: 26.0, carbsG: 58.0, fatG: 10.0, isNatural: 1 },
  { name: 'Phở gà ta', category: 'meal', servingLabel: '1 tô vừa', gramsPerServing: 480, calories: 390, proteinG: 25.0, carbsG: 54.0, fatG: 8.0, isNatural: 1 },
  { name: 'Bún bò Huế', category: 'meal', servingLabel: '1 tô', gramsPerServing: 520, calories: 520, proteinG: 28.0, carbsG: 62.0, fatG: 17.0, isNatural: 1 },
  { name: 'Bún chả Hà Nội', category: 'meal', servingLabel: '1 suất', gramsPerServing: 450, calories: 560, proteinG: 26.0, carbsG: 65.0, fatG: 21.0, isNatural: 1 },
  { name: 'Bún riêu cua', category: 'meal', servingLabel: '1 tô', gramsPerServing: 480, calories: 410, proteinG: 21.0, carbsG: 56.0, fatG: 11.0, isNatural: 1 },
  { name: 'Bún thịt nướng', category: 'meal', servingLabel: '1 tô', gramsPerServing: 420, calories: 490, proteinG: 24.0, carbsG: 62.0, fatG: 15.0, isNatural: 1 },
  { name: 'Bún đậu mắm tôm', category: 'meal', servingLabel: '1 mẹt nhỏ', gramsPerServing: 420, calories: 630, proteinG: 28.0, carbsG: 64.0, fatG: 28.0, isNatural: 0 },
  { name: 'Bún cá', category: 'meal', servingLabel: '1 tô', gramsPerServing: 460, calories: 380, proteinG: 23.0, carbsG: 52.0, fatG: 8.5, isNatural: 1 },
  { name: 'Hủ tiếu Nam Vang', category: 'meal', servingLabel: '1 tô', gramsPerServing: 480, calories: 440, proteinG: 24.0, carbsG: 58.0, fatG: 12.0, isNatural: 1 },
  { name: 'Mì Quảng gà / tôm thịt', category: 'meal', servingLabel: '1 tô', gramsPerServing: 430, calories: 470, proteinG: 25.0, carbsG: 56.0, fatG: 15.0, isNatural: 1 },
  { name: 'Cao lầu Hội An', category: 'meal', servingLabel: '1 tô', gramsPerServing: 400, calories: 450, proteinG: 22.0, carbsG: 58.0, fatG: 14.0, isNatural: 1 },
  { name: 'Miến gà', category: 'meal', servingLabel: '1 tô', gramsPerServing: 420, calories: 330, proteinG: 22.0, carbsG: 44.0, fatG: 6.5, isNatural: 1 },
  { name: 'Cháo sườn sụn', category: 'meal', servingLabel: '1 tô vừa', gramsPerServing: 350, calories: 310, proteinG: 14.0, carbsG: 42.0, fatG: 9.0, isNatural: 1 },
  { name: 'Cháo gà', category: 'meal', servingLabel: '1 tô vừa', gramsPerServing: 380, calories: 295, proteinG: 19.0, carbsG: 39.0, fatG: 6.5, isNatural: 1 },
  { name: 'Cơm tấm sườn bì chả', category: 'meal', servingLabel: '1 đĩa', gramsPerServing: 450, calories: 640, proteinG: 32.0, carbsG: 72.0, fatG: 24.0, isNatural: 0 },
  { name: 'Cơm gà xối mỡ', category: 'meal', servingLabel: '1 đĩa', gramsPerServing: 420, calories: 620, proteinG: 29.0, carbsG: 68.0, fatG: 25.0, isNatural: 0 },
  { name: 'Cơm chiên dương châu', category: 'meal', servingLabel: '1 đĩa', gramsPerServing: 360, calories: 540, proteinG: 18.0, carbsG: 72.0, fatG: 19.0, isNatural: 0 },
  { name: 'Bánh cuốn nhân thịt', category: 'meal', servingLabel: '1 đĩa (250g)', gramsPerServing: 250, calories: 340, proteinG: 14.0, carbsG: 48.0, fatG: 10.0, isNatural: 1 },
  { name: 'Bánh mì thịt trứng', category: 'meal', servingLabel: '1 ổ', gramsPerServing: 220, calories: 420, proteinG: 19.0, carbsG: 46.0, fatG: 17.0, isNatural: 0 },
  { name: 'Bánh mì ốp la 2 trứng', category: 'meal', servingLabel: '1 ổ', gramsPerServing: 200, calories: 390, proteinG: 17.0, carbsG: 46.0, fatG: 15.0, isNatural: 1 },
  { name: 'Bánh bao nhân thịt trứng cút', category: 'meal', servingLabel: '1 cái (150g)', gramsPerServing: 150, calories: 310, proteinG: 12.0, carbsG: 44.0, fatG: 9.5, isNatural: 0 },
  { name: 'Bánh giò nóng', category: 'meal', servingLabel: '1 cái (180g)', gramsPerServing: 180, calories: 280, proteinG: 10.0, carbsG: 36.0, fatG: 10.5, isNatural: 1 },
  { name: 'Bánh xèo miền Tây', category: 'meal', servingLabel: '1 cái vừa', gramsPerServing: 240, calories: 390, proteinG: 14.0, carbsG: 42.0, fatG: 18.0, isNatural: 0 },
  { name: 'Bánh chưng', category: 'meal', servingLabel: '1 góc 1/8 cái (125g)', gramsPerServing: 125, calories: 250, proteinG: 7.0, carbsG: 41.0, fatG: 6.5, isNatural: 1 },
  { name: 'Gỏi cuốn tôm thịt', category: 'meal', servingLabel: '2 cuốn', gramsPerServing: 160, calories: 165, proteinG: 12.0, carbsG: 23.0, fatG: 2.5, isNatural: 1 },
  { name: 'Chả giò (nem rán)', category: 'meal', servingLabel: '3 cuốn (120g)', gramsPerServing: 120, calories: 290, proteinG: 11.0, carbsG: 22.0, fatG: 17.0, isNatural: 0 },

  // === Canh & Rau củ (veggie) ===
  { name: 'Rau muống luộc', category: 'veggie', servingLabel: '1 đĩa (150g)', gramsPerServing: 150, calories: 30, proteinG: 3.9, carbsG: 4.5, fatG: 0.3, isNatural: 1 },
  { name: 'Rau muống xào tỏi', category: 'veggie', servingLabel: '1 đĩa (150g)', gramsPerServing: 150, calories: 95, proteinG: 3.9, carbsG: 5.5, fatG: 6.8, isNatural: 1 },
  { name: 'Bông cải xanh hấp', category: 'veggie', servingLabel: '100g', gramsPerServing: 100, calories: 34, proteinG: 2.8, carbsG: 6.6, fatG: 0.4, isNatural: 1 },
  { name: 'Cải thìa luộc', category: 'veggie', servingLabel: '150g', gramsPerServing: 150, calories: 24, proteinG: 2.3, carbsG: 3.5, fatG: 0.3, isNatural: 1 },
  { name: 'Đậu bắp luộc', category: 'veggie', servingLabel: '100g', gramsPerServing: 100, calories: 33, proteinG: 1.9, carbsG: 7.5, fatG: 0.2, isNatural: 1 },
  { name: 'Dưa leo & cà chua', category: 'veggie', servingLabel: '150g', gramsPerServing: 150, calories: 25, proteinG: 1.2, carbsG: 5.4, fatG: 0.2, isNatural: 1 },
  { name: 'Canh chua cá lóc', category: 'veggie', servingLabel: '1 tô (300ml)', gramsPerServing: 300, calories: 145, proteinG: 14.0, carbsG: 12.0, fatG: 4.5, isNatural: 1 },
  { name: 'Canh rau ngót thịt băm', category: 'veggie', servingLabel: '1 tô (250ml)', gramsPerServing: 250, calories: 95, proteinG: 7.5, carbsG: 6.0, fatG: 4.5, isNatural: 1 },
  { name: 'Canh bí đỏ thịt băm', category: 'veggie', servingLabel: '1 tô (250ml)', gramsPerServing: 250, calories: 125, proteinG: 7.0, carbsG: 14.0, fatG: 4.5, isNatural: 1 },
  { name: 'Canh khổ qua nhồi thịt', category: 'veggie', servingLabel: '1 trái vừa (220g)', gramsPerServing: 220, calories: 155, proteinG: 11.0, carbsG: 8.5, fatG: 8.5, isNatural: 1 },
  { name: 'Canh mồng tơi nấu cua', category: 'veggie', servingLabel: '1 tô (250ml)', gramsPerServing: 250, calories: 85, proteinG: 8.5, carbsG: 5.5, fatG: 3.0, isNatural: 1 },

  // === Trái cây (fruit) ===
  { name: 'Chuối tiêu', category: 'fruit', servingLabel: '1 quả vừa (120g)', gramsPerServing: 120, calories: 105, proteinG: 1.3, carbsG: 27.0, fatG: 0.4, isNatural: 1 },
  { name: 'Táo tươi', category: 'fruit', servingLabel: '1 quả (180g)', gramsPerServing: 180, calories: 95, proteinG: 0.5, carbsG: 25.0, fatG: 0.3, isNatural: 1 },
  { name: 'Quả bơ tươi', category: 'fruit', servingLabel: '1/2 quả (75g)', gramsPerServing: 75, calories: 120, proteinG: 1.5, carbsG: 6.4, fatG: 11.0, isNatural: 1 },
  { name: 'Thanh long ruột trắng/đỏ', category: 'fruit', servingLabel: '150g', gramsPerServing: 150, calories: 75, proteinG: 1.6, carbsG: 18.0, fatG: 0.3, isNatural: 1 },
  { name: 'Dưa hấu', category: 'fruit', servingLabel: '200g', gramsPerServing: 200, calories: 60, proteinG: 1.2, carbsG: 15.0, fatG: 0.3, isNatural: 1 },
  { name: 'Cam sành', category: 'fruit', servingLabel: '1 quả (160g)', gramsPerServing: 160, calories: 75, proteinG: 1.5, carbsG: 18.5, fatG: 0.2, isNatural: 1 },
  { name: 'Ổi tươi', category: 'fruit', servingLabel: '1 quả vừa (150g)', gramsPerServing: 150, calories: 98, proteinG: 3.8, carbsG: 21.0, fatG: 1.4, isNatural: 1 },
  { name: 'Xoài chín', category: 'fruit', servingLabel: '150g', gramsPerServing: 150, calories: 90, proteinG: 1.2, carbsG: 22.5, fatG: 0.6, isNatural: 1 },
  { name: 'Đu đủ chín', category: 'fruit', servingLabel: '150g', gramsPerServing: 150, calories: 65, proteinG: 0.8, carbsG: 16.0, fatG: 0.4, isNatural: 1 },
  { name: 'Bưởi da xanh', category: 'fruit', servingLabel: '150g', gramsPerServing: 150, calories: 58, proteinG: 1.1, carbsG: 14.5, fatG: 0.2, isNatural: 1 },

  // === Sữa & Đồ uống (dairy, drink) ===
  { name: 'Sữa chua không đường', category: 'dairy', servingLabel: '1 hộp (100g)', gramsPerServing: 100, calories: 63, proteinG: 3.8, carbsG: 4.7, fatG: 3.3, isNatural: 1 },
  { name: 'Sữa chua có đường', category: 'dairy', servingLabel: '1 hộp (100g)', gramsPerServing: 100, calories: 96, proteinG: 3.5, carbsG: 14.0, fatG: 2.8, isNatural: 0 },
  { name: 'Sữa tươi không đường', category: 'dairy', servingLabel: '1 hộp (180ml)', gramsPerServing: 180, calories: 110, proteinG: 5.8, carbsG: 8.6, fatG: 5.9, isNatural: 1 },
  { name: 'Sữa đậu nành ít đường', category: 'drink', servingLabel: '1 ly (250ml)', gramsPerServing: 250, calories: 105, proteinG: 7.0, carbsG: 11.0, fatG: 3.5, isNatural: 1 },
  { name: 'Nước dừa tươi', category: 'drink', servingLabel: '1 trái (300ml)', gramsPerServing: 300, calories: 58, proteinG: 1.5, carbsG: 12.0, fatG: 0.5, isNatural: 1 },
  { name: 'Cà phê đen đá (không đường)', category: 'drink', servingLabel: '1 ly (200ml)', gramsPerServing: 200, calories: 5, proteinG: 0.2, carbsG: 0.8, fatG: 0.0, isNatural: 1 },
  { name: 'Cà phê sữa đá', category: 'drink', servingLabel: '1 ly (200ml)', gramsPerServing: 200, calories: 155, proteinG: 2.5, carbsG: 24.0, fatG: 5.0, isNatural: 0 },
  { name: 'Nước mía tươi', category: 'drink', servingLabel: '1 ly (300ml)', gramsPerServing: 300, calories: 185, proteinG: 0.5, carbsG: 46.0, fatG: 0.0, isNatural: 1 },
  { name: 'Trà sữa trân châu (ít đường)', category: 'drink', servingLabel: '1 ly vừa (450ml)', gramsPerServing: 450, calories: 330, proteinG: 3.5, carbsG: 58.0, fatG: 9.0, isNatural: 0 }
];

export const SEED_EXERCISES = [
  { name: 'Barbell Squat', category: 'strength', muscleGroup: 'legs', metValue: 6.0, defaultSets: 4, defaultReps: 8, defaultDurationMin: 20 },
  { name: 'Romanian Deadlift', category: 'strength', muscleGroup: 'legs', metValue: 6.0, defaultSets: 3, defaultReps: 10, defaultDurationMin: 18 },
  { name: 'Bench Press', category: 'strength', muscleGroup: 'chest', metValue: 5.5, defaultSets: 4, defaultReps: 8, defaultDurationMin: 20 },
  { name: 'Incline Dumbbell Press', category: 'strength', muscleGroup: 'chest', metValue: 5.0, defaultSets: 3, defaultReps: 10, defaultDurationMin: 15 },
  { name: 'Pull-up / Lat Pulldown', category: 'strength', muscleGroup: 'back', metValue: 5.5, defaultSets: 4, defaultReps: 10, defaultDurationMin: 18 },
  { name: 'Barbell / Dumbbell Row', category: 'strength', muscleGroup: 'back', metValue: 5.0, defaultSets: 3, defaultReps: 10, defaultDurationMin: 15 },
  { name: 'Overhead Shoulder Press', category: 'strength', muscleGroup: 'shoulders', metValue: 5.0, defaultSets: 3, defaultReps: 10, defaultDurationMin: 15 },
  { name: 'Dumbbell Bicep Curl', category: 'strength', muscleGroup: 'arms', metValue: 3.8, defaultSets: 3, defaultReps: 12, defaultDurationMin: 12 },
  { name: 'Tricep Rope Pushdown', category: 'strength', muscleGroup: 'arms', metValue: 3.8, defaultSets: 3, defaultReps: 12, defaultDurationMin: 12 },
  { name: 'Hít đất (Push-ups)', category: 'strength', muscleGroup: 'chest', metValue: 4.5, defaultSets: 3, defaultReps: 15, defaultDurationMin: 10 },
  { name: 'Plank', category: 'strength', muscleGroup: 'core', metValue: 3.5, defaultSets: 3, defaultReps: 1, defaultDurationMin: 8 },
  { name: 'Chạy bộ ngoài trời (Zone 2)', category: 'cardio', muscleGroup: 'cardio', metValue: 8.5, defaultSets: 1, defaultReps: 1, defaultDurationMin: 30 },
  { name: 'Chạy máy Treadmill', category: 'cardio', muscleGroup: 'cardio', metValue: 8.0, defaultSets: 1, defaultReps: 1, defaultDurationMin: 25 },
  { name: 'Đi bộ nhanh (Incline Walk)', category: 'cardio', muscleGroup: 'cardio', metValue: 4.8, defaultSets: 1, defaultReps: 1, defaultDurationMin: 30 },
  { name: 'Đạp xe (Cycling)', category: 'cardio', muscleGroup: 'cardio', metValue: 7.0, defaultSets: 1, defaultReps: 1, defaultDurationMin: 30 },
  { name: 'Nhảy dây (Jump Rope)', category: 'cardio', muscleGroup: 'cardio', metValue: 10.0, defaultSets: 1, defaultReps: 1, defaultDurationMin: 15 },
  { name: 'Bơi lội (Swimming)', category: 'cardio', muscleGroup: 'full_body', metValue: 7.5, defaultSets: 1, defaultReps: 1, defaultDurationMin: 30 },
  { name: 'Giãn cơ & Mobility', category: 'mobility', muscleGroup: 'full_body', metValue: 2.5, defaultSets: 1, defaultReps: 1, defaultDurationMin: 15 }
];

export function seedDatabase(db) {
  const existingFoods = new Set(
    db.prepare('SELECT name FROM foods WHERE user_id IS NULL').all().map((r) => r.name)
  );
  const insertFood = db.prepare(`
    INSERT INTO foods (user_id, name, category, serving_label, grams_per_serving, calories, protein_g, carbs_g, fat_g, is_natural)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const f of SEED_FOODS) {
    if (!existingFoods.has(f.name)) {
      insertFood.run(f.name, f.category, f.servingLabel, f.gramsPerServing, f.calories, f.proteinG, f.carbsG, f.fatG, f.isNatural);
    }
  }

  const existingExercises = new Set(
    db.prepare('SELECT name FROM exercises WHERE user_id IS NULL').all().map((r) => r.name)
  );
  const insertExercise = db.prepare(`
    INSERT INTO exercises (user_id, name, category, muscle_group, met_value, default_sets, default_reps, default_duration_min)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of SEED_EXERCISES) {
    if (!existingExercises.has(e.name)) {
      insertExercise.run(e.name, e.category, e.muscleGroup, e.metValue, e.defaultSets, e.defaultReps, e.defaultDurationMin);
    }
  }

  // Bootstrap default local admin if no admin exists yet
  const adminCount = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'").get().cnt;
  if (adminCount === 0 && process.env.SEED_DEFAULT_ADMIN !== 'false') {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nhipkhoe.local').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (existingUser) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existingUser.id);
    } else {
      const hash = bcrypt.hashSync(adminPassword, 10);
      const res = db.prepare(
        "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, 'Quản trị Nhịp Khỏe', 'admin')"
      ).run(adminEmail, hash);
      db.prepare('INSERT INTO profiles (user_id, onboarded) VALUES (?, 1)').run(Number(res.lastInsertRowid));
    }
  }
}
