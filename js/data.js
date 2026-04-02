window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var STORAGE_PREFIX = "ksk_";
  var STORAGE_KEYS = ["trainers", "trainerSchedules", "horses", "grooms", "arenas", "services", "bookings"];
  var HORSE_REST_GAP_MINUTES = 60;

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

  var SERVICES = [
    { id: "1", name: "Аренда лошади (30 мин)", duration: 30, requiresGroom: false, legacyServiceType: "rental" },
    { id: "3", name: "Аренда лошади (45 мин)", duration: 45, requiresGroom: false, legacyServiceType: "rental" },
    { id: "5", name: "Обучение ВЕ детей с 6 до 13 лет (45 мин)", duration: 45, requiresGroom: false, legacyServiceType: "training" },
    { id: "7", name: "Обучение ВЕ (взрослые, 45 мин)", duration: 45, requiresGroom: false, legacyServiceType: "training" },
    { id: "9", name: "Иппотерапия (будни)", duration: 30, requiresGroom: true, legacyServiceType: "training" },
    { id: "13", name: "Обучение ВЕ детей с 6 до 13 лет (30 мин)", duration: 30, requiresGroom: false, legacyServiceType: "training" },
    { id: "15", name: "Обучение ВЕ (взрослые, 45 мин)", duration: 45, requiresGroom: false, legacyServiceType: "training" }
  ];

  var LEGACY_SERVICE_DEFAULTS = {
    training: {
      30: "9",
      45: "7"
    },
    rental: {
      30: "1",
      45: "3"
    }
  };

  var BOOKINGS = [
    { id: "b1", date: "2026-03-16", time: "09:00", duration: 45, clientName: "Горожанинова Виктория", serviceId: "7", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t4", horseId: "h7", groomId: "g1", arenaId: "a1", status: "confirmed", notes: "", bitrixDealUrl: "https://dubrava.bitrix24.ru/crm/deal/details/123/", bitrixDealLabel: "D123", paymentType: "single", paymentStatus: "paid", singlePrice: 3200 },
    { id: "b2", date: "2026-03-16", time: "09:15", duration: 45, clientName: "Ушакова Анна", serviceId: "5", serviceName: "Обучение ВЕ детей с 6 до 13 лет (45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t2", horseId: "h2", groomId: null, arenaId: "a1", status: "draft", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b3", date: "2026-03-16", time: "10:00", duration: 30, clientName: "Волкова Юлия", serviceId: "1", serviceName: "Аренда лошади (30 мин)", serviceDuration: 30, serviceRequiresGroom: false, serviceType: "rental", trainerId: "t3", horseId: "h3", groomId: null, arenaId: "a2", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 5 },
    { id: "b4", date: "2026-03-16", time: "18:00", duration: 45, clientName: "Козлова Мария", serviceId: "7", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t1", horseId: "h1", groomId: "g2", arenaId: "a2", status: "completed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3000 },
    { id: "b5", date: "2026-03-17", time: "09:00", duration: 30, clientName: "Сафонова Елена", serviceId: "9", serviceName: "Иппотерапия (будни)", serviceDuration: 30, serviceRequiresGroom: true, serviceType: "training", trainerId: "t6", horseId: "h8", groomId: "g2", arenaId: "a1", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "unpaid", singlePrice: 2800 },
    { id: "b6", date: "2026-03-17", time: "09:00", duration: 45, clientName: "Романова Алиса", serviceId: "15", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t8", horseId: "h10", groomId: "g3", arenaId: "a2", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 3 },
    { id: "b7", date: "2026-03-18", time: "11:00", duration: 30, clientName: "Петрова София", serviceId: "13", serviceName: "Обучение ВЕ детей с 6 до 13 лет (30 мин)", serviceDuration: 30, serviceRequiresGroom: false, serviceType: "training", trainerId: "t7", horseId: "h5", groomId: null, arenaId: "a1", status: "confirmed", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b8", date: "2026-03-18", time: "11:00", duration: 45, clientName: "Иванова Полина", serviceId: "7", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t9", horseId: "h9", groomId: "g4", arenaId: "a2", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3500 },
    { id: "b9", date: "2026-03-19", time: "09:00", duration: 45, clientName: "Горожанинова Виктория", serviceId: "15", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t4", horseId: "h7", groomId: null, arenaId: "a1", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3200 },
    { id: "b10", date: "2026-03-19", time: "09:30", duration: 30, clientName: "Чернова Дарья", serviceId: "13", serviceName: "Обучение ВЕ детей с 6 до 13 лет (30 мин)", serviceDuration: 30, serviceRequiresGroom: false, serviceType: "training", trainerId: "t4", horseId: "h4", groomId: null, arenaId: "a1", status: "confirmed", notes: "Пересечение по тренеру для демонстрации conflict UI", paymentType: "single", paymentStatus: "unpaid", singlePrice: 2900 },
    { id: "b11", date: "2026-03-19", time: "10:15", duration: 45, clientName: "Сидорова Таисия", serviceId: "3", serviceName: "Аренда лошади (45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "rental", trainerId: "t2", horseId: "h2", groomId: "g1", arenaId: "a2", status: "confirmed", notes: "", bitrixDealUrl: "https://dubrava.bitrix24.ru/crm/deal/details/587/", bitrixDealLabel: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 2 },
    { id: "b12", date: "2026-03-19", time: "17:30", duration: 45, clientName: "Клименко Ольга", serviceId: "5", serviceName: "Обучение ВЕ детей с 6 до 13 лет (45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t1", horseId: "h1", groomId: "g2", arenaId: "a2", status: "cancelled", notes: "", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null },
    { id: "b13", date: "2026-03-20", time: "09:00", duration: 45, clientName: "Морозова Ева", serviceId: "7", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t5", horseId: "h6", groomId: "g5", arenaId: "a1", status: "confirmed", notes: "", paymentType: "subscription", paymentStatus: "paid", subscriptionRemaining: 4 },
    { id: "b14", date: "2026-03-20", time: "09:45", duration: 45, clientName: "Филиппова Ника", serviceId: "15", serviceName: "Обучение ВЕ (взрослые, 45 мин)", serviceDuration: 45, serviceRequiresGroom: false, serviceType: "training", trainerId: "t10", horseId: "h11", groomId: null, arenaId: "a2", status: "confirmed", notes: "", paymentType: "single", paymentStatus: "paid", singlePrice: 3100 },
    { id: "b15", date: "2026-03-21", time: "12:00", duration: 30, clientName: "Лебедева Анна", serviceId: "1", serviceName: "Аренда лошади (30 мин)", serviceDuration: 30, serviceRequiresGroom: false, serviceType: "rental", trainerId: "t3", horseId: null, groomId: null, arenaId: "a1", status: "draft", notes: "Сценарий без лошади", paymentType: null, paymentStatus: null, singlePrice: null, subscriptionRemaining: null }
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
    var start = parseTimeToMinutes(time);
    var minutesToAdd = Number(duration);

    if (Number.isNaN(start) || Number.isNaN(minutesToAdd)) {
      return "";
    }

    return formatTime(start + minutesToAdd);
  }

  function getShiftLabel(start, end) {
    if (!start || !end) {
      return "Выходной";
    }
    return start + "-" + end;
  }

  function getTrainerScheduleEntry(trainerId) {
    var schedules = read("trainerSchedules");
    return schedules.find(function (schedule) {
      return schedule.trainerId === trainerId;
    }) || null;
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

  function buildHorseSelectableHourMeta(horseId, isoDate, duration, bookingsForDate) {
    var horses = KSK.Data.getHorses();
    var horse = horses.find(function (item) {
      return item.id === horseId;
    }) || null;
    var maxDailyLoad = horse ? Number(horse.maxDailyLoad) : 0;
    var safeResult = {
      summary: {
        horseStatus: horse ? horse.status : null,
        horseStatusLabel: horse ? KSK.Utils.HORSE_STATUS_LABELS[horse.status] : "",
        dayLoad: 0,
        maxDailyLoad: maxDailyLoad,
        restGapMinutes: HORSE_REST_GAP_MINUTES
      },
      startSlots: [],
      hasCapacity: false,
      isUnavailable: false,
      isFullyBooked: false
    };
    var effectiveDuration;
    var activeHorseBookings;
    var startSlots = [];

    function fitsBetweenBookings(candidateStart, candidateEnd, otherStart, otherEnd) {
      if (candidateStart < otherEnd && otherStart < candidateEnd) {
        return false;
      }
      if (candidateStart >= otherEnd) {
        return candidateStart - otherEnd >= HORSE_REST_GAP_MINUTES;
      }
      if (otherStart >= candidateEnd) {
        return otherStart - candidateEnd >= HORSE_REST_GAP_MINUTES;
      }
      return true;
    }

    if (!horseId || !isoDate) {
      return safeResult;
    }

    if (!horse) {
      return safeResult;
    }

    if (horse.status !== "available") {
      safeResult.isUnavailable = true;
      return safeResult;
    }

    activeHorseBookings = (Array.isArray(bookingsForDate) ? bookingsForDate : KSK.Data.getBookings(isoDate))
      .filter(function (booking) {
        return booking
          && booking.status !== "cancelled"
          && booking.horseId === horseId;
      })
      .map(function (booking) {
        var start = parseTimeToMinutes(booking.time);
        var end = start + Number(booking.duration);

        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
          return null;
        }

        return {
          start: start,
          end: end
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        return a.end - b.end;
      });

    safeResult.summary.dayLoad = activeHorseBookings.length;

    if (activeHorseBookings.length >= maxDailyLoad) {
      safeResult.isFullyBooked = true;
      return safeResult;
    }

    effectiveDuration = Number(duration) === 30 || Number(duration) === 45 ? Number(duration) : 45;

    KSK.Utils.HOURS.forEach(function (hour) {
      var candidateStart = hour * 60;
      var candidateEnd = candidateStart + effectiveDuration;
      var isSelectable = candidateEnd <= KSK.Utils.DAY_END && activeHorseBookings.every(function (other) {
        return fitsBetweenBookings(candidateStart, candidateEnd, other.start, other.end);
      });

      if (isSelectable) {
        startSlots.push(formatTime(candidateStart));
      }
    });

    safeResult.startSlots = startSlots;
    safeResult.hasCapacity = startSlots.length > 0;
    return safeResult;
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

  function read(name) {
    var raw = window.localStorage.getItem(getStorageKey(name));
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return [];
    }
  }

  function write(name, value) {
    window.localStorage.setItem(getStorageKey(name), JSON.stringify(value));
  }

  function normalizeServiceId(serviceId) {
    return serviceId === null || serviceId === undefined ? "" : String(serviceId).trim();
  }

  function normalizeServiceType(serviceType) {
    return serviceType === "training" || serviceType === "rental"
      ? serviceType
      : null;
  }

  function isValidServiceDuration(duration) {
    return duration === 30 || duration === 45;
  }

  function isValidServiceShape(service) {
    return Boolean(
      service
      && typeof service.id === "string"
      && service.id.trim()
      && typeof service.name === "string"
      && service.name.trim()
      && isValidServiceDuration(Number(service.duration))
      && typeof service.requiresGroom === "boolean"
      && normalizeServiceType(service.legacyServiceType)
    );
  }

  function buildServiceByIdMap(services) {
    var map = {};
    var hasEntries = false;
    var isValid = Array.isArray(services) && services.length > 0;

    if (!Array.isArray(services) || !services.length) {
      return {
        isValid: false,
        map: {}
      };
    }

    services.forEach(function (service) {
      if (!isValidServiceShape(service)) {
        isValid = false;
        return;
      }

      if (map[service.id]) {
        isValid = false;
        return;
      }

      hasEntries = true;
      map[service.id] = {
        id: String(service.id),
        name: service.name.trim(),
        duration: Number(service.duration),
        requiresGroom: service.requiresGroom,
        legacyServiceType: normalizeServiceType(service.legacyServiceType)
      };
    });

    return {
      isValid: isValid && hasEntries,
      map: isValid && hasEntries ? map : {}
    };
  }

  function getStoredServiceCatalog() {
    var services = read("services");
    var meta = buildServiceByIdMap(services);

    if (!meta.isValid) {
      return {
        services: deepClone(SERVICES),
        serviceById: buildServiceByIdMap(SERVICES).map,
        needsRewrite: true
      };
    }

    return {
      services: Object.keys(meta.map).map(function (id) {
        return deepClone(meta.map[id]);
      }),
      serviceById: meta.map,
      needsRewrite: false
    };
  }

  function getServiceByIdFromMap(serviceById, serviceId) {
    var normalizedId = normalizeServiceId(serviceId);
    var service = normalizedId && serviceById ? serviceById[normalizedId] : null;
    return service ? deepClone(service) : null;
  }

  function findDefaultServiceForLegacyShape(serviceType, duration, serviceById) {
    var normalizedType = normalizeServiceType(serviceType);
    var normalizedDuration = Number(duration);
    var defaultsByType = normalizedType ? LEGACY_SERVICE_DEFAULTS[normalizedType] : null;
    var serviceId = defaultsByType ? defaultsByType[normalizedDuration] : null;

    if (!serviceId) {
      return null;
    }

    return getServiceByIdFromMap(serviceById, serviceId);
  }

  function applyServiceSnapshot(booking, service) {
    var nextBooking = Object.assign({}, booking);

    if (!service) {
      nextBooking.serviceId = null;
      nextBooking.serviceName = null;
      nextBooking.serviceDuration = null;
      nextBooking.serviceRequiresGroom = false;
      return nextBooking;
    }

    nextBooking.serviceId = String(service.id);
    nextBooking.serviceName = service.name;
    nextBooking.serviceDuration = Number(service.duration);
    nextBooking.serviceRequiresGroom = Boolean(service.requiresGroom);
    nextBooking.duration = Number(service.duration);
    nextBooking.serviceType = normalizeServiceType(service.legacyServiceType) || nextBooking.serviceType || null;
    return nextBooking;
  }

  function migrateLegacyBooking(rawBooking, serviceById) {
    var service = findDefaultServiceForLegacyShape(rawBooking && rawBooking.serviceType, rawBooking && rawBooking.duration, serviceById);

    if (!service) {
      return Object.assign({}, rawBooking);
    }

    return applyServiceSnapshot(rawBooking, service);
  }

  function normalizeBooking(booking, serviceById) {
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
    var effectiveServiceById = serviceById || getStoredServiceCatalog().serviceById;
    var normalizedDuration = Number(booking.duration);
    var normalizedServiceId = normalizeServiceId(booking.serviceId);
    var normalizedServiceTypeValue = normalizeServiceType(booking.serviceType);
    var normalizedServiceDuration = Number(booking.serviceDuration);
    var normalizedServiceName = typeof booking.serviceName === "string" ? booking.serviceName.trim() : "";
    var hasValidSnapshot = Boolean(
      normalizedServiceId
      && normalizedServiceName
      && isValidServiceDuration(normalizedServiceDuration)
      && typeof booking.serviceRequiresGroom === "boolean"
    );
    var normalizedBooking = {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      duration: normalizedDuration,
      clientName: booking.clientName,
      serviceId: normalizedServiceId || null,
      serviceName: hasValidSnapshot ? normalizedServiceName : null,
      serviceDuration: hasValidSnapshot ? normalizedServiceDuration : null,
      serviceRequiresGroom: hasValidSnapshot ? Boolean(booking.serviceRequiresGroom) : false,
      serviceType: normalizedServiceTypeValue,
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
    var service = null;

    if (normalizedBooking.serviceId) {
      service = getServiceByIdFromMap(effectiveServiceById, normalizedBooking.serviceId);

      if (!service && normalizedBooking.serviceType) {
        service = findDefaultServiceForLegacyShape(normalizedBooking.serviceType, normalizedBooking.duration, effectiveServiceById);
      }

      if (service) {
        normalizedBooking = applyServiceSnapshot(normalizedBooking, service);
      } else if (hasValidSnapshot) {
        normalizedBooking.duration = normalizedBooking.serviceDuration;
      } else {
        normalizedBooking = applyServiceSnapshot(normalizedBooking, null);
      }
    } else {
      normalizedBooking = migrateLegacyBooking(normalizedBooking, effectiveServiceById);
    }

    if (normalizedBooking.serviceId) {
      if (!normalizedBooking.serviceType) {
        service = service || getServiceByIdFromMap(effectiveServiceById, normalizedBooking.serviceId);
        normalizedBooking.serviceType = service ? normalizeServiceType(service.legacyServiceType) : normalizedBooking.serviceType;
      }
      if (isValidServiceDuration(Number(normalizedBooking.serviceDuration))) {
        normalizedBooking.duration = Number(normalizedBooking.serviceDuration);
      }
    }

    if (!normalizedBooking.serviceId) {
      normalizedBooking.serviceName = null;
      normalizedBooking.serviceDuration = null;
      normalizedBooking.serviceRequiresGroom = false;
    }

    return normalizedBooking;
  }

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
      rental: "Аренда"
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
      var serviceCatalog;
      var serviceById;
      var rawBookings;
      var healedBookings;
      var hasBookingChanges = false;

      if (!window.localStorage.getItem(getStorageKey("bookings"))) {
        this.seedData();
        return;
      }

      serviceCatalog = getStoredServiceCatalog();
      serviceById = serviceCatalog.serviceById;

      if (serviceCatalog.needsRewrite) {
        write("services", deepClone(serviceCatalog.services));
      }

      rawBookings = read("bookings");
      if (Array.isArray(rawBookings)) {
        healedBookings = rawBookings.map(function (booking) {
          var normalized = normalizeBooking(booking, serviceById);

          if (!hasBookingChanges && JSON.stringify(normalized) !== JSON.stringify(booking)) {
            hasBookingChanges = true;
          }

          return normalized;
        });

        if (hasBookingChanges) {
          healedBookings.sort(compareBookings);
          write("bookings", healedBookings);
        }
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

    getServices: function () {
      return deepClone(getStoredServiceCatalog().services);
    },

    getServiceById: function (serviceId) {
      return getServiceByIdFromMap(getStoredServiceCatalog().serviceById, serviceId);
    },

    getDefaultServiceForLegacyShape: function (serviceType, duration) {
      return findDefaultServiceForLegacyShape(serviceType, duration, getStoredServiceCatalog().serviceById);
    },

    getBookings: function (date) {
      var serviceById = getStoredServiceCatalog().serviceById;
      var bookings = read("bookings").map(function (booking) {
        return normalizeBooking(booking, serviceById);
      }).sort(compareBookings);
      if (!date) {
        return bookings;
      }
      return bookings.filter(function (booking) {
        return booking.date === date;
      });
    },

    getBookingById: function (id) {
      var serviceById = getStoredServiceCatalog().serviceById;
      var bookings = read("bookings");
      var match = bookings.find(function (booking) {
        return booking.id === id;
      });
      return match ? normalizeBooking(match, serviceById) : null;
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

    getHorseSelectableHourSlots: function (horseId, isoDate, duration, bookingsForDate) {
      return buildHorseSelectableHourMeta(horseId, isoDate, duration, bookingsForDate);
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
      var serviceById = getStoredServiceCatalog().serviceById;
      var bookings = read("bookings");
      var nextBooking = normalizeBooking(booking, serviceById);
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
      write("services", deepClone(SERVICES));
      write("bookings", deepClone(BOOKINGS));
    },

    clearAll: function () {
      STORAGE_KEYS.forEach(function (key) {
        window.localStorage.removeItem(getStorageKey(key));
      });
    }
  };
})();
