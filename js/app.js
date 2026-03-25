window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var Utils = KSK.Utils;
  var FOCUS_FILTERS = ["all", "conflicts", "unpaid", "subscription"];
  var DESKTOP_DENSITY_QUERY = "(min-width: 1800px) and (min-height: 980px)";
  var desktopDensityMql = null;
  var desktopDensityMatches = null;
  var isDesktopDensityRefreshBound = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function setActive(button, isActive) {
    button.classList.toggle("active", isActive);
  }

  function updateResourceMenu(viewType) {
    var label = Utils.VIEW_LABELS[viewType];
    byId("resource-view-btn").textContent = label;
    byId("resource-view-menu").querySelectorAll("[data-view]").forEach(function (item) {
      item.classList.toggle("active", item.dataset.view === viewType);
    });
  }

  function buildLegend(container) {
    var items = [
      { label: "Черновик", swatch: "draft" },
      { label: "Подтверждено", swatch: "confirmed" },
      { label: "Проведено", swatch: "completed" },
      { label: "Отменено", swatch: "cancelled" },
      { label: "Есть конфликты", swatch: "conflict" }
    ];
    var fragment = document.createDocumentFragment();
    items.forEach(function (item) {
      var wrapper = document.createElement("div");
      wrapper.className = "calendar-legend-item";
      var swatch = document.createElement("span");
      swatch.className = "calendar-legend-swatch calendar-legend-swatch--" + item.swatch;
      var label = document.createElement("span");
      label.textContent = item.label;
      wrapper.appendChild(swatch);
      wrapper.appendChild(label);
      fragment.appendChild(wrapper);
    });
    container.replaceChildren(fragment);
  }

  function createByIdMap(items) {
    var map = {};
    items.forEach(function (item) {
      map[item.id] = item;
    });
    return map;
  }

  function getLookups() {
    return {
      trainersById: createByIdMap(KSK.Data.getTrainers()),
      horsesById: createByIdMap(KSK.Data.getHorses()),
      groomsById: createByIdMap(KSK.Data.getGrooms()),
      arenasById: createByIdMap(KSK.Data.getArenas())
    };
  }

  function getCurrentPeriodBookings() {
    var state = KSK.App.state;
    if (state.period === "week") {
      return KSK.Data.getBookings().filter(function (booking) {
        return Utils.getWeekDates(state.currentDate).indexOf(booking.date) !== -1;
      });
    }
    return KSK.Data.getBookings(state.currentDate);
  }

  function buildTrainerWeekSummary(weekDates, gridVisibleBookings) {
    var summary = {
      bookingsByDate: {},
      freeMetaByTrainerAndDate: {},
      dayWindowCounts: {},
      trainerWindowCounts: {},
      totalWindows: 0
    };
    var trainers = KSK.Data.getTrainers();

    weekDates.forEach(function (date) {
      summary.bookingsByDate[date] = KSK.Data.getBookings(date);
      summary.dayWindowCounts[date] = 0;
    });

    trainers.forEach(function (trainer) {
      summary.freeMetaByTrainerAndDate[trainer.id] = {};
      summary.trainerWindowCounts[trainer.id] = 0;

      weekDates.forEach(function (date) {
        var freeMeta = KSK.Data.getTrainerFreeWindows(trainer.id, date, summary.bookingsByDate[date]);
        var windowCount = freeMeta.windows.length;

        summary.freeMetaByTrainerAndDate[trainer.id][date] = freeMeta;
        summary.dayWindowCounts[date] += windowCount;
        summary.trainerWindowCounts[trainer.id] += windowCount;
        summary.totalWindows += windowCount;
      });
    });

    return summary;
  }

  function isEnhancedResourceWeekState(state) {
    return Boolean(
      state
      && state.period === "week"
      && state.viewType !== "arenas"
      && KSK.App
      && typeof KSK.App.isScheduleInsightsEnabled === "function"
      && KSK.App.isScheduleInsightsEnabled()
    );
  }

  function isTrainerWeekState(state) {
    return Boolean(
      isEnhancedResourceWeekState(state)
      && state.viewType === "trainers"
      && KSK.App
      && typeof KSK.App.isTrainerScheduleEnabled === "function"
      && KSK.App.isTrainerScheduleEnabled()
    );
  }

  function isBookingVisibleInCurrentGrid(booking) {
    var state = KSK.App.state;
    if (state.period === "week") {
      if (!isEnhancedResourceWeekState(state)) {
        return true;
      }
      if (state.viewType === "horses") {
        return Boolean(booking.horseId);
      }
      if (state.viewType === "trainers") {
        return Boolean(booking.trainerId);
      }
      return true;
    }
    if (state.viewType === "horses") {
      return Boolean(booking.horseId);
    }
    if (state.viewType === "trainers") {
      return Boolean(booking.trainerId);
    }
    if (state.viewType === "arenas") {
      return Boolean(booking.arenaId);
    }
    return true;
  }

  function getTitle() {
    if (KSK.App.state.period === "week") {
      return "Расписание недели";
    }
    if (KSK.App.state.viewType === "arenas") {
      return "Занятость площадок";
    }
    return "Расписание";
  }

  function getSubtitle() {
    var state = KSK.App.state;
    var bookings = getCurrentPeriodBookings();
    var subtitleBookings;

    if (state.period === "week") {
      subtitleBookings = isEnhancedResourceWeekState(state)
        ? KSK.App.getGridVisibleBookings()
        : bookings;
      return KSK.Calendar.getWeekRangeLabel(state.currentDate) + " • " + subtitleBookings.length + " " + Utils.pluralize(subtitleBookings.length, ["запись", "записи", "записей"]);
    }

    return Utils.VIEW_LABELS[state.viewType] + " • " + bookings.length + " " + Utils.pluralize(bookings.length, ["запись", "записи", "записей"]) + " на " + Utils.formatDateLabel(state.currentDate, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatMoney(value) {
    if (typeof value !== "number") {
      return "Не задано";
    }
    return value.toLocaleString("ru-RU") + " ₽";
  }

  function getPaymentTypeLabel(paymentType) {
    if (paymentType === "single") {
      return "Разовое";
    }
    if (paymentType === "subscription") {
      return "Абонемент";
    }
    return "Не задано";
  }

  function getPaymentStatusLabel(paymentStatus) {
    if (paymentStatus === "paid") {
      return "Оплачено";
    }
    if (paymentStatus === "unpaid") {
      return "Не оплачено";
    }
    return "Не задано";
  }

  function getProblemPriority(booking) {
    if (KSK.Conflicts.checkConflicts(booking, KSK.Data.getBookings(booking.date)).length) {
      return 0;
    }
    if (booking.paymentStatus === "unpaid") {
      return 1;
    }
    if (booking.paymentType === null && booking.paymentStatus === null && booking.singlePrice === null && booking.subscriptionRemaining === null) {
      return 2;
    }
    return 99;
  }

  function getProblemLabel(booking) {
    var priority = getProblemPriority(booking);
    if (priority === 0) {
      return "Конфликт";
    }
    if (priority === 1) {
      return "Не оплачено";
    }
    if (priority === 2) {
      return "Нет финданных";
    }
    return "";
  }

  function createInfoRow(label, value) {
    var row = el("div", "booking-details__row");
    row.appendChild(el("span", "booking-details__label", label));
    row.appendChild(el("span", "booking-details__value", value));
    return row;
  }

  function createSection(title) {
    var section = el("section", "booking-details__section");
    section.appendChild(el("h3", "booking-details__section-title", title));
    return section;
  }

  function createActionButton(label, action, tone, nextStatus) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm " + (tone || "btn-outline-secondary");
    button.dataset.detailsAction = action;
    if (nextStatus) {
      button.dataset.nextStatus = nextStatus;
    }
    button.textContent = label;
    return button;
  }

  function bindDesktopDensityRefresh() {
    function handleDesktopDensityChange(event) {
      var nextMatches = event && typeof event.matches === "boolean"
        ? event.matches
        : desktopDensityMql.matches;

      if (nextMatches === desktopDensityMatches) {
        return;
      }

      desktopDensityMatches = nextMatches;
      KSK.App.refresh();
    }

    if (isDesktopDensityRefreshBound) {
      return;
    }

    desktopDensityMql = window.matchMedia(DESKTOP_DENSITY_QUERY);
    desktopDensityMatches = desktopDensityMql.matches;

    if (typeof desktopDensityMql.addEventListener === "function") {
      desktopDensityMql.addEventListener("change", handleDesktopDensityChange);
    } else if (typeof desktopDensityMql.addListener === "function") {
      desktopDensityMql.addListener(handleDesktopDensityChange);
    }

    isDesktopDensityRefreshBound = true;
  }

  KSK.App = {
    state: {
      currentDate: "2026-03-19",
      viewType: "trainers",
      period: "day",
      selectedBookingId: null,
      focusFilter: "all"
    },

    init: function () {
      KSK.Data.init();
      KSK.Booking.init();
      KSK.Calendar.init();

      byId("period-day-btn").addEventListener("click", function () {
        KSK.App.switchPeriod("day");
      });
      byId("period-week-btn").addEventListener("click", function () {
        KSK.App.switchPeriod("week");
      });
      byId("prev-date-btn").addEventListener("click", function () {
        KSK.App.navigateDate(-1);
      });
      byId("next-date-btn").addEventListener("click", function () {
        KSK.App.navigateDate(1);
      });
      byId("resource-view-menu").addEventListener("click", function (event) {
        var target = event.target.closest("[data-view]");
        if (!target) {
          return;
        }
        KSK.App.switchResourceView(target.dataset.view);
      });
      byId("new-booking-btn").addEventListener("click", function () {
        KSK.Booking.openNew();
      });
      byId("reset-data-btn").addEventListener("click", function () {
        if (!window.confirm("Сбросить все данные к каноническому демо-набору?")) {
          return;
        }
        KSK.Data.seedData();
        KSK.App.state.selectedBookingId = null;
        KSK.Booking.showToast("Демо-данные восстановлены", "success");
        KSK.App.refresh();
      });
      byId("calendar-page").addEventListener("click", function (event) {
        var focusTarget = event.target.closest("[data-focus-filter]");
        var detailsTarget = event.target.closest("[data-details-action]");
        var selected;

        if (focusTarget && KSK.App.isScheduleInsightsEnabled()) {
          KSK.App.setFocusFilter(focusTarget.dataset.focusFilter);
          return;
        }

        if (!detailsTarget || !KSK.App.isScheduleInsightsEnabled()) {
          return;
        }

        selected = KSK.App.getSelectedBooking();
        if (!selected && detailsTarget.dataset.detailsAction !== "clear-selection") {
          return;
        }

        if (detailsTarget.dataset.detailsAction === "clear-selection") {
          KSK.App.clearSelection();
          return;
        }

        if (detailsTarget.dataset.detailsAction === "go-to-day") {
          KSK.App.setDate(selected.date, { silent: true });
          KSK.App.switchPeriod("day", { silent: true });
          KSK.App.refresh();
          return;
        }

        if (detailsTarget.dataset.detailsAction === "edit-booking") {
          if (KSK.App.state.period === "week") {
            KSK.App.setDate(selected.date, { silent: true });
            KSK.App.switchPeriod("day", { silent: true });
            KSK.App.refresh();
          }
          KSK.Booking.openEdit(selected.id);
          return;
        }

        if (detailsTarget.dataset.detailsAction === "update-booking-status") {
          KSK.App.updateBookingStatus(selected.id, detailsTarget.dataset.nextStatus);
          return;
        }

        if (detailsTarget.dataset.detailsAction === "open-deal" && selected.bitrixDealUrl) {
          var dealWindow = window.open(selected.bitrixDealUrl, "_blank", "noopener");
          if (dealWindow) {
            dealWindow.opener = null;
          }
        }
      });

      buildLegend(byId("calendar-legend"));
      bindDesktopDensityRefresh();
      this.refresh();
      window.setInterval(function () {
        KSK.Calendar.highlightCurrentHour();
      }, 60000);
    },

    isScheduleInsightsEnabled: function () {
      return !(window.KSK_FLAGS && window.KSK_FLAGS.scheduleInsightsV2 === false);
    },

    isTrainerScheduleEnabled: function () {
      return !(window.KSK_FLAGS && window.KSK_FLAGS.trainerScheduleMvp === false);
    },

    matchesFocusFilter: function (booking, bookingsForDate) {
      var dayBookings = bookingsForDate || KSK.Data.getBookings(booking.date);

      if (this.state.focusFilter === "conflicts") {
        return KSK.Conflicts.checkConflicts(booking, dayBookings).length > 0;
      }
      if (this.state.focusFilter === "unpaid") {
        return booking.paymentStatus === "unpaid";
      }
      if (this.state.focusFilter === "subscription") {
        return booking.paymentType === "subscription";
      }
      return true;
    },

    isEnhancedResourceWeek: function () {
      return isEnhancedResourceWeekState(this.state);
    },

    getGridVisibleBookings: function () {
      return getCurrentPeriodBookings().filter(function (booking) {
        return isBookingVisibleInCurrentGrid(booking);
      });
    },

    getVisibleBookings: function () {
      var app = this;
      return this.getGridVisibleBookings().filter(function (booking) {
        return app.matchesFocusFilter(booking, KSK.Data.getBookings(booking.date));
      });
    },

    getSelectedBooking: function () {
      if (!this.state.selectedBookingId) {
        return null;
      }
      return KSK.Data.getBookingById(this.state.selectedBookingId);
    },

    selectBooking: function (bookingId) {
      if (!this.isScheduleInsightsEnabled()) {
        return;
      }
      this.state.selectedBookingId = this.state.selectedBookingId === bookingId ? null : bookingId;
      this.refresh();
    },

    clearSelection: function () {
      if (!this.state.selectedBookingId) {
        return;
      }
      this.state.selectedBookingId = null;
      this.refresh();
    },

    updateBookingStatus: function (bookingId, nextStatus) {
      var booking = KSK.Data.getBookingById(bookingId);
      var allowedTransitions = {
        draft: ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: ["cancelled"]
      };
      var allowedNext = booking ? (allowedTransitions[booking.status] || []) : [];
      var nextBooking;

      if (!booking || allowedNext.indexOf(nextStatus) === -1) {
        return false;
      }

      nextBooking = Object.assign({}, booking, {
        status: nextStatus
      });
      KSK.Data.saveBooking(nextBooking);
      this.refresh();
      KSK.Booking.showToast(
        nextStatus === "cancelled" ? "Занятие отменено" : "Занятие сохранено",
        nextStatus === "cancelled" ? "danger" : "success"
      );
      return true;
    },

    setFocusFilter: function (filter) {
      if (FOCUS_FILTERS.indexOf(filter) === -1) {
        return;
      }
      this.state.focusFilter = filter;
      this.refresh();
    },

    syncSelectionWithVisibility: function (gridVisibleBookings, focusVisibleBookings) {
      var selected = this.getSelectedBooking();
      var visibilitySource = this.isEnhancedResourceWeek()
        ? (gridVisibleBookings || this.getGridVisibleBookings())
        : (focusVisibleBookings || this.getVisibleBookings());
      var visibleIds = visibilitySource.map(function (booking) {
        return booking.id;
      });

      if (!selected || visibleIds.indexOf(selected.id) === -1) {
        this.state.selectedBookingId = null;
      }
    },

    navigateDate: function (delta) {
      var step = this.state.period === "week" ? 7 : 1;
      this.state.currentDate = Utils.addDays(this.state.currentDate, delta * step);
      this.refresh();
    },

    setDate: function (isoDate, options) {
      this.state.currentDate = isoDate;
      if (!options || !options.silent) {
        this.refresh();
      }
    },

    switchResourceView: function (type) {
      this.state.viewType = type;
      if (type === "arenas") {
        this.state.period = "day";
      }
      this.refresh();
    },

    switchPeriod: function (period, options) {
      if (period === "week" && this.state.viewType === "arenas") {
        this.state.period = "day";
      } else {
        this.state.period = period;
      }
      if (!options || !options.silent) {
        this.refresh();
      }
    },

    renderOverview: function (bookings, trainerWeekSummary) {
      var container = byId("calendar-overview");
      var fragment;
      var stats;
      var isTrainerWeek = isTrainerWeekState(this.state) && trainerWeekSummary;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      fragment = document.createDocumentFragment();
      if (isTrainerWeek) {
        stats = [
          {
            label: "Занятий",
            value: String(bookings.length)
          },
          {
            label: "Свободных окон",
            value: String(trainerWeekSummary.totalWindows)
          },
          {
            label: "Конфликтов",
            value: String(bookings.filter(function (booking) {
              return KSK.Conflicts.checkConflicts(booking, trainerWeekSummary.bookingsByDate[booking.date]).length > 0;
            }).length)
          },
          {
            label: "Не оплачено",
            value: String(bookings.filter(function (booking) {
              return booking.paymentStatus === "unpaid";
            }).length)
          }
        ];
      } else {
        stats = [
          {
            label: "Всего записей",
            value: String(bookings.length)
          },
          {
            label: "Есть конфликты",
            value: String(bookings.filter(function (booking) {
              return KSK.Conflicts.checkConflicts(booking, KSK.Data.getBookings(booking.date)).length > 0;
            }).length)
          },
          {
            label: "Не оплачено",
            value: String(bookings.filter(function (booking) {
              return booking.paymentStatus === "unpaid";
            }).length)
          },
          {
            label: "По абонементу",
            value: String(bookings.filter(function (booking) {
              return booking.paymentType === "subscription";
            }).length)
          }
        ];
      }

      stats.forEach(function (item) {
        var card = el("div", "calendar-overview-card");
        card.appendChild(el("div", "calendar-overview-card__label", item.label));
        card.appendChild(el("div", "calendar-overview-card__value", item.value));
        fragment.appendChild(card);
      });

      container.replaceChildren(fragment);
    },

    renderFocusControls: function () {
      var container = byId("calendar-focus-controls");
      var fragment;
      var state = this.state;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      fragment = document.createDocumentFragment();
      [
        { id: "all", label: "Все" },
        { id: "conflicts", label: "Конфликты" },
        { id: "unpaid", label: "Не оплачено" },
        { id: "subscription", label: "Абонементы" }
      ].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-sm " + (state.focusFilter === item.id ? "btn-primary" : "btn-outline-secondary");
        button.dataset.focusFilter = item.id;
        button.textContent = item.label;
        fragment.appendChild(button);
      });
      container.replaceChildren(fragment);
    },

    renderDetailsPanel: function (bookings, trainerWeekSummary) {
      var panel = byId("booking-details-panel");
      var container = byId("booking-details-content");
      var selected = this.getSelectedBooking();
      var lookups = getLookups();
      var fragment;
      var problems;
      var summary;
      var isTrainerWeek = isTrainerWeekState(this.state) && trainerWeekSummary;
      var statusActions = [];
      var selectedDayBookings;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      panel.dataset.state = selected ? "selected" : "empty";
      fragment = document.createDocumentFragment();

      if (!selected) {
        summary = el("div", "booking-details__empty");
        summary.appendChild(el("h2", "booking-details__title", "Детали периода"));
        summary.appendChild(el("p", "booking-details__hint", this.state.period === "week"
          ? KSK.Calendar.getWeekRangeLabel(this.state.currentDate)
          : Utils.formatDateLabel(this.state.currentDate, {
            day: "numeric",
            month: "long",
            year: "numeric"
          })));

        summary.appendChild(createInfoRow("Всего записей", String(bookings.length)));
        if (isTrainerWeek) {
          summary.appendChild(createInfoRow("Свободных окон", String(trainerWeekSummary.totalWindows)));
        } else {
          summary.appendChild(createInfoRow("Показывается во фокусе", String(this.getVisibleBookings().length)));
        }

        problems = bookings
          .filter(function (booking) {
            return getProblemPriority(booking) < 99;
          })
          .sort(function (a, b) {
            var priorityDiff = getProblemPriority(a) - getProblemPriority(b);
            if (priorityDiff !== 0) {
              return priorityDiff;
            }
            if (a.date !== b.date) {
              return a.date.localeCompare(b.date);
            }
            if (a.time !== b.time) {
              return a.time.localeCompare(b.time);
            }
            return a.id.localeCompare(b.id);
          })
          .slice(0, 5);

        if (problems.length) {
          var listSection = createSection("Проблемные записи");
          var list = el("div", "booking-details__problem-list");

          problems.forEach(function (booking) {
            var item = el("div", "booking-details__problem-item");
            item.appendChild(el("div", "booking-details__problem-title", Utils.formatShortDate(booking.date) + " • " + booking.time + " • " + booking.clientName));
            item.appendChild(el("div", "booking-details__problem-meta", getProblemLabel(booking)));
            list.appendChild(item);
          });

          listSection.appendChild(list);
          fragment.appendChild(summary);
          fragment.appendChild(listSection);
        } else {
          summary.appendChild(el("p", "booking-details__hint", "Проблемных записей не найдено."));
          fragment.appendChild(summary);
        }

        fragment.appendChild(el("p", "booking-details__hint booking-details__hint--footer", "Выберите занятие в сетке, чтобы увидеть подробности и действия."));
        container.replaceChildren(fragment);
        return;
      }

      var trainer = selected.trainerId ? lookups.trainersById[selected.trainerId] : null;
      var horse = selected.horseId ? lookups.horsesById[selected.horseId] : null;
      var groom = selected.groomId ? lookups.groomsById[selected.groomId] : null;
      var arena = selected.arenaId ? lookups.arenasById[selected.arenaId] : null;
      selectedDayBookings = isTrainerWeek
        ? trainerWeekSummary.bookingsByDate[selected.date]
        : KSK.Data.getBookings(selected.date);
      var conflicts = KSK.Conflicts.checkConflicts(selected, selectedDayBookings);
      var trainerScheduleEnabled = this.isTrainerScheduleEnabled();
      var trainerShift = selected.trainerId ? KSK.Data.getTrainerShiftForDate(selected.trainerId, selected.date) : null;
      var trainerAvailability = selected.trainerId ? KSK.Data.checkTrainerAvailability(selected.trainerId, selected.date, selected.time, selected.duration) : null;
      var trainerAvailabilityMessage = trainerAvailability && !trainerAvailability.isAvailable
        ? (trainerAvailability.reason === "off"
          ? "У тренера выходной в этот день"
          : "Время занятия выходит за смену тренера")
        : "";
      var title = el("div", "booking-details__header");
      var actions = el("div", "booking-details__actions");
      var bookingSection = createSection("Занятие");
      var resourcesSection = createSection("Ресурсы");
      var financeSection = createSection("Финансы");
      var conflictsSection = createSection("Конфликты");

      title.appendChild(el("h2", "booking-details__title", selected.clientName));
      title.appendChild(el("p", "booking-details__hint", Utils.formatDateLabel(selected.date, {
        day: "numeric",
        month: "long",
        year: "numeric"
      }) + " • " + selected.time + "–" + Utils.addMinutes(selected.time, selected.duration)));
      fragment.appendChild(title);

      bookingSection.appendChild(createInfoRow("Дата", Utils.formatDateLabel(selected.date, {
        day: "numeric",
        month: "long",
        year: "numeric"
      })));
      bookingSection.appendChild(createInfoRow("Время", selected.time + "–" + Utils.addMinutes(selected.time, selected.duration)));
      bookingSection.appendChild(createInfoRow("Статус", Utils.STATUS_LABELS[selected.status] || selected.status));
      bookingSection.appendChild(createInfoRow("Тип услуги", Utils.SERVICE_LABELS[selected.serviceType] || selected.serviceType));
      bookingSection.appendChild(createInfoRow("Клиент", selected.clientName));
      fragment.appendChild(bookingSection);

      resourcesSection.appendChild(createInfoRow("Тренер", trainer ? trainer.name : "Не назначен"));
      if (trainer && trainerScheduleEnabled && trainerShift) {
        resourcesSection.appendChild(createInfoRow("График тренера", trainerShift.label));
      }
      resourcesSection.appendChild(createInfoRow("Лошадь", horse ? horse.name : "Без лошади"));
      resourcesSection.appendChild(createInfoRow("Коновод", groom ? groom.name : "Не назначен"));
      resourcesSection.appendChild(createInfoRow("Площадка", arena ? arena.name : "Не назначен"));
      if (trainer && trainerScheduleEnabled && trainerAvailabilityMessage) {
        resourcesSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--danger", trainerAvailabilityMessage));
      }
      fragment.appendChild(resourcesSection);

      financeSection.appendChild(createInfoRow("Тип оплаты", getPaymentTypeLabel(selected.paymentType)));
      financeSection.appendChild(createInfoRow("Статус оплаты", getPaymentStatusLabel(selected.paymentStatus)));
      if (selected.paymentType === "single") {
        financeSection.appendChild(createInfoRow("Стоимость", formatMoney(selected.singlePrice)));
      }
      if (selected.paymentType === "subscription") {
        financeSection.appendChild(createInfoRow("Осталось занятий", selected.subscriptionRemaining === null ? "Не задано" : String(selected.subscriptionRemaining)));
      }
      financeSection.appendChild(createInfoRow("Bitrix24", selected.bitrixDealUrl || "Нет ссылки"));
      fragment.appendChild(financeSection);

      if (conflicts.length) {
        conflicts.forEach(function (conflict) {
          conflictsSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--" + conflict.severity, conflict.message));
        });
      } else {
        conflictsSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--neutral", "Конфликтов не найдено"));
      }
      fragment.appendChild(conflictsSection);

      if (isTrainerWeek) {
        if (selected.status === "draft") {
          statusActions.push(createActionButton("Подтвердить", "update-booking-status", "btn-success", "confirmed"));
        }
        if (selected.status === "confirmed") {
          statusActions.push(createActionButton("Проведено", "update-booking-status", "btn-success", "completed"));
        }
        if (selected.status === "draft" || selected.status === "confirmed" || selected.status === "completed") {
          statusActions.push(createActionButton("Отменить занятие", "update-booking-status", "btn-outline-danger", "cancelled"));
        }
      }

      statusActions.forEach(function (button) {
        actions.appendChild(button);
      });
      actions.appendChild(createActionButton("Редактировать", "edit-booking", "btn-primary"));
      if (this.state.period === "week") {
        actions.appendChild(createActionButton("Перейти к дню", "go-to-day"));
      }
      if (selected.bitrixDealUrl) {
        actions.appendChild(createActionButton("Открыть Bitrix24", "open-deal"));
      }
      actions.appendChild(createActionButton("Скрыть детали", "clear-selection"));
      fragment.appendChild(actions);

      container.replaceChildren(fragment);
    },

    refresh: function () {
      var scroll = document.querySelector(".calendar-scroll");
      var prevScrollTop = scroll ? scroll.scrollTop : 0;
      var prevScrollLeft = scroll ? scroll.scrollLeft : 0;
      var enabled = this.isScheduleInsightsEnabled();
      var currentBookings = getCurrentPeriodBookings();
      var gridVisibleBookings = this.getGridVisibleBookings();
      var focusVisibleBookings = enabled ? this.getVisibleBookings() : gridVisibleBookings;
      var weekDates = this.state.period === "week" ? Utils.getWeekDates(this.state.currentDate) : [];
      var trainerWeekSummary = enabled && isTrainerWeekState(this.state)
        ? buildTrainerWeekSummary(weekDates, gridVisibleBookings)
        : null;
      var summaryBookings = enabled && this.state.period === "week" && this.state.viewType !== "arenas"
        ? gridVisibleBookings
        : currentBookings;
      var page = byId("calendar-page");

      if (!enabled) {
        this.state.selectedBookingId = null;
        this.state.focusFilter = "all";
      }

      this.syncSelectionWithVisibility(gridVisibleBookings, focusVisibleBookings);

      if (this.state.period === "week") {
        KSK.Calendar.renderWeekView(Utils.startOfIsoWeek(this.state.currentDate), {
          allPeriodBookings: currentBookings,
          gridVisibleBookings: gridVisibleBookings,
          viewType: this.state.viewType,
          trainerWeekSummary: trainerWeekSummary
        });
      } else {
        KSK.Calendar.renderDayView(this.state.currentDate, this.state.viewType);
      }

      page.classList.toggle("schedule-insights-enabled", enabled);
      page.classList.toggle("schedule-insights-disabled", !enabled);
      byId("calendar-overview").hidden = !enabled;
      byId("calendar-focus-controls").hidden = !enabled;
      byId("booking-details-panel").hidden = !enabled;

      byId("calendar-title").textContent = getTitle();
      byId("calendar-subtitle").textContent = getSubtitle();
      updateResourceMenu(this.state.viewType);

      setActive(byId("period-day-btn"), this.state.period === "day");
      setActive(byId("period-week-btn"), this.state.period === "week");
      byId("period-week-btn").disabled = this.state.viewType === "arenas";

      byId("current-date-btn").textContent = this.state.period === "week"
        ? KSK.Calendar.getWeekRangeLabel(this.state.currentDate)
        : Utils.formatDateLabel(this.state.currentDate, {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

      if (enabled) {
        this.renderOverview(summaryBookings, trainerWeekSummary);
        this.renderFocusControls();
        this.renderDetailsPanel(summaryBookings, trainerWeekSummary);
      }

      window.requestAnimationFrame(function () {
        var nextScroll = document.querySelector(".calendar-scroll");
        if (!nextScroll) {
          return;
        }
        nextScroll.scrollTop = prevScrollTop;
        nextScroll.scrollLeft = prevScrollLeft;
      });
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    KSK.App.init();
  });
})();
