window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var Utils = KSK.Utils;

  function findById(items, id) {
    return items.find(function (item) {
      return item.id === id;
    }) || null;
  }

  function getBookingLabel(booking) {
    return booking.time + "–" + Utils.addMinutes(booking.time, booking.duration);
  }

  function activeBookingsForDate(allBookings, booking) {
    return allBookings.filter(function (item) {
      return item.date === booking.date && item.status !== "cancelled" && item.id !== booking.id;
    });
  }

  function getOverlapCount(booking, otherBookings) {
    var start = Utils.parseTimeToMinutes(booking.time);
    var end = start + Number(booking.duration);
    var events = [
      { minute: start, delta: 1 },
      { minute: end, delta: -1 }
    ];

    otherBookings.forEach(function (item) {
      var itemStart = Utils.parseTimeToMinutes(item.time);
      var itemEnd = itemStart + Number(item.duration);
      var clippedStart = Math.max(start, itemStart);
      var clippedEnd = Math.min(end, itemEnd);
      if (clippedStart < clippedEnd) {
        events.push({ minute: clippedStart, delta: 1 });
        events.push({ minute: clippedEnd, delta: -1 });
      }
    });

    events.sort(function (a, b) {
      if (a.minute !== b.minute) {
        return a.minute - b.minute;
      }
      return a.delta - b.delta;
    });

    var current = 0;
    var peak = 0;
    events.forEach(function (event) {
      current += event.delta;
      peak = Math.max(peak, current);
    });

    return peak;
  }

  KSK.Conflicts = {
    hasTimeOverlap: function (date1, time1, dur1, date2, time2, dur2) {
      if (date1 !== date2) {
        return false;
      }
      var start1 = Utils.parseTimeToMinutes(time1);
      var end1 = start1 + Number(dur1);
      var start2 = Utils.parseTimeToMinutes(time2);
      var end2 = start2 + Number(dur2);
      return start1 < end2 && start2 < end1;
    },

    checkConflicts: function (booking, allBookings) {
      if (!booking || !booking.date || !booking.time || !booking.duration) {
        return [];
      }
      if (booking.status === "cancelled") {
        return [];
      }

      var data = KSK.Data;
      var bookings = Array.isArray(allBookings) ? allBookings : data.getBookings();
      var trainers = data.getTrainers();
      var horses = data.getHorses();
      var grooms = data.getGrooms();
      var arenas = data.getArenas();
      var conflicts = [];

      var candidates = activeBookingsForDate(bookings, booking).filter(function (item) {
        return KSK.Conflicts.hasTimeOverlap(booking.date, booking.time, booking.duration, item.date, item.time, item.duration);
      });

      if (booking.trainerId) {
        var trainer = findById(trainers, booking.trainerId);
        var trainerConflict = candidates.find(function (item) {
          return item.trainerId === booking.trainerId;
        });
        if (trainerConflict && trainer) {
          conflicts.push({
            type: "trainer",
            severity: "danger",
            message: "Тренер " + trainer.name + " занят в " + getBookingLabel(trainerConflict),
            conflictWith: trainerConflict.id
          });
        }
      }

      if (booking.horseId) {
        var horse = findById(horses, booking.horseId);
        var horseConflict = candidates.find(function (item) {
          return item.horseId === booking.horseId;
        });
        if (horseConflict && horse) {
          conflicts.push({
            type: "horse",
            severity: "danger",
            message: "Лошадь " + horse.name + " занята в " + getBookingLabel(horseConflict),
            conflictWith: horseConflict.id
          });
        }
        if (horse && horse.status !== "available") {
          conflicts.push({
            type: "horseStatus",
            severity: "danger",
            message: "Лошадь " + horse.name + ": " + Utils.HORSE_STATUS_LABELS[horse.status],
            conflictWith: null
          });
        }
        if (horse) {
          var horseDayCount = activeBookingsForDate(bookings, booking).filter(function (item) {
            return item.horseId === booking.horseId;
          }).length + 1;
          if (horseDayCount >= Number(horse.maxDailyLoad)) {
            conflicts.push({
              type: "horseDailyLoad",
              severity: "warning",
              message: "Лошадь " + horse.name + ": " + horseDayCount + "/" + horse.maxDailyLoad + " занятий за день",
              conflictWith: null
            });
          }
        }
      }

      if (booking.groomId) {
        var groom = findById(grooms, booking.groomId);
        var groomConflict = candidates.find(function (item) {
          return item.groomId === booking.groomId;
        });
        if (groomConflict && groom) {
          conflicts.push({
            type: "groom",
            severity: "danger",
            message: "Коновод " + groom.name + " занят в " + getBookingLabel(groomConflict),
            conflictWith: groomConflict.id
          });
        }
      }

      if (booking.arenaId) {
        var arena = findById(arenas, booking.arenaId);
        if (arena) {
          var sameArena = activeBookingsForDate(bookings, booking).filter(function (item) {
            return item.arenaId === booking.arenaId;
          });
          var peakLoad = getOverlapCount(booking, sameArena);
          if (peakLoad > Number(arena.capacity)) {
            conflicts.push({
              type: "arena",
              severity: "warning",
              message: arena.name + ": " + peakLoad + "/" + arena.capacity + " занятий",
              conflictWith: null
            });
          }
        }
      }

      conflicts.sort(function (a, b) {
        if (a.severity === b.severity) {
          return a.type.localeCompare(b.type);
        }
        return a.severity === "danger" ? -1 : 1;
      });

      return conflicts;
    }
  };
})();
