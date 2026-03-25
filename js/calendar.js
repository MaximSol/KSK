window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var Utils = KSK.Utils;
  var HOUR_HEIGHT = 96;
  var QUARTER_HEIGHT = 24;
  var DEFAULT_HOUR_HEIGHT = 96;
  var DEFAULT_QUARTER_HEIGHT = 24;
  var container;
  var isBound = false;

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

  function bookingStart(booking) {
    return Utils.parseTimeToMinutes(booking.time);
  }

  function bookingEnd(booking) {
    return bookingStart(booking) + Number(booking.duration);
  }

  function getCssPixelValue(styles, propertyName, fallback) {
    var value = parseFloat(styles.getPropertyValue(propertyName));
    return value > 0 ? value : fallback;
  }

  function syncRuntimeMetrics() {
    var metricSource = container || document.documentElement;
    var styles;

    if (!metricSource) {
      HOUR_HEIGHT = DEFAULT_HOUR_HEIGHT;
      QUARTER_HEIGHT = DEFAULT_QUARTER_HEIGHT;
      return;
    }

    styles = window.getComputedStyle(document.documentElement);
    HOUR_HEIGHT = getCssPixelValue(styles, "--ksk-hour-height", DEFAULT_HOUR_HEIGHT);
    QUARTER_HEIGHT = getCssPixelValue(styles, "--ksk-quarter-height", DEFAULT_QUARTER_HEIGHT);
  }

  function topForMinutes(minutes) {
    return ((minutes - Utils.DAY_START) / 60) * HOUR_HEIGHT;
  }

  function heightForDuration(duration) {
    return (Number(duration) / 60) * HOUR_HEIGHT - 2;
  }

  function slotTop(minute) {
    return ((minute - Utils.DAY_START) / 15) * QUARTER_HEIGHT;
  }

  function heightForMinutes(minutes) {
    return (minutes / 60) * HOUR_HEIGHT;
  }

  function isMinuteWithinShift(minute, availability) {
    var shiftStart;
    var shiftEnd;

    if (!availability || availability.isOff) {
      return false;
    }

    shiftStart = Utils.parseTimeToMinutes(availability.start);
    shiftEnd = Utils.parseTimeToMinutes(availability.end);
    return minute >= shiftStart && minute < shiftEnd;
  }

  function buildAvailabilityLayer(availability) {
    var layer = el("div", "calendar-availability-layer");
    var shiftStart;
    var shiftEnd;

    function appendBlock(start, end, className) {
      var block = el("div", className || "calendar-availability-block");
      block.style.top = topForMinutes(start) + "px";
      block.style.height = heightForMinutes(end - start) + "px";
      layer.appendChild(block);
    }

    if (!availability) {
      return layer;
    }

    if (availability.isOff) {
      appendBlock(Utils.DAY_START, Utils.DAY_END, "calendar-availability-block calendar-availability-block--off");
      return layer;
    }

    shiftStart = Utils.parseTimeToMinutes(availability.start);
    shiftEnd = Utils.parseTimeToMinutes(availability.end);

    if (shiftStart > Utils.DAY_START) {
      appendBlock(Utils.DAY_START, shiftStart);
    }
    if (shiftEnd < Utils.DAY_END) {
      appendBlock(shiftEnd, Utils.DAY_END);
    }

    return layer;
  }

  function getWeekRangeLabel(anchorDate) {
    var dates = Utils.getWeekDates(anchorDate);
    var startDate = Utils.toDate(dates[0]);
    var endDate = Utils.toDate(dates[6]);
    var sameMonth = startDate.getMonth() === endDate.getMonth();
    if (sameMonth) {
      return startDate.getDate() + "–" + endDate.getDate() + " " + endDate.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric"
      });
    }
    return startDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long"
    }) + " – " + endDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function computePeakOccupancy(bookings) {
    var events = [];
    bookings.forEach(function (booking) {
      if (booking.status === "cancelled") {
        return;
      }
      events.push({ minute: bookingStart(booking), delta: 1 });
      events.push({ minute: bookingEnd(booking), delta: -1 });
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

  function getLayout(bookings) {
    var sorted = bookings.slice().sort(function (a, b) {
      var startDiff = bookingStart(a) - bookingStart(b);
      if (startDiff !== 0) {
        return startDiff;
      }
      if (a.duration !== b.duration) {
        return b.duration - a.duration;
      }
      return a.id.localeCompare(b.id);
    });

    var layout = {};
    var active = [];
    var clusterIds = [];
    var clusterLaneCount = 0;

    function finalizeCluster() {
      clusterIds.forEach(function (id) {
        layout[id].laneCount = Math.max(layout[id].laneCount, clusterLaneCount || 1);
      });
      clusterIds = [];
      clusterLaneCount = 0;
    }

    sorted.forEach(function (booking) {
      var start = bookingStart(booking);
      active = active.filter(function (item) {
        return item.end > start;
      });

      if (active.length === 0 && clusterIds.length) {
        finalizeCluster();
      }

      var used = active.map(function (item) {
        return item.laneIndex;
      });
      var laneIndex = 0;
      while (used.indexOf(laneIndex) !== -1) {
        laneIndex += 1;
      }

      layout[booking.id] = {
        laneIndex: laneIndex,
        laneCount: 1
      };
      active.push({
        id: booking.id,
        laneIndex: laneIndex,
        end: bookingEnd(booking)
      });
      clusterIds.push(booking.id);
      clusterLaneCount = Math.max(clusterLaneCount, active.length);
    });

    if (clusterIds.length) {
      finalizeCluster();
    }

    return layout;
  }

  function createTimeRail() {
    var rail = el("div", "calendar-time-rail");
    Utils.HOURS.forEach(function (hour, index) {
      var label = el("div", "calendar-time-label", String(hour).padStart(2, "0") + ":00");
      label.style.top = index * HOUR_HEIGHT + "px";
      rail.appendChild(label);
    });
    return rail;
  }

  function createTrackBase(date, readonly, resourceType, resourceId, resourceLabel, availability) {
    var track = el("div", "calendar-track");
    track.dataset.date = date;
    if (resourceId) {
      track.dataset.resourceId = resourceId;
    }

    Utils.HOURS.forEach(function (_, index) {
      var band = el("div", "calendar-hour-band");
      band.style.top = index * HOUR_HEIGHT + "px";
      band.style.height = HOUR_HEIGHT + "px";
      band.dataset.hourIndex = String(index);
      track.appendChild(band);
    });

    var availabilityLayer = buildAvailabilityLayer(availability);
    var slotLayer = el("div", "calendar-slot-layer");
    var bookingLayer = el("div", "calendar-booking-layer");
    var nowLayer = el("div", "calendar-now-layer");

    var minute;
    for (minute = Utils.DAY_START; minute <= 1215; minute += 15) {
      var slot;
      var isOffhours = resourceType === "trainers" && availability && !isMinuteWithinShift(minute, availability);
      if (readonly || isOffhours) {
        slot = el("div", "calendar-slot calendar-slot--readonly" + (isOffhours ? " calendar-slot--offhours" : ""));
      } else {
        slot = el("button", "calendar-slot");
        slot.type = "button";
        slot.dataset.action = "create-booking";
        slot.dataset.date = date;
        slot.dataset.time = Utils.formatTime(minute);
        slot.dataset.resourceType = resourceType;
        slot.dataset.resourceId = resourceId;
        slot.setAttribute("aria-label", "Новое занятие, " + Utils.formatShortDate(date) + " " + Utils.formatTime(minute) + ", " + resourceLabel);
      }
      slot.style.top = slotTop(minute) + "px";
      slotLayer.appendChild(slot);
    }

    track.appendChild(availabilityLayer);
    track.appendChild(slotLayer);
    track.appendChild(bookingLayer);
    track.appendChild(nowLayer);
    return track;
  }

  function createColumnHeader(primary, secondary, resourceId) {
    var header = el("div", "calendar-column-header px-2 py-2 border-bottom");
    if (resourceId) {
      header.dataset.resourceId = resourceId;
    }
    header.appendChild(el("div", "fw-semibold text-truncate", primary));
    header.appendChild(el("div", "small text-body-secondary", secondary));
    return header;
  }

  function createByIdMap(items) {
    var map = {};

    items.forEach(function (item) {
      map[item.id] = item;
    });

    return map;
  }

  function createLookups() {
    return {
      trainersById: createByIdMap(KSK.Data.getTrainers()),
      horsesById: createByIdMap(KSK.Data.getHorses()),
      groomsById: createByIdMap(KSK.Data.getGrooms()),
      arenasById: createByIdMap(KSK.Data.getArenas())
    };
  }

  function getBookingNames(booking, lookups) {
    var trainer = booking.trainerId ? lookups.trainersById[booking.trainerId] : null;
    var horse = booking.horseId ? lookups.horsesById[booking.horseId] : null;
    var groom = booking.groomId ? lookups.groomsById[booking.groomId] : null;
    var arena = booking.arenaId ? lookups.arenasById[booking.arenaId] : null;

    return {
      trainerName: trainer ? trainer.name : "Без тренера",
      horseName: horse ? horse.name : "Без лошади",
      groomName: groom ? groom.name : null,
      arenaName: arena ? arena.name : ""
    };
  }

  function getCardResourceLine(booking, viewType, lookups, compact) {
    var names = getBookingNames(booking, lookups);
    var serviceLabel = Utils.SERVICE_LABELS[booking.serviceType] || booking.serviceType;

    if (compact) {
      if (viewType === "trainers") {
        return [names.horseName, names.arenaName].filter(Boolean).join(" • ");
      }

      if (viewType === "horses") {
        return [names.trainerName, names.arenaName].filter(Boolean).join(" • ");
      }

      return [names.trainerName, names.horseName].filter(Boolean).join(" • ");
    }

    if (viewType === "trainers") {
      return [serviceLabel, names.horseName, names.arenaName].filter(Boolean).join(" • ");
    }

    if (viewType === "horses") {
      return [serviceLabel, names.trainerName, names.arenaName].filter(Boolean).join(" • ");
    }

    return [serviceLabel, names.trainerName, names.horseName].filter(Boolean).join(" • ");
  }

  function getDealLabel(booking) {
    if (!booking.bitrixDealUrl) {
      return null;
    }
    return booking.bitrixDealLabel || "CRM";
  }

  function createChip(tone, text) {
    var chip = el("span", "booking-chip booking-chip--" + tone, text);
    return chip;
  }

  function getFinancialChipText(booking) {
    if (booking.paymentType === "subscription") {
      return booking.subscriptionRemaining === null
        ? "Абонемент"
        : "Абонемент • ост. " + booking.subscriptionRemaining;
    }
    if (booking.paymentType === "single") {
      return booking.singlePrice === null
        ? "Разово"
        : "Разово • " + booking.singlePrice + " ₽";
    }
    return null;
  }

  function isCardRelevant(booking, dayBookings) {
    if (!KSK.App.isScheduleInsightsEnabled()) {
      return true;
    }
    return KSK.App.matchesFocusFilter(booking, dayBookings);
  }

  function getBookingsByDate(weekDates, bookings) {
    var bookingsByDate = {};

    weekDates.forEach(function (date) {
      bookingsByDate[date] = [];
    });

    bookings.forEach(function (booking) {
      if (bookingsByDate[booking.date]) {
        bookingsByDate[booking.date].push(booking);
      }
    });

    weekDates.forEach(function (date) {
      bookingsByDate[date].sort(Utils.compareBookings);
    });

    return bookingsByDate;
  }

  function getResourcesForType(resourceType) {
    if (resourceType === "trainers") {
      return KSK.Data.getTrainers();
    }
    if (resourceType === "horses") {
      return KSK.Data.getHorses();
    }
    return [];
  }

  function getResourceIdForBooking(booking, resourceType) {
    if (resourceType === "trainers") {
      return booking.trainerId;
    }
    if (resourceType === "horses") {
      return booking.horseId;
    }
    return "";
  }

  function getResourceWeekMetaLine(booking, resourceType, lookups) {
    var names = getBookingNames(booking, lookups);

    if (resourceType === "trainers") {
      return names.horseName;
    }
    if (resourceType === "horses") {
      return names.trainerName;
    }
    return "";
  }

  function formatWindowCount(count) {
    return count + " " + Utils.pluralize(count, ["окно", "окна", "окон"]);
  }

  function createBookingCardState(booking, options) {
    var dayBookings = options.dayBookings || KSK.Data.getBookings(booking.date);
    var lookups = options.lookups || createLookups();
    var names = getBookingNames(booking, lookups);
    var enhanced = KSK.App.isScheduleInsightsEnabled();
    var conflicts = KSK.Conflicts.checkConflicts(booking, dayBookings);
    var paymentChipText = getFinancialChipText(booking);
    var trainerScheduleEnabled = KSK.App.isTrainerScheduleEnabled();
    var trainerAvailability = trainerScheduleEnabled && booking.trainerId
      ? KSK.Data.checkTrainerAvailability(booking.trainerId, booking.date, booking.time, booking.duration)
      : null;
    var offhoursChipText = trainerAvailability && !trainerAvailability.isAvailable
      ? (trainerAvailability.reason === "off" ? "Выходной" : "Вне смены")
      : "";

    return {
      dayBookings: dayBookings,
      lookups: lookups,
      names: names,
      enhanced: enhanced,
      relevant: isCardRelevant(booking, dayBookings),
      dealLabel: getDealLabel(booking),
      conflicts: conflicts,
      paymentChipText: paymentChipText,
      trainerAvailability: trainerAvailability,
      offhoursChipText: offhoursChipText,
      isCompactDay: Boolean(options.allowCompactDay && Number(booking.duration) === 30)
    };
  }

  function createBookingCardButton(booking, options) {
    var card = document.createElement("button");
    var cardState = createBookingCardState(booking, options);
    var action = options.weekMode
      ? (cardState.enhanced ? "select-week-booking" : "open-week-booking")
      : (cardState.enhanced ? "select-booking" : "open-booking");

    card.type = "button";
    card.className = "booking-card " + options.variantClass + " booking-card--status-" + booking.status;
    if (cardState.dealLabel) {
      card.classList.add("booking-card--has-deal");
    }
    if (options.isTight) {
      card.classList.add("booking-card--tight");
    }
    if (cardState.isCompactDay) {
      card.classList.add("booking-card--compact");
    }
    if (cardState.offhoursChipText) {
      card.classList.add("booking-card--offhours");
    }
    if (cardState.conflicts.length) {
      card.classList.add("booking-card--conflict");
      card.dataset.hasConflicts = "true";
    }
    if (cardState.enhanced && KSK.App.state.selectedBookingId === booking.id) {
      card.classList.add("booking-card--selected");
    }
    if (cardState.enhanced && KSK.App.state.focusFilter !== "all" && !cardState.relevant) {
      card.classList.add("booking-card--muted");
    }

    card.dataset.bookingId = booking.id;
    card.dataset.date = booking.date;
    card.dataset.time = booking.time;
    card.dataset.action = action;
    card.dataset.resourceType = options.resourceType || options.viewType || "";
    card.dataset.resourceId = options.resourceId || "";

    return {
      card: card,
      cardState: cardState
    };
  }

  function createDealLink(booking, dealLabel, variant) {
    var dealLink;

    if (!dealLabel) {
      return null;
    }

    dealLink = document.createElement("a");
    dealLink.className = "booking-card__deal-link";
    if (variant === "week") {
      dealLink.classList.add("booking-card__deal-link--week");
    }
    if (variant === "list") {
      dealLink.classList.add("booking-card__deal-link--list");
    }
    dealLink.href = booking.bitrixDealUrl;
    dealLink.target = "_blank";
    dealLink.rel = "noopener noreferrer";
    dealLink.textContent = dealLabel;
    dealLink.dataset.action = "open-deal";
    dealLink.dataset.dealUrl = booking.bitrixDealUrl;
    dealLink.setAttribute("aria-label", "Открыть сделку Bitrix24 " + dealLabel);
    return dealLink;
  }

  function appendStandardCardChips(card, booking, cardState) {
    var chips = el("div", "booking-card__chips");

    if (cardState.offhoursChipText) {
      chips.appendChild(createChip("offhours", cardState.offhoursChipText));
    }
    if (cardState.conflicts.length) {
      chips.appendChild(createChip("conflict", "Конфликт"));
    }
    if (booking.paymentStatus === "unpaid") {
      chips.appendChild(createChip("unpaid", "Не оплачено"));
    } else if (booking.paymentStatus === "paid") {
      chips.appendChild(createChip("paid", "Оплачено"));
    }
    if (cardState.paymentChipText) {
      chips.appendChild(createChip(booking.paymentType === "subscription" ? "subscription" : "single", cardState.paymentChipText));
    }
    if (chips.childNodes.length) {
      card.appendChild(chips);
    }
  }

  function appendWeekListChips(card, booking, cardState) {
    var chips = el("div", "booking-card__chips");

    if (cardState.offhoursChipText) {
      chips.appendChild(createChip("offhours", cardState.offhoursChipText));
    }
    if (cardState.conflicts.length) {
      chips.appendChild(createChip("conflict", "Конфликт"));
    }
    if (booking.paymentStatus === "unpaid") {
      chips.appendChild(createChip("unpaid", "Не оплачено"));
    }
    if (booking.paymentType === "subscription") {
      chips.appendChild(createChip("subscription", "Абонемент"));
    }
    if (chips.childNodes.length) {
      card.appendChild(chips);
    }
  }

  function appendLegacyWeekChips(card, cardState) {
    var chips = el("div", "booking-card__chips");

    if (cardState.offhoursChipText) {
      chips.appendChild(createChip("offhours", cardState.offhoursChipText));
    }
    if (chips.childNodes.length) {
      card.appendChild(chips);
    }
  }

  function renderWeekListBookingCard(booking, options) {
    var built = createBookingCardButton(booking, {
      variantClass: "booking-card--week-list",
      viewType: options.resourceType,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      weekMode: true,
      dayBookings: options.dayBookings,
      lookups: options.lookups
    });
    var shell = el("div", "booking-card-shell booking-card-shell--list");
    var card = built.card;
    var cardState = built.cardState;
    var dealLink = createDealLink(booking, cardState.dealLabel, "list");

    card.appendChild(el("span", "booking-card__summary", booking.time + " • " + booking.clientName));
    card.appendChild(el("span", "booking-card__meta", getResourceWeekMetaLine(booking, options.resourceType, cardState.lookups)));
    appendWeekListChips(card, booking, cardState);

    shell.appendChild(card);
    if (dealLink) {
      shell.appendChild(dealLink);
    }

    return shell;
  }

  function renderTrainerWeekAvailability(meta, options) {
    var availability = el("div", "calendar-week-cell__availability");
    var quickslots = el("div", "calendar-week-quickslots");
    var visibleSlots = meta.startSlots.slice(0, 3);
    var overflowCount = Math.max(meta.startSlots.length - visibleSlots.length, 0);
    var trainerLabel = "тренер " + options.trainerName;

    if (meta.shift.isOff) {
      availability.appendChild(el("div", "calendar-week-cell__status", "Выходной"));
      return availability;
    }

    if (meta.isFullyBooked) {
      availability.appendChild(el("div", "calendar-week-cell__status", "Окон нет"));
      return availability;
    }

    visibleSlots.forEach(function (time) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-week-quickslot";
      button.dataset.action = "create-week-booking";
      button.dataset.date = options.date;
      button.dataset.time = time;
      button.dataset.resourceType = "trainers";
      button.dataset.resourceId = options.trainerId;
      button.setAttribute("aria-label", "Создать занятие, " + Utils.formatShortDate(options.date) + " " + time + ", " + trainerLabel);
      button.textContent = time;
      quickslots.appendChild(button);
    });

    if (overflowCount > 0) {
      var moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.className = "calendar-week-quickslot calendar-week-quickslot--more";
      moreButton.dataset.action = "open-week-overflow";
      moreButton.dataset.date = options.date;
      moreButton.dataset.resourceType = "trainers";
      moreButton.dataset.resourceId = options.trainerId;
      moreButton.setAttribute("aria-label", "Открыть день " + Utils.formatShortDate(options.date) + " по " + trainerLabel + " и увидеть все свободные старты");
      moreButton.textContent = "+" + overflowCount;
      quickslots.appendChild(moreButton);
    }

    availability.appendChild(quickslots);
    return availability;
  }

  KSK.Calendar = {
    init: function () {
      container = document.getElementById("calendar-container");
      this._attachClickHandlers();
    },

    renderDayView: function (date, resourceType) {
      var fragment = document.createDocumentFragment();
      var scroll = el("div", "calendar-scroll");
      var resources;
      var bookings = KSK.Data.getBookings(date);
      var lookups = createLookups();
      var columnsById = {};
      var bookingsByResourceId = {};
      var resourceMetaById = {};
      var timeHeader = el("div", "calendar-time-header px-2 py-2 border-bottom fw-semibold text-body-secondary", "Время");
      var grid = el("div", "calendar-grid");
      var enhanced = KSK.App.isScheduleInsightsEnabled();
      var trainerScheduleEnabled = resourceType === "trainers" && KSK.App.isTrainerScheduleEnabled();
      var hasFocus = enhanced && KSK.App.state.focusFilter !== "all";

      syncRuntimeMetrics();

      if (resourceType === "trainers") {
        resources = KSK.Data.getTrainers();
      } else if (resourceType === "horses") {
        resources = KSK.Data.getHorses();
      } else {
        resources = KSK.Data.getArenas();
      }

      resources.forEach(function (resource) {
        bookingsByResourceId[resource.id] = [];
      });

      bookings.forEach(function (booking) {
        var bookingResourceId;

        if (resourceType === "trainers") {
          bookingResourceId = booking.trainerId;
        } else if (resourceType === "horses") {
          bookingResourceId = booking.horseId;
        } else {
          bookingResourceId = booking.arenaId;
        }

        if (bookingResourceId && bookingsByResourceId[bookingResourceId]) {
          bookingsByResourceId[bookingResourceId].push(booking);
        }
      });

      var visibleResources = resources;

      if (trainerScheduleEnabled) {
        resources.forEach(function (resource) {
          var columnBookings = bookingsByResourceId[resource.id] || [];

          resourceMetaById[resource.id] = {
            columnBookings: columnBookings,
            availability: KSK.Data.getTrainerShiftForDate(resource.id, date)
          };
        });

        visibleResources = resources.filter(function (resource) {
          var meta = resourceMetaById[resource.id];
          return !meta.availability.isOff || meta.columnBookings.length > 0;
        });

        if (visibleResources.length === 0) {
          var empty = el("div", "calendar-empty-state");
          empty.appendChild(el("h3", "calendar-empty-state__title", "На выбранную дату нет тренеров в смене"));
          empty.appendChild(el("p", "calendar-empty-state__text", "Смените дату или откройте неделю, чтобы увидеть все записи."));
          scroll.appendChild(empty);
          fragment.appendChild(scroll);
          container.replaceChildren(fragment);
          this.highlightCurrentHour();
          return;
        }
      }

      grid.style.setProperty("--ksk-column-count", String(visibleResources.length));
      grid.appendChild(timeHeader);

      visibleResources.forEach(function (resource) {
        var meta = resourceMetaById[resource.id] || {};
        var columnBookings = meta.columnBookings || bookingsByResourceId[resource.id] || [];
        var secondary;
        var relevantCount = columnBookings.filter(function (booking) {
          return isCardRelevant(booking, bookings);
        }).length;
        var availability = Object.prototype.hasOwnProperty.call(meta, "availability") ? meta.availability : null;

        if (resourceType === "arenas") {
          secondary = "пик " + computePeakOccupancy(columnBookings) + "/" + resource.capacity;
        } else if (trainerScheduleEnabled) {
          secondary = availability.label + " • " + columnBookings.length + " " + Utils.pluralize(columnBookings.length, ["занятие", "занятия", "занятий"]);
        } else {
          secondary = columnBookings.length + " " + Utils.pluralize(columnBookings.length, ["занятие", "занятия", "занятий"]);
        }
        var labelPrefix = resourceType === "trainers" ? "тренер " : resourceType === "horses" ? "лошадь " : "площадка ";
        var header = createColumnHeader(resource.name, secondary, resource.id);
        var track = createTrackBase(date, resourceType === "arenas", resourceType, resource.id, labelPrefix + resource.name, availability);
        var bookingLayer = track.querySelector(".calendar-booking-layer");
        var layout = getLayout(columnBookings);

        if (hasFocus && relevantCount === 0) {
          header.classList.add("calendar-column-header--muted");
          track.classList.add("calendar-track--muted");
        }

        columnBookings.forEach(function (booking) {
          bookingLayer.appendChild(KSK.Calendar._renderBookingCard(booking, {
            viewType: resourceType,
            layout: layout[booking.id],
            compactWeek: false,
            resourceId: resource.id,
            dayBookings: bookings,
            lookups: lookups
          }));
        });

        columnsById[resource.id] = track;
        grid.appendChild(header);
      });

      grid.appendChild(createTimeRail());
      visibleResources.forEach(function (resource) {
        grid.appendChild(columnsById[resource.id]);
      });

      scroll.appendChild(grid);
      fragment.appendChild(scroll);
      container.replaceChildren(fragment);
      this.highlightCurrentHour();
    },

    renderWeekView: function (startDate, options) {
      var weekDates = Utils.getWeekDates(startDate);
      var allPeriodBookings = options && options.allPeriodBookings ? options.allPeriodBookings : [];
      var gridVisibleBookings = options && options.gridVisibleBookings ? options.gridVisibleBookings : allPeriodBookings;
      var viewType = options && options.viewType ? options.viewType : "";
      var trainerWeekSummary = options && options.trainerWeekSummary ? options.trainerWeekSummary : null;

      if (!KSK.App.isScheduleInsightsEnabled()) {
        this.renderLegacyWeekView(startDate, allPeriodBookings, weekDates);
        return;
      }

      if (viewType === "trainers" || viewType === "horses") {
        this.renderResourceWeekView(startDate, gridVisibleBookings, viewType, weekDates, allPeriodBookings, trainerWeekSummary);
        return;
      }

      this.renderLegacyWeekView(startDate, allPeriodBookings, weekDates);
    },

    renderLegacyWeekView: function (startDate, allPeriodBookings, weekDates) {
      var fragment = document.createDocumentFragment();
      var scroll = el("div", "calendar-scroll");
      var grid = el("div", "calendar-grid calendar-grid--week");
      var lookups = createLookups();
      var timeHeader = el("div", "calendar-time-header px-2 py-2 border-bottom fw-semibold text-body-secondary", "Время");
      var bookingsByDate = getBookingsByDate(weekDates, allPeriodBookings || []);
      var tracks = {};
      var enhanced = KSK.App.isScheduleInsightsEnabled();
      var hasFocus = enhanced && KSK.App.state.focusFilter !== "all";

      syncRuntimeMetrics();

      grid.style.setProperty("--ksk-column-count", "7");
      grid.appendChild(timeHeader);

      weekDates.forEach(function (date) {
        var dateObj = Utils.toDate(date);
        var dayBookings = bookingsByDate[date] || [];
        var relevantCount = dayBookings.filter(function (booking) {
          return isCardRelevant(booking, dayBookings);
        }).length;
        var header = createColumnHeader(
          dateObj.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }),
          dayBookings.length + " " + Utils.pluralize(dayBookings.length, ["занятие", "занятия", "занятий"])
        );
        var track = createTrackBase(date, true, "week", "", "");
        var bookingLayer = track.querySelector(".calendar-booking-layer");
        var layout = getLayout(dayBookings);

        if (hasFocus && relevantCount === 0) {
          header.classList.add("calendar-column-header--muted");
          track.classList.add("calendar-track--muted");
        }

        dayBookings.forEach(function (booking) {
          bookingLayer.appendChild(KSK.Calendar._renderBookingCard(booking, {
            viewType: "week",
            layout: layout[booking.id],
            compactWeek: true,
            resourceId: "",
            resourceType: "week",
            dayBookings: dayBookings,
            lookups: lookups
          }));
        });

        tracks[date] = track;
        grid.appendChild(header);
      });

      grid.appendChild(createTimeRail());
      weekDates.forEach(function (date) {
        grid.appendChild(tracks[date]);
      });

      scroll.appendChild(grid);
      fragment.appendChild(scroll);
      container.replaceChildren(fragment);
      this.highlightCurrentHour();
    },

    renderResourceWeekView: function (startDate, gridVisibleBookings, resourceType, weekDates, allPeriodBookings, trainerWeekSummary) {
      var fragment = document.createDocumentFragment();
      var scroll = el("div", "calendar-scroll");
      var matrix = el("div", "calendar-week-matrix");
      var lookups = createLookups();
      var resources = getResourcesForType(resourceType);
      var allBookingsByDate = getBookingsByDate(weekDates, allPeriodBookings || []);
      var visibleBookingsByDate = getBookingsByDate(weekDates, gridVisibleBookings || []);
      var bookingsByResourceId = {};
      var bookingsByResourceAndDate = {};
      var relevantCountByResourceId = {};
      var relevantCountByDate = {};
      var enhanced = KSK.App.isScheduleInsightsEnabled();
      var hasFocus = enhanced && KSK.App.state.focusFilter !== "all";
      var isTrainerAvailabilityWeek = resourceType === "trainers"
        && KSK.App.isTrainerScheduleEnabled()
        && trainerWeekSummary;

      matrix.style.setProperty("--ksk-week-day-count", String(weekDates.length));
      matrix.appendChild(el("div", "calendar-week-corner", Utils.VIEW_LABELS[resourceType]));

      weekDates.forEach(function (date) {
        relevantCountByDate[date] = 0;
      });

      resources.forEach(function (resource) {
        bookingsByResourceId[resource.id] = [];
        bookingsByResourceAndDate[resource.id] = {};
        relevantCountByResourceId[resource.id] = 0;
        weekDates.forEach(function (date) {
          bookingsByResourceAndDate[resource.id][date] = [];
        });
      });

      (gridVisibleBookings || []).slice().sort(Utils.compareBookings).forEach(function (booking) {
        var resourceId = getResourceIdForBooking(booking, resourceType);
        var dayBookings = allBookingsByDate[booking.date] || [];

        if (!resourceId || !bookingsByResourceAndDate[resourceId] || !bookingsByResourceAndDate[resourceId][booking.date]) {
          return;
        }

        bookingsByResourceId[resourceId].push(booking);
        bookingsByResourceAndDate[resourceId][booking.date].push(booking);

        if (isCardRelevant(booking, dayBookings)) {
          relevantCountByResourceId[resourceId] += 1;
          relevantCountByDate[booking.date] += 1;
        }
      });

      weekDates.forEach(function (date) {
        var header = el("div", "calendar-week-day-header");
        var total = (visibleBookingsByDate[date] || []).length;
        var metaLabel = total + " " + Utils.pluralize(total, ["занятие", "занятия", "занятий"]);

        if (hasFocus && relevantCountByDate[date] === 0) {
          header.classList.add("calendar-week-day-header--muted");
        }

        if (isTrainerAvailabilityWeek) {
          metaLabel += " • " + formatWindowCount(trainerWeekSummary.dayWindowCounts[date]);
        }

        header.appendChild(el("div", "calendar-week-day-header__title", Utils.toDate(date).toLocaleDateString("ru-RU", {
          weekday: "short",
          day: "numeric",
          month: "short"
        })));
        header.appendChild(el("div", "calendar-week-day-header__meta", metaLabel));
        matrix.appendChild(header);
      });

      resources.forEach(function (resource) {
        var resourceHeader = el("div", "calendar-week-resource-header");
        var weeklyTotal = bookingsByResourceId[resource.id].length;
        var headerMeta = weeklyTotal + " " + Utils.pluralize(weeklyTotal, ["занятие", "занятия", "занятий"]);

        if (hasFocus && relevantCountByResourceId[resource.id] === 0) {
          resourceHeader.classList.add("calendar-week-resource-header--muted");
        }

        if (isTrainerAvailabilityWeek) {
          headerMeta += " • " + formatWindowCount(trainerWeekSummary.trainerWindowCounts[resource.id]);
        }

        resourceHeader.dataset.resourceId = resource.id;
        resourceHeader.appendChild(el("div", "calendar-week-resource-header__title", resource.name));
        resourceHeader.appendChild(el("div", "calendar-week-resource-header__meta", headerMeta));
        matrix.appendChild(resourceHeader);

        weekDates.forEach(function (date) {
          var cellBookings = bookingsByResourceAndDate[resource.id][date] || [];
          var cell = el("div", "calendar-week-cell");
          var dayBookings = isTrainerAvailabilityWeek
            ? trainerWeekSummary.bookingsByDate[date]
            : (allBookingsByDate[date] || []);
          var freeMeta = isTrainerAvailabilityWeek
            ? trainerWeekSummary.freeMetaByTrainerAndDate[resource.id][date]
            : null;
          var shiftLine;
          var availabilityNode;

          cell.dataset.resourceId = resource.id;
          cell.dataset.date = date;

          if (hasFocus && relevantCountByResourceId[resource.id] === 0) {
            cell.classList.add("calendar-week-cell--muted");
          }

          if (isTrainerAvailabilityWeek) {
            if (freeMeta.shift.isOff) {
              cell.classList.add("calendar-week-cell--off");
            }
            if (freeMeta.isFullyBooked) {
              cell.classList.add("calendar-week-cell--full");
            }
            if (!cellBookings.length) {
              cell.classList.add("calendar-week-cell--empty");
            }

            if (!freeMeta.shift.isOff) {
              shiftLine = el("div", "calendar-week-cell__shift", freeMeta.shift.label);
              cell.appendChild(shiftLine);
            }

            if (cellBookings.length) {
              cellBookings.forEach(function (booking) {
                cell.appendChild(renderWeekListBookingCard(booking, {
                  resourceType: resourceType,
                  resourceId: resource.id,
                  dayBookings: dayBookings,
                  lookups: lookups
                }));
              });
            }

            availabilityNode = renderTrainerWeekAvailability(freeMeta, {
              date: date,
              trainerId: resource.id,
              trainerName: resource.name
            });
            if (availabilityNode) {
              cell.appendChild(availabilityNode);
            }
          } else if (!cellBookings.length) {
            cell.classList.add("calendar-week-cell--empty");
            cell.appendChild(el("div", "calendar-week-cell__empty", "Свободно"));
          } else {
            cellBookings.forEach(function (booking) {
              cell.appendChild(renderWeekListBookingCard(booking, {
                resourceType: resourceType,
                resourceId: resource.id,
                dayBookings: dayBookings,
                lookups: lookups
              }));
            });
          }

          matrix.appendChild(cell);
        });
      });

      scroll.appendChild(matrix);
      fragment.appendChild(scroll);
      container.replaceChildren(fragment);
      this.highlightCurrentHour();
    },

    highlightCurrentHour: function () {
      if (!container) {
        return;
      }
      syncRuntimeMetrics();
      container.querySelectorAll(".calendar-hour-band.is-current-hour").forEach(function (band) {
        band.classList.remove("is-current-hour");
      });
      container.querySelectorAll(".calendar-now-line").forEach(function (line) {
        line.remove();
      });

      var currentDate = new Date();
      var todayIso = Utils.isoFromDate(currentDate);
      var nowMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
      if (nowMinutes < Utils.DAY_START || nowMinutes > Utils.DAY_END) {
        return;
      }

      var hourIndex = Math.floor((nowMinutes - Utils.DAY_START) / 60);
      container.querySelectorAll('.calendar-track[data-date="' + todayIso + '"]').forEach(function (track) {
        var band = track.querySelector('.calendar-hour-band[data-hour-index="' + hourIndex + '"]');
        if (band) {
          band.classList.add("is-current-hour");
        }
        var line = el("div", "calendar-now-line");
        line.style.top = topForMinutes(nowMinutes) + "px";
        track.querySelector(".calendar-now-layer").appendChild(line);
      });
    },

    _renderBookingCard: function (booking, options) {
      var viewType = options.viewType;
      var layout = options.layout;
      var compactWeek = options.compactWeek;
      var resourceId = options.resourceId;
      var resourceType = options.resourceType || viewType;
      var dayBookings = options.dayBookings;
      var lookups = options.lookups;
      var laneCount = layout && layout.laneCount ? layout.laneCount : 1;
      var laneIndex = layout && typeof layout.laneIndex === "number" ? layout.laneIndex : 0;
      var isTight = laneCount > 1;
      var left = laneCount === 1 ? "0" : "calc((100% / " + laneCount + ") * " + laneIndex + " + 2px)";
      var width = laneCount === 1 ? "calc(100% - 4px)" : "calc((100% / " + laneCount + ") - 4px)";
      var shell = document.createElement("div");
      var built = createBookingCardButton(booking, {
        variantClass: compactWeek ? "booking-card--week" : "booking-card--day",
        viewType: viewType,
        resourceType: resourceType,
        resourceId: resourceId,
        weekMode: compactWeek,
        dayBookings: dayBookings,
        lookups: lookups,
        isTight: isTight,
        allowCompactDay: !compactWeek
      });
      var card = built.card;
      var cardState = built.cardState;
      var dealLink = createDealLink(booking, cardState.dealLabel, compactWeek ? "week" : "");

      shell.className = "booking-card-shell";
      shell.style.top = topForMinutes(bookingStart(booking)) + "px";
      shell.style.height = heightForDuration(booking.duration) + "px";
      shell.style.left = left;
      shell.style.width = width;

      if (compactWeek) {
        card.appendChild(el("span", "booking-card__compact", booking.time + " • " + booking.clientName + " • " + cardState.names.trainerName));
        appendLegacyWeekChips(card, cardState);
      } else {
        card.appendChild(el("span", "booking-card__summary", booking.time + " • " + booking.clientName));
        card.appendChild(el("span", "booking-card__meta", getCardResourceLine(booking, viewType, cardState.lookups, cardState.isCompactDay || isTight)));
        appendStandardCardChips(card, booking, cardState);
      }

      shell.appendChild(card);

      if (dealLink) {
        shell.appendChild(dealLink);
      }

      return shell;
    },

    _attachClickHandlers: function () {
      if (isBound) {
        return;
      }
      isBound = true;
      container.addEventListener("click", function (event) {
        var target = event.target.closest("[data-action]");
        if (!target) {
          return;
        }

        var action = target.dataset.action;
        if (action === "open-deal") {
          return;
        }
        if (action === "open-booking") {
          KSK.Booking.openEdit(target.dataset.bookingId);
          return;
        }
        if (action === "open-week-booking") {
          KSK.App.setDate(target.dataset.date, { silent: true });
          KSK.App.switchPeriod("day", { silent: true });
          KSK.App.refresh();
          KSK.Booking.openEdit(target.dataset.bookingId);
          return;
        }
        if (action === "select-booking" || action === "select-week-booking") {
          KSK.App.selectBooking(target.dataset.bookingId);
          return;
        }
        if (action === "create-booking") {
          KSK.Booking.openNew({
            date: target.dataset.date,
            time: target.dataset.time,
            resourceType: target.dataset.resourceType,
            resourceId: target.dataset.resourceId
          });
          return;
        }
        if (action === "create-week-booking") {
          KSK.Booking.openNew({
            date: target.dataset.date,
            time: target.dataset.time,
            resourceType: target.dataset.resourceType,
            resourceId: target.dataset.resourceId,
            trainerId: target.dataset.resourceId
          });
          return;
        }
        if (action === "open-week-overflow") {
          KSK.App.setDate(target.dataset.date, { silent: true });
          KSK.App.switchPeriod("day", { silent: true });
          KSK.App.refresh();
        }
      });
    },

    getWeekRangeLabel: getWeekRangeLabel
  };
})();
