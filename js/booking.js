window.KSK = window.KSK || {};

(function () {
  var KSK = window.KSK;
  var Utils = KSK.Utils;
  var fieldToConflictMap = {
    trainer: "booking-trainer-id",
    horse: "booking-horse-id",
    horseStatus: "booking-horse-id",
    horseDailyLoad: "booking-horse-id",
    horseRestGap: "booking-horse-id",
    groom: "booking-groom-id",
    arena: "booking-arena-id"
  };

  var state = {
    mode: "new",
    bookingId: null,
    currentStatus: null,
    originalBookingSnapshot: null
  };

  var elements = {};
  var modalInstance = null;

  function optionHtml(value, label) {
    return '<option value="' + value + '">' + label + "</option>";
  }

  function setOptions(select, options) {
    select.innerHTML = options.join("");
  }

  function getInput(id) {
    return elements[id];
  }

  function trimValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizePaymentType(value) {
    return value === "single" || value === "subscription" ? value : null;
  }

  function normalizePaymentStatus(value) {
    return value === "paid" || value === "unpaid" ? value : null;
  }

  function normalizeSinglePrice(rawValue, paymentType) {
    var value = Number(rawValue);
    if (paymentType === "single" && value > 0) {
      return value;
    }
    return null;
  }

  function normalizeSubscriptionRemaining(rawValue, paymentType) {
    if (rawValue === null || rawValue === undefined || trimValue(String(rawValue)) === "") {
      return null;
    }
    var value = Number(rawValue);
    if (paymentType === "subscription" && Number.isInteger(value) && value >= 0) {
      return value;
    }
    return null;
  }

  function resolveEffectiveStatus(status) {
    if (status === "cancelled") {
      return "confirmed";
    }

    return status || "draft";
  }

  function getAllFormFields() {
    return [
      getInput("booking-date"),
      getInput("booking-time"),
      getInput("booking-duration"),
      getInput("booking-service-id"),
      getInput("booking-client-name"),
      getInput("booking-trainer-id"),
      getInput("booking-horse-id"),
      getInput("booking-groom-id"),
      getInput("booking-arena-id"),
      getInput("booking-notes"),
      getInput("booking-payment-type"),
      getInput("booking-payment-status"),
      getInput("booking-single-price"),
      getInput("booking-subscription-remaining"),
      getInput("booking-bitrix-deal-url"),
      getInput("booking-bitrix-deal-label")
    ];
  }

  function clearFieldStates() {
    getAllFormFields().forEach(function (field) {
      field.classList.remove("is-invalid", "border-warning", "border-danger");
    });
  }

  function createAlert(message, severity) {
    var alert = document.createElement("div");
    alert.className = "alert alert-" + (severity === "danger" ? "danger" : "warning") + " py-2 mb-0";
    alert.textContent = message;
    return alert;
  }

  function formatModalSubtitle(booking) {
    if (!booking.date || !booking.time || !booking.duration) {
      return "";
    }
    return Utils.formatDateLabel(booking.date, {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) + " • " + booking.time + "–" + Utils.addMinutes(booking.time, booking.duration);
  }

  function isQuarterTime(time) {
    var minutes = Utils.parseTimeToMinutes(time);
    return !Number.isNaN(minutes) && minutes >= Utils.DAY_START && minutes <= 1215 && minutes % 15 === 0;
  }

  function getNormalizedBitrixFields(rawUrl, rawLabel) {
    var bitrixDealUrl = trimValue(rawUrl);
    var bitrixDealLabel = trimValue(rawLabel);

    if (!bitrixDealUrl) {
      return {
        bitrixDealUrl: null,
        bitrixDealLabel: null
      };
    }

    return {
      bitrixDealUrl: bitrixDealUrl,
      bitrixDealLabel: bitrixDealLabel || null
    };
  }

  function getBitrixUrlState(rawUrl) {
    var value = trimValue(rawUrl);
    var parsed;

    if (!value) {
      return {
        value: "",
        isEmpty: true,
        isValid: false
      };
    }

    try {
      parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return {
          value: value,
          isEmpty: false,
          isValid: true
        };
      }
    } catch (error) {
      return {
        value: value,
        isEmpty: false,
        isValid: false
      };
    }

    return {
      value: value,
      isEmpty: false,
      isValid: false
    };
  }

  function resetBitrixDealLink() {
    var link = elements["booking-bitrix-deal-link"];
    link.classList.add("d-none");
    link.removeAttribute("href");
    link.removeAttribute("aria-label");
    link.textContent = "";
  }

  function updateBitrixDealLink(raw) {
    var urlState = getBitrixUrlState(raw.bitrixDealUrl);
    var link = elements["booking-bitrix-deal-link"];
    var linkLabel = trimValue(raw.bitrixDealLabel) || "CRM";

    if (!urlState.isValid) {
      resetBitrixDealLink();
      return;
    }

    link.classList.remove("d-none");
    link.href = urlState.value;
    link.textContent = "Открыть сделку";
    link.setAttribute("aria-label", "Открыть сделку Bitrix24 " + linkLabel);
  }

  function getTrainerAvailabilityPrompt() {
    return "График тренера появится после выбора даты и тренера";
  }

  function getHorseAvailabilityPrompt() {
    return isServiceCatalogEnabled()
      ? "Доступность лошади появится после выбора услуги, даты и лошади"
      : "Доступность лошади появится после выбора даты и лошади";
  }

  function isScheduleInsightsEnabled() {
    return KSK.App && typeof KSK.App.isScheduleInsightsEnabled === "function" && KSK.App.isScheduleInsightsEnabled();
  }

  function isServiceCatalogEnabled() {
    return !(window.KSK_FLAGS && window.KSK_FLAGS.serviceCatalogMvp === false);
  }

  function syncServiceFieldCaption() {
    var label = elements["booking-service-label"];

    if (!label) {
      return;
    }

    label.textContent = isServiceCatalogEnabled() ? "Услуга" : "Тип";
  }

  function getSelectedService(raw) {
    if (!isServiceCatalogEnabled() || !raw || !raw.serviceId) {
      return null;
    }

    return KSK.Data.getServiceById(raw.serviceId);
  }

  function getEffectiveHorseDuration(raw) {
    if (!raw) {
      return null;
    }

    if (isServiceCatalogEnabled()) {
      return raw.serviceId ? Number(raw.duration) : null;
    }

    return raw.duration ? Number(raw.duration) : null;
  }

  function getDefaultCatalogService() {
    var services = KSK.Data.getServices();

    return services.find(function (service) {
      return service.legacyServiceType === "training" && Number(service.duration) === 45;
    }) || null;
  }

  function syncGroomPlaceholder(requiresGroom) {
    var groomSelect = getInput("booking-groom-id");
    var placeholder = groomSelect && groomSelect.options ? groomSelect.options[0] : null;

    if (!placeholder) {
      return;
    }

    placeholder.textContent = requiresGroom ? "Выберите коновода" : "Не назначен";
  }

  function syncServiceSelection(raw) {
    var durationSelect = getInput("booking-duration");
    var service = getSelectedService(raw);

    syncServiceFieldCaption();

    if (!isServiceCatalogEnabled()) {
      durationSelect.disabled = false;
      syncGroomPlaceholder(false);
      return raw;
    }

    if (!service) {
      setOptions(durationSelect, [optionHtml("", "Выберите услугу")]);
      durationSelect.value = "";
      durationSelect.disabled = true;
      syncGroomPlaceholder(false);
      return collectFormData();
    }

    setOptions(durationSelect, [optionHtml(String(service.duration), String(service.duration) + " минут")]);
    durationSelect.value = String(service.duration);
    durationSelect.disabled = true;
    syncGroomPlaceholder(Boolean(service.requiresGroom));
    return collectFormData();
  }

  function copyServiceSnapshot(target, source) {
    target.serviceId = source && source.serviceId ? String(source.serviceId) : null;
    target.serviceName = source && source.serviceName ? source.serviceName : null;
    target.serviceDuration = source && source.serviceDuration ? Number(source.serviceDuration) : null;
    target.serviceRequiresGroom = Boolean(source && source.serviceRequiresGroom);
    return target;
  }

  function hasLegacyPairChanged(raw) {
    var original = state.originalBookingSnapshot;

    if (!original) {
      return true;
    }

    return normalizeServiceTypeValue(original.serviceType) !== normalizeServiceTypeValue(raw.serviceType)
      || Number(original.duration) !== Number(raw.duration);
  }

  function normalizeServiceTypeValue(serviceType) {
    return serviceType === "training" || serviceType === "rental" ? serviceType : null;
  }

  function getBookingsForDate(raw) {
    if (!raw || !raw.date) {
      return null;
    }

    return KSK.Data.getBookings(raw.date).filter(function (booking) {
      return booking.id !== raw.id;
    });
  }

  function getTrainerAvailabilityMessage(availability) {
    if (!availability || availability.isAvailable) {
      return "";
    }
    return availability.reason === "off"
      ? "У тренера выходной в этот день"
      : "Время занятия выходит за смену тренера";
  }

  function formatTrainerOptionLabel(trainer, selectableMeta) {
    if (!selectableMeta) {
      return trainer.name;
    }

    if (selectableMeta.isOff) {
      return trainer.name + " - выходной";
    }

    return trainer.name;
  }

  function renderTrainerAvailabilityHint(raw) {
    var helper = elements["booking-trainer-availability"];
    var enabled = KSK.App && typeof KSK.App.isTrainerScheduleEnabled === "function" && KSK.App.isTrainerScheduleEnabled();
    var shift;

    if (!helper) {
      return;
    }

    helper.hidden = !enabled;
    if (!enabled) {
      return;
    }

    if (!raw.date || !raw.trainerId) {
      helper.textContent = getTrainerAvailabilityPrompt();
      return;
    }

    shift = KSK.Data.getTrainerShiftForDate(raw.trainerId, raw.date);
    helper.textContent = shift.isOff
      ? "У тренера выходной"
      : "Смена тренера: " + shift.label;
  }

  function getTrainerSelectableMeta(raw) {
    var enabled = KSK.App && typeof KSK.App.isTrainerScheduleEnabled === "function" && KSK.App.isTrainerScheduleEnabled();

    if (!enabled || !raw || !raw.date || !raw.trainerId) {
      return null;
    }

    return KSK.Data.getTrainerSelectableHourSlots(raw.trainerId, raw.date, getBookingsForDate(raw));
  }

  function renderTrainerSlotPicker(raw) {
    var picker = elements["booking-trainer-slot-picker"];
    var buttons = elements["booking-trainer-slot-buttons"];
    var selectableMeta = getTrainerSelectableMeta(raw);
    var fragment;

    if (!picker || !buttons) {
      return;
    }

    if (!selectableMeta || selectableMeta.isOff || !selectableMeta.startSlots.length) {
      picker.hidden = true;
      picker.classList.add("d-none");
      buttons.replaceChildren();
      return;
    }

    fragment = document.createDocumentFragment();
    selectableMeta.startSlots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-sm btn-outline-primary booking-slot-picker__button";
      if (raw.time === slot) {
        button.classList.add("active");
      }
      button.dataset.slotTime = slot;
      button.textContent = slot;
      button.setAttribute("aria-label", "Поставить время " + slot);
      fragment.appendChild(button);
    });

    buttons.replaceChildren(fragment);

    picker.hidden = false;
    picker.classList.remove("d-none");
  }

  function formatHorseOptionLabel(horse, selectableMeta) {
    if (horse.status !== "available") {
      return horse.name + " - " + Utils.HORSE_STATUS_LABELS[horse.status];
    }

    if (!selectableMeta) {
      return horse.name;
    }

    if (selectableMeta.isFullyBooked) {
      return horse.name + " - лимит";
    }

    if (!selectableMeta.isUnavailable && !selectableMeta.startSlots.length) {
      return horse.name + " - окон нет";
    }

    return horse.name;
  }

  function populateHorseOptions(raw) {
    var select = getInput("booking-horse-id");
    var selectedValue = select.value;
    var horses = KSK.Data.getHorses();
    var enabled = isScheduleInsightsEnabled();
    var effectiveDuration = getEffectiveHorseDuration(raw);
    var bookingsForDate = enabled && raw && raw.date ? getBookingsForDate(raw) : null;
    var options = [optionHtml("", "Без лошади")].concat(horses.map(function (horse) {
      var label = horse.name;

      if (enabled) {
        label = formatHorseOptionLabel(
          horse,
          raw && raw.date && effectiveDuration
            ? KSK.Data.getHorseSelectableHourSlots(horse.id, raw.date, effectiveDuration, bookingsForDate)
            : null
        );
      }

      return optionHtml(horse.id, label);
    }));

    setOptions(select, options);
    select.value = horses.some(function (horse) {
      return horse.id === selectedValue;
    }) ? selectedValue : "";
  }

  function getHorseSelectableMeta(raw) {
    var effectiveDuration = getEffectiveHorseDuration(raw);

    if (!isScheduleInsightsEnabled() || !raw || !raw.date || !raw.horseId || !effectiveDuration) {
      return null;
    }

    return KSK.Data.getHorseSelectableHourSlots(raw.horseId, raw.date, effectiveDuration, getBookingsForDate(raw));
  }

  function renderHorseAvailabilityHint(raw) {
    var helper = elements["booking-horse-availability"];
    var meta;

    if (!helper) {
      return;
    }

    helper.hidden = !isScheduleInsightsEnabled();
    if (!isScheduleInsightsEnabled()) {
      return;
    }

    if (!raw.date || !raw.horseId) {
      helper.textContent = getHorseAvailabilityPrompt();
      return;
    }

    meta = getHorseSelectableMeta(raw);
    if (!meta) {
      helper.textContent = getHorseAvailabilityPrompt();
      return;
    }

    if (meta.isUnavailable) {
      helper.textContent = "Лошадь недоступна: " + meta.summary.horseStatusLabel;
      return;
    }

    if (meta.isFullyBooked) {
      helper.textContent = "Лошадь достигла дневной нагрузки: " + meta.summary.dayLoad + "/" + meta.summary.maxDailyLoad;
      return;
    }

    helper.textContent = "Лошадь доступна • " + meta.summary.dayLoad + "/" + meta.summary.maxDailyLoad + " занятий • нужен 1 час отдыха";
  }

  function renderHorseSlotPicker(raw) {
    var picker = elements["booking-horse-slot-picker"];
    var buttons = elements["booking-horse-slot-buttons"];
    var selectableMeta = getHorseSelectableMeta(raw);
    var fragment;

    if (!picker || !buttons) {
      return;
    }

    if (!isScheduleInsightsEnabled() || !selectableMeta || !selectableMeta.startSlots.length) {
      picker.hidden = true;
      picker.classList.add("d-none");
      buttons.replaceChildren();
      return;
    }

    fragment = document.createDocumentFragment();
    selectableMeta.startSlots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-sm btn-outline-primary booking-slot-picker__button";
      if (raw.time === slot) {
        button.classList.add("active");
      }
      button.dataset.slotTime = slot;
      button.textContent = slot;
      button.setAttribute("aria-label", "Поставить время " + slot);
      fragment.appendChild(button);
    });

    buttons.replaceChildren(fragment);
    picker.hidden = false;
    picker.classList.remove("d-none");
  }

  function setPaymentGroupVisibility(groupId, isVisible) {
    var group = getInput(groupId);
    group.hidden = !isVisible;
    group.classList.toggle("d-none", !isVisible);
  }

  function updatePaymentFieldVisibility(raw) {
    var paymentType = normalizePaymentType(raw.paymentType);
    var singlePriceInput = getInput("booking-single-price");
    var subscriptionInput = getInput("booking-subscription-remaining");

    if (paymentType === "single") {
      setPaymentGroupVisibility("booking-single-price-group", true);
      setPaymentGroupVisibility("booking-subscription-remaining-group", false);
      subscriptionInput.value = "";
      return;
    }

    if (paymentType === "subscription") {
      setPaymentGroupVisibility("booking-single-price-group", false);
      setPaymentGroupVisibility("booking-subscription-remaining-group", true);
      singlePriceInput.value = "";
      return;
    }

    setPaymentGroupVisibility("booking-single-price-group", false);
    setPaymentGroupVisibility("booking-subscription-remaining-group", false);
    singlePriceInput.value = "";
    subscriptionInput.value = "";
  }

  function collectFormData() {
    var serviceControlValue = getInput("booking-service-id").value;
    var raw = {
      id: getInput("booking-id").value || null,
      date: getInput("booking-date").value,
      time: getInput("booking-time").value,
      duration: getInput("booking-duration").value,
      serviceId: "",
      serviceType: "",
      clientName: getInput("booking-client-name").value,
      trainerId: getInput("booking-trainer-id").value,
      horseId: getInput("booking-horse-id").value,
      groomId: getInput("booking-groom-id").value,
      arenaId: getInput("booking-arena-id").value,
      notes: getInput("booking-notes").value,
      paymentType: getInput("booking-payment-type").value,
      paymentStatus: getInput("booking-payment-status").value,
      singlePrice: getInput("booking-single-price").value,
      subscriptionRemaining: getInput("booking-subscription-remaining").value,
      bitrixDealUrl: getInput("booking-bitrix-deal-url").value,
      bitrixDealLabel: getInput("booking-bitrix-deal-label").value
    };

    if (isServiceCatalogEnabled()) {
      raw.serviceId = serviceControlValue;
    } else {
      raw.serviceType = serviceControlValue;
    }

    return raw;
  }

  function normalizeFormData(raw, nextStatus) {
    var bitrixFields = getNormalizedBitrixFields(raw.bitrixDealUrl, raw.bitrixDealLabel);
    var paymentType = normalizePaymentType(raw.paymentType);
    var normalized = {
      id: raw.id || undefined,
      date: raw.date,
      time: raw.time,
      duration: Number(raw.duration),
      serviceId: null,
      serviceName: null,
      serviceDuration: null,
      serviceRequiresGroom: false,
      serviceType: normalizeServiceTypeValue(raw.serviceType),
      clientName: trimValue(raw.clientName),
      trainerId: raw.trainerId,
      horseId: raw.horseId || null,
      groomId: raw.groomId || null,
      arenaId: raw.arenaId,
      status: nextStatus,
      notes: trimValue(raw.notes),
      paymentType: paymentType,
      paymentStatus: normalizePaymentStatus(raw.paymentStatus),
      singlePrice: normalizeSinglePrice(raw.singlePrice, paymentType),
      subscriptionRemaining: normalizeSubscriptionRemaining(raw.subscriptionRemaining, paymentType),
      bitrixDealUrl: bitrixFields.bitrixDealUrl,
      bitrixDealLabel: bitrixFields.bitrixDealLabel
    };
    var service = null;

    if (isServiceCatalogEnabled()) {
      service = raw.serviceId ? KSK.Data.getServiceById(raw.serviceId) : null;
      if (service) {
        normalized.serviceId = String(service.id);
        normalized.serviceName = service.name;
        normalized.serviceDuration = Number(service.duration);
        normalized.serviceRequiresGroom = Boolean(service.requiresGroom);
        normalized.serviceType = normalizeServiceTypeValue(service.legacyServiceType);
        normalized.duration = Number(service.duration);
      }

      return normalized;
    }

    if (!hasLegacyPairChanged(raw) && state.originalBookingSnapshot && state.originalBookingSnapshot.serviceId) {
      copyServiceSnapshot(normalized, state.originalBookingSnapshot);
      normalized.duration = state.originalBookingSnapshot.serviceDuration || normalized.duration;
      normalized.serviceType = normalizeServiceTypeValue(state.originalBookingSnapshot.serviceType) || normalized.serviceType;
      return normalized;
    }

    service = KSK.Data.getDefaultServiceForLegacyShape(raw.serviceType, raw.duration);
    if (service) {
      normalized.serviceId = String(service.id);
      normalized.serviceName = service.name;
      normalized.serviceDuration = Number(service.duration);
      normalized.serviceRequiresGroom = Boolean(service.requiresGroom);
      normalized.serviceType = normalizeServiceTypeValue(service.legacyServiceType) || normalized.serviceType;
      normalized.duration = Number(service.duration);
    }

    return normalized;
  }

  function getHardValidation(raw, effectiveStatus) {
    var invalidFieldIds = [];
    var generalInvalidFieldIds = [];
    var duration = Number(raw.duration);
    var start = Utils.parseTimeToMinutes(raw.time);
    var end = start + duration;
    var bitrixUrlState = getBitrixUrlState(raw.bitrixDealUrl);
    var paymentType = normalizePaymentType(raw.paymentType);
    var singlePrice = trimValue(raw.singlePrice);
    var subscriptionRemaining = trimValue(raw.subscriptionRemaining);
    var trainerScheduleEnabled = KSK.App && typeof KSK.App.isTrainerScheduleEnabled === "function" && KSK.App.isTrainerScheduleEnabled();
    var service = getSelectedService(raw);
    var normalized = normalizeFormData(raw, resolveEffectiveStatus(effectiveStatus));
    var availability = {
      isChecked: false,
      isAvailable: true,
      reason: null,
      label: "",
      message: "",
      severity: null
    };
    var hasGroomError = false;

    function markGeneralInvalid(fieldId) {
      invalidFieldIds.push(fieldId);
      generalInvalidFieldIds.push(fieldId);
    }

    ["booking-date", "booking-time", "booking-duration", "booking-service-id", "booking-client-name", "booking-trainer-id", "booking-arena-id"].forEach(function (fieldId) {
      var field = getInput(fieldId);
      var value = field.value;
      if (!value || (fieldId === "booking-client-name" && !trimValue(value))) {
        markGeneralInvalid(fieldId);
      }
    });

    if (raw.time && !isQuarterTime(raw.time)) {
      markGeneralInvalid("booking-time");
    }

    if (raw.duration && duration !== 30 && duration !== 45) {
      markGeneralInvalid("booking-duration");
    }

    if (isServiceCatalogEnabled()) {
      if (!raw.serviceId || !service) {
        markGeneralInvalid("booking-service-id");
      }

      if (service && duration !== Number(service.duration)) {
        invalidFieldIds.push("booking-duration", "booking-service-id");
      }

      if (
        service
        && normalized.serviceDuration !== null
        && Number(normalized.duration) !== Number(normalized.serviceDuration)
      ) {
        invalidFieldIds.push("booking-duration", "booking-service-id");
      }
    }

    if (!Number.isNaN(start) && (start < Utils.DAY_START || end > Utils.DAY_END)) {
      markGeneralInvalid("booking-time");
      markGeneralInvalid("booking-duration");
    }

    if (!bitrixUrlState.isEmpty && !bitrixUrlState.isValid) {
      invalidFieldIds.push("booking-bitrix-deal-url");
    }

    if (paymentType === "single" && singlePrice) {
      if (!(Number(singlePrice) > 0)) {
        invalidFieldIds.push("booking-single-price");
      }
    }

    if (paymentType === "subscription" && subscriptionRemaining) {
      if (!(Number.isInteger(Number(subscriptionRemaining)) && Number(subscriptionRemaining) >= 0)) {
        invalidFieldIds.push("booking-subscription-remaining");
      }
    }

    if (
      trainerScheduleEnabled
      && raw.date
      && raw.time
      && raw.duration
      && raw.trainerId
      && isQuarterTime(raw.time)
      && (duration === 30 || duration === 45)
      && !Number.isNaN(start)
      && start >= Utils.DAY_START
      && end <= Utils.DAY_END
    ) {
      var availabilityResult = KSK.Data.checkTrainerAvailability(raw.trainerId, raw.date, raw.time, raw.duration);
      availability = {
        isChecked: true,
        isAvailable: availabilityResult.isAvailable,
        reason: availabilityResult.reason,
        label: availabilityResult.label,
        message: getTrainerAvailabilityMessage(availabilityResult),
        severity: availabilityResult.reason === "off"
          ? "warning"
          : (availabilityResult.reason === "outside_shift" ? "danger" : null)
      };

      if (availabilityResult.reason === "outside_shift") {
        invalidFieldIds.push("booking-trainer-id", "booking-time", "booking-duration");
      }
    }

    if (normalized.serviceRequiresGroom && !normalized.groomId) {
      invalidFieldIds.push("booking-groom-id");
      hasGroomError = true;
    }

    invalidFieldIds = Array.from(new Set(invalidFieldIds));
    return {
      isValid: invalidFieldIds.length === 0,
      invalidFieldIds: invalidFieldIds,
      hasGeneralErrors: Array.from(new Set(generalInvalidFieldIds)).length > 0,
      hasGroomError: hasGroomError,
      hasBitrixUrlError: !bitrixUrlState.isEmpty && !bitrixUrlState.isValid,
      hasSinglePriceError: invalidFieldIds.indexOf("booking-single-price") !== -1,
      hasSubscriptionRemainingError: invalidFieldIds.indexOf("booking-subscription-remaining") !== -1,
      availability: availability
    };
  }

  function renderValidation(raw, effectiveStatus) {
    var resolvedStatus = resolveEffectiveStatus(effectiveStatus);
    var validation = getHardValidation(raw, resolvedStatus);
    var conflictsContainer = elements["booking-conflicts"];
    var fragment = document.createDocumentFragment();
    clearFieldStates();

    validation.invalidFieldIds.forEach(function (fieldId) {
      getInput(fieldId).classList.add("is-invalid");
    });

    if (validation.hasBitrixUrlError) {
      fragment.appendChild(createAlert("Ссылка Bitrix24 должна начинаться с http:// или https://", "danger"));
    }

    if (validation.hasSinglePriceError) {
      fragment.appendChild(createAlert("Стоимость должна быть числом больше 0", "danger"));
    }

    if (validation.hasSubscriptionRemainingError) {
      fragment.appendChild(createAlert("Остаток абонемента должен быть целым числом 0 или больше", "danger"));
    }

    if (validation.hasGeneralErrors) {
      fragment.appendChild(createAlert("Заполните обязательные поля и проверьте время занятия", "danger"));
    }

    if (validation.hasGroomError) {
      fragment.appendChild(createAlert("Для выбранной услуги нужно назначить коновода", "danger"));
    }

    if (validation.availability.message) {
      fragment.appendChild(createAlert(validation.availability.message, validation.availability.severity));
    }

    if (validation.isValid) {
      var probe = normalizeFormData(raw, resolvedStatus);
      var conflicts = KSK.Conflicts.checkConflicts(probe, KSK.Data.getBookings());
      conflicts.forEach(function (conflict) {
        var fieldId = fieldToConflictMap[conflict.type];
        if (fieldId) {
          getInput(fieldId).classList.add(conflict.severity === "danger" ? "border-danger" : "border-warning");
        }
        fragment.appendChild(createAlert(conflict.message, conflict.severity));
      });
    }

    conflictsContainer.replaceChildren(fragment);
    return validation;
  }

  function populateTimeOptions() {
    var options = [optionHtml("", "Выберите время")];
    var minute;
    for (minute = Utils.DAY_START; minute <= 1215; minute += 15) {
      options.push(optionHtml(Utils.formatTime(minute), Utils.formatTime(minute)));
    }
    setOptions(getInput("booking-time"), options);
  }

  function populateDurationOptions(raw) {
    var durationSelect = getInput("booking-duration");
    var service = getSelectedService(raw);

    if (isServiceCatalogEnabled()) {
      if (!service) {
        setOptions(durationSelect, [optionHtml("", "Выберите услугу")]);
        durationSelect.disabled = true;
        return;
      }

      setOptions(durationSelect, [optionHtml(String(service.duration), String(service.duration) + " минут")]);
      durationSelect.disabled = true;
      return;
    }

    setOptions(durationSelect, [
      optionHtml("", "Выберите длительность"),
      optionHtml("30", "30 минут"),
      optionHtml("45", "45 минут")
    ]);
    durationSelect.disabled = false;
  }

  function populateServiceOptions(raw) {
    var select = getInput("booking-service-id");
    var options;
    var serviceNameCounts = {};

    syncServiceFieldCaption();

    if (isServiceCatalogEnabled()) {
      KSK.Data.getServices().forEach(function (service) {
        serviceNameCounts[service.name] = (serviceNameCounts[service.name] || 0) + 1;
      });

      options = [optionHtml("", "Выберите услугу")].concat(KSK.Data.getServices().map(function (service) {
        var label = serviceNameCounts[service.name] > 1
          ? service.name + " · ID " + service.id
          : service.name;
        return optionHtml(String(service.id), label);
      }));

      setOptions(select, options);
      if (raw && raw.serviceId) {
        select.value = String(raw.serviceId);
      }
      return;
    }

    setOptions(select, [
      optionHtml("", "Выберите тип"),
      optionHtml("training", "Обучение"),
      optionHtml("rental", "Аренда")
    ]);
    if (raw && raw.serviceType) {
      select.value = raw.serviceType;
    }
  }

  function populateLookupOptions() {
    var trainers = KSK.Data.getTrainers();
    var horses = KSK.Data.getHorses();
    var grooms = KSK.Data.getGrooms();
    var arenas = KSK.Data.getArenas();

    setOptions(getInput("booking-trainer-id"), [optionHtml("", "Выберите тренера")].concat(trainers.map(function (trainer) {
      return optionHtml(trainer.id, trainer.name);
    })));

    setOptions(getInput("booking-horse-id"), [optionHtml("", "Без лошади")].concat(horses.map(function (horse) {
      return optionHtml(horse.id, horse.name);
    })));

    setOptions(getInput("booking-groom-id"), [optionHtml("", "Не назначен")].concat(grooms.map(function (groom) {
      return optionHtml(groom.id, groom.name);
    })));

    setOptions(getInput("booking-arena-id"), [optionHtml("", "Выберите площадку")].concat(arenas.map(function (arena) {
      return optionHtml(arena.id, arena.name);
    })));
  }

  function populateTrainerOptions(raw) {
    var select = getInput("booking-trainer-id");
    var selectedValue = select.value;
    var trainers = KSK.Data.getTrainers();
    var enabled = KSK.App && typeof KSK.App.isTrainerScheduleEnabled === "function" && KSK.App.isTrainerScheduleEnabled();
    var bookingsForDate = null;
    var options;

    if (enabled && raw && raw.date) {
      bookingsForDate = KSK.Data.getBookings(raw.date).filter(function (booking) {
        return booking.id !== raw.id;
      });
    }

    options = [optionHtml("", "Выберите тренера")].concat(trainers.map(function (trainer) {
      var label = trainer.name;

      if (enabled && raw && raw.date) {
        label = formatTrainerOptionLabel(
          trainer,
          KSK.Data.getTrainerSelectableHourSlots(trainer.id, raw.date, bookingsForDate)
        );
      }

      return optionHtml(trainer.id, label);
    }));

    setOptions(select, options);
    select.value = trainers.some(function (trainer) {
      return trainer.id === selectedValue;
    }) ? selectedValue : "";
  }

  function updateButtons(mode, status) {
    var saveDraft = elements["booking-save-draft-btn"];
    var confirmButton = elements["booking-confirm-btn"];
    var saveButton = elements["booking-save-btn"];
    var completeButton = elements["booking-complete-btn"];
    var restoreButton = elements["booking-restore-btn"];
    var cancelButton = elements["booking-cancel-btn"];
    var deleteButton = elements["booking-delete-btn"];

    [saveDraft, confirmButton, saveButton, completeButton, cancelButton, restoreButton, deleteButton].forEach(function (button) {
      button.classList.add("d-none");
    });

    if (mode === "new") {
      saveDraft.classList.remove("d-none");
      confirmButton.classList.remove("d-none");
      return;
    }

    deleteButton.classList.remove("d-none");

    if (status === "draft") {
      saveButton.classList.remove("d-none");
      confirmButton.classList.remove("d-none");
      cancelButton.classList.remove("d-none");
    } else if (status === "confirmed") {
      saveButton.classList.remove("d-none");
      completeButton.classList.remove("d-none");
      cancelButton.classList.remove("d-none");
    } else if (status === "completed") {
      saveButton.classList.remove("d-none");
      cancelButton.classList.remove("d-none");
    } else if (status === "cancelled") {
      restoreButton.classList.remove("d-none");
      deleteButton.classList.remove("d-none");
    }
  }

  function setModalState(mode, booking) {
    state.mode = mode;
    state.bookingId = booking && booking.id ? booking.id : null;
    state.currentStatus = booking && booking.status ? booking.status : null;
    elements["booking-modal-title"].textContent = mode === "new" ? "Новое занятие" : "Редактирование занятия";
    elements["booking-modal-subtitle"].textContent = booking ? formatModalSubtitle(booking) : "";
    updateButtons(mode, state.currentStatus);
  }

  function showModal() {
    if (!modalInstance) {
      modalInstance = bootstrap.Modal.getOrCreateInstance(elements["booking-modal"]);
    }
    modalInstance.show();
  }

  function hideModal() {
    if (!modalInstance) {
      modalInstance = bootstrap.Modal.getOrCreateInstance(elements["booking-modal"]);
    }
    modalInstance.hide();
  }

  function getDefaultNewBookingArenaId() {
    var arenas = KSK.Data.getArenas();
    var arena = arenas.find(function (item) {
      return item.name === "Большой манеж";
    });
    return arena ? arena.id : "";
  }

  function getPrefillValue(prefill, key, fallback) {
    return prefill && Object.prototype.hasOwnProperty.call(prefill, key)
      ? prefill[key]
      : fallback;
  }

  KSK.Booking = {
    init: function () {
      [
        "booking-modal",
        "booking-modal-title",
        "booking-modal-subtitle",
        "booking-form",
        "booking-id",
        "booking-date",
        "booking-time",
        "booking-duration",
        "booking-service-label",
        "booking-service-id",
        "booking-client-name",
        "booking-trainer-id",
        "booking-trainer-availability",
        "booking-trainer-slot-picker",
        "booking-trainer-slot-buttons",
        "booking-horse-id",
        "booking-horse-availability",
        "booking-horse-slot-picker",
        "booking-horse-slot-buttons",
        "booking-groom-id",
        "booking-arena-id",
        "booking-notes",
        "booking-payment-type",
        "booking-payment-status",
        "booking-single-price-group",
        "booking-single-price",
        "booking-subscription-remaining-group",
        "booking-subscription-remaining",
        "booking-bitrix-deal-url",
        "booking-bitrix-deal-label",
        "booking-bitrix-deal-link",
        "booking-conflicts",
        "booking-save-draft-btn",
        "booking-confirm-btn",
        "booking-save-btn",
        "booking-complete-btn",
        "booking-restore-btn",
        "booking-cancel-btn",
        "booking-delete-btn"
      ].forEach(function (id) {
        elements[id] = document.getElementById(id);
      });

      modalInstance = bootstrap.Modal.getOrCreateInstance(elements["booking-modal"]);

      elements["booking-form"].addEventListener("submit", function (event) {
        event.preventDefault();
      });

      elements["booking-trainer-slot-buttons"].addEventListener("click", function (event) {
        var button = event.target.closest("button[data-slot-time]");

        if (!button) {
          return;
        }

        getInput("booking-time").value = button.dataset.slotTime;
        getInput("booking-time").dispatchEvent(new Event("change", { bubbles: true }));
      });

      elements["booking-horse-slot-buttons"].addEventListener("click", function (event) {
        var button = event.target.closest("button[data-slot-time]");

        if (!button) {
          return;
        }

        getInput("booking-time").value = button.dataset.slotTime;
        getInput("booking-time").dispatchEvent(new Event("change", { bubbles: true }));
      });

      getAllFormFields().forEach(function (field) {
        var eventName = field.tagName === "INPUT" || field.tagName === "TEXTAREA" ? "input" : "change";
        var handler = function () {
          var raw = collectFormData();

          if (field.id === "booking-payment-type") {
            updatePaymentFieldVisibility(raw);
            raw = collectFormData();
          }

          if (field.id === "booking-service-id") {
            raw = syncServiceSelection(raw);
            populateHorseOptions(raw);
            raw = collectFormData();
          }

          if (field.id === "booking-date") {
            populateTrainerOptions(raw);
            populateHorseOptions(raw);
            raw = collectFormData();
          }

          if (field.id === "booking-date" || field.id === "booking-trainer-id" || field.id === "booking-time") {
            renderTrainerSlotPicker(raw);
            raw = collectFormData();
          }

          if (field.id === "booking-duration" && !isServiceCatalogEnabled()) {
            populateHorseOptions(raw);
            raw = collectFormData();
          }

          if (
            field.id === "booking-date"
            || field.id === "booking-time"
            || field.id === "booking-horse-id"
            || field.id === "booking-service-id"
            || (!isServiceCatalogEnabled() && field.id === "booking-duration")
          ) {
            renderHorseSlotPicker(raw);
            raw = collectFormData();
          }

          updateBitrixDealLink(raw);
          renderTrainerAvailabilityHint(raw);
          renderHorseAvailabilityHint(raw);
          KSK.Booking._validateForm();
          elements["booking-modal-subtitle"].textContent = formatModalSubtitle(collectFormData());
        };

        field.addEventListener(eventName, handler);
        if (eventName !== "change") {
          field.addEventListener("change", handler);
        }
      });

      elements["booking-save-draft-btn"].addEventListener("click", function () {
        KSK.Booking._save("draft");
      });
      elements["booking-confirm-btn"].addEventListener("click", function () {
        KSK.Booking._save("confirmed");
      });
      elements["booking-save-btn"].addEventListener("click", function () {
        KSK.Booking._save(state.currentStatus);
      });
      elements["booking-complete-btn"].addEventListener("click", function () {
        KSK.Booking._save("completed");
      });
      elements["booking-restore-btn"].addEventListener("click", function () {
        KSK.Booking._save("confirmed");
      });
      elements["booking-cancel-btn"].addEventListener("click", function () {
        KSK.Booking._save("cancelled");
      });
      elements["booking-delete-btn"].addEventListener("click", function () {
        if (state.bookingId) {
          KSK.Booking._delete(state.bookingId);
        }
      });
    },

    openNew: function (prefill) {
      var catalogEnabled = isServiceCatalogEnabled();
      var fallbackService = null;
      var prefillService = null;
      var draft = {
        date: getPrefillValue(prefill, "date", KSK.App.state.currentDate),
        time: getPrefillValue(prefill, "time", ""),
        duration: "",
        serviceId: "",
        serviceType: "",
        clientName: "",
        trainerId: "",
        horseId: "",
        groomId: "",
        arenaId: getPrefillValue(prefill, "arenaId", getDefaultNewBookingArenaId()),
        notes: "",
        paymentType: "",
        paymentStatus: "",
        singlePrice: "",
        subscriptionRemaining: "",
        bitrixDealUrl: "",
        bitrixDealLabel: "",
        status: null
      };

      state.originalBookingSnapshot = null;

      if (prefill && prefill.serviceId) {
        prefillService = KSK.Data.getServiceById(prefill.serviceId);
      } else if (prefill && prefill.serviceType && prefill.duration) {
        prefillService = KSK.Data.getDefaultServiceForLegacyShape(prefill.serviceType, prefill.duration);
      }

      if (prefill && prefill.resourceType === "trainers") {
        draft.trainerId = prefill.resourceId || prefill.trainerId || "";
      }
      if (prefill && prefill.resourceType === "horses") {
        draft.horseId = prefill.resourceId || prefill.horseId || "";
      }

      if (catalogEnabled) {
        fallbackService = prefillService || getDefaultCatalogService();
        if (fallbackService) {
          draft.serviceId = String(fallbackService.id);
          draft.serviceType = normalizeServiceTypeValue(fallbackService.legacyServiceType) || "";
          draft.duration = String(fallbackService.duration);
        }
      } else {
        if (prefillService) {
          draft.serviceType = normalizeServiceTypeValue(prefillService.legacyServiceType) || "training";
          draft.duration = String(prefillService.duration);
        } else {
          draft.serviceType = getPrefillValue(prefill, "serviceType", "training");
          draft.duration = String(getPrefillValue(prefill, "duration", 45));
        }
      }

      setModalState("new", draft);
      this._populateForm(draft);
      showModal();
    },

    openEdit: function (bookingId) {
      var booking = KSK.Data.getBookingById(bookingId);
      if (!booking) {
        this.showToast("Занятие не найдено", "danger");
        return;
      }
      state.originalBookingSnapshot = Utils.deepClone(booking);
      setModalState("edit", booking);
      this._populateForm(booking);
      showModal();
    },

    _save: function (status) {
      var raw = collectFormData();
      var nextStatus = status || state.currentStatus || "draft";
      var previousStatus = state.currentStatus;
      var validation = this._validateForm(nextStatus);
      if (!validation.isValid) {
        return;
      }

      var booking = normalizeFormData(raw, nextStatus);
      var saved = KSK.Data.saveBooking(booking);
      state.bookingId = saved.id;
      state.currentStatus = saved.status;
      hideModal();
      if (saved.status === "cancelled") {
        this.showToast("Занятие отменено", "danger");
      } else if (previousStatus === "cancelled" && saved.status === "confirmed") {
        this.showToast("Занятие восстановлено", "success");
      } else {
        this.showToast("Занятие сохранено", "success");
      }
      KSK.App.refresh();
    },

    _delete: function (bookingId) {
      if (!window.confirm("Удалить занятие без возможности восстановления?")) {
        return;
      }
      KSK.Data.deleteBooking(bookingId);
      hideModal();
      this.showToast("Занятие удалено", "danger");
      KSK.App.refresh();
    },

    _validateForm: function (effectiveStatus) {
      return renderValidation(collectFormData(), resolveEffectiveStatus(effectiveStatus || state.currentStatus));
    },

    _populateForm: function (booking) {
      populateTimeOptions();
      populateDurationOptions(booking);
      populateServiceOptions(booking);
      populateLookupOptions();

      getInput("booking-id").value = booking.id || "";
      getInput("booking-date").value = booking.date || "";
      getInput("booking-time").value = booking.time || "";
      getInput("booking-duration").value = booking.duration ? String(booking.duration) : "";
      getInput("booking-service-id").value = isServiceCatalogEnabled()
        ? (booking.serviceId ? String(booking.serviceId) : "")
        : (booking.serviceType || "");
      getInput("booking-client-name").value = booking.clientName || "";
      getInput("booking-trainer-id").value = booking.trainerId || "";
      getInput("booking-horse-id").value = booking.horseId || "";
      getInput("booking-groom-id").value = booking.groomId || "";
      getInput("booking-arena-id").value = booking.arenaId || "";
      getInput("booking-notes").value = booking.notes || "";
      getInput("booking-payment-type").value = booking.paymentType || "";
      getInput("booking-payment-status").value = booking.paymentStatus || "";
      getInput("booking-single-price").value = booking.singlePrice === null || booking.singlePrice === undefined ? "" : String(booking.singlePrice);
      getInput("booking-subscription-remaining").value = booking.subscriptionRemaining === null || booking.subscriptionRemaining === undefined ? "" : String(booking.subscriptionRemaining);
      getInput("booking-bitrix-deal-url").value = booking.bitrixDealUrl || "";
      getInput("booking-bitrix-deal-label").value = booking.bitrixDealLabel || "";
      syncServiceSelection(collectFormData());
      populateTrainerOptions(collectFormData());
      populateHorseOptions(collectFormData());
      renderTrainerSlotPicker(collectFormData());
      renderHorseAvailabilityHint(collectFormData());
      renderHorseSlotPicker(collectFormData());

      updatePaymentFieldVisibility(booking);
      elements["booking-modal-subtitle"].textContent = formatModalSubtitle(booking);
      updateBitrixDealLink(booking);
      renderTrainerAvailabilityHint(collectFormData());
      this._validateForm();
      updateButtons(state.mode, state.currentStatus);
    },

    showToast: function (message, tone) {
      var container = document.getElementById("toast-container");
      var toastEl = document.createElement("div");
      toastEl.className = "toast align-items-center border-0 text-bg-" + (tone === "danger" ? "danger" : "success");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      toastEl.setAttribute("aria-atomic", "true");
      toastEl.innerHTML = '<div class="d-flex"><div class="toast-body">' + message + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Закрыть"></button></div>';
      container.appendChild(toastEl);
      var toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2500 });
      toastEl.addEventListener("hidden.bs.toast", function () {
        toastEl.remove();
      }, { once: true });
      toast.show();
    }
  };
})();
