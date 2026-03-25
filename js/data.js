window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var STORAGE_PREFIX = "ksk_";
  var STORAGE_KEYS = ["trainers", "trainerSchedules", "horses", "grooms", "arenas", "bookings"];
  var memoryCache = {};
  var derivedCache = {
    bookings: null,
    trainerSchedulesById: null
  };

  var TRAINERS = [
    { id: "t1", name: "Ольга", color: "#4A90D9" },
    { id: "t2", name: "Арина", color: "#E8736A" },
    { id: "t3", name: "Джулия", color: "#50B86C" },
    { id: "t4", name: "Настя Б", color: "#F5A623" },
    { id: "t5", name: "Гриша", color: "#9B59B6" },
    { id: "t6", name: "Ольга Г", color: "#1ABC9C" },
    { id: "t7", name: "Аня Ж", color: "#E67E22" },
    { id: "t8", name: "Катя Мальц", color: "#3498DB" },
    { id: "t9", name: "Саша", color: "#95A5A6" },
    { id: "t10", name: "Лиза", color: "#E74C3C" }
  ];

  var HORSES = [
    { id: "h1", name: "Голди", status: "available", maxDailyLoad: 4 },
    { id: "h2", name: "Риф", status: "available", maxDailyLoad: 4 },
    { id: "h3", name: "Кавалер", status: "available", maxDailyLoad: 4 },
    { id: "h4", name: "Рафаэль", status: "available", maxDailyLoad: 4 },
    { id: "h5", name: "Утренняя", status: "available", maxDailyLoad: 4 },
    { id: "h6", name: "Бурушка", status: "available", maxDailyLoad: 4 },
    { id: "h7", name: "Уэлси", status: "available", maxDailyLoad: 3 },
    { id: "h8", name: "Дарина", status: "available", maxDailyLoad: 4 },
    { id: "h9", name: "Дариус", status: "available", maxDailyLoad: 4 },
    { id: "h10", name: "Максимус", status: "available", maxDailyLoad: 4 },
    { id: "h11", name: "Легион", status: "available", maxDailyLoad: 4 },
    { id: "h12", name: "Фантастик", status: "treatment", maxDailyLoad: 4 },
    { id: "h13", name: "Сноу", status: "available", maxDailyLoad: 3 },
    { id: "h14", name: "Мультик", status: "rest", maxDailyLoad: 3 },
    { id: "h15", name: "Герда", status: "available", maxDailyLoad: 4 }
  ];

  var GROOMS = [
    { id: "g1", name: "Гриша" },
    { id: "g2", name: "Маша О" },
    { id: "g3", name: "Соня З" },
    { id: "g4", name: "Ева О" },
    { id: "g5", name: "Диана Ф" }
  ];

  var ARENAS = [
    { id: "a1", name: "Малый манеж", capacity: 6 },
    { id: "a2", name: "Большой манеж", capacity: 10 }
  ];

  var BOOKINGS = [
    { id: "b1", date: "2026-03-16", time: "09:00", duration: 45, clientName: "Горожанинова Виктория", serviceType: "training", trainerId: "t4", horseId: "h7", groomId: "g1", arenaId: "a1", status: "confirmed", notes: "", bitrixDealUrl: "https://dubrava.bitrix24.ru/crm/deal/details/123/", bitrixDealLabel: "D123", paymentType: "single", paymentStatus: "paid", singlePrice: 3200 },
    { id: "b2", date: "2026-03-16", time: "09:15", duration: 45, clientName: "Ушакова Анна", serviceType: "training", trainerId: "t2", horseId: "h2", groomId: null, arenaId: "a1", status: "draft", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b3", date: "2026-03-16", time: "10:00", duration: 30, clientName: "Волкова Юлия", serviceType: "rental", trainerId: "t3", horseId: "h3", groomId: null, arenaId: "a2", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 5 },
    { id: "b4", date: "2026-03-16", time: "18:00", duration: 45, clientName: "Козлова Мария", serviceType: "training", trainerId: "t1", horseId: "h1", groomId: "g2", arenaId: "a2", status: "completed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3000 },
    { id: "b5", date: "2026-03-17", time: "09:00", duration: 30, clientName: "Сафонова Елена", serviceType: "training", trainerId: "t6", horseId: "h8", groomId: null, arenaId: "a1", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "unpaid", singlePrice: 2800 },
    { id: "b6", date: "2026-03-17", time: "09:00", duration: 45, clientName: "Романова Алиса", serviceType: "training", trainerId: "t8", horseId: "h10", groomId: "g3", arenaId: "a2", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 3 },
    { id: "b7", date: "2026-03-18", time: "11:00", duration: 30, clientName: "Петрова София", serviceType: "training", trainerId: "t7", horseId: "h5", groomId: null, arenaId: "a1", status: "confirmed", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b8", date: "2026-03-18", time: "11:00", duration: 45, clientName: "Иванова Полина", serviceType: "training", trainerId: "t9", horseId: "h9", groomId: "g4", arenaId: "a2", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3500 },
    { id: "b9", date: "2026-03-19", time: "09:00", duration: 45, clientName: "Горожанинова Виктория", serviceType: "training", trainerId: "t4", horseId: "h7", groomId: null, arenaId: "a1", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3200 },
    { id: "b10", date: "2026-03-19", time: "09:30", duration: 30, clientName: "Чернова Дарья", serviceType: "training", trainerId: "t4", horseId: "h4", groomId: null, arenaId: "a1", status: "confirmed", notes: "Пересечение по тренеру для демонстрации conflict UI", paymentType: "single", paymentStatus: "unpaid", singlePrice: 2900 },
    { id: "b11", date: "2026-03-19", time: "10:15", duration: 45, clientName: "Сидорова Таисия", serviceType: "rental", trainerId: "t2", horseId: "h2", groomId: "g1", arenaId: "a2", status: "confirmed", notes: "", bitrixDealUrl: "https://dubrava.bitrix24.ru/crm/deal/details/587/", bitrixDealLabel: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 2 },
    { id: "b12", date: "2026-03-19", time: "17:30", duration: 45, clientName: "Клименко Ольга", serviceType: "training", trainerId: "t1", horseId: "h1", groomId: "g2", arenaId: "a2", status: "cancelled", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b13", date: "2026-03-20", time: "09:00", duration: 45, clientName: "Морозова Ева", serviceType: "training", trainerId: "t5", horseId: "h6", groomId: "g5", arenaId: "a1", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 4 },
    { id: "b14", date: "2026-03-20", time: "09:45", duration: 45, clientName: "Филиппова Ника", serviceType: "training", trainerId: "t10", horseId: "h11", groomId: null, arenaId: "a2", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3100 },
    { id: "b15", date: "2026-03-21", time: "12:00", duration: 30, clientName: "Лебедева Анна", serviceType: "rental", trainerId: "t3", horseId: null, groomId: null, arenaId: "a1", status: "draft", notes: "Сценарий без лошади", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null }
  ];

  var TRAINER_SCHEDULES = [
    { trainerId: "t1", days: { 1: ["15:00", "21:00"], 2: ["15:00", "21:00"], 3: null, 4: ["15:00", "21:00"], 5: ["09:00", "15:00"], 6: ["09:00", "15:00"], 7: null } },
    { trainerId: "t2", days: { 1: ["09:00", "15:00"], 2: ["15:00", "21:00"], 3: null, 4: ["09:00", "15:00"], 5: ["09:00", "15:00"], 6: null, 7: ["15:00", "21:00"] } },
    { trainerId: "t3", days: { 1: ["09:00", "15:00"], 2: null, 3: ["15:00", "21:00"], 4: ["15:00", "21:00"], 5: ["09:00", "15:00"], 6: ["09:00", "15:00"], 7: null } },
    { trainerId: "t4", days: { 1: ["09:00", "15:00"], 2: ["09:00", "15:00"], 3: null, 4: ["09:00", "15:00"], 5: ["15:00", "21:00"], 6: null, 7: ["15:00", "21:00"] } },
    { trainerId: "t5", days: { 1: null, 2: null, 3: ["15:00", "21:00"], 4: ["09:00", "15:00"], 5: ["09:00", "15:00"], 6: ["15:00", "21:00"], 7: ["09:00", "15:00"] } },
    { trainerId: "t6", days: { 1: ["09:00", "15:00"], 2: ["09:00", "15:00"], 3: ["09:00", "15:00"], 4: null, 5: null, 6: ["15:00", "21:00"], 7: ["15:00", "21:00"] } },
    { trainerId: "t7", days: { 1: null, 2: ["09:00", "15:00"], 3: ["09:00", "15:00"], 4: ["15:00", "21:00"], 5: null, 6: ["15:00", "21:00"], 7: ["09:00", "15:00"] } },
    { trainerId: "t8", days: { 1: ["15:00", "21:00"], 2: ["09:00", "15:00"], 3: ["09:00", "15:00"], 4: null, 5: null, 6: ["09:00", "15:00"], 7: ["15:00", "21:00"] } },
    { trainerId: "t9", days: { 1: null, 2: ["09:00", "15:00"], 3: ["09:00", "15:00"], 4: null, 5: ["09:00", "15:00"], 6: ["15:00", "21:00"], 7: ["15:00", "21:00"] } },
    { trainerId: "t10", days: { 1: ["09:00", "15:00"], 2: null, 3: ["15:00", "21:00"], 4: ["15:00", "21:00"], 5: ["09:00", "15:00"], 6: ["15:00", "21:00"], 7: null } }
  ];

  var EXCEL_STRESS_TRAINER_NAMES = ["Ольга", "Арина", "Даша", "Катя Мальц", "Попова Алена", "Евгения", "Горлушкина Марина", "Никита", "Ольга Г", "Маша Т", "Варя Ч", "Лиза", "Саша", "Гриша", "Катя С", "Митина Елена", "Аня Ж", "Трубчанинова Маша", "Анна С", "Джулия", "Настя Б", "Вика"];
  var EXCEL_STRESS_TRAINER_COLORS = ["#4A90D9", "#E8736A", "#50B86C", "#F5A623", "#9B59B6", "#1ABC9C", "#E67E22", "#3498DB", "#95A5A6", "#E74C3C", "#16A085", "#C0392B", "#8E44AD", "#2ECC71", "#D35400", "#2C82C9", "#7F8C8D", "#27AE60", "#2980B9", "#F39C12", "#C2185B", "#455A64"];
  var EXCEL_STRESS_HORSE_NAMES = ["Ижмарин", "Максимус", "Голди", "Зайка", "Кудряшка", "Кавалер", "Кинза", "Фортуна", "Дариус", "Жозефина", "Дарина", "Риф", "Герда", "Уэлси", "Альбус", "Легион", "Чупа-Чупс", "Ванкувер", "Забава", "Сникерс", "Кромка", "Фантастик", "Мегги", "Элла"];
  var EXCEL_STRESS_WEEKDAY_DATES = ["2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28", "2026-03-29"];
  var EXCEL_STRESS_TRAINER_SHIFT_ROWS = [["Ольга", ["09:00", "21:00"], ["09:00", "21:00"], null, ["09:00", "21:00"], null, ["09:00", "21:00"], ["09:00", "21:00"]], ["Арина", ["09:00", "21:00"], ["09:00", "21:00"], null, null, ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Даша", null, ["09:00", "21:00"], ["09:00", "21:00"], null, ["09:00", "21:00"], ["09:00", "17:00"], ["09:00", "21:00"]], ["Катя Мальц", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Попова Алена", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Евгения", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Горлушкина Марина", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Никита", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Ольга Г", null, null, ["14:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Маша Т", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Варя Ч", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Лиза", null, ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], null], ["Саша", null, ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], null], ["Гриша", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Катя С", null, ["14:00", "20:00"], ["09:00", "21:00"], ["14:00", "20:00"], ["09:00", "21:00"], ["14:00", "20:00"], ["09:00", "21:00"]], ["Митина Елена", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Аня Ж", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Трубчанинова Маша", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Анна С", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Джулия", null, null, ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Настя Б", ["14:00", "21:00"], ["09:00", "21:00"], ["14:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]], ["Вика", ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"], ["09:00", "21:00"]]];
  var EXCEL_STRESS_BOOKING_ROWS = [["2026-03-23", "10:00", 45, "Демакова Ника", "training", "Ольга", null, "draft", "", "single", "paid", 2600], ["2026-03-23", "10:00", 45, "Андреева Мария", "training", "Арина", null, "confirmed", "168 см 80 кг.", "single", "paid", 2800], ["2026-03-23", "10:00", 45, "Протасова Николь", "battle", "Даша", "Ижмарин", "confirmed", "", null, null, null], ["2026-03-23", "11:00", 45, "Ткаченко Есения", "training", "Ольга", null, "confirmed", "13 лет, 167 см 55 кг", "single", "paid", 2600], ["2026-03-23", "11:00", 45, "Акулова Елена", "training", "Арина", null, "confirmed", "47/168/52 ДР", null, null, null], ["2026-03-23", "11:00", 45, "Акуловам Елизавета", "training", "Катя Мальц", null, "confirmed", "11/150/33", null, null, null], ["2026-03-23", "11:00", 45, "Прусакова Юлия", "battle", "Попова Алена", null, "confirmed", "177 см 60 кг", null, null, null], ["2026-03-23", "12:00", 45, "Гусева Яна", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-23", "12:00", 45, "Акулова Анастасия", "forest_walk", "Катя Мальц", null, "confirmed", "20/172/50", "single", "paid", 3500], ["2026-03-23", "12:00", 45, "Алтихина Елизавета", "forest_walk", "Арина", null, "confirmed", "23/ 176/58", "single", "paid", 3500], ["2026-03-23", "12:00", 45, "Мулина Евгения", "battle", "Евгения", "Максимус", "confirmed", "", null, null, null], ["2026-03-23", "14:00", 45, "Количкин Всеволод", "training", "Арина", null, "confirmed", "7 лет 140 см 30 кг", "subscription", "paid", null], ["2026-03-23", "14:00", 45, "Заседателева Анна", "battle", "Горлушкина Марина", "Голди", "confirmed", "30/150/69", null, null, null], ["2026-03-23", "14:00", 45, "Матвеева Елена", "battle", "Никита", null, "confirmed", "40/167/56", null, null, null], ["2026-03-23", "14:00", 45, "Фасхетдинова Мария", "battle", "Ольга", "Зайка", "confirmed", "", null, null, null], ["2026-03-23", "15:00", 45, "Лесняк Валерия", "rental", "Арина", "Кудряшка", "confirmed", "146 см 30 кг.", "single", "paid", 3500], ["2026-03-23", "15:00", 30, "Шепелев Вадим", "rental", "Евгения", null, "confirmed", "", "single", "paid", 3500], ["2026-03-23", "15:00", 30, "Кожевников Александр", "training", "Ольга", null, "confirmed", "7 лет.", "single", "paid", 2200], ["2026-03-23", "15:00", 45, "Палкина Майя", "battle", "Ольга Г", "Кавалер", "confirmed", "10/149/37", null, null, null], ["2026-03-23", "15:30", 30, "Кожевников Сергей", "training", "Ольга", null, "confirmed", "7 лет.", "single", "paid", 2200], ["2026-03-23", "16:00", 45, "Черноскутова Виктория", "rental", "Арина", "Кинза", "confirmed", "8 лет, 142/40", "single", "paid", 3500], ["2026-03-23", "16:00", 45, "Жилина Таисия", "battle", "Ольга Г", "Голди", "confirmed", "11/150/35", null, null, null], ["2026-03-23", "17:00", 45, "Копкова Арина", "training", "Арина", null, "confirmed", "", "single", "paid", 3000], ["2026-03-23", "17:00", 45, "Скорб Яна", "battle", "Маша Т", "Максимус", "confirmed", "27 лет 175 см 63 кг", null, null, null], ["2026-03-23", "17:00", 45, "Слободянюк Анна", "battle", "Горлушкина Марина", "Фортуна", "confirmed", "24/170/60", null, null, null], ["2026-03-23", "17:00", 45, "Филипп Королик", "battle", "Ольга Г", "Дариус", "confirmed", "9/146/38", null, null, null], ["2026-03-23", "17:00", 30, "Пахомова Анна", "training", "Ольга", null, "confirmed", "постоянно", "single", "paid", 2200], ["2026-03-23", "18:00", 45, "едомских-Колесников Мирон", "rental", "Варя Ч", null, "confirmed", "", "single", "paid", 3500], ["2026-03-23", "18:00", 45, "Едомских-Колесникова Алёна", "battle", "Никита", "Голди", "confirmed", "37/160/ 56", null, null, null], ["2026-03-23", "18:00", 45, "Болдырева Юлия", "battle", "Ольга Г", "Зайка", "confirmed", "40 лет 159 см 50 кг", null, null, null], ["2026-03-23", "18:00", 45, "Бабкина Елизавета", "training", "Евгения", null, "confirmed", "8 лет 130 см 25 кг", "subscription", "paid", null], ["2026-03-23", "18:00", 30, "Пьянков Артем", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-23", "19:00", 45, "Павлов Артем", "training", "Ольга", null, "confirmed", "отмена до 26.02", "subscription", "paid", null], ["2026-03-23", "19:00", 45, "Коровина Валерия", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-23", "20:00", 45, "Балдина София", "rental", "Ольга", null, "confirmed", "", null, null, null], ["2026-03-24", "09:00", 45, "Майер Ева", "rental", "Лиза", "Жозефина", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "09:00", 45, "Стенина Дарья", "training", "Саша", "Кинза", "confirmed", "13/150/35", null, null, null], ["2026-03-24", "10:00", 45, "Голенищева Стефания", "rental", "Маша Т", "Дарина", "confirmed", "6 лет писать тренеру", "single", "paid", 3500], ["2026-03-24", "10:00", 45, "Куклева Мария", "training", "Ольга", null, "confirmed", "12 лет 158 см 43 кг", "single", "unpaid", 2600], ["2026-03-24", "10:00", 45, "Халиуллина Ася", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-24", "10:00", 45, "Диордиева Диана", "training", "Арина", null, "confirmed", "7 лет, 20 кг, 120 см", "subscription", "paid", null], ["2026-03-24", "11:00", 45, "Набиев Кутфиддин", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-24", "11:00", 45, "Кристина Габулян", "training", "Евгения", null, "confirmed", "160 см, 44 кг.", "single", "paid", 2800], ["2026-03-24", "11:00", 45, "Михайлова Марина", "training", "Ольга", null, "confirmed", "", "single", "paid", 2800], ["2026-03-24", "12:00", 30, "Масленица", "sled", "Гриша", null, "completed", "", "single", "paid", 6000], ["2026-03-24", "14:00", 45, "Шушмарченко Екатерина", "rental", "Катя Мальц", "Риф", "confirmed", "пернос", "single", "paid", 3500], ["2026-03-24", "14:00", 45, "Казакова Татьяна", "rental", "Ольга", null, "confirmed", "171, 65", null, null, null], ["2026-03-24", "14:00", 45, "Мироненко Валерия", "rental", "Евгения", "Максимус", "confirmed", "38 лет", null, null, null], ["2026-03-24", "14:00", 45, "Матвеева Елена", "battle", "Никита", "Фортуна", "confirmed", "40/167/56", null, null, null], ["2026-03-24", "14:00", 45, "Кокшарова Александра", "training", "Арина", null, "confirmed", "11 лет, 50 кг постоянно", "subscription", "paid", null], ["2026-03-24", "14:00", 45, "Кокшарова Мария", "training", "Катя С", null, "confirmed", "75 кг", "subscription", "paid", null], ["2026-03-24", "14:00", 45, "Богдашева", "training", "Даша", "Герда", "confirmed", "", null, null, null], ["2026-03-24", "15:00", 30, "Масленица", "sled", "Гриша", null, "confirmed", "", "single", "paid", 6000], ["2026-03-24", "15:00", 30, "Шкуратова Таисия", "rental", "Ольга", "Уэлси", "confirmed", "4 года, 108 см, 20 кг", "single", "paid", 3500], ["2026-03-24", "15:00", 45, "Левина Ева", "rental", "Арина", "Альбус", "confirmed", "10 лет, 35 кг.", "single", "paid", 3500], ["2026-03-24", "15:00", 45, "Смирнова Алиса", "rental", "Варя Ч", "Кинза", "confirmed", "10/148/30", null, null, null], ["2026-03-24", "15:00", 45, "Смирнова Юля", "rental", "Ольга Г", "Максимус", "confirmed", "37/165/50", null, null, null], ["2026-03-24", "15:00", 45, "Казакова Каролина", "rental", "Даша", "Дарина", "confirmed", "9.5 лет 130 см", null, null, null], ["2026-03-24", "15:00", 45, "Трофимова Надежда", "battle", "Горлушкина Марина", "Легион", "confirmed", "42/174/88", null, null, null], ["2026-03-24", "16:00", 45, "Богданова Милана", "training", "Даша", null, "confirmed", "11/164/48", "single", "paid", 2600], ["2026-03-24", "16:00", 45, "Комольцева Яна", "training", "Ольга", null, "confirmed", "", "single", "paid", 2600], ["2026-03-24", "16:00", 45, "Черепкова Ева", "training", "Ольга", null, "confirmed", "10 лет, 32 кг.", "subscription", "paid", null], ["2026-03-24", "16:00", 45, "Черепкова Полина", "training", "Ольга", null, "confirmed", "14 лет 55 кг 158 см", "subscription", "paid", null], ["2026-03-24", "16:00", 45, "Лесняк Валерия", "training", "Арина", null, "confirmed", "146 см 30 кг,", "subscription", "paid", null], ["2026-03-24", "16:00", 45, "Топорищева Анастасия", "training", "Саша", "Чупа-Чупс", "confirmed", "12/158/40", null, null, null], ["2026-03-24", "16:00", 45, "Елизавета Малышева", "battle", "Ольга Г", "Фортуна", "confirmed", "40 лет", null, null, null], ["2026-03-24", "16:00", 45, "Елизавета Малышева", "rental", "Митина Елена", "Ванкувер", "confirmed", "40 лет", null, null, null], ["2026-03-24", "17:00", 45, "Федорахина Милана", "rental", "Ольга", null, "confirmed", "", "single", "paid", 3500], ["2026-03-24", "17:00", 45, "Фимочкина Гульнара", "rental", "Аня Ж", "Забава", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "17:00", 45, "Гончарова София", "training", "Арина", null, "confirmed", "8 лет, 135 см, 30 кг отмена до 8.03", null, null, null], ["2026-03-24", "17:00", 45, "Лескина Варя", "training", "Катя С", "Сникерс", "confirmed", "", null, null, null], ["2026-03-24", "17:45", 45, "Лескина Белла", "rental", "Катя С", "Кромка", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "18:00", 45, "Фимочкин Михаил", "rental", "Аня Ж", "Максимус", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "18:00", 45, "Семерикова Евгения", "rental", "Катя Мальц", "Кинза", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "18:00", 45, "Семерикова Саша", "rental", "Даша", "Ижмарин", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "18:00", 45, "Шутрова Екатерина", "training", "Ольга", null, "confirmed", "10 лет, 158 см, 40 кг.", "subscription", "paid", null], ["2026-03-24", "18:30", 45, "Лангборг Ева", "rental", "Арина", "Кудряшка", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "19:00", 45, "Хабарова Милана", "rental", "Катя Мальц", "Фантастик", "confirmed", "", "single", "paid", 3500], ["2026-03-24", "19:00", 45, "Лангборт Михаил", "training", "Даша", null, "confirmed", "", "subscription", "paid", null], ["2026-03-24", "19:00", 45, "Федорчукова Варвара", "training", "Саша", "Чупа-Чупс", "confirmed", "12/166/45", null, null, null], ["2026-03-24", "20:00", 45, "Кузьмина Алла", "rental", "Даша", "Альбус", "confirmed", "10 лет", "single", "paid", 3500], ["2026-03-24", "20:00", 45, "Алексей Клыгин", "rental", "Ольга", "Максимус", "confirmed", "", null, null, null], ["2026-03-24", "20:00", 45, "Мухин Артем", "rental", "Трубчанинова Маша", "Легион", "confirmed", "38 лет 191 84 кг", null, null, null], ["2026-03-24", "20:00", 45, "Мухин Иван", "rental", "Лиза", "Ижмарин", "confirmed", "10 лет 152 см 40 кг", null, null, null], ["2026-03-25", "09:00", 45, "Фимочкина Гульнара", "rental", "Аня Ж", null, "confirmed", "", "single", "paid", 3500], ["2026-03-25", "10:00", 45, "Насакина Алиса", "training", "Лиза", "Мегги", "confirmed", "", null, null, null], ["2026-03-25", "10:00", 45, "Головина Александра", "hippotherapy", "Даша", null, "confirmed", "", null, null, null], ["2026-03-25", "11:00", 30, "Доспехов Родион", "hippotherapy", "Ольга Г", null, "confirmed", "8 лет, 30 кг.", "single", "paid", 2500], ["2026-03-25", "12:00", 45, "Кузнецова Варвара", "training", "Даша", null, "confirmed", "6 лет, 18 кг, 130 см.", "subscription", "paid", null], ["2026-03-25", "14:00", 45, "Шушмарченко Екатерина", "rental", "Катя Мальц", "Риф", "confirmed", "", "single", "paid", 3500], ["2026-03-25", "14:00", 30, "Щелканова Алиса", "training", "Ольга Г", null, "confirmed", "6 лет 19 кг 118 см", "single", "paid", 2200], ["2026-03-25", "14:00", 45, "Матвеева Елена", "battle", "Никита", "Ижмарин", "confirmed", "40/167/56", "single", "paid", 3500], ["2026-03-25", "14:00", 45, "Богдашева", "training", "Даша", "Герда", "confirmed", "", null, null, null], ["2026-03-25", "15:00", 45, "Кушниренко Ольга", "training", "Лиза", null, "confirmed", "", null, null, null], ["2026-03-25", "15:00", 30, "Шепелев Вадим", "rental", "Евгения", null, "confirmed", "", "single", "paid", 3500], ["2026-03-25", "15:30", 30, "Калита Анна", "training", "Евгения", null, "confirmed", "5 лет", "single", "paid", 2200], ["2026-03-25", "16:00", 30, "Диана Ф", "training", "Даша", null, "confirmed", "", "single", "paid", 1300], ["2026-03-25", "16:00", 45, "Нефедова Оксана", "training", "Евгения", null, "confirmed", "", "subscription", "paid", null], ["2026-03-25", "16:00", 45, "Анциферов Арсений", "training", "Катя С", null, "confirmed", "8 лет 28 кг 132 см", "subscription", "paid", null], ["2026-03-25", "16:00", 45, "Матвеева Софья", "rental", "Ольга Г", null, "confirmed", "37 лет 52 кг 164 см", null, null, null], ["2026-03-25", "17:00", 45, "Окулова Мария", "training", "Даша", null, "confirmed", "", "single", "paid", 1300], ["2026-03-25", "17:00", 45, "Худякова Елизавета", "training", "Катя С", null, "confirmed", "11 лет, 140/30", "single", "paid", 2600], ["2026-03-25", "17:00", 30, "Фадеев Макар", "hippotherapy", "Ольга Г", null, "confirmed", "13 кг 90 см.", "single", "paid", 2500], ["2026-03-25", "18:00", 30, "Никонова Ольга", "training", "Даша", null, "confirmed", "", "single", "paid", 2200], ["2026-03-25", "18:00", 30, "Федотова София", "training", "Катя С", null, "confirmed", "8 лет 128 см 27 кг", "subscription", "paid", null], ["2026-03-25", "18:30", 30, "Яковцева Полина", "training", "Даша", null, "confirmed", "", "single", "paid", 2200], ["2026-03-25", "19:00", 45, "Пивоварова София", "rental", "Катя Мальц", "Альбус", "confirmed", "12 лет 41 кг, 161 см.", "single", "paid", 3500], ["2026-03-26", "09:00", 45, "Стенина Дарья", "training", "Саша", "Кинза", "confirmed", "13/150/35", "single", "paid", 3500], ["2026-03-26", "10:00", 45, "Демакова Ника", "training", "Ольга", null, "confirmed", "", "single", "paid", 2600], ["2026-03-26", "10:00", 45, "Голенищева Стефания", "rental", "Маша Т", "Дарина", "confirmed", "", "single", "paid", 3500], ["2026-03-26", "11:00", 45, "Набиев Кутфиддин", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-26", "11:00", 45, "Кристина Габулян", "training", "Евгения", null, "confirmed", "160 см, 44 кг.", "single", "paid", 2800], ["2026-03-26", "11:00", 45, "Михайлова Марина", "training", "Ольга", null, "confirmed", "", "single", "paid", 2800], ["2026-03-26", "11:00", 45, "Прусакова Юлия", "rental", "Попова Алена", null, "confirmed", "177 см 60 кг", null, null, null], ["2026-03-26", "12:00", 45, "Гусева Яна", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-26", "12:00", 45, "Мулина Евгения", "battle", "Евгения", "Максимус", "confirmed", "", "single", "paid", 3500], ["2026-03-26", "14:00", 45, "Мироненко Валерия", "battle", "Евгения", "Максимус", "confirmed", "38 лет", "single", "paid", 3500], ["2026-03-26", "14:00", 45, "Матвеева Елена", "battle", "Никита", "Ижмарин", "confirmed", "40/167/56", "single", "paid", 3500], ["2026-03-26", "15:00", 45, "Кушниренко Ольга", "rental", "Лиза", null, "confirmed", "", null, null, null], ["2026-03-26", "15:00", 30, "Владыкин Владимир", "training", "Даша", null, "confirmed", "", null, null, null], ["2026-03-26", "15:00", 45, "Петрова Арина", "rental", "Ольга", "Легион", "confirmed", "19 лет, 173 см.", "single", "paid", 3500], ["2026-03-26", "16:00", 45, "Каргаполова Полина", "rental", "Катя С", null, "confirmed", "", "single", "paid", 3500], ["2026-03-26", "16:00", 30, "Горожанцева Варвара", "rental", "Катя Мальц", "Дарина", "confirmed", "", "single", "paid", 3500], ["2026-03-26", "17:00", 45, "Черепкова Полина", "training", "Ольга", null, "confirmed", "14 лет 55 кг 158 см", "subscription", "paid", null], ["2026-03-26", "17:00", 45, "Черепкова Ева", "training", "Ольга", null, "confirmed", "10 лет, 32 кг.", "subscription", "paid", null], ["2026-03-26", "18:00", 30, "Пьянков Артем", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-26", "18:15", 45, "Мищенко Лея", "training", "Даша", null, "confirmed", "8 лет, 33 кг, 130 см, постоянно.", "single", "paid", 1300], ["2026-03-26", "18:30", 30, "Мищенко Давид", "training", "Ольга", null, "confirmed", "6 лет 125 см 32 кг.", "single", "paid", 1300], ["2026-03-26", "19:00", 45, "Окулова Мария", "training", "Даша", null, "confirmed", "перенос на пт", null, null, null], ["2026-03-26", "20:00", 45, "Коровина Валерия", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-26", "20:00", 45, "Павлов Артем", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-27", "09:00", 45, "Федорчукова Варвара", "battle", "Саша", "Чупа-Чупс", "confirmed", "12/166/45", "single", "paid", 3500], ["2026-03-27", "09:00", 45, "Майер Ева", "rental", "Лиза", "Жозефина", "confirmed", "", "single", "paid", 3500], ["2026-03-27", "10:00", 45, "Мунарова Арина", "training", "Лиза", "Элла", "confirmed", "", null, null, null], ["2026-03-27", "10:00", 45, "Савина Елена", "training", "Даша", null, "cancelled", "166 см 70 кг", "subscription", "paid", null], ["2026-03-27", "10:00", 30, "Анна Савосина", "excursion", "Анна С", null, "confirmed", "14 чел", null, null, null], ["2026-03-27", "10:00", 30, "Анна Савосина", "riding", "Арина", null, "confirmed", "14 чел", null, null, null], ["2026-03-27", "10:30", 30, "Анна Савосина", "excursion", "Анна С", null, "confirmed", "14 чел", null, null, null], ["2026-03-27", "10:30", 30, "Анна Савосина", "riding", "Арина", null, "confirmed", "14 чел", null, null, null], ["2026-03-27", "11:00", 45, "Катаев Арсений", "rental", "Саша", "Кинза", "confirmed", "7 лет.", "single", "paid", 3500], ["2026-03-27", "12:00", 45, "Кузнецова Варвара", "training", "Даша", null, "confirmed", "6 лет, 18 кг, 130 см. НЕ ПЕРЕНОСИТЬ!!!", "subscription", "paid", null], ["2026-03-27", "13:00", 30, "Анна", "sled", "Катя С", null, "confirmed", "", null, null, null], ["2026-03-27", "14:00", 45, "Левина Ева", "rental", "Арина", "Альбус", "confirmed", "10 лет, 35 кг.", "single", "paid", 3500], ["2026-03-27", "14:00", 45, "Богдашева", "training", "Даша", "Герда", "confirmed", "", null, null, null], ["2026-03-27", "15:00", 45, "Анциферов Арсений", "training", "Катя С", null, "confirmed", "8 лет 28 кг 132 см", "subscription", "paid", null], ["2026-03-27", "15:00", 45, "Трофимова Надежда", "battle", "Горлушкина Марина", "Легион", "confirmed", "42/174/88", null, null, null], ["2026-03-27", "15:00", 45, "Смирнова Алиса", "rental", "Варя Ч", "Кинза", "confirmed", "10/148/30", "single", "paid", 3500], ["2026-03-27", "16:00", 45, "Пудовкина Амелия", "rental", "Катя С", "Кромка", "confirmed", "", "single", "paid", 3500], ["2026-03-27", "16:00", 45, "Пудовкина Слава", "rental", "Катя Мальц", "Максимус", "confirmed", "", "single", "paid", 3500], ["2026-03-27", "17:00", 45, "Сабурова Кира", "rental", "Даша", "Риф", "confirmed", "18 лет 170 см 65 кг", "single", "paid", 3500], ["2026-03-27", "17:00", 30, "Ярославцева Ева", "rental", "Катя Мальц", "Дарина", "confirmed", "4 года, 16 кг, 110 см.", "single", "paid", 3500], ["2026-03-27", "17:00", 45, "Худякова Елизавета", "rental", "Катя С", "Фантастик", "confirmed", "11 лет, 140/30", "single", "paid", 3500], ["2026-03-27", "18:00", 45, "Бабкина Елизавета", "training", "Евгения", null, "confirmed", "8 лет 130 см 25 кг", "subscription", "paid", null], ["2026-03-27", "18:00", 45, "Окулова Мария", "training", "Даша", null, "confirmed", "", "single", "paid", 1300], ["2026-03-27", "18:45", 45, "Васильева Софья", "rental", "Арина", "Кудряшка", "confirmed", "9 лет, 133 см, 40 кг.", "single", "paid", 3500], ["2026-03-27", "19:00", 45, "Хабарова Милана", "rental", "Катя Мальц", "Кинза", "confirmed", "", "single", "paid", 3500], ["2026-03-28", "09:00", 45, "Надейкина Ульяна", "training", "Джулия", null, "confirmed", "10 лет", "single", "paid", 3000], ["2026-03-28", "09:00", 45, "Нефедова Оксана", "training", "Евгения", null, "confirmed", "", "subscription", "paid", null], ["2026-03-28", "09:00", 45, "Нефедов Илья", "training", "Евгения", null, "confirmed", "", "subscription", "paid", null], ["2026-03-28", "10:00", 45, "Зенина Анна", "training", "Ольга", "Голди", "confirmed", "12/150/50 тренера не менять", "single", "unpaid", 3000], ["2026-03-28", "10:00", 30, "Садиахметова Уля", "rve", "Джулия", null, "confirmed", "1 год ,хотят в 11:00", "subscription", "paid", null], ["2026-03-28", "10:00", 45, "Гущина Вероника", "training", "Даша", null, "confirmed", "10 лет, 144 см 34 кг", "single", "paid", 3000], ["2026-03-28", "10:00", 45, "Лангборт Ева", "training", "Арина", null, "confirmed", "", "subscription", "paid", null], ["2026-03-28", "10:30", 30, "Порохонько Кристина", "rve", "Настя Б", null, "confirmed", "3 года.", "single", "paid", 3000], ["2026-03-28", "11:00", 30, "Кутепов Роберт", "training", "Джулия", null, "confirmed", "", "single", "paid", 2600], ["2026-03-28", "11:00", 45, "Медведева Елизавета", "rental", "Арина", "Кудряшка", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "11:00", 45, "Протасова Николь", "battle", "Даша", "Ижмарин", "confirmed", "", "single", "paid", 3500], ["2026-03-28", "12:00", 30, "Хабарова Кира", "training", "Настя Б", null, "confirmed", "5 лет 120 см 22 кг запись по звонку", null, null, null], ["2026-03-28", "12:00", 45, "Денисова Диана", "rental", "Арина", "Альбус", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "12:00", 30, "Нелюбин Павел", "rve", "Даша", null, "confirmed", "4 года 110 см 15 кг", "single", "paid", 3000], ["2026-03-28", "12:00", 30, "Романова Вероника", "training", "Джулия", null, "confirmed", "5 лет", "single", "paid", 2600], ["2026-03-28", "14:00", 30, "Янович Алиса", "rve", "Арина", null, "confirmed", "", "single", "paid", 3000], ["2026-03-28", "14:00", 45, "Петрова Арина", "rental", "Ольга", "Легион", "confirmed", "19 лет, 173 см", "single", "paid", 4000], ["2026-03-28", "14:00", 45, "Семерикова Евгения", "rental", "Катя Мальц", "Кинза", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "14:00", 45, "Семерикова Саша", "rental", "Даша", null, "confirmed", "", "single", "paid", 4000], ["2026-03-28", "14:00", 30, "Жуков Юрий", "hippotherapy", "Ольга Г", null, "confirmed", "", "single", "paid", 3000], ["2026-03-28", "14:00", 30, "Баженова Милана", "training", "Катя С", null, "confirmed", "", "single", "paid", 2600], ["2026-03-28", "14:00", 45, "Богдашева", "training", "Даша", "Герда", "confirmed", "", null, null, null], ["2026-03-28", "14:00", 45, "Насакина Алиса", "training", "Лиза", "Мегги", "confirmed", "", null, null, null], ["2026-03-28", "15:00", 30, "Масленица", "sled", "Гриша", null, "confirmed", "", "single", "paid", 6000], ["2026-03-28", "15:00", 45, "Таланкина Елизавета", "training", "Даша", null, "confirmed", "7 лет, 129 см, 25 кг", "single", "paid", 3000], ["2026-03-28", "15:00", 45, "Слепухина Валерия", "training", "Катя С", null, "confirmed", "13 лет", "single", "paid", 3000], ["2026-03-28", "15:00", 45, "Секретарева Таисия", "rental", "Арина", "Дарина", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "15:00", 45, "Палкина Майя", "battle", "Ольга Г", "Кавалер", "confirmed", "10/149/37", "single", "paid", 3500], ["2026-03-28", "15:00", 45, "Конузелева София", "training", "Ольга", null, "confirmed", "10 лет 150 см 41 кг", "subscription", "paid", null], ["2026-03-28", "16:00", 30, "Сивожелезова Вероника", "training", "Арина", null, "confirmed", "6 лет 117 см 19 кг", "single", "paid", 3000], ["2026-03-28", "16:00", 45, "Громыко Карина", "rental", "Катя Мальц", "Фантастик", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "16:00", 45, "Флягина Вика", "training", "Даша", null, "confirmed", "8 лет, 135 см,35 кг.", "single", "paid", 3000], ["2026-03-28", "17:00", 45, "Чечулина Яна", "rental", "Катя Мальц", "Кинза", "confirmed", "9 лет, 136 см, 32 кг.", "single", "paid", 4000], ["2026-03-28", "17:00", 30, "Кудрина Полина", "training", "Арина", null, "confirmed", "13 лет, 55 кг, 160 см", "single", "paid", 2600], ["2026-03-28", "17:00", 45, "Вахрушева Арина", "rental", "Саша", "Ижмарин", "confirmed", "", "single", "paid", 4000], ["2026-03-28", "17:00", 30, "Шкуратова Таисия", "rental", "Ольга", "Уэлси", "confirmed", "4 года, 108 см, 20 кг", "single", "paid", 4000], ["2026-03-28", "17:00", 45, "Морозова Александра", "training", "Джулия", null, "confirmed", "14 лет 75 кг 170 см.", "single", "paid", 3300], ["2026-03-28", "17:00", 45, "Королик Филипп", "rental", "Ольга Г", "Дариус", "confirmed", "", "single", "paid", 3500], ["2026-03-28", "17:30", 30, "Белопашенцев Максим", "training", "Арина", null, "confirmed", "5 лет 16 кг 110 см", "single", "paid", 2600], ["2026-03-28", "18:00", 30, "Логинов Лев", "hippotherapy", "Ольга Г", null, "confirmed", "", "single", "paid", 2100], ["2026-03-28", "18:00", 45, "Кислякова Алина", "training", "Арина", null, "confirmed", "9 лет.", "single", "paid", 3000], ["2026-03-28", "18:00", 30, "Чеканов Архип", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-28", "18:30", 30, "Чеканов Николай", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-28", "19:00", 45, "Пивоварова София", "rental", "Катя Мальц", "Альбус", "confirmed", "12 лет 41 кг, 161 см.", "single", "paid", 4000], ["2026-03-28", "19:00", 45, "Пивоварова Алиса", "rental", "Катя Мальц", "Дарина", "confirmed", "6 лет", "single", "paid", 4000], ["2026-03-28", "19:00", 45, "Кундрюков Лев", "training", "Джулия", null, "confirmed", "5 лет 116 см 15 кг", "subscription", "paid", null], ["2026-03-29", "09:00", 45, "Горожанинова Виктория", "training", "Вика", null, "confirmed", "", "single", "paid", 3000], ["2026-03-29", "09:00", 30, "Горожанинова Маргарита", "training", "Джулия", null, "confirmed", "", "single", "paid", 2600], ["2026-03-29", "09:45", 30, "Ушакова Анна", "rve", "Настя Б", null, "confirmed", "4 года 17 кг 90 см", "single", "paid", 3000], ["2026-03-29", "10:00", 30, "Садиахметова Уля", "rve", "Джулия", null, "confirmed", "1 год ,", "subscription", "paid", null], ["2026-03-29", "10:00", 45, "Денисова Диана", "rental", "Арина", "Альбус", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "10:30", 30, "Унесихина Стефания", "rve", "Настя Б", null, "confirmed", "", "single", "paid", 3000], ["2026-03-29", "11:00", 45, "Щербань Екатерина", "training", "Арина", null, "confirmed", "38 лет", "single", "paid", 3300], ["2026-03-29", "11:00", 45, "Федорахина Милана", "rental", "Ольга", "Кавалер", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "11:00", 30, "Кутепов Роберт", "training", "Джулия", null, "confirmed", "", "single", "paid", 2600], ["2026-03-29", "11:00", 45, "Елизавета Малышева", "battle", "Ольга Г", "Фортуна", "confirmed", "40 лет", null, null, null], ["2026-03-29", "11:15", 30, "Денисова Стефания", "training", "Настя Б", null, "confirmed", "", "single", "paid", 2600], ["2026-03-29", "12:00", 30, "Масленица", "sled", "Гриша", null, "confirmed", "", "single", "paid", 6000], ["2026-03-29", "12:00", 45, "Громыко Карина", "rental", "Катя Мальц", "Фантастик", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "12:00", 45, "Круглина Ольга", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-29", "12:00", 45, "Бахолдина Яна", "training", "Ольга", null, "confirmed", "", "single", "paid", 3300], ["2026-03-29", "12:00", 45, "Филипьева Елизавета", "training", "Настя Б", null, "confirmed", "", "single", "paid", 3300], ["2026-03-29", "12:00", 45, "Пальчиков Александр", "rental", "Аня Ж", "Легион", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "12:00", 30, "Доспехова Алиса", "rental", "Арина", "Дарина", "confirmed", "6 лет, 18 кг.", "single", "paid", 4000], ["2026-03-29", "12:00", 30, "Доспехов Родион", "hippotherapy", "Ольга Г", null, "confirmed", "8 лет, 30 кг.", "single", "paid", 3000], ["2026-03-29", "12:00", 45, "Пальчикова Полина", "rental", "Аня Ж", "Кромка", "confirmed", "7 лет.", "single", "paid", 4000], ["2026-03-29", "12:00", 30, "Аболенская Кира", "training", "Джулия", null, "confirmed", "", "single", "paid", 2600], ["2026-03-29", "14:00", 30, "Баженова Милана", "training", "Катя С", null, "confirmed", "", "single", "paid", 2600], ["2026-03-29", "14:00", 45, "Большакова Кира", "training", "Ольга", null, "confirmed", "13 лет, 41 кг.", "single", "paid", 3000], ["2026-03-29", "14:00", 45, "Секретарева Таисия", "rental", "Арина", "Дарина", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "14:00", 45, "Вовин Владимир", "training", "Ольга Г", null, "confirmed", "11 лет 145 см 36 кг", "single", "paid", 3000], ["2026-03-29", "14:00", 45, "Кочарян Полина", "training", "Джулия", null, "confirmed", "9 лет 130 см 25 кг", null, null, null], ["2026-03-29", "15:00", 45, "Фасхетдинова Мария", "battle", "Ольга", "Зайка", "confirmed", "", "single", "paid", 3500], ["2026-03-29", "15:00", 30, "Бушмакина Елизавета", "training", "Джулия", null, "confirmed", "5 лет 115 см 19 кг", "single", "paid", 2600], ["2026-03-29", "15:00", 30, "Диордиев Давид", "rve", "Ольга Г", null, "confirmed", "3 года 12 кг 92 см", "subscription", "paid", null], ["2026-03-29", "15:00", 30, "Ворончихина Стефания", "training", "Настя Б", null, "confirmed", "5 лет 21 кг 106 см", "subscription", "paid", null], ["2026-03-29", "15:00", 45, "Каргаполова Полина", "rental", "Катя С", "Фантастик", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "15:00", 45, "Диордиева Диана", "training", "Арина", null, "confirmed", "7 лет, 20 кг, 120 см", "subscription", "paid", null], ["2026-03-29", "15:00", 45, "Стефахина Елена", "training", "Ольга", null, "confirmed", "34/160/74", "single", "paid", 3300], ["2026-03-29", "16:00", 45, "Васильева Саша", "rental", "Ольга Г", "Голди", "confirmed", "40 лет", null, null, null], ["2026-03-29", "16:00", 45, "Васильева Софья", "training", "Арина", null, "confirmed", "9 лет, 133 см, 40 кг.", "single", "paid", 3000], ["2026-03-29", "16:00", 45, "Пудовкина Амелия", "rental", "Катя С", "Кромка", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "16:00", 30, "Кунавин Кирилл", "training", "Арина", null, "confirmed", "7 лет 130 см 30 кг", "single", "paid", 2600], ["2026-03-29", "16:15", 45, "Косажевская Екатерина", "rental", "Ольга Г", null, "confirmed", "46 лет 175 см 62 кг запись по звонку", null, null, null], ["2026-03-29", "17:00", 45, "Лескина Белла", "rental", "Катя С", "Уэлси", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "17:00", 45, "Пивоварова София", "rental", "Катя Мальц", "Альбус", "confirmed", "11 лет 41 кг, 161 см.", "single", "paid", 4000], ["2026-03-29", "17:00", 45, "Таланкина Елизавета", "training", "Джулия", null, "confirmed", "7 лет, 129 см, 25 кг", "single", "paid", 3000], ["2026-03-29", "17:00", 45, "Прокопьева Елена", "training", "Арина", null, "confirmed", "", "single", "paid", 3300], ["2026-03-29", "17:00", 45, "Карамазова Анастасия", "training", "Ольга", null, "confirmed", "15 лет", "single", "paid", 3300], ["2026-03-29", "17:00", 45, "Гильманов Глеб", "hippotherapy", "Ольга", null, "confirmed", "", null, null, null], ["2026-03-29", "17:00", 45, "Ахмаева Индира", "training", "Ольга", null, "confirmed", "38/160/70", "single", "paid", 3300], ["2026-03-29", "17:00", 30, "Нежданов Даниил", "hippotherapy", "Ольга Г", null, "confirmed", "", "single", "paid", 3000], ["2026-03-29", "17:45", 45, "Лескина Варвара", "rental", "Катя С", "Кромка", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "18:00", 30, "Гусева Дарья", "training", "Ольга", null, "confirmed", "", "subscription", "paid", null], ["2026-03-29", "18:00", 30, "Гусева Варвара", "rve", "Настя Б", null, "confirmed", "", "subscription", "paid", null], ["2026-03-29", "18:00", 45, "Чечулина Яна", "rental", "Катя Мальц", "Кинза", "confirmed", "9 лет, 136 см, 32 кг.", "single", "paid", 4000], ["2026-03-29", "18:00", 45, "Медведева Елизавета", "rental", "Арина", "Кудряшка", "confirmed", "", "single", "paid", 4000], ["2026-03-29", "18:00", 45, "гусева", "training", "Джулия", null, "confirmed", "", null, null, null], ["2026-03-29", "18:00", 45, "Королик Филипп", "battle", "Ольга Г", "Дариус", "confirmed", "", "single", "paid", 3500], ["2026-03-29", "18:30", 45, "Орехова Вероника", "training", "Ольга", null, "confirmed", "", "single", "paid", 3000], ["2026-03-29", "19:00", 45, "Феоктистов Иван", "training", "Джулия", null, "confirmed", "42 года 177 см 90 кг", "subscription", "paid", null], ["2026-03-29", "19:15", 45, "Герман Елизавета", "training", "Ольга", null, "confirmed", "14 лет, 45 кг, опыт есть.", null, null, null]];

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toDate(isoDate) {
    var parts = isoDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function isoFromDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function addDays(isoDate, delta) {
    var date = toDate(isoDate);
    date.setDate(date.getDate() + delta);
    return isoFromDate(date);
  }

  function startOfIsoWeek(isoDate) {
    var date = toDate(isoDate);
    var day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return isoFromDate(date);
  }

  function getIsoWeekday(isoDate) {
    return toDate(isoDate).getDay() || 7;
  }

  function parseTimeToMinutes(time) {
    if (!time || typeof time !== "string") {
      return NaN;
    }
    var parts = time.split(":").map(Number);
    if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
      return NaN;
    }
    return parts[0] * 60 + parts[1];
  }

  function formatTime(minutes) {
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
  }

  function addMinutes(time, duration) {
    return formatTime(parseTimeToMinutes(time) + duration);
  }

  function getShiftLabel(start, end) {
    if (!start || !end) {
      return "Выходной";
    }
    return start + "-" + end;
  }

  function getTrainerScheduleEntry(trainerId) {
    return buildTrainerScheduleMap()[trainerId] || null;
  }

  function buildTrainerFreeWindowMeta(trainerId, isoDate, bookingsForDate) {
    var shift = KSK.Data.getTrainerShiftForDate(trainerId, isoDate);
    var safeResult = {
      shift: shift,
      windows: [],
      startSlots: [],
      hasCapacity: false
    };
    var shiftStart;
    var shiftEnd;
    var busyIntervals;
    var mergedBusy;
    var windows = [];
    var startSlots = [];
    var cursor;

    if (!trainerId || !isoDate) {
      return safeResult;
    }

    if (shift.isOff) {
      return safeResult;
    }

    shiftStart = parseTimeToMinutes(shift.start);
    shiftEnd = parseTimeToMinutes(shift.end);
    if (Number.isNaN(shiftStart) || Number.isNaN(shiftEnd) || shiftEnd <= shiftStart) {
      return safeResult;
    }

    busyIntervals = (Array.isArray(bookingsForDate) ? bookingsForDate : KSK.Data.getBookings(isoDate))
      .filter(function (booking) {
        return booking
          && booking.status !== "cancelled"
          && booking.trainerId === trainerId;
      })
      .map(function (booking) {
        var start = parseTimeToMinutes(booking.time);
        var end = start + Number(booking.duration);
        var clippedStart;
        var clippedEnd;

        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
          return null;
        }

        clippedStart = Math.max(start, shiftStart);
        clippedEnd = Math.min(end, shiftEnd);
        if (clippedEnd <= clippedStart) {
          return null;
        }

        return {
          start: clippedStart,
          end: clippedEnd
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        return a.end - b.end;
      });

    mergedBusy = [];
    busyIntervals.forEach(function (interval) {
      var previous = mergedBusy[mergedBusy.length - 1];

      if (!previous || interval.start > previous.end) {
        mergedBusy.push({
          start: interval.start,
          end: interval.end
        });
        return;
      }

      previous.end = Math.max(previous.end, interval.end);
    });

    cursor = shiftStart;
    mergedBusy.forEach(function (interval) {
      if (interval.start > cursor) {
        windows.push({
          start: formatTime(cursor),
          end: formatTime(interval.start),
          duration: interval.start - cursor
        });
      }
      cursor = Math.max(cursor, interval.end);
    });

    if (cursor < shiftEnd) {
      windows.push({
        start: formatTime(cursor),
        end: formatTime(shiftEnd),
        duration: shiftEnd - cursor
      });
    }

    windows.forEach(function (windowMeta) {
      var windowStart = parseTimeToMinutes(windowMeta.start);
      var windowEnd = parseTimeToMinutes(windowMeta.end);
      var firstHour = Math.ceil(windowStart / 60) * 60;
      var minute;

      for (minute = firstHour; minute + 60 <= windowEnd; minute += 60) {
        startSlots.push(formatTime(minute));
      }
    });

    return {
      shift: shift,
      windows: windows,
      startSlots: startSlots,
      hasCapacity: startSlots.length > 0
    };
  }

  function formatDateLabel(isoDate, options) {
    return toDate(isoDate).toLocaleDateString("ru-RU", options || {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatShortDate(isoDate) {
    return toDate(isoDate).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function getWeekDates(anchorDate) {
    var start = startOfIsoWeek(anchorDate);
    var dates = [];
    var i;
    for (i = 0; i < 7; i += 1) {
      dates.push(addDays(start, i));
    }
    return dates;
  }

  function compareBookings(a, b) {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    var startA = parseTimeToMinutes(a.time);
    var startB = parseTimeToMinutes(b.time);
    if (startA !== startB) {
      return startA - startB;
    }
    if (a.duration !== b.duration) {
      return b.duration - a.duration;
    }
    return a.id.localeCompare(b.id);
  }

  function pluralize(count, forms) {
    var abs = Math.abs(count) % 100;
    var last = abs % 10;
    if (abs > 10 && abs < 20) {
      return forms[2];
    }
    if (last > 1 && last < 5) {
      return forms[1];
    }
    if (last === 1) {
      return forms[0];
    }
    return forms[2];
  }

  function getStorageKey(name) {
    return STORAGE_PREFIX + name;
  }

  function invalidateDerivedCache(name) {
    if (!name || name === "bookings") {
      derivedCache.bookings = null;
    }
    if (!name || name === "trainerSchedules") {
      derivedCache.trainerSchedulesById = null;
    }
  }

  function read(name) {
    if (Object.prototype.hasOwnProperty.call(memoryCache, name)) {
      return memoryCache[name];
    }
    var raw = window.localStorage.getItem(getStorageKey(name));
    if (!raw) {
      memoryCache[name] = [];
      return memoryCache[name];
    }
    memoryCache[name] = JSON.parse(raw);
    return memoryCache[name];
  }

  function write(name, value) {
    var serialized = JSON.stringify(value);
    window.localStorage.setItem(getStorageKey(name), serialized);
    memoryCache[name] = JSON.parse(serialized);
    invalidateDerivedCache(name);
  }

  function buildTrainerScheduleMap() {
    if (derivedCache.trainerSchedulesById) {
      return derivedCache.trainerSchedulesById;
    }

    derivedCache.trainerSchedulesById = {};
    read("trainerSchedules").forEach(function (schedule) {
      derivedCache.trainerSchedulesById[schedule.trainerId] = schedule;
    });

    return derivedCache.trainerSchedulesById;
  }

  function buildBookingsCache() {
    var normalized;
    var byDate;
    var byId;

    if (derivedCache.bookings) {
      return derivedCache.bookings;
    }

    normalized = read("bookings").map(normalizeBooking).sort(compareBookings);
    byDate = {};
    byId = {};

    normalized.forEach(function (booking) {
      if (!byDate[booking.date]) {
        byDate[booking.date] = [];
      }
      byDate[booking.date].push(booking);
      byId[booking.id] = booking;
    });

    derivedCache.bookings = {
      all: normalized,
      byDate: byDate,
      byId: byId
    };

    return derivedCache.bookings;
  }

  function normalizeBooking(booking) {
    var bitrixDealUrl = typeof booking.bitrixDealUrl === "string" ? booking.bitrixDealUrl.trim() : "";
    var bitrixDealLabel = typeof booking.bitrixDealLabel === "string" ? booking.bitrixDealLabel.trim() : "";
    var paymentType = booking.paymentType === "single" || booking.paymentType === "subscription"
      ? booking.paymentType
      : null;
    var paymentStatus = booking.paymentStatus === "paid" || booking.paymentStatus === "unpaid"
      ? booking.paymentStatus
      : null;
    var singlePriceValue = Number(booking.singlePrice);
    var subscriptionRemainingValue = Number(booking.subscriptionRemaining);
    var hasSubscriptionRemaining = booking.subscriptionRemaining !== null
      && booking.subscriptionRemaining !== undefined
      && booking.subscriptionRemaining !== "";

    return {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      duration: Number(booking.duration),
      clientName: booking.clientName,
      serviceType: booking.serviceType,
      trainerId: booking.trainerId,
      horseId: booking.horseId || null,
      groomId: booking.groomId || null,
      arenaId: booking.arenaId,
      status: booking.status,
      notes: booking.notes || "",
      bitrixDealUrl: bitrixDealUrl || null,
      bitrixDealLabel: bitrixDealUrl ? (bitrixDealLabel || null) : null,
      paymentType: paymentType,
      paymentStatus: paymentStatus,
      singlePrice: paymentType === "single" && singlePriceValue > 0
        ? singlePriceValue
        : null,
      subscriptionRemaining: paymentType === "subscription"
        && hasSubscriptionRemaining
        && Number.isInteger(subscriptionRemainingValue)
        && subscriptionRemainingValue >= 0
        ? subscriptionRemainingValue
        : null
    };
  }

  function buildExcelStressSeedData() {
    var trainerIdByName = {};
    var horseIdByName = {};
    var bookingsByTrainerAndDate = {};
    var MAX_STRESS_SHIFT_MINUTES = 360;
    var STRESS_DAY_START = 540;
    var STRESS_DAY_END = 1260;

    function buildStressShiftWindow(intervals, allowedStart, allowedEnd) {
      var safeStart = Math.max(STRESS_DAY_START, allowedStart);
      var safeEnd = Math.min(STRESS_DAY_END, allowedEnd);
      var normalizedIntervals;
      var spanStart;
      var spanEnd;
      var candidateStarts;
      var bestWindow = null;
      var bestContained = [];

      if (safeEnd <= safeStart) {
        return null;
      }

      normalizedIntervals = (intervals || []).slice().sort(function (a, b) {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        return a.end - b.end;
      });

      if (!normalizedIntervals.length) {
        return [
          formatTime(safeStart),
          formatTime(Math.min(safeEnd, safeStart + MAX_STRESS_SHIFT_MINUTES))
        ];
      }

      spanStart = Math.max(safeStart, normalizedIntervals[0].start);
      spanEnd = normalizedIntervals.reduce(function (max, interval) {
        return Math.max(max, Math.min(safeEnd, interval.end));
      }, Math.min(safeEnd, normalizedIntervals[0].end));

      if (spanEnd > spanStart && spanEnd - spanStart <= MAX_STRESS_SHIFT_MINUTES) {
        return [formatTime(spanStart), formatTime(spanEnd)];
      }

      if (safeEnd - safeStart <= MAX_STRESS_SHIFT_MINUTES) {
        return [formatTime(safeStart), formatTime(safeEnd)];
      }

      candidateStarts = Array.from(new Set(normalizedIntervals.reduce(function (list, interval) {
        list.push(Math.max(safeStart, Math.min(interval.start, safeEnd - MAX_STRESS_SHIFT_MINUTES)));
        list.push(Math.max(safeStart, Math.min(interval.end - MAX_STRESS_SHIFT_MINUTES, safeEnd - MAX_STRESS_SHIFT_MINUTES)));
        return list;
      }, [safeStart]))).sort(function (a, b) {
        return a - b;
      });

      candidateStarts.forEach(function (start) {
        var end = Math.min(start + MAX_STRESS_SHIFT_MINUTES, safeEnd);
        var contained = normalizedIntervals.filter(function (interval) {
          return interval.start >= start && interval.end <= end;
        });
        var totalDuration = contained.reduce(function (sum, interval) {
          return sum + interval.duration;
        }, 0);

        if (!bestWindow || contained.length > bestWindow.count || (
          contained.length === bestWindow.count
          && totalDuration > bestWindow.totalDuration
        ) || (
          contained.length === bestWindow.count
          && totalDuration === bestWindow.totalDuration
          && start < bestWindow.start
        )) {
          bestWindow = {
            start: start,
            count: contained.length,
            totalDuration: totalDuration
          };
          bestContained = contained;
        }
      });

      if (!bestContained.length) {
        return [formatTime(safeStart), formatTime(Math.min(safeEnd, safeStart + MAX_STRESS_SHIFT_MINUTES))];
      }

      return [
        formatTime(bestContained[0].start),
        formatTime(bestContained.reduce(function (max, interval) {
          return Math.max(max, interval.end);
        }, bestContained[0].end))
      ];
    }
    var trainers = EXCEL_STRESS_TRAINER_NAMES.map(function (name, index) {
      var trainer = {
        id: "t" + String(101 + index),
        name: name,
        color: EXCEL_STRESS_TRAINER_COLORS[index]
      };
      trainerIdByName[name] = trainer.id;
      return trainer;
    });
    var horses = EXCEL_STRESS_HORSE_NAMES.map(function (name, index) {
      var horse = {
        id: "h" + String(101 + index),
        name: name,
        status: "available",
        maxDailyLoad: 4
      };
      horseIdByName[name] = horse.id;
      return horse;
    });
    var bookings = EXCEL_STRESS_BOOKING_ROWS.map(function (row, index) {
      var trainerName = row[5];
      var date = row[0];

      bookingsByTrainerAndDate[trainerName] = bookingsByTrainerAndDate[trainerName] || {};
      bookingsByTrainerAndDate[trainerName][date] = bookingsByTrainerAndDate[trainerName][date] || [];
      bookingsByTrainerAndDate[trainerName][date].push({
        start: parseTimeToMinutes(row[1]),
        end: parseTimeToMinutes(row[1]) + Number(row[2]),
        duration: Number(row[2])
      });

      return {
        id: "b" + String(1001 + index),
        date: date,
        time: row[1],
        duration: row[2],
        clientName: row[3],
        serviceType: row[4],
        trainerId: trainerIdByName[trainerName],
        horseId: row[6] ? horseIdByName[row[6]] : null,
        groomId: null,
        arenaId: "a1",
        status: row[7],
        notes: row[8],
        paymentType: row[9],
        paymentStatus: row[10],
        singlePrice: row[11],
        subscriptionRemaining: null
      };
    });
    var trainerSchedules = EXCEL_STRESS_TRAINER_SHIFT_ROWS.map(function (row) {
      var trainerName = row[0];
      var days = {};

      EXCEL_STRESS_WEEKDAY_DATES.forEach(function (date, index) {
        var range = row[index + 1];
        var intervals = bookingsByTrainerAndDate[trainerName] && bookingsByTrainerAndDate[trainerName][date]
          ? bookingsByTrainerAndDate[trainerName][date].slice()
          : [];
        var isDefaultFullDay = Array.isArray(range) && range[0] === "09:00" && range[1] === "21:00";
        var explicitStart;
        var explicitEnd;

        if (range === null) {
          days[index + 1] = null;
          return;
        }

        if (!isDefaultFullDay) {
          explicitStart = parseTimeToMinutes(range[0]);
          explicitEnd = parseTimeToMinutes(range[1]);
          days[index + 1] = buildStressShiftWindow(intervals, explicitStart, explicitEnd);
          return;
        }

        if (!intervals.length) {
          days[index + 1] = null;
          return;
        }

        days[index + 1] = buildStressShiftWindow(intervals, STRESS_DAY_START, STRESS_DAY_END);
      });

      return {
        trainerId: trainerIdByName[trainerName],
        days: days
      };
    });

    return {
      trainers: trainers,
      trainerSchedules: trainerSchedules,
      horses: horses,
      grooms: GROOMS,
      arenas: ARENAS,
      bookings: bookings
    };
  }

  var EXCEL_STRESS_DATA = buildExcelStressSeedData();

  KSK.Utils = {
    DAY_START: 540,
    DAY_END: 1260,
    DAY_MINUTES: 720,
    HOURS: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    STATUS_LABELS: {
      draft: "Черновик",
      confirmed: "Подтверждено",
      completed: "Проведено",
      cancelled: "Отменено"
    },
    SERVICE_LABELS: {
      training: "Обучение",
      rental: "Аренда лошади",
      battle: "БАТЛ",
      rve: "РВЕ",
      hippotherapy: "Иппотерапия",
      sled: "Сани",
      forest_walk: "Прогулка в лес",
      excursion: "Экскурсия",
      riding: "Катание"
    },
    HORSE_STATUS_LABELS: {
      available: "доступна",
      rest: "отдых",
      treatment: "лечение"
    },
    VIEW_LABELS: {
      trainers: "По тренерам",
      horses: "По лошадям",
      arenas: "По площадкам"
    },
    toDate: toDate,
    isoFromDate: isoFromDate,
    addDays: addDays,
    startOfIsoWeek: startOfIsoWeek,
    getIsoWeekday: getIsoWeekday,
    parseTimeToMinutes: parseTimeToMinutes,
    formatTime: formatTime,
    addMinutes: addMinutes,
    formatDateLabel: formatDateLabel,
    formatShortDate: formatShortDate,
    getWeekDates: getWeekDates,
    compareBookings: compareBookings,
    pluralize: pluralize,
    deepClone: deepClone
  };

  KSK.Data = {
    init: function () {
      if (!window.localStorage.getItem(getStorageKey("bookings"))) {
        this.seedData();
        return;
      }
      if (!window.localStorage.getItem(getStorageKey("trainerSchedules"))) {
        write("trainerSchedules", deepClone(TRAINER_SCHEDULES));
      }
    },

    getTrainers: function () {
      return read("trainers");
    },

    getHorses: function () {
      return read("horses");
    },

    getTrainerSchedules: function () {
      return deepClone(read("trainerSchedules"));
    },

    getGrooms: function () {
      return read("grooms");
    },

    getArenas: function () {
      return read("arenas");
    },

    getBookings: function (date) {
      var bookingsCache = buildBookingsCache();
      if (!date) {
        return bookingsCache.all;
      }
      return bookingsCache.byDate[date] || [];
    },

    getBookingById: function (id) {
      return buildBookingsCache().byId[id] || null;
    },

    getTrainerShiftForDate: function (trainerId, isoDate) {
      var schedule = trainerId && isoDate ? getTrainerScheduleEntry(trainerId) : null;
      var dayKey = schedule ? getIsoWeekday(isoDate) : null;
      var range = schedule && schedule.days ? schedule.days[dayKey] : null;

      if (!Array.isArray(range) || range.length !== 2) {
        return {
          isOff: true,
          start: null,
          end: null,
          label: "Выходной"
        };
      }

      return {
        isOff: false,
        start: range[0],
        end: range[1],
        label: getShiftLabel(range[0], range[1])
      };
    },

    getTrainerFreeWindows: function (trainerId, isoDate, bookingsForDate) {
      var meta = buildTrainerFreeWindowMeta(trainerId, isoDate, bookingsForDate);

      return {
        shift: meta.shift,
        windows: meta.windows,
        startSlots: meta.startSlots,
        hasCapacity: meta.hasCapacity,
        isFullyBooked: meta.startSlots.length === 0
      };
    },

    getTrainerSelectableHourSlots: function (trainerId, isoDate, bookingsForDate) {
      var meta = buildTrainerFreeWindowMeta(trainerId, isoDate, bookingsForDate);

      return {
        shift: meta.shift,
        startSlots: meta.startSlots,
        hasCapacity: meta.hasCapacity,
        isOff: meta.shift.isOff
      };
    },

    checkTrainerAvailability: function (trainerId, isoDate, time, duration) {
      var shift = this.getTrainerShiftForDate(trainerId, isoDate);
      var start = parseTimeToMinutes(time);
      var end = start + Number(duration);
      var shiftStart = parseTimeToMinutes(shift.start);
      var shiftEnd = parseTimeToMinutes(shift.end);

      if (!trainerId || !isoDate || !time || !duration) {
        return {
          isAvailable: true,
          reason: null,
          label: shift.label
        };
      }

      if (shift.isOff) {
        return {
          isAvailable: false,
          reason: "off",
          label: shift.label
        };
      }

      if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(shiftStart) || Number.isNaN(shiftEnd)) {
        return {
          isAvailable: true,
          reason: null,
          label: shift.label
        };
      }

      if (start < shiftStart || end > shiftEnd) {
        return {
          isAvailable: false,
          reason: "outside_shift",
          label: shift.label
        };
      }

      return {
        isAvailable: true,
        reason: null,
        label: shift.label
      };
    },

    saveBooking: function (booking) {
      var bookings = read("bookings");
      var nextBooking = normalizeBooking(booking);
      if (!nextBooking.id) {
        nextBooking.id = this.generateId("b");
      }
      var index = bookings.findIndex(function (item) {
        return item.id === nextBooking.id;
      });
      if (index === -1) {
        bookings.push(nextBooking);
      } else {
        bookings[index] = nextBooking;
      }
      bookings.sort(compareBookings);
      write("bookings", bookings);
      return deepClone(nextBooking);
    },

    deleteBooking: function (id) {
      var bookings = read("bookings").filter(function (booking) {
        return booking.id !== id;
      });
      write("bookings", bookings);
    },

    generateId: function (prefix) {
      return prefix + String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    },

    seedData: function () {
      write("trainers", deepClone(TRAINERS));
      write("trainerSchedules", deepClone(TRAINER_SCHEDULES));
      write("horses", deepClone(HORSES));
      write("grooms", deepClone(GROOMS));
      write("arenas", deepClone(ARENAS));
      write("bookings", deepClone(BOOKINGS));
    },

    seedExcelStressWeek: function () {
      write("trainers", deepClone(EXCEL_STRESS_DATA.trainers));
      write("trainerSchedules", deepClone(EXCEL_STRESS_DATA.trainerSchedules));
      write("horses", deepClone(EXCEL_STRESS_DATA.horses));
      write("grooms", deepClone(EXCEL_STRESS_DATA.grooms));
      write("arenas", deepClone(EXCEL_STRESS_DATA.arenas));
      write("bookings", deepClone(EXCEL_STRESS_DATA.bookings));
    },

    clearAll: function () {
      STORAGE_KEYS.forEach(function (key) {
        window.localStorage.removeItem(getStorageKey(key));
      });
      memoryCache = {};
      invalidateDerivedCache();
    }
  };
})();
