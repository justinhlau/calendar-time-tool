const calendarGrid = document.querySelector("#calendarGrid");
const startDateInput = document.querySelector("#startDate");
const stepInput = document.querySelector("#stepMinutes");
const timezoneInput = document.querySelector("#timezoneSelect");
const dayStartInput = document.querySelector("#dayStart");
const dayEndInput = document.querySelector("#dayEnd");
const joinerInput = document.querySelector("#rangeJoiner");
const weekRange = document.querySelector("#weekRange");
const outputText = document.querySelector("#outputText");
const copyBuffer = document.querySelector("#copyBuffer");
const copyOutput = document.querySelector("#copyOutput");
const clearSelection = document.querySelector("#clearSelection");
const prevWeek = document.querySelector("#prevWeek");
const todayWeek = document.querySelector("#todayWeek");
const nextWeek = document.querySelector("#nextWeek");

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const weekdayNames = ["Sun", "Mon", "Tues", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let plainOutputText = "";
const today = startOfLocalDay(new Date());

const state = {
  selectedDate: today,
  weekStart: startOfWeek(today),
  stepMinutes: 30,
  visibleStart: 8 * 60,
  visibleEnd: 18 * 60,
  selected: new Set(),
  drag: null,
};

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const weekStart = startOfLocalDay(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inputValueToDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function minutesToClock(totalMinutes) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const suffix = hours24 >= 12 ? "p" : "a";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

function formatOutputDay(date) {
  return `${weekdayNames[date.getDay()]} ${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function slotKey(dayIndex, minutes) {
  return `${dayIndex}-${minutes}`;
}

function parseSlotKey(key) {
  const [dayIndex, minutes] = key.split("-").map(Number);
  return { dayIndex, minutes };
}

function setupHourSelects() {
  const options = [];
  for (let minutes = 0; minutes <= 24 * 60; minutes += 60) {
    options.push(`<option value="${minutes}">${minutesToClock(minutes % (24 * 60))}</option>`);
  }

  dayStartInput.innerHTML = options.slice(0, -1).join("");
  dayEndInput.innerHTML = options.slice(1).join("");
  dayStartInput.value = String(state.visibleStart);
  dayEndInput.value = String(state.visibleEnd);
}

function getWeekDates() {
  return Array.from({ length: 7 }, (_, index) => addDays(state.weekStart, index));
}

function renderCalendar() {
  startDateInput.value = dateToInputValue(state.selectedDate);

  const dates = getWeekDates();
  weekRange.textContent = `${monthDayFormatter.format(dates[0])} - ${monthDayFormatter.format(dates[6])}`;

  const slots = [];
  for (let minutes = state.visibleStart; minutes < state.visibleEnd; minutes += state.stepMinutes) {
    slots.push(minutes);
  }

  calendarGrid.innerHTML = "";
  calendarGrid.append(createElement("div", "corner"));

  dates.forEach((date) => {
    const header = createElement("div", "day-header");
    const dayName = createElement("strong", "", weekdayNames[date.getDay()]);
    const dateLabel = createElement("span", "", monthDayFormatter.format(date));
    header.append(dayName, dateLabel);
    calendarGrid.append(header);
  });

  slots.forEach((minutes) => {
    const label = createElement(
      "div",
      `time-label${minutes % 60 === 0 ? " hour" : ""}`,
      minutes % 60 === 0 ? minutesToClock(minutes) : "",
    );
    calendarGrid.append(label);

    dates.forEach((_, dayIndex) => {
      const key = slotKey(dayIndex, minutes);
      const button = createElement("button", `time-slot${minutes % 60 === 0 ? " hour-start" : ""}`);
      button.type = "button";
      button.dataset.day = String(dayIndex);
      button.dataset.minutes = String(minutes);
      button.dataset.key = key;
      button.setAttribute("aria-label", `${formatOutputDay(dates[dayIndex])} ${minutesToClock(minutes)}`);
      button.setAttribute("aria-pressed", state.selected.has(key) ? "true" : "false");

      if (state.selected.has(key)) {
        button.classList.add("selected");
      }

      calendarGrid.append(button);
    });
  });

  updateOutput();
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function pruneHiddenSelections() {
  for (const key of [...state.selected]) {
    const { minutes } = parseSlotKey(key);
    if (minutes < state.visibleStart || minutes >= state.visibleEnd || minutes % state.stepMinutes !== 0) {
      state.selected.delete(key);
    }
  }
}

function updateSlotVisual(key) {
  const slot = calendarGrid.querySelector(`[data-key="${key}"]`);
  if (!slot) {
    return;
  }

  const selected = state.selected.has(key);
  slot.classList.toggle("selected", selected);
  slot.setAttribute("aria-pressed", selected ? "true" : "false");

  if (state.drag) {
    const inCurrentRange = state.drag.rangeKeys.has(key);
    slot.classList.toggle("dragging", state.drag.mode === "add" && inCurrentRange);
    slot.classList.toggle("drag-remove", state.drag.mode === "remove" && inCurrentRange);
  } else {
    slot.classList.remove("dragging", "drag-remove");
  }
}

function beginDrag(slot, pointerId) {
  const key = slot.dataset.key;
  const { dayIndex, minutes } = parseSlotKey(key);
  const adding = !state.selected.has(key);
  state.drag = {
    dayIndex,
    anchorMinutes: minutes,
    baseSelected: new Set(state.selected),
    mode: adding ? "add" : "remove",
    pointerId,
    lastKey: null,
    rangeKeys: new Set(),
  };

  slot.setPointerCapture(pointerId);
  applyDragToSlot(slot);
}

function applyDragToSlot(slot) {
  if (!state.drag || !slot?.classList.contains("time-slot")) {
    return;
  }

  const key = slot.dataset.key;
  if (!key || state.drag.lastKey === key) {
    return;
  }

  const end = parseSlotKey(key);
  if (end.dayIndex !== state.drag.dayIndex) {
    return;
  }

  const nextRangeKeys = new Set(keysBetween(state.drag.dayIndex, state.drag.anchorMinutes, end.minutes));
  const affectedKeys = new Set([...state.drag.rangeKeys, ...nextRangeKeys]);

  affectedKeys.forEach((nextKey) => {
    const inRange = nextRangeKeys.has(nextKey);
    const selected =
      state.drag.mode === "add"
        ? state.drag.baseSelected.has(nextKey) || inRange
        : state.drag.baseSelected.has(nextKey) && !inRange;

    if (selected) {
      state.selected.add(nextKey);
      return;
    }

    state.selected.delete(nextKey);
  });

  state.drag.rangeKeys = nextRangeKeys;
  state.drag.lastKey = key;
  affectedKeys.forEach(updateSlotVisual);
  updateOutput();
}

function keysBetween(dayIndex, firstMinutes, lastMinutes) {
  const start = Math.min(firstMinutes, lastMinutes);
  const end = Math.max(firstMinutes, lastMinutes);
  const keys = [];

  for (let minutes = start; minutes <= end; minutes += state.stepMinutes) {
    keys.push(slotKey(dayIndex, minutes));
  }

  return keys;
}

function endDrag() {
  if (!state.drag) {
    return;
  }

  const rangeKeys = [...state.drag.rangeKeys];
  state.drag = null;
  rangeKeys.forEach(updateSlotVisual);
}

function slotFromPointerEvent(event) {
  if (state.drag) {
    return slotFromDragY(event.clientY);
  }

  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element?.closest?.(".time-slot");
}

function slotFromDragY(clientY) {
  const slots = [
    ...calendarGrid.querySelectorAll(`.time-slot[data-day="${state.drag.dayIndex}"]`),
  ];

  if (!slots.length) {
    return null;
  }

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    if (clientY <= rect.bottom) {
      return slot;
    }
  }

  return slots[slots.length - 1];
}

function updateOutput() {
  const dates = getWeekDates();
  const rangesByDay = Array.from({ length: 7 }, () => []);

  for (const key of state.selected) {
    const { dayIndex, minutes } = parseSlotKey(key);
    if (dayIndex >= 0 && dayIndex < 7) {
      rangesByDay[dayIndex].push(minutes);
    }
  }

  const joiner = ` ${joinerInput.value} `;
  const dayLines = rangesByDay
    .map((minutes, dayIndex) => {
      if (!minutes.length) {
        return "";
      }

      const ranges = mergeMinutes(minutes).map(
        ([start, end]) => `${minutesToClock(start)} - ${minutesToClock(end)}`,
      );

      return `${formatOutputDay(dates[dayIndex])}: ${ranges.join(joiner)}`;
    })
    .filter(Boolean);

  outputText.replaceChildren();

  if (!dayLines.length) {
    plainOutputText = "";
    return;
  }

  const timezoneLine = `In ${timezoneInput.value}:`;
  plainOutputText = [timezoneLine, ...dayLines].join("\n");

  outputText.append(
    createElement("div", "timezone-output-line", timezoneLine),
    createElement("div", "output-days", dayLines.join("\n")),
  );
}

function mergeMinutes(minutes) {
  const sorted = [...new Set(minutes)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === previous + state.stepMinutes) {
      previous = current;
      continue;
    }

    ranges.push([start, previous + state.stepMinutes]);
    start = current;
    previous = current;
  }

  ranges.push([start, previous + state.stepMinutes]);
  return ranges;
}

function shiftWeek(days) {
  state.selectedDate = addDays(state.selectedDate, days);
  state.weekStart = addDays(state.weekStart, days);
  renderCalendar();
}

function goToToday() {
  state.selectedDate = startOfLocalDay(new Date());
  state.weekStart = startOfWeek(state.selectedDate);
  renderCalendar();
}

function fallbackCopy() {
  copyBuffer.value = plainOutputText;
  copyBuffer.focus();
  copyBuffer.select();
  document.execCommand("copy");
  copyBuffer.setSelectionRange(0, 0);
}

function handleVisibleHoursChange() {
  const nextStart = Number(dayStartInput.value);
  const nextEnd = Number(dayEndInput.value);

  if (nextStart >= nextEnd) {
    if (document.activeElement === dayStartInput) {
      dayEndInput.value = String(Math.min(nextStart + 60, 24 * 60));
    } else {
      dayStartInput.value = String(Math.max(nextEnd - 60, 0));
    }
  }

  state.visibleStart = Number(dayStartInput.value);
  state.visibleEnd = Number(dayEndInput.value);
  pruneHiddenSelections();
  renderCalendar();
}

calendarGrid.addEventListener("pointerdown", (event) => {
  const slot = event.target.closest(".time-slot");
  if (!slot) {
    return;
  }

  event.preventDefault();
  beginDrag(slot, event.pointerId);
});

calendarGrid.addEventListener("pointermove", (event) => {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  event.preventDefault();
  applyDragToSlot(slotFromPointerEvent(event));
});

calendarGrid.addEventListener("pointerup", (event) => {
  if (state.drag && event.pointerId === state.drag.pointerId) {
    endDrag();
  }
});

calendarGrid.addEventListener("pointercancel", endDrag);
calendarGrid.addEventListener("lostpointercapture", endDrag);

calendarGrid.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") {
    return;
  }

  const slot = event.target.closest(".time-slot");
  if (!slot) {
    return;
  }

  event.preventDefault();
  const key = slot.dataset.key;
  if (state.selected.has(key)) {
    state.selected.delete(key);
  } else {
    state.selected.add(key);
  }
  updateSlotVisual(key);
  updateOutput();
});

startDateInput.addEventListener("change", () => {
  if (!startDateInput.value) {
    return;
  }

  state.selectedDate = inputValueToDate(startDateInput.value);
  state.weekStart = startOfWeek(state.selectedDate);
  renderCalendar();
});

stepInput.addEventListener("change", () => {
  state.stepMinutes = Number(stepInput.value);
  pruneHiddenSelections();
  renderCalendar();
});

dayStartInput.addEventListener("change", handleVisibleHoursChange);
dayEndInput.addEventListener("change", handleVisibleHoursChange);
joinerInput.addEventListener("change", updateOutput);
timezoneInput.addEventListener("change", updateOutput);
prevWeek.addEventListener("click", () => shiftWeek(-7));
todayWeek.addEventListener("click", goToToday);
nextWeek.addEventListener("click", () => shiftWeek(7));

clearSelection.addEventListener("click", () => {
  state.selected.clear();
  renderCalendar();
});

copyOutput.addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(plainOutputText);
  } catch {
    fallbackCopy();
  }

  copyOutput.textContent = "Copied";
  copyOutput.classList.add("copied");
  window.setTimeout(() => {
    copyOutput.textContent = "Copy";
    copyOutput.classList.remove("copied");
  }, 1100);
});

setupHourSelects();
renderCalendar();
