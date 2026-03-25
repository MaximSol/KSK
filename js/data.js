window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var STORAGE_PREFIX = "ksk_";
  var STORAGE_KEYS = ["trainers", "trainerSchedules", "horses", "grooms", "arenas", "bookings"];

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
    return JSON.parse(raw);
  }

  function write(name, value) {
    window.localStorage.setItem(getStorageKey(name), JSON.stringify(value));
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
      var bookings = read("bookings").map(normalizeBooking).sort(compareBookings);
      if (!date) {
        return bookings;
      }
      return bookings.filter(function (booking) {
        return booking.date === date;
      });
    },

    getBookingById: function (id) {
      var bookings = read("bookings");
      var match = bookings.find(function (booking) {
        return booking.id === id;
      });
      return match ? normalizeBooking(match) : null;
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

    clearAll: function () {
      STORAGE_KEYS.forEach(function (key) {
        window.localStorage.removeItem(getStorageKey(key));
      });
    }
  };
})();
