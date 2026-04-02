window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var Utils = KSK.Utils;
  var FOCUS_FILTERS = ["all", "conflicts", "missing-horse", "unpaid", "subscription"];
  var PROBLEM_GROUP_ORDER = ["conflict", "missing-horse", "unpaid", "missing-finance"];
  var PROBLEM_GROUP_META = {
    conflict: {
      title: "Конфликты"
    },
    "missing-horse": {
      title: "Не назначена лошадь"
    },
    unpaid: {
      title: "Не оплачено"
    },
    "missing-finance": {
      title: "Нет финданных"
    }
  };
  var DESKTOP_DENSITY_QUERY = "(min-width: 1800px) and (min-height: 980px)";
  var desktopDensityMql = null;
  var desktopDensityMatches = null;
  var isDesktopDensityRefreshBound = false;
  var pendingScrollBookingId = null;
  var pendingProblemToggleTimerId = null;

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

  function buildTrainerWeekSummary(weekDates, visibleTrainerIds) {
    var summary = {
      bookingsByDate: {},
      freeMetaByTrainerAndDate: {},
      dayWindowCounts: {},
      visibleDayWindowCounts: {},
      trainerWindowCounts: {},
      totalWindows: 0,
      visibleTotalWindows: 0
    };
    var trainers = KSK.Data.getTrainers();
    var visibleTrainerIdMap = {};

    (visibleTrainerIds || []).forEach(function (trainerId) {
      visibleTrainerIdMap[trainerId] = true;
    });

    weekDates.forEach(function (date) {
      summary.bookingsByDate[date] = KSK.Data.getBookings(date);
      summary.dayWindowCounts[date] = 0;
      summary.visibleDayWindowCounts[date] = 0;
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
        if (!visibleTrainerIds || visibleTrainerIdMap[trainer.id]) {
          summary.visibleDayWindowCounts[date] += windowCount;
          summary.visibleTotalWindows += windowCount;
        }
      });
    });

    return summary;
  }

  function buildHorseWeekSummary(weekDates, visibleHorseIds) {
    var summary = {
      bookingsByDate: {},
      freeMetaByHorseAndDate: {},
      dayStartCounts: {},
      visibleDayStartCounts: {},
      horseStartCounts: {},
      totalStarts: 0,
      visibleTotalStarts: 0
    };
    var horses = KSK.Data.getHorses();
    var visibleHorseIdMap = {};

    (visibleHorseIds || []).forEach(function (horseId) {
      visibleHorseIdMap[horseId] = true;
    });

    weekDates.forEach(function (date) {
      summary.bookingsByDate[date] = KSK.Data.getBookings(date);
      summary.dayStartCounts[date] = 0;
      summary.visibleDayStartCounts[date] = 0;
    });

    horses.forEach(function (horse) {
      summary.freeMetaByHorseAndDate[horse.id] = {};
      summary.horseStartCounts[horse.id] = 0;

      weekDates.forEach(function (date) {
        var freeMeta = KSK.Data.getHorseSelectableHourSlots(horse.id, date, 45, summary.bookingsByDate[date]);
        var startCount = freeMeta.startSlots.length;

        summary.freeMetaByHorseAndDate[horse.id][date] = freeMeta;
        summary.dayStartCounts[date] += startCount;
        summary.horseStartCounts[horse.id] += startCount;
        summary.totalStarts += startCount;
        if (!visibleHorseIds || visibleHorseIdMap[horse.id]) {
          summary.visibleDayStartCounts[date] += startCount;
          summary.visibleTotalStarts += startCount;
        }
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

  function isHorseWeekState(state) {
    return Boolean(
      isEnhancedResourceWeekState(state)
      && state.viewType === "horses"
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
    var currentBookings = KSK.App._currentBookings || getCurrentPeriodBookings();
    var subtitleBookings = KSK.App._gridVisibleBookings && KSK.App._gridVisibleBookings.length >= 0
      ? KSK.App._gridVisibleBookings
      : currentBookings;

    if (state.period === "week") {
      return KSK.Calendar.getWeekRangeLabel(state.currentDate) + " • " + subtitleBookings.length + " " + Utils.pluralize(subtitleBookings.length, ["запись", "записи", "записей"]);
    }

    return Utils.VIEW_LABELS[state.viewType] + " • " + subtitleBookings.length + " " + Utils.pluralize(subtitleBookings.length, ["запись", "записи", "записей"]) + " на " + Utils.formatDateLabel(state.currentDate, {
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

  function getProblemDescriptor(booking, dayBookings) {
    var sourceBookings = dayBookings || KSK.Data.getBookings(booking.date);

    if (KSK.Conflicts.checkConflicts(booking, sourceBookings).length) {
      return { id: "conflict", label: "Конфликт", priority: 0 };
    }
    if (!booking.horseId) {
      return { id: "missing-horse", label: "Не назначена лошадь", priority: 1 };
    }
    if (booking.paymentStatus === "unpaid") {
      return { id: "unpaid", label: "Не оплачено", priority: 2 };
    }
    if (booking.paymentType === null && booking.paymentStatus === null && booking.singlePrice === null && booking.subscriptionRemaining === null) {
      return { id: "missing-finance", label: "Нет финданных", priority: 3 };
    }
    return { id: "none", label: "", priority: 99 };
  }

  function compareProblemBookings(a, b) {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.time !== b.time) {
      return a.time.localeCompare(b.time);
    }
    return a.id.localeCompare(b.id);
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

  function clearPendingProblemToggle() {
    if (pendingProblemToggleTimerId === null) {
      return;
    }
    window.clearTimeout(pendingProblemToggleTimerId);
    pendingProblemToggleTimerId = null;
  }

  function openNativeDatePicker(datePicker) {
    if (!datePicker) {
      return;
    }

    if (typeof datePicker.showPicker === "function") {
      try {
        datePicker.showPicker();
        return;
      } catch (error) {
        // Fallback for browsers that expose showPicker() but reject scripted opening.
      }
    }

    datePicker.focus();
    datePicker.click();
  }

  function closeNativeDatePicker(datePicker, focusTarget) {
    if (!datePicker) {
      return;
    }

    datePicker.blur();
    if (!focusTarget || typeof focusTarget.focus !== "function") {
      return;
    }

    window.requestAnimationFrame(function () {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch (error) {
        focusTarget.focus();
      }
    });
  }

  function bindCalendarDatePickerChange(datePicker, currentDateBtn) {
    if (!datePicker) {
      return;
    }

    datePicker.addEventListener("change", function () {
      var isoDate = datePicker.value;
      var nextDatePicker = replaceCalendarDatePicker(currentDateBtn);

      closeNativeDatePicker(nextDatePicker || datePicker, currentDateBtn);
      if (!isoDate || isoDate === KSK.App.state.currentDate) {
        return;
      }

      KSK.App.setDate(isoDate, { silent: true });
      KSK.App.refresh();
    });
  }

  function replaceCalendarDatePicker(currentDateBtn) {
    var datePicker = byId("calendar-date-picker");
    var replacement;

    if (!datePicker || !datePicker.parentNode) {
      return null;
    }

    replacement = datePicker.cloneNode(false);
    replacement.value = datePicker.value;
    datePicker.parentNode.replaceChild(replacement, datePicker);
    bindCalendarDatePickerChange(replacement, currentDateBtn);
    return replacement;
  }

  KSK.App = {
    state: {
      currentDate: "2026-03-19",
      viewType: "trainers",
      period: "day",
      selectedBookingId: null,
      previewBookingId: null,
      focusFilter: "all",
      resourceFilterType: null,
      resourceFilterId: null,
      sidebarCollapsed: false,
      sidebarSection: "period",
      sidebarMiniCalendarMonth: null
    },
    _currentBookings: [],
    _resourceFilteredBookings: [],
    _gridVisibleBookings: [],
    _focusVisibleBookings: [],
    _trainerWeekSummary: null,
    _horseWeekSummary: null,

    init: function () {
      var currentDateBtn = byId("current-date-btn");

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
      if (currentDateBtn && byId("calendar-date-picker")) {
        currentDateBtn.addEventListener("click", function () {
          var datePicker = byId("calendar-date-picker");

          if (!datePicker) {
            return;
          }

          datePicker.value = KSK.App.state.currentDate;
          openNativeDatePicker(datePicker);
        });
        bindCalendarDatePickerChange(byId("calendar-date-picker"), currentDateBtn);
      }
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
        KSK.App.state.resourceFilterType = null;
        KSK.App.state.resourceFilterId = null;
        KSK.App.state.sidebarCollapsed = false;
        KSK.App.state.sidebarSection = "period";
        KSK.App.state.sidebarMiniCalendarMonth = KSK.App.getMonthStartIso(KSK.App.state.currentDate);
        KSK.App.state.selectedBookingId = null;
        KSK.App.state.previewBookingId = null;
        pendingScrollBookingId = null;
        KSK.Booking.showToast("Демо-данные восстановлены", "success");
        KSK.App.refresh();
      });
      byId("calendar-page").addEventListener("click", function (event) {
        var focusTarget = event.target.closest("[data-focus-filter]");
        var problemTarget = event.target.closest("[data-problem-booking-id]");
        var sidebarTarget = event.target.closest("[data-sidebar-action]");
        var clearResourceTarget = event.target.closest('[data-action="clear-resource-filter"]');
        var detailsTarget = event.target.closest("[data-details-action]");
        var selected;

        if (focusTarget && KSK.App.isScheduleInsightsEnabled()) {
          KSK.App.setFocusFilter(focusTarget.dataset.focusFilter);
          return;
        }

        if (problemTarget && KSK.App.isScheduleInsightsEnabled()) {
          KSK.App.previewProblemBooking(problemTarget.dataset.problemBookingId);
          return;
        }

        if (sidebarTarget && KSK.App.isScheduleInsightsEnabled()) {
          if (sidebarTarget.dataset.sidebarAction === "toggle-sidebar-collapse") {
            KSK.App.toggleSidebarCollapse();
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "toggle-section") {
            var nextSection = sidebarTarget.dataset.sidebarSection || "period";
            var isClosingSection = KSK.App.state.sidebarSection === nextSection;

            KSK.App.state.sidebarSection = isClosingSection ? null : nextSection;
            if (
              isClosingSection
              && (nextSection === "trainers" || nextSection === "horses")
              && KSK.App.state.resourceFilterType === nextSection
            ) {
              KSK.App.state.resourceFilterType = null;
              KSK.App.state.resourceFilterId = null;
            }
            KSK.App.refresh();
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "select-resource") {
            KSK.App.setResourceFilter(sidebarTarget.dataset.resourceType, sidebarTarget.dataset.resourceId);
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "clear-resource-filter") {
            KSK.App.clearResourceFilter();
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "mini-calendar-day" && sidebarTarget.dataset.date) {
            KSK.App.setDate(sidebarTarget.dataset.date, { silent: true });
            KSK.App.refresh();
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "mini-calendar-prev-month") {
            KSK.App.state.sidebarMiniCalendarMonth = KSK.App.shiftMonthIso(KSK.App.state.sidebarMiniCalendarMonth, -1);
            KSK.App.refresh();
            return;
          }
          if (sidebarTarget.dataset.sidebarAction === "mini-calendar-next-month") {
            KSK.App.state.sidebarMiniCalendarMonth = KSK.App.shiftMonthIso(KSK.App.state.sidebarMiniCalendarMonth, 1);
            KSK.App.refresh();
            return;
          }
        }

        if (clearResourceTarget && KSK.App.isScheduleInsightsEnabled()) {
          KSK.App.clearResourceFilter();
          return;
        }

        if (!detailsTarget || !KSK.App.isScheduleInsightsEnabled()) {
          return;
        }

        if (detailsTarget.dataset.detailsAction === "clear-resource-filter") {
          KSK.App.clearResourceFilter();
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
      byId("calendar-page").addEventListener("dblclick", function (event) {
        var problemTarget = event.target.closest("[data-problem-booking-id]");
        if (!problemTarget || !KSK.App.isScheduleInsightsEnabled()) {
          return;
        }
        clearPendingProblemToggle();
        KSK.App.openProblemBookingCard(problemTarget.dataset.problemBookingId);
      });

      buildLegend(byId("calendar-legend"));
      bindDesktopDensityRefresh();
      this.state.sidebarMiniCalendarMonth = this.getMonthStartIso(this.state.currentDate);
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

    isServiceCatalogEnabled: function () {
      return !(window.KSK_FLAGS && window.KSK_FLAGS.serviceCatalogMvp === false);
    },

    isResourceSidebarFilterEnabled: function () {
      return !(window.KSK_FLAGS && window.KSK_FLAGS.resourceSidebarFilterV1 === false);
    },

    getMonthStartIso: function (isoDate) {
      var date = Utils.toDate(isoDate);
      date.setDate(1);
      return Utils.isoFromDate(date);
    },

    shiftMonthIso: function (monthIso, delta) {
      var date = Utils.toDate(monthIso || this.state.currentDate);
      date.setDate(1);
      date.setMonth(date.getMonth() + delta);
      return Utils.isoFromDate(date);
    },

    syncSidebarMiniCalendarMonth: function (force) {
      var nextMonth = this.getMonthStartIso(this.state.currentDate);
      if (force || !this.state.sidebarMiniCalendarMonth || this.state.sidebarMiniCalendarMonth !== nextMonth) {
        this.state.sidebarMiniCalendarMonth = nextMonth;
      }
    },

    matchesFocusFilter: function (booking, bookingsForDate) {
      var dayBookings = bookingsForDate || KSK.Data.getBookings(booking.date);

      if (this.state.focusFilter === "conflicts") {
        return KSK.Conflicts.checkConflicts(booking, dayBookings).length > 0;
      }
      if (this.state.focusFilter === "missing-horse") {
        return !booking.horseId;
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

    setResourceFilter: function (type, id) {
      if (!this.isResourceSidebarFilterEnabled()) {
        return;
      }
      if ((type !== "trainers" && type !== "horses") || !id) {
        return;
      }
      if (this.state.resourceFilterType === type && this.state.resourceFilterId === id) {
        this.clearResourceFilter();
        return;
      }
      this.state.resourceFilterType = type;
      this.state.resourceFilterId = id;
      this.state.sidebarSection = type;
      this.refresh();
    },

    clearResourceFilter: function () {
      if (!this.state.resourceFilterType && !this.state.resourceFilterId) {
        return;
      }
      this.state.resourceFilterType = null;
      this.state.resourceFilterId = null;
      this.refresh();
    },

    toggleSidebarCollapse: function () {
      if (!this.isScheduleInsightsEnabled()) {
        return;
      }
      this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
      this.refresh();
    },

    getResourceFilteredBookings: function (bookings) {
      var sourceBookings = Array.isArray(bookings) ? bookings : getCurrentPeriodBookings();
      var filterType = this.state.resourceFilterType;
      var filterId = this.state.resourceFilterId;

      if (!this.isScheduleInsightsEnabled() || !this.isResourceSidebarFilterEnabled() || !filterType || !filterId) {
        return sourceBookings.slice();
      }

      return sourceBookings.filter(function (booking) {
        if (filterType === "trainers") {
          return booking.trainerId === filterId;
        }
        if (filterType === "horses") {
          return booking.horseId === filterId;
        }
        return true;
      });
    },

    getGridVisibleBookings: function (bookings) {
      var sourceBookings = Array.isArray(bookings) ? bookings : getCurrentPeriodBookings();
      return sourceBookings.filter(function (booking) {
        return isBookingVisibleInCurrentGrid(booking);
      });
    },

    getVisibleBookings: function (bookings) {
      var app = this;
      var sourceBookings = Array.isArray(bookings) ? bookings : this.getGridVisibleBookings();
      return sourceBookings.filter(function (booking) {
        return app.matchesFocusFilter(booking, KSK.Data.getBookings(booking.date));
      });
    },

    getVisibleResourceIds: function (bookings, resourceType) {
      var ids = {};
      (bookings || []).forEach(function (booking) {
        var id = "";
        if (resourceType === "trainers") {
          id = booking.trainerId;
        } else if (resourceType === "horses") {
          id = booking.horseId;
        } else if (resourceType === "arenas") {
          id = booking.arenaId;
        }
        if (id) {
          ids[id] = true;
        }
      });
      return Object.keys(ids);
    },

    getSelectedBooking: function () {
      if (!this.state.selectedBookingId) {
        return null;
      }
      return KSK.Data.getBookingById(this.state.selectedBookingId);
    },

    selectBooking: function (bookingId) {
      var hadPreview = Boolean(this.state.previewBookingId);

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      clearPendingProblemToggle();
      pendingScrollBookingId = null;

      if (this.state.selectedBookingId === bookingId) {
        this.state.selectedBookingId = null;
        this.state.previewBookingId = null;
      } else {
        this.state.selectedBookingId = bookingId;
        this.state.previewBookingId = hadPreview ? bookingId : null;
        this.state.sidebarSection = "period";
      }
      this.refresh();
    },

    clearSelection: function () {
      if (!this.state.selectedBookingId && !this.state.previewBookingId) {
        return;
      }
      clearPendingProblemToggle();
      pendingScrollBookingId = null;
      this.state.selectedBookingId = null;
      this.state.previewBookingId = null;
      this.refresh();
    },

    previewProblemBooking: function (bookingId) {
      var booking;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      booking = KSK.Data.getBookingById(bookingId);
      if (!booking) {
        return;
      }
      clearPendingProblemToggle();
      if (this.state.previewBookingId === bookingId && this.state.selectedBookingId === null) {
        pendingProblemToggleTimerId = window.setTimeout(function () {
          pendingProblemToggleTimerId = null;
          if (KSK.App.state.selectedBookingId === null && KSK.App.state.previewBookingId === bookingId) {
            KSK.App.clearSelection();
          }
        }, 220);
        return;
      }

      this.state.previewBookingId = bookingId;
      this.state.sidebarSection = "period";
      pendingScrollBookingId = bookingId;
      this.refresh();
    },

    openProblemBookingCard: function (bookingId) {
      var booking;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      booking = KSK.Data.getBookingById(bookingId);
      if (!booking) {
        return;
      }

      clearPendingProblemToggle();
      this.state.selectedBookingId = bookingId;
      this.state.previewBookingId = bookingId;
      this.state.sidebarSection = "period";
      pendingScrollBookingId = bookingId;
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

      if (booking.serviceRequiresGroom && !booking.groomId) {
        KSK.Booking.showToast("Назначьте коновода в карточке занятия", "danger");
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
      var preview = this.state.previewBookingId
        ? KSK.Data.getBookingById(this.state.previewBookingId)
        : null;
      var visibilitySource = this.isEnhancedResourceWeek()
        ? (gridVisibleBookings || this.getGridVisibleBookings())
        : (focusVisibleBookings || this.getVisibleBookings());
      var visibleIds = visibilitySource.map(function (booking) {
        return booking.id;
      });

      if (!selected || visibleIds.indexOf(selected.id) === -1) {
        this.state.selectedBookingId = null;
      }
      if (!preview || visibleIds.indexOf(preview.id) === -1) {
        this.state.previewBookingId = null;
      }
    },

    navigateDate: function (delta) {
      var step = this.state.period === "week" ? 7 : 1;
      this.state.currentDate = Utils.addDays(this.state.currentDate, delta * step);
      this.syncSidebarMiniCalendarMonth();
      this.refresh();
    },

    setDate: function (isoDate, options) {
      this.state.currentDate = isoDate;
      this.syncSidebarMiniCalendarMonth();
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

    renderOverview: function (bookings, trainerWeekSummary, horseWeekSummary) {
      var container = byId("calendar-overview");
      var fragment;
      var stats;
      var isTrainerWeek = isTrainerWeekState(this.state) && trainerWeekSummary;
      var isHorseWeek = isHorseWeekState(this.state) && horseWeekSummary;

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
            value: String(trainerWeekSummary.visibleTotalWindows)
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
      } else if (isHorseWeek) {
        stats = [
          {
            label: "Занятий",
            value: String(bookings.length)
          },
          {
            label: "Свободных стартов",
            value: String(horseWeekSummary.visibleTotalStarts)
          },
          {
            label: "Конфликтов",
            value: String(bookings.filter(function (booking) {
              return KSK.Conflicts.checkConflicts(booking, horseWeekSummary.bookingsByDate[booking.date]).length > 0;
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
        { id: "missing-horse", label: "Не назначена лошадь" },
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

    buildSidebarMiniCalendar: function (baseDate, selectedDate, period) {
      var monthStart = this.state.sidebarMiniCalendarMonth || this.getMonthStartIso(baseDate);
      var monthDate = Utils.toDate(monthStart);
      var firstWeekdayOffset = (monthDate.getDay() || 7) - 1;
      var gridStart = Utils.addDays(monthStart, -firstWeekdayOffset);
      var selectedWeekMap = {};
      var todayIso = Utils.isoFromDate(new Date());
      var days = [];
      var index;

      if (period === "week") {
        Utils.getWeekDates(selectedDate).forEach(function (isoDate) {
          selectedWeekMap[isoDate] = true;
        });
      }

      for (index = 0; index < 42; index += 1) {
        var dayIso = Utils.addDays(gridStart, index);
        var dayDate = Utils.toDate(dayIso);
        days.push({
          isoDate: dayIso,
          label: String(dayDate.getDate()),
          inMonth: dayDate.getMonth() === monthDate.getMonth(),
          isSelected: dayIso === selectedDate,
          isInWeek: Boolean(selectedWeekMap[dayIso]),
          isToday: dayIso === todayIso
        });
      }

      return {
        title: monthDate.toLocaleDateString("ru-RU", {
          month: "long",
          year: "numeric"
        }),
        days: days
      };
    },

    renderSidebarMiniCalendar: function (container, meta) {
      var calendar = el("div", "sidebar-mini-calendar");
      var header = el("div", "sidebar-mini-calendar__header");
      var prevButton = document.createElement("button");
      var nextButton = document.createElement("button");
      var grid = el("div", "sidebar-mini-calendar__grid");

      prevButton.type = "button";
      prevButton.className = "sidebar-mini-calendar__nav";
      prevButton.dataset.sidebarAction = "mini-calendar-prev-month";
      prevButton.textContent = "‹";

      nextButton.type = "button";
      nextButton.className = "sidebar-mini-calendar__nav";
      nextButton.dataset.sidebarAction = "mini-calendar-next-month";
      nextButton.textContent = "›";

      header.appendChild(prevButton);
      header.appendChild(el("div", "sidebar-mini-calendar__title", meta.title));
      header.appendChild(nextButton);
      calendar.appendChild(header);

      ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(function (label) {
        grid.appendChild(el("div", "sidebar-mini-calendar__weekday", label));
      });

      meta.days.forEach(function (day) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sidebar-mini-calendar__day";
        if (!day.inMonth) {
          button.classList.add("sidebar-mini-calendar__day--outside");
        }
        if (day.isSelected) {
          button.classList.add("sidebar-mini-calendar__day--selected");
        }
        if (day.isInWeek) {
          button.classList.add("sidebar-mini-calendar__day--in-week");
        }
        if (day.isToday) {
          button.classList.add("sidebar-mini-calendar__day--today");
        }
        button.dataset.sidebarAction = "mini-calendar-day";
        button.dataset.date = day.isoDate;
        button.textContent = day.label;
        grid.appendChild(button);
      });

      calendar.appendChild(grid);
      container.appendChild(calendar);
    },

    renderSidebarCalendarPanel: function () {
      var panel = byId("sidebar-calendar-panel");
      var wrapper;
      var header;
      var body;
      var subtitle = this.state.period === "week"
        ? KSK.Calendar.getWeekRangeLabel(this.state.currentDate)
        : Utils.formatDateLabel(this.state.currentDate, {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

      if (!panel) {
        return;
      }

      wrapper = el("section", "schedule-sidebar__calendar");
      header = el("div", "schedule-sidebar__calendar-header");
      body = el("div", "schedule-sidebar__calendar-body");

      header.appendChild(el("div", "schedule-sidebar__calendar-title", "Календарь"));
      header.appendChild(el("div", "schedule-sidebar__calendar-subtitle", subtitle));
      wrapper.appendChild(header);
      this.renderSidebarMiniCalendar(body, this.buildSidebarMiniCalendar(this.state.currentDate, this.state.currentDate, this.state.period));
      wrapper.appendChild(body);

      panel.replaceChildren(wrapper);
    },

    renderSidebarSection: function (id, title, subtitle, bodyBuilder) {
      var section = el("section", "schedule-sidebar__section");
      var header = document.createElement("button");
      var titleWrap = el("div", "schedule-sidebar__section-title-wrap");
      var body = el("div", "schedule-sidebar__section-body");

      section.dataset.open = this.state.sidebarSection === id ? "true" : "false";
      header.type = "button";
      header.className = "schedule-sidebar__section-header";
      header.dataset.sidebarAction = "toggle-section";
      header.dataset.sidebarSection = id;

      titleWrap.appendChild(el("div", "schedule-sidebar__section-title", title));
      if (subtitle) {
        titleWrap.appendChild(el("div", "schedule-sidebar__section-subtitle", subtitle));
      }
      header.appendChild(titleWrap);
      header.appendChild(el("span", "schedule-sidebar__section-icon", "⌄"));

      section.appendChild(header);
      bodyBuilder(body);
      section.appendChild(body);
      return section;
    },

    buildSidebarResourceItems: function (resourceType, currentBookings) {
      var resources = resourceType === "trainers" ? KSK.Data.getTrainers() : KSK.Data.getHorses();
      var countsById = {};
      var app = this;

      currentBookings.forEach(function (booking) {
        var resourceId = resourceType === "trainers" ? booking.trainerId : booking.horseId;
        if (!resourceId) {
          return;
        }
        countsById[resourceId] = (countsById[resourceId] || 0) + 1;
      });

      return resources.filter(function (resource) {
        return countsById[resource.id] || app.state.resourceFilterId === resource.id;
      }).map(function (resource) {
        var count = countsById[resource.id] || 0;
        var meta = count + " " + Utils.pluralize(count, ["занятие", "занятия", "занятий"]);

        if (resourceType === "horses") {
          meta += " • " + Utils.HORSE_STATUS_LABELS[resource.status];
        } else if (app.state.period === "day" && app.isTrainerScheduleEnabled()) {
          meta += " • " + KSK.Data.getTrainerShiftForDate(resource.id, app.state.currentDate).label;
        }

        return {
          id: resource.id,
          title: resource.name,
          meta: meta,
          count: count
        };
      });
    },

    renderSidebarPeriodPanel: function (ctx) {
      var app = this;
      var panel = byId("sidebar-period-panel");
      var selected = ctx.selectedBooking;
      var subtitle = selected
        ? selected.clientName
        : (this.state.period === "week"
          ? KSK.Calendar.getWeekRangeLabel(this.state.currentDate)
          : Utils.formatDateLabel(this.state.currentDate, {
            day: "numeric",
            month: "long",
            year: "numeric"
          }));

      if (!panel) {
        return;
      }

      panel.replaceChildren(this.renderSidebarSection("period", "Детали периода", subtitle, function (body) {
        var summary = el("div", "booking-details__empty");
        var actions = el("div", "booking-details__actions");
        var groupedProblems = {};
        var lookups = ctx.lookups;
        var problemBookings;
        var trainer;
        var horse;
        var groom;
        var arena;
        var selectedDayBookings;
        var conflicts;
        var trainerShift;
        var trainerAvailability;
        var trainerAvailabilityMessage;
        var title;
        var bookingSection;
        var resourcesSection;
        var financeSection;
        var conflictsSection;

        if (app.state.resourceFilterType && app.isResourceSidebarFilterEnabled()) {
          actions.appendChild(createActionButton("Сбросить фильтр", "clear-resource-filter", "btn-outline-secondary"));
          body.appendChild(actions);
        }

        if (!selected) {
          summary.appendChild(el("h2", "booking-details__title", "Сводка периода"));
          summary.appendChild(el("p", "booking-details__hint", subtitle));
          summary.appendChild(createInfoRow("Видимых записей", String(ctx.bookings.length)));
          if (isTrainerWeekState(app.state) && ctx.trainerWeekSummary) {
            summary.appendChild(createInfoRow("Свободных окон", String(ctx.trainerWeekSummary.visibleTotalWindows)));
          } else if (isHorseWeekState(app.state) && ctx.horseWeekSummary) {
            summary.appendChild(createInfoRow("Свободных стартов", String(ctx.horseWeekSummary.visibleTotalStarts)));
          } else {
            summary.appendChild(createInfoRow("Показывается во фокусе", String(ctx.focusVisibleBookings.length)));
          }
          if (app.state.resourceFilterType && app.state.resourceFilterId) {
            var activeLabel = app.state.resourceFilterType === "trainers"
              ? (lookups.trainersById[app.state.resourceFilterId] ? lookups.trainersById[app.state.resourceFilterId].name : app.state.resourceFilterId)
              : (lookups.horsesById[app.state.resourceFilterId] ? lookups.horsesById[app.state.resourceFilterId].name : app.state.resourceFilterId);
            summary.appendChild(createInfoRow("Активный фильтр", activeLabel));
          }
          body.appendChild(summary);

          problemBookings = ctx.bookings.filter(function (booking) {
            return getProblemDescriptor(booking, KSK.Data.getBookings(booking.date)).priority < 99;
          }).sort(compareProblemBookings);

          PROBLEM_GROUP_ORDER.forEach(function (problemId) {
            groupedProblems[problemId] = [];
          });

          problemBookings.forEach(function (booking) {
            var descriptor = getProblemDescriptor(booking, KSK.Data.getBookings(booking.date));
            if (descriptor.id !== "none" && groupedProblems[descriptor.id]) {
              groupedProblems[descriptor.id].push({
                booking: booking,
                descriptor: descriptor
              });
            }
          });

          if (problemBookings.length) {
            var listSection = createSection("Проблемные записи");
            PROBLEM_GROUP_ORDER.forEach(function (problemId) {
              var groupEntries = groupedProblems[problemId];
              var meta = PROBLEM_GROUP_META[problemId];
              var group;
              var header;

              if (!groupEntries.length || !meta) {
                return;
              }

              group = el("div", "booking-details__problem-group");
              header = el("div", "booking-details__problem-group-title");
              header.appendChild(el("span", "", meta.title));
              header.appendChild(el("span", "booking-details__problem-group-count", String(groupEntries.length)));
              group.appendChild(header);

              groupEntries.forEach(function (entry) {
                var item = document.createElement("button");
                item.type = "button";
                item.className = "booking-details__problem-item booking-details__problem-item--" + entry.descriptor.id;
                if (app.state.previewBookingId === entry.booking.id) {
                  item.classList.add("booking-details__problem-item--active");
                }
                item.dataset.problemBookingId = entry.booking.id;
                item.appendChild(el("div", "booking-details__problem-title", Utils.formatShortDate(entry.booking.date) + " • " + entry.booking.time + " • " + entry.booking.clientName));
                item.appendChild(el("div", "booking-details__problem-meta", entry.descriptor.label));
                group.appendChild(item);
              });

              listSection.appendChild(group);
            });
            body.appendChild(listSection);
          } else {
            body.appendChild(el("p", "booking-details__hint", "Проблемных записей не найдено."));
          }

          body.appendChild(el("p", "booking-details__hint booking-details__hint--footer", "Выберите занятие в сетке, чтобы увидеть подробности и действия."));
          return;
        }

        trainer = selected.trainerId ? lookups.trainersById[selected.trainerId] : null;
        horse = selected.horseId ? lookups.horsesById[selected.horseId] : null;
        groom = selected.groomId ? lookups.groomsById[selected.groomId] : null;
        arena = selected.arenaId ? lookups.arenasById[selected.arenaId] : null;
        selectedDayBookings = KSK.Data.getBookings(selected.date);
        conflicts = KSK.Conflicts.checkConflicts(selected, selectedDayBookings);
        trainerShift = selected.trainerId ? KSK.Data.getTrainerShiftForDate(selected.trainerId, selected.date) : null;
        trainerAvailability = selected.trainerId ? KSK.Data.checkTrainerAvailability(selected.trainerId, selected.date, selected.time, selected.duration) : null;
        trainerAvailabilityMessage = trainerAvailability && !trainerAvailability.isAvailable
          ? (trainerAvailability.reason === "off" ? "У тренера выходной в этот день" : "Время занятия выходит за смену тренера")
          : "";
        title = el("div", "booking-details__header");
        bookingSection = createSection("Занятие");
        resourcesSection = createSection("Ресурсы");
        financeSection = createSection("Финансы");
        conflictsSection = createSection("Конфликты");

        title.appendChild(el("h2", "booking-details__title", selected.clientName));
        title.appendChild(el("p", "booking-details__hint", Utils.formatDateLabel(selected.date, {
          day: "numeric",
          month: "long",
          year: "numeric"
        }) + " • " + selected.time + "–" + Utils.addMinutes(selected.time, selected.duration)));
        body.appendChild(title);

        bookingSection.appendChild(createInfoRow("Дата", Utils.formatDateLabel(selected.date, {
          day: "numeric",
          month: "long",
          year: "numeric"
        })));
        bookingSection.appendChild(createInfoRow("Время", selected.time + "–" + Utils.addMinutes(selected.time, selected.duration)));
        bookingSection.appendChild(createInfoRow("Статус", Utils.STATUS_LABELS[selected.status] || selected.status));
        bookingSection.appendChild(createInfoRow(
          app.isServiceCatalogEnabled() ? "Услуга" : "Тип услуги",
          selected.serviceName || Utils.SERVICE_LABELS[selected.serviceType] || selected.serviceType || "Не задано"
        ));
        bookingSection.appendChild(createInfoRow("Клиент", selected.clientName));
        body.appendChild(bookingSection);

        resourcesSection.appendChild(createInfoRow("Тренер", trainer ? trainer.name : "Не назначен"));
        if (trainer && app.isTrainerScheduleEnabled() && trainerShift) {
          resourcesSection.appendChild(createInfoRow("График тренера", trainerShift.label));
        }
        resourcesSection.appendChild(createInfoRow("Лошадь", horse ? horse.name : "Без лошади"));
        resourcesSection.appendChild(createInfoRow("Коновод", groom ? groom.name : "Не назначен"));
        resourcesSection.appendChild(createInfoRow("Площадка", arena ? arena.name : "Не назначен"));
        if (trainer && app.isTrainerScheduleEnabled() && trainerAvailabilityMessage) {
          resourcesSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--danger", trainerAvailabilityMessage));
        }
        body.appendChild(resourcesSection);

        financeSection.appendChild(createInfoRow("Тип оплаты", getPaymentTypeLabel(selected.paymentType)));
        financeSection.appendChild(createInfoRow("Статус оплаты", getPaymentStatusLabel(selected.paymentStatus)));
        if (selected.paymentType === "single") {
          financeSection.appendChild(createInfoRow("Стоимость", formatMoney(selected.singlePrice)));
        }
        if (selected.paymentType === "subscription") {
          financeSection.appendChild(createInfoRow("Осталось занятий", selected.subscriptionRemaining === null ? "Не задано" : String(selected.subscriptionRemaining)));
        }
        financeSection.appendChild(createInfoRow("Bitrix24", selected.bitrixDealUrl || "Нет ссылки"));
        body.appendChild(financeSection);

        if (conflicts.length) {
          conflicts.forEach(function (conflict) {
            conflictsSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--" + conflict.severity, conflict.message));
          });
        } else {
          conflictsSection.appendChild(el("div", "booking-details__conflict booking-details__conflict--neutral", "Конфликтов не найдено"));
        }
        body.appendChild(conflictsSection);

        if (selected.status === "draft") {
          actions.appendChild(createActionButton("Подтвердить", "update-booking-status", "btn-success", "confirmed"));
        }
        if (selected.status === "confirmed") {
          actions.appendChild(createActionButton("Проведено", "update-booking-status", "btn-success", "completed"));
        }
        if (selected.status === "draft" || selected.status === "confirmed" || selected.status === "completed") {
          actions.appendChild(createActionButton("Отменить занятие", "update-booking-status", "btn-outline-danger", "cancelled"));
        }
        actions.appendChild(createActionButton("Редактировать", "edit-booking", "btn-primary"));
        if (app.state.period === "week") {
          actions.appendChild(createActionButton("Перейти к дню", "go-to-day"));
        }
        if (selected.bitrixDealUrl) {
          actions.appendChild(createActionButton("Открыть Bitrix24", "open-deal"));
        }
        actions.appendChild(createActionButton("Скрыть детали", "clear-selection"));
        body.appendChild(actions);
      }));
    },

    renderSidebarResourcePanel: function (resourceType, ctx) {
      var app = this;
      var panelId = resourceType === "trainers" ? "sidebar-trainers-panel" : "sidebar-horses-panel";
      var panel = byId(panelId);
      var title = resourceType === "trainers" ? "Тренеры" : "Лошади";
      var items = this.buildSidebarResourceItems(resourceType, ctx.currentBookings);
      var subtitle = this.state.resourceFilterType === resourceType && this.state.resourceFilterId
        ? "Активен фильтр"
        : items.length + " " + Utils.pluralize(items.length, ["ресурс", "ресурса", "ресурсов"]);

      if (!panel) {
        return;
      }

      panel.replaceChildren(this.renderSidebarSection(resourceType, title, subtitle, function (body) {
        if (!app.isResourceSidebarFilterEnabled()) {
          body.appendChild(el("div", "schedule-sidebar__empty", "Фильтрация отключена флагом resourceSidebarFilterV1."));
          return;
        }

        body.appendChild(el("p", "schedule-sidebar__section-intro", "Выберите ресурс, чтобы оставить в календаре только связанные с ним занятия."));

        if (!items.length) {
          body.appendChild(el("div", "schedule-sidebar__empty", "В текущем периоде нет доступных записей для этого списка."));
        } else {
          var list = el("div", "sidebar-filter-list");
          items.forEach(function (item) {
            var button = document.createElement("button");
            var main = el("div", "sidebar-filter-item__main");
            button.type = "button";
            button.className = "sidebar-filter-item";
            if (app.state.resourceFilterType === resourceType && app.state.resourceFilterId === item.id) {
              button.classList.add("sidebar-filter-item--active");
            }
            button.dataset.sidebarAction = "select-resource";
            button.dataset.resourceType = resourceType;
            button.dataset.resourceId = item.id;
            main.appendChild(el("div", "sidebar-filter-item__title", item.title));
            main.appendChild(el("div", "sidebar-filter-item__meta", item.meta));
            button.appendChild(main);
            button.appendChild(el("span", "sidebar-filter-item__count", String(item.count)));
            list.appendChild(button);
          });
          body.appendChild(list);
        }

        if (app.state.resourceFilterType) {
          var clearActions = el("div", "booking-details__actions");
          clearActions.appendChild(createActionButton("Сбросить фильтр", "clear-resource-filter", "btn-outline-secondary"));
          body.appendChild(clearActions);
        }
      }));
    },

    renderSidebarTrainerPanel: function (ctx) {
      this.renderSidebarResourcePanel("trainers", ctx);
    },

    renderSidebarHorsePanel: function (ctx) {
      this.renderSidebarResourcePanel("horses", ctx);
    },

    renderSidebar: function (bookings, trainerWeekSummary, horseWeekSummary) {
      var ctx;

      if (!this.isScheduleInsightsEnabled()) {
        return;
      }

      ctx = {
        bookings: bookings,
        currentBookings: this._currentBookings || [],
        focusVisibleBookings: this._focusVisibleBookings || [],
        selectedBooking: this.getSelectedBooking(),
        trainerWeekSummary: trainerWeekSummary,
        horseWeekSummary: horseWeekSummary,
        lookups: getLookups()
      };

      this.renderSidebarCalendarPanel();
      this.renderSidebarPeriodPanel(ctx);
      this.renderSidebarTrainerPanel(ctx);
      this.renderSidebarHorsePanel(ctx);
    },

    refresh: function () {
      var scroll = document.querySelector(".calendar-scroll");
      var prevScrollTop = scroll ? scroll.scrollTop : 0;
      var prevScrollLeft = scroll ? scroll.scrollLeft : 0;
      var enabled = this.isScheduleInsightsEnabled();
      var currentBookings = getCurrentPeriodBookings();
      var resourceFilteredBookings = this.getResourceFilteredBookings(currentBookings);
      var gridVisibleBookings = this.getGridVisibleBookings(resourceFilteredBookings);
      var focusVisibleBookings = enabled ? this.getVisibleBookings(gridVisibleBookings) : gridVisibleBookings;
      var weekDates = this.state.period === "week" ? Utils.getWeekDates(this.state.currentDate) : [];
      var visibleTrainerIds = this.getVisibleResourceIds(gridVisibleBookings, "trainers");
      var visibleHorseIds = this.getVisibleResourceIds(gridVisibleBookings, "horses");
      var trainerWeekSummary = enabled && isTrainerWeekState(this.state)
        ? buildTrainerWeekSummary(weekDates, visibleTrainerIds)
        : null;
      var horseWeekSummary = enabled && isHorseWeekState(this.state)
        ? buildHorseWeekSummary(weekDates, visibleHorseIds)
        : null;
      var page = byId("calendar-page");
      var currentDateBtn = byId("current-date-btn");
      var datePicker = byId("calendar-date-picker");
      var toolbar = byId("calendar-toolbar");
      var sidebar = byId("schedule-sidebar");
      var sidebarContent = byId("schedule-sidebar-content");
      var sidebarToggle = byId("schedule-sidebar-toggle");
      var sidebarToggleLabel = sidebarToggle ? sidebarToggle.querySelector(".schedule-sidebar__toggle-label") : null;
      var sidebarToggleIcon = sidebarToggle ? sidebarToggle.querySelector(".schedule-sidebar__toggle-icon") : null;
      var isDatePickerDisabled = !(currentDateBtn && datePicker);
      var overviewHidden = !enabled || (page ? page.classList.contains("calendar-overview-hidden") : true);
      var sidebarCollapsed = enabled && this.state.sidebarCollapsed;
      var sidebarToggleText = sidebarCollapsed ? "Развернуть панель" : "Свернуть панель";

      if (!enabled) {
        clearPendingProblemToggle();
        this.state.selectedBookingId = null;
        this.state.previewBookingId = null;
        this.state.focusFilter = "all";
        pendingScrollBookingId = null;
      }

      this._currentBookings = currentBookings;
      this._resourceFilteredBookings = resourceFilteredBookings;
      this._gridVisibleBookings = gridVisibleBookings;
      this._focusVisibleBookings = focusVisibleBookings;
      this._trainerWeekSummary = trainerWeekSummary;
      this._horseWeekSummary = horseWeekSummary;
      page.dataset.period = this.state.period;
      page.dataset.viewType = this.state.viewType;
      page.classList.toggle("schedule-insights-enabled", enabled);
      page.classList.toggle("schedule-insights-disabled", !enabled);

      this.syncSelectionWithVisibility(gridVisibleBookings, focusVisibleBookings);

      if (this.state.period === "week") {
        KSK.Calendar.renderWeekView(Utils.startOfIsoWeek(this.state.currentDate), {
          allPeriodBookings: currentBookings,
          gridVisibleBookings: gridVisibleBookings,
          viewType: this.state.viewType,
          trainerWeekSummary: trainerWeekSummary,
          horseWeekSummary: horseWeekSummary
        });
      } else {
        KSK.Calendar.renderDayView(this.state.currentDate, this.state.viewType, {
          bookings: gridVisibleBookings,
          allDayBookings: currentBookings,
          allowEmptyResetAction: Boolean(this.state.resourceFilterType)
        });
      }

      page.classList.toggle("schedule-sidebar-collapsed", sidebarCollapsed);
      byId("calendar-overview").hidden = overviewHidden;
      if (toolbar) {
        toolbar.hidden = !enabled;
      }
      byId("calendar-focus-controls").hidden = !enabled;
      if (sidebar) {
        sidebar.hidden = !enabled;
      }
      if (sidebarToggle) {
        sidebarToggle.setAttribute("aria-expanded", sidebarCollapsed ? "false" : "true");
        sidebarToggle.setAttribute("title", sidebarToggleText);
      }
      if (sidebarToggleLabel) {
        sidebarToggleLabel.textContent = sidebarToggleText;
      }
      if (sidebarToggleIcon) {
        sidebarToggleIcon.textContent = sidebarCollapsed ? "›" : "‹";
      }
      if (sidebarContent) {
        sidebarContent.setAttribute("aria-hidden", sidebarCollapsed ? "true" : "false");
        sidebarContent.inert = sidebarCollapsed;
        if (sidebarCollapsed) {
          sidebarContent.setAttribute("inert", "");
        } else {
          sidebarContent.removeAttribute("inert");
        }
      }

      byId("calendar-title").textContent = getTitle();
      byId("calendar-subtitle").textContent = getSubtitle();
      updateResourceMenu(this.state.viewType);

      setActive(byId("period-day-btn"), this.state.period === "day");
      setActive(byId("period-week-btn"), this.state.period === "week");
      byId("period-week-btn").disabled = this.state.viewType === "arenas";

      if (currentDateBtn) {
        currentDateBtn.disabled = isDatePickerDisabled;
        currentDateBtn.setAttribute("aria-disabled", isDatePickerDisabled ? "true" : "false");
        currentDateBtn.classList.toggle("disabled", isDatePickerDisabled);
        currentDateBtn.textContent = this.state.period === "week"
          ? KSK.Calendar.getWeekRangeLabel(this.state.currentDate)
          : Utils.formatDateLabel(this.state.currentDate, {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
      }

      if (datePicker) {
        datePicker.value = this.state.currentDate;
      }

      if (enabled) {
        this.renderOverview(gridVisibleBookings, trainerWeekSummary, horseWeekSummary);
        this.renderFocusControls();
        this.renderSidebar(gridVisibleBookings, trainerWeekSummary, horseWeekSummary);
      }

      var scrollTargetBookingId = pendingScrollBookingId;
      pendingScrollBookingId = null;
      window.requestAnimationFrame(function () {
        var nextScroll = document.querySelector(".calendar-scroll");
        var bookingCard;
        var scrollTarget;
        var scrollRect;
        var targetRect;
        var nextTop;
        var nextLeft;
        var maxTop;
        var maxLeft;

        if (!nextScroll) {
          return;
        }

        if (scrollTargetBookingId !== null) {
          bookingCard = nextScroll.querySelector('[data-booking-id="' + scrollTargetBookingId + '"]');
          scrollTarget = bookingCard ? (bookingCard.closest(".booking-card-shell") || bookingCard) : null;

          if (scrollTarget) {
            scrollRect = nextScroll.getBoundingClientRect();
            targetRect = scrollTarget.getBoundingClientRect();
            nextTop = nextScroll.scrollTop + (targetRect.top - scrollRect.top) - ((scrollRect.height - targetRect.height) / 2);
            nextLeft = nextScroll.scrollLeft + (targetRect.left - scrollRect.left) - ((scrollRect.width - targetRect.width) / 2);
            maxTop = Math.max(0, nextScroll.scrollHeight - nextScroll.clientHeight);
            maxLeft = Math.max(0, nextScroll.scrollWidth - nextScroll.clientWidth);
            nextScroll.scrollTop = Math.min(Math.max(0, nextTop), maxTop);
            nextScroll.scrollLeft = Math.min(Math.max(0, nextLeft), maxLeft);
            return;
          }
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
