"use strict";
const storageKey = "jeju-autumn-2026-checklist-v1";
const validChecklistIds = new Set(
  CHECKLIST.flatMap((group) => group.items.map((item) => item[0])),
);
let activeDayId = "before";
let activeMode = "normal";
let activeFoodType = "全部";
let activeFoodArea = "全部";
let toastTimer;
let checkedIds = new Set();

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3500);
}
function mapUrl(query) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
function externalLink(url, label, className = "") {
  return `<a href="${escapeHtml(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}
function sourceLink(sourceId) {
  const source = SOURCES.find((item) => item.id === sourceId);
  return source ? externalLink(source.url, "资料 ↗") : "";
}
const planStorageKey = "jeju-autumn-2026-plan-v1";
function loadPlanSettings() {
  const defaults = {
    dayModes: {},
    foodChoices: {},
    customEvents: [],
  };
  try {
    const saved = JSON.parse(localStorage.getItem(planStorageKey) || "null");
    if (!saved || typeof saved !== "object") return defaults;
    return {
      dayModes:
        saved.dayModes && typeof saved.dayModes === "object"
          ? saved.dayModes
          : {},
      foodChoices:
        saved.foodChoices && typeof saved.foodChoices === "object"
          ? saved.foodChoices
          : {},
      customEvents: Array.isArray(saved.customEvents)
        ? saved.customEvents.filter(validCustomEvent)
        : [],
    };
  } catch {
    return defaults;
  }
}
function validCustomEvent(item) {
  return (
    item &&
    typeof item.id === "string" &&
    /^[a-zA-Z0-9-]{1,80}$/.test(item.id) &&
    typeof item.date === "string" &&
    /^2026-11-(1[3-9]|2[0-4])$/.test(item.date) &&
    typeof item.time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) &&
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    item.title.length <= 100 &&
    typeof item.description === "string" &&
    item.description.length <= 500
  );
}
const planSettings = loadPlanSettings();
let previewInstant = null;
let followsClock = true;
let lastClockEventId = "";
function savePlanSettings() {
  try {
    localStorage.setItem(planStorageKey, JSON.stringify(planSettings));
  } catch {
    showToast("浏览器未允许保存，选择与新增安排仅在本次页面有效。");
  }
}
function viewedInstant() {
  return previewInstant ?? Date.now();
}
function currentEvents(day, useRain = false) {
  return buildDaySchedule(day.id, {
    mode: useRain ? "rain" : "normal",
    customEvents: planSettings.customEvents,
  });
}
function allScheduledEvents() {
  return TRIP_DAYS.flatMap((day) =>
    currentEvents(day, planSettings.dayModes[day.id] === "rain"),
  );
}
function clockPosition() {
  return getTripPosition(viewedInstant(), allScheduledEvents());
}
function formatEventTime(event) {
  if (event.label) return event.label;
  const start = koreaDateTime(event.start),
    end = koreaDateTime(event.end);
  return `${start.time}–${start.date !== end.date ? "次日 " : ""}${end.time}`;
}
function chosenFood(event) {
  const saved = planSettings.foodChoices[event.id];
  const id = event.foodIds.includes(saved) ? saved : event.foodIds[0];
  return FOODS.find((food) => food.id === id);
}
function renderMeal(event) {
  const food = chosenFood(event);
  if (!food)
    return event.mealQuery
      ? `<div class="event-meal"><span class="mini-label">这一餐</span>${externalLink(mapUrl(event.mealQuery), "查找附近热餐 ↗", "map-link")}</div>`
      : "";
  const selector =
    event.foodIds.length > 1
      ? `<label class="meal-picker">餐厅选择<select data-meal-event="${event.id}" aria-label="${escapeHtml(event.title)}的餐厅选择">${event.foodIds
          .map((id) => {
            const option = FOODS.find((item) => item.id === id);
            return `<option value="${id}" ${id === food.id ? "selected" : ""}>${escapeHtml(option.shop)}</option>`;
          })
          .join("")}</select></label>`
      : '<span class="mini-label">餐饮</span>';
  return `<div class="event-meal">${selector}<strong>${escapeHtml(food.name)}</strong><p>${escapeHtml(food.description)}</p><div class="event-meal-links">${externalLink(mapUrl(food.query), "打开地图 ↗", "map-link")}<span>${escapeHtml(food.price)}</span></div><p class="meal-note">${escapeHtml(event.foodNote || food.note)}</p></div>`;
}
function contextualChecks(ids) {
  const items = ids
    .map((id) => ALL_CHECKLIST_ITEMS.find((item) => item[0] === id))
    .filter(Boolean);
  if (!items.length) return "";
  return `<div class="context-checks"><span class="mini-label">出发前确认</span>${items.map(([id, title, description]) => `<label class="context-check"><input type="checkbox" data-check-id="${id}" ${checkedIds.has(id) ? "checked" : ""}><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span></label>`).join("")}</div>`;
}
function shopGallery(shop) {
  if (!shop.photos.length) return "";
  return `<div class="shop-gallery ${shop.photos.length === 1 ? "single-photo" : ""}">${shop.photos.map((photo, index) => `<a class="shop-photo" href="./assets/shops/${photo}.webp" data-shop-photo="${photo}" data-shop-name="${escapeHtml(shop.name)}" aria-label="查看 ${escapeHtml(shop.name)} 第 ${index + 1} 张大图"><img src="./assets/shops/${photo}.webp" alt="用户截图中的 ${escapeHtml(shop.name)} 配图 ${index + 1}" loading="lazy" decoding="async"><span>看大图 ↗</span></a>`).join("")}</div>`;
}
function shopCardHtml(shop, inDialog = false) {
  return `<article class="shop-card" id="${inDialog ? "dialog-shop" : "shop"}-${shop.id}"><span class="mini-label">${escapeHtml(shop.kind)}</span><h4>${escapeHtml(shop.name)}</h4><p>${escapeHtml(shop.description)}</p>${shopGallery(shop)}<p class="shop-note">${escapeHtml(shop.note)}</p>${externalLink(mapUrl(shop.query), "店铺地图 ↗", "map-link")}</article>`;
}
function shopGroupsHtml(groups = SHOP_GROUPS, inDialog = false) {
  const prefix = inDialog ? "dialog-shops" : "shops";
  return groups
    .map(
      (group) =>
        `<section class="shop-area" id="${prefix}-${group.id}" aria-labelledby="${prefix}-heading-${group.id}"><h3 id="${prefix}-heading-${group.id}">${escapeHtml(group.title)}</h3><p class="shop-area-route">${escapeHtml(group.route)}</p><div class="shop-grid">${SHOPS.filter(
          (shop) => shop.group === group.id,
        )
          .map((shop) => shopCardHtml(shop, inDialog))
          .join("")}</div></section>`,
    )
    .join("");
}
function renderShops() {
  document.querySelector("#shop-groups").innerHTML = shopGroupsHtml();
}
const shopDetails = document.querySelector("#shop-details");
let shopDialogOrigin = null;
function openShoppingDialog(hash, trigger = null) {
  if (typeof shopDetails.showModal !== "function") return false;
  const shop = SHOPS.find((item) => hash === `#shop-${item.id}`);
  const group = SHOP_GROUPS.find((item) => hash === `#shops-${item.id}`);
  if (!shop && !group && hash !== "#shops") return false;
  if (!shopDetails.open) shopDialogOrigin = { x: scrollX, y: scrollY, trigger };
  document.querySelector("#shop-details-title").textContent =
    shop?.name || group?.title || "全部小店图文";
  document.querySelector("#shop-details-body").innerHTML = shop
    ? shopCardHtml(shop, true)
    : shopGroupsHtml(group ? [group] : SHOP_GROUPS, true);
  if (!shopDetails.open) shopDetails.showModal();
  shopDetails.scrollTop = 0;
  return true;
}
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#shop"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return;
  if (openShoppingDialog(link.getAttribute("href"), link))
    event.preventDefault();
});
shopDetails
  .querySelector("[data-close-shop-details]")
  .addEventListener("click", () => shopDetails.close());
shopDetails.addEventListener("click", (event) => {
  if (event.target === shopDetails) shopDetails.close();
});
shopDetails.addEventListener("close", () => {
  if (!shopDialogOrigin) return;
  const { x, y, trigger } = shopDialogOrigin;
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  window.scrollTo({ left: x, top: y, behavior: "instant" });
  shopDialogOrigin = null;
});

function renderShopping(event) {
  if (!event.shopIds?.length) return "";
  const shops = event.shopIds
    .map((id) => SHOPS.find((shop) => shop.id === id))
    .filter(Boolean);
  return `<div class="event-shopping"><h5>顺路小店 · 选一家</h5><ul>${shops.map((shop) => `<li><strong>${escapeHtml(shop.name)}</strong><span>${escapeHtml(shop.kind)}</span><a href="#shop-${shop.id}" aria-haspopup="dialog" aria-controls="shop-details">查看详情</a></li>`).join("")}</ul><p>先查营业，顺路再去。</p><a href="#shops" class="map-link" aria-haspopup="dialog" aria-controls="shop-details">全部小店 ↗</a></div>`;
}
const photoViewer = document.querySelector("#photo-viewer");
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-shop-photo]");
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return;
  if (typeof photoViewer.showModal !== "function") return;
  event.preventDefault();
  const image = photoViewer.querySelector("img");
  image.src = link.href;
  image.alt = link.querySelector("img").alt;
  document.querySelector("#photo-viewer-title").textContent =
    link.dataset.shopName;
  photoViewer.showModal();
});
photoViewer
  .querySelector("button")
  .addEventListener("click", () => photoViewer.close());
photoViewer.addEventListener("click", (event) => {
  if (event.target === photoViewer) photoViewer.close();
});

function eventHtml(event, printing = false) {
  const position = clockPosition();
  const isCurrent = position.current?.id === event.id;
  const isNext = !position.current && position.next?.id === event.id;
  const isPast = event.end <= viewedInstant();
  const place = PLACES[event.placeId];
  const alternativePlace = PLACES[event.alternativePlaceId];
  return `<article id="event-${event.id}" tabindex="-1" class="timeline-event ${isCurrent ? "event-current" : ""} ${isNext ? "event-next" : ""} ${isPast ? "event-past" : ""}"><div class="event-time">${escapeHtml(formatEventTime(event))}${isCurrent ? '<span class="time-state">计划进行中</span>' : isNext ? '<span class="time-state">下一项</span>' : ""}</div><div class="event-body"><div class="event-title-row"><h4 class="event-title">${escapeHtml(event.title)}</h4>${event.customId && !printing ? `<button type="button" class="remove-event" data-remove-event="${event.customId}" aria-label="删除自定安排：${escapeHtml(event.title)}">删除</button>` : ""}</div>${event.localHint ? `<p class="local-time-note">${escapeHtml(event.localHint)}</p>` : ""}<p class="event-description">${escapeHtml(event.description)}</p><div class="event-meta"><span class="event-category">${escapeHtml(event.category)}</span>${place ? externalLink(mapUrl(place.query), `${place.ko} ↗`, "map-link") : ""}${alternativePlace ? externalLink(mapUrl(alternativePlace.query), `雨天改去：${alternativePlace.name} ↗`, "map-link") : ""}</div>${event.carry.length ? `<div class="event-carry"><span class="mini-label">随身带</span><p>${escapeHtml(event.carry.join(" · "))}</p></div>` : ""}${renderMeal(event)}${renderShopping(event)}${contextualChecks(event.checkIds)}</div></article>`;
}
function renderDayTabs() {
  const position = clockPosition();
  document.querySelector("#day-tabs").innerHTML = TRIP_DAYS.map(
    (day) =>
      `<button type="button" class="day-tab ${day.id === position.dayId ? "clock-day" : ""}" role="tab" id="tab-${day.id}" aria-controls="day-panel" aria-selected="${day.id === activeDayId}" tabindex="${day.id === activeDayId ? 0 : -1}" data-day="${day.id}"><small>${day.id === "before" ? day.weekday : day.weekday + (day.id === position.dayId ? " · 今天" : "")}</small><strong>${day.date}</strong><span>${day.label}</span></button>`,
  ).join("");
  const tabs = document.querySelector("#day-tabs");
  const selected = tabs.querySelector('[aria-selected="true"]');
  if (selected) {
    const left = selected.offsetLeft - tabs.offsetLeft;
    if (
      left < tabs.scrollLeft ||
      left + selected.offsetWidth > tabs.scrollLeft + tabs.clientWidth
    )
      tabs.scrollLeft = Math.max(
        0,
        left - (tabs.clientWidth - selected.offsetWidth) / 2,
      );
  }
}
function renderDayPanel() {
  const day = TRIP_DAYS.find((item) => item.id === activeDayId);
  const isRain = activeMode === "rain" && Boolean(day.rain);
  const events = currentEvents(day, isRain);
  const panel = document.querySelector("#day-panel");
  panel.setAttribute("aria-labelledby", `tab-${day.id}`);
  const position = clockPosition();
  const browsing = day.id !== position.dayId || !followsClock;
  panel.innerHTML = `<div class="day-topline"><span class="day-counter">${day.id === "before" ? "BEFORE DEPARTURE" : day.date + " / " + day.weekday}</span><span class="tag">${escapeHtml(day.badge)}</span></div><h3 class="day-title">${escapeHtml(day.id === "before" ? day.title : day.date + " · " + day.label)}</h3><p class="day-subtitle">${escapeHtml(day.subtitle)}</p>${browsing ? '<div class="browse-notice">正在浏览这一天的计划 <button type="button" data-locate-now>定位' + (previewInstant === null ? "当前时间" : "预览时间") + " ↗</button></div>" : ""}${day.rain ? `<div class="mode-controls"><span>${day.id === "city" ? "下午二选一" : "按天气选路线"}</span><div class="segmented"><button type="button" data-mode="normal" aria-pressed="${!isRain}">${day.id === "city" ? "风小：塔洞海边" : "原计划"}</button><button type="button" data-mode="rain" aria-pressed="${isRain}">${day.id === "city" ? "下雨：地下商街" : "风雨备选"}</button></div></div>` : ""}<details class="day-context"><summary>随身物品与交通提醒</summary><p><strong>随身带：</strong>${escapeHtml(DAY_CARRY[day.id].join("；"))}</p><p>${escapeHtml(isRain ? day.rain.summary : day.summary)}</p><p>${escapeHtml(day.warning)}</p><p>${escapeHtml(day.transport)}</p></details><div class="timeline-heading"><h4>${day.id === "before" ? "准备清单" : "今日安排"}</h4><span>${events.length} 项 · 济州时间</span></div><div class="timeline">${events.map((event) => eventHtml(event)).join("")}</div>${
    day.id === "east"
      ? `<details class="day-context"><summary>仅在改走东部海岸时：月汀里与咸德备选</summary><p>三大景点照常走时，不额外绕去。Moumoon 与“缘屋”只有改为沿海慢游时才选。</p><p>小店也只在改线时考虑：<a href="#shop-studio943" aria-haspopup="dialog" aria-controls="shop-details">943 Studio（咸德）详情</a>；<a href="#shop-dalmun" aria-haspopup="dialog" aria-controls="shop-details">달문굿（月汀里）详情</a>。</p>${[
          "moumoon",
          "yeonok",
        ]
          .map((id) => {
            const food = FOODS.find((item) => item.id === id);
            return `<p><strong>${escapeHtml(food.name)}</strong> · ${externalLink(mapUrl(food.query), "地图 ↗", "map-link")}<br>${escapeHtml(food.note)}</p>`;
          })
          .join("")}</details>`
      : ""
  }`;
  document.querySelector("#day-carry-list").textContent =
    DAY_CARRY[day.id].join("；");
  document.querySelector("#share-summary").textContent =
    `${day.date} ${day.weekday}｜${day.subtitle}`;
  document.querySelector("#custom-date").value =
    day.id === "before"
      ? koreaDateTime(viewedInstant()).date < "2026-11-20"
        ? koreaDateTime(viewedInstant()).date
        : "2026-11-19"
      : day.isoDate;
}
function selectDay(dayId) {
  if (!TRIP_DAYS.some((day) => day.id === dayId)) return;
  followsClock = false;
  activeDayId = dayId;
  activeMode = planSettings.dayModes[dayId] === "rain" ? "rain" : "normal";
  renderDayTabs();
  renderDayPanel();
  renderNowPanel();
}
function jumpToEvent(eventId) {
  requestAnimationFrame(() => {
    const target = eventId
      ? document.getElementById(`event-${eventId}`)
      : document.querySelector("#day-panel");
    target?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });
}
function renderNowPanel() {
  const instant = viewedInstant(),
    local = koreaDateTime(instant),
    position = clockPosition();
  const current = position.current,
    next = position.next;
  const focus = current || next;
  document.querySelector("#journey-clock").textContent =
    `${local.date.replaceAll("-", ".")} ${local.time}`;
  document.querySelector("#clock-mode").textContent =
    previewInstant === null
      ? "韩国时间 · 每分钟更新"
      : "时间预览 · 不是真实当前时间";
  document.querySelector("#preview-banner").hidden = previewInstant === null;
  document.querySelector("#follow-status").textContent = followsClock
    ? "跟随时间定位"
    : "正在手动浏览";
  if (document.activeElement !== document.querySelector("#preview-time"))
    document.querySelector("#preview-time").value =
      `${local.date}T${local.time}`;
  const title =
    position.phase === "before"
      ? "先把出发准备好。"
      : position.phase === "after"
        ? "把旅途，好好收尾。"
        : "此刻，按计划出发。";
  document.querySelector("#journey-title").textContent = title;
  let currentHtml = "";
  if (position.phase === "after")
    currentHtml =
      '<span class="focus-label">旅程已结束</span><h2>计划已走到杭州返程抵达</h2><p>可以回看各天路线、餐厅和清单；若航班有变化，请以实际航班通知为准。</p><button type="button" data-view-day="return" class="small-button">回看返程日 ↗</button>';
  else if (!current)
    currentHtml = `<span class="focus-label">${position.phase === "before" ? "行前准备" : "休息与交通缓冲"}</span><h2>${next ? "接下来，" + escapeHtml(next.title) : "今天的计划时段已结束"}</h2><p>${next ? "下一项从 " + escapeHtml(koreaDateTime(next.start).date + " " + koreaDateTime(next.start).time) + " 开始，先休息或做好准备。" : "先休息，按实际天气、航班与服务方通知调整。"}</p>${focus ? `<button type="button" class="focus-jump" data-jump-event="${focus.id}" data-event-day="${focus.dayId}">查看下一项 ↗</button>` : ""}`;
  else {
    const food = chosenFood(current);
    const pending = current.checkIds
      .map((id) => ALL_CHECKLIST_ITEMS.find((item) => item[0] === id))
      .filter((item) => item && !checkedIds.has(item[0]));
    const checklistSnippet = current.checkIds.length
      ? `<p class="focus-essential"><strong>${pending.length ? "先确认" : "本时段清单"}</strong> ${
          pending.length
            ? escapeHtml(
                pending
                  .slice(0, 2)
                  .map((item) => item[1])
                  .join("；"),
              ) + (pending.length > 2 ? `，另有 ${pending.length - 2} 项` : "")
            : "已全部勾选完成"
        }</p>`
      : "";
    currentHtml = `<span class="focus-label">${previewInstant !== null ? "预览 · " : ""}计划进行中 · ${escapeHtml(formatEventTime(current))}</span><h2>${escapeHtml(current.title)}</h2><p>${escapeHtml(current.description)}</p>${current.localHint ? `<p class="local-time-note">${escapeHtml(current.localHint)}</p>` : ""}${food ? `<div class="focus-meal"><strong>${escapeHtml(food.name)}</strong>${externalLink(mapUrl(food.query), "餐厅地图 ↗", "map-link")}</div>` : current.mealQuery ? `<div class="focus-meal">${externalLink(mapUrl(current.mealQuery), "查找附近热餐 ↗", "map-link")}</div>` : ""}${current.shopIds?.length ? `<p class="focus-essential"><strong>顺路小店</strong> ${escapeHtml(current.shopIds.map((id) => SHOPS.find((shop) => shop.id === id)?.name).join(" / "))}，选 1—2 家即可。</p>` : ""}${current.carry.length ? `<p class="focus-essential"><strong>随身带</strong> ${escapeHtml(current.carry.join(" · "))}</p>` : ""}${checklistSnippet}<button type="button" class="focus-jump" data-jump-event="${current.id}" data-event-day="${current.dayId}">查看当前安排${current.checkIds.length ? " · 勾选清单" : ""} ↗</button>`;
  }
  document.querySelector("#current-focus").innerHTML = currentHtml;
  document.querySelector("#next-focus").innerHTML = next
    ? `<span class="focus-label">接下来 · ${escapeHtml(koreaDateTime(next.start).date.slice(5).replace("-", "/"))}</span><div class="next-time">${escapeHtml(next.label || koreaDateTime(next.start).time)}</div><h3>${escapeHtml(next.title)}</h3><button type="button" data-jump-event="${next.id}" data-event-day="${next.dayId}">查看下一项 ↗</button>`
    : '<span class="focus-label">接下来</span><h3>没有后续计划了</h3><p>保留订单与行李，确认已顺利抵达。你也可以新增自己的安排。</p>';
}
function locateCurrentTime(scroll = true) {
  const position = clockPosition();
  followsClock = true;
  activeDayId = position.dayId;
  activeMode =
    planSettings.dayModes[activeDayId] === "rain" ? "rain" : "normal";
  renderDayTabs();
  renderDayPanel();
  renderNowPanel();
  lastClockEventId = position.current?.id || position.next?.id || "";
  if (scroll)
    jumpToEvent(
      position.current?.id ||
        (position.next?.dayId === activeDayId ? position.next.id : null),
    );
}
function startClockUpdates() {
  const refresh = () => {
    const position = clockPosition(),
      eventId = position.current?.id || position.next?.id || "";
    if (
      followsClock &&
      (activeDayId !== position.dayId || eventId !== lastClockEventId)
    )
      locateCurrentTime(false);
    else renderNowPanel();
  };
  setInterval(refresh, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  if (
    previewInstant === null &&
    clockPosition().phase === "during" &&
    (!location.hash || location.hash === "#plan" || location.hash === "#now")
  )
    jumpToEvent(clockPosition().current?.id);
}

function renderMap(filter = "all") {
  const entries = Object.entries(PLACES).filter(
    ([, place]) => filter === "all" || place.area === filter,
  );
  document.querySelector("#map-places").innerHTML = entries
    .map(
      ([, place]) =>
        `<a class="place-row" href="${mapUrl(place.query)}" target="_blank" rel="noopener noreferrer"><div><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.ko)} · ${escapeHtml(place.area)}</small></div><span aria-hidden="true">↗</span></a>`,
    )
    .join("");
  // Pin labels are intentionally limited to avoid overlapping on the schematic map.
  const labelOffsets = {
    peak: [12, 0],
    port: [-90, -8],
    udo: [-17, -47],
    seopji: [8, 22],
    aewol: [-15, 25],
    hyeopjae: [-50, 25],
    cafe: [-80, -8],
    saebyeol: [-55, 30],
    university: [0, 28],
    cheonah: [-65, 25],
    dongmun: [10, -3],
    nuwemaru: [5, 29],
    stay: [-135, -9],
    airport: [-46, -16],
    arte: [-35, 26],
    museum: [5, 18],
    tapdong: [40, -22],
    underground: [55, 25],
  };
  document.querySelector("#map-pins").innerHTML = entries
    .map(([id, place]) => {
      const [dx, dy] = labelOffsets[id] || [10, 20];
      const shortName =
        {
          stay: "住宿区域",
          aewol: "汉潭",
          cafe: "涯月",
          university: "济州大学",
          nuwemaru: "保健路",
          museum: "博物馆",
          tapdong: "塔洞海边",
          underground: "地下商街",
          airport: "机场",
          hyeopjae: "挟才",
          arte: "ARTE",
        }[id] || place.name;
      const color = {
        东线: "#c67a47",
        西线: "#597c73",
        秋色: "#a29450",
        市区: "#385746",
        雨天: "#78849b",
      }[place.area];
      return `<a class="map-pin" href="${escapeHtml(mapUrl(place.query))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(place.name)}，在 Naver Map 打开"><title>${escapeHtml(place.name)}</title><circle cx="${place.x}" cy="${place.y}" r="8" fill="${color}" stroke="#faf8f1" stroke-width="3"/><text x="${place.x + dx}" y="${place.y + dy}" fill="${color}" font-size="13">${escapeHtml(shortName)}</text></a>`;
    })
    .join("");
}
function renderFoods(filter = activeFoodType) {
  activeFoodType = filter;
  const visibleFoods = FOODS.map((food, index) => ({
    food,
    index,
  }))
    .filter(
      ({ food }) => activeFoodType === "全部" || food.type === activeFoodType,
    )
    .filter(
      ({ food }) => activeFoodArea === "全部" || food.area === activeFoodArea,
    );
  document.querySelector("#food-result-count").textContent =
    `${visibleFoods.length} 项 · ${activeFoodArea === "全部" ? "所有区域" : activeFoodArea} · ${activeFoodType === "全部" ? "所有类型" : activeFoodType}`;
  document.querySelector("#food-grid").innerHTML =
    visibleFoods
      .map(
        ({ food, index }) =>
          `<article class="food-card"><div class="food-index"><span>${String(index + 1).padStart(2, "0")}</span><span class="tag">${escapeHtml(food.area)} · ${escapeHtml(food.type)}</span></div><h3>${escapeHtml(food.name)}</h3><p class="food-ko">${escapeHtml(food.ko)}</p><p class="food-shop">${escapeHtml(food.shop)}</p><p class="food-description">${escapeHtml(food.description)}</p><strong class="food-price">${escapeHtml(food.price)}</strong><p class="food-when">${escapeHtml(food.when)}</p><p class="fine-print">${escapeHtml(food.note)}</p><div class="food-links">${externalLink(mapUrl(food.query), "在地图找店 ↗")}${sourceLink(food.source)}</div></article>`,
      )
      .join("") ||
    '<p class="food-empty">这个组合暂无候选，换个区域或选择“所有类型”看看。</p>';
}
function updateChecklistProgress() {
  const total = validChecklistIds.size;
  document.querySelector("#checklist-count").textContent =
    `${checkedIds.size} / ${total}`;
  const progress = document.querySelector("#checklist-progress");
  progress.max = total;
  progress.value = checkedIds.size;
}
function loadChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved))
      checkedIds = new Set(saved.filter((id) => validChecklistIds.has(id)));
  } catch {
    document.querySelector("#storage-notice").textContent =
      "当前浏览器无法读取本地记录；仍可勾选，本次离开页面后可能不保留。";
  }
  document.querySelector("#checklist-groups").innerHTML = CHECKLIST.map(
    (group) =>
      `<div class="checklist-group"><h3>${escapeHtml(group.group)}</h3>${group.items.map(([id, title, description]) => `<label class="check-item"><input type="checkbox" data-check-id="${id}" ${checkedIds.has(id) ? "checked" : ""}><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span></label>`).join("")}</div>`,
  ).join("");
  updateChecklistProgress();
}
function formatWon(value) {
  return `₩${Math.round(value).toLocaleString("en-US")}`;
}
function updateBudget() {
  const mealPerPersonPerDay = Number(
    document.querySelector("#meal-budget").value,
  );
  const isCharter =
    document.querySelector("#budget-transport").value === "charter";
  const eastTransportGroup = isCharter ? 280000 : 80000 * 3;
  const baseGroupTotal =
    mealPerPersonPerDay * 3 * 3 +
    20000 * 3 +
    eastTransportGroup +
    100000 +
    90000 +
    50000 +
    50000 * 3;
  const totalWithBuffer = Math.ceil((baseGroupTotal * 1.15) / 1000) * 1000;
  document.querySelector("#meal-output").textContent =
    formatWon(mealPerPersonPerDay);
  document.querySelector("#budget-total").textContent =
    formatWon(totalWithBuffer);
  document.querySelector("#budget-per-person").textContent = formatWon(
    totalWithBuffer / 3,
  );
}
function dayText(day, useRain = false) {
  return (
    day.date +
    " " +
    day.weekday +
    "｜" +
    day.subtitle +
    (useRain ? "（风雨备选）" : "") +
    "\n" +
    (useRain && day.rain ? day.rain.summary : day.summary) +
    "\n\n" +
    currentEvents(day, useRain)
      .map(
        (event) =>
          formatEventTime(event) +
          " " +
          event.title +
          "\n" +
          event.description +
          (event.localHint ? "\n" + event.localHint : "") +
          (event.foodIds.length
            ? "\n用餐候选：" +
              event.foodIds
                .map((id) => FOODS.find((food) => food.id === id)?.shop)
                .join(" / ")
            : "") +
          (event.shopIds?.length
            ? "\n顺路小店：" +
              event.shopIds
                .map((id) => SHOPS.find((shop) => shop.id === id)?.name)
                .join(" / ")
            : "") +
          (event.checkIds.length
            ? "\n准备：" +
              event.checkIds
                .map(
                  (id) =>
                    ALL_CHECKLIST_ITEMS.find((item) => item[0] === id)?.[1],
                )
                .join("；")
            : "") +
          (event.carry.length ? "\n随身带：" + event.carry.join("；") : "") +
          (event.placeId
            ? "\n地图：" + mapUrl(PLACES[event.placeId].query)
            : ""),
      )
      .join("\n\n") +
    "\n\n交通：" +
    day.transport +
    "\n提醒：" +
    day.warning
  );
}
function fullTextPlan() {
  return `济州，晚秋见。｜2026.11.20—11.24，3 人旅行手册\n路线调整：2026.11.19；市区与营业资料复核：2026.11.19\n时间线统一使用韩国时间 UTC+9（比中国快 1 小时）；杭州起降的当地时间另行注明。\n住宿：新济州乐天免税店附近；精确地址请看私人订单。\n车程和预算均为规划估算，船班和开放情况临行复核。\n\n${TRIP_DAYS.map((day) => dayText(day) + (day.rain ? "\n\n" + dayText(day, true) : "")).join("\n\n----------------\n\n")}\n\n秋色备用参考（不在当前市区、东线、西线主线内；若要去，需要替换当天安排）\n${Object.values(
    AUTUMN_OPTIONS,
  )
    .map((option) => option.name + "：" + option.description)
    .join(
      "\n",
    )}\n\n吃点好的\n${FOODS.map((food) => `${food.name} / ${food.shop}\n区域：${food.area}｜${food.price}｜${food.when}\n${food.description}\n${food.note}\n${mapUrl(food.query)}`).join("\n\n")}\n\n顺路逛小店（用户截图参考，营业与地址临行确认）\n${SHOPS.map((shop) => `${shop.name}｜${SHOP_GROUPS.find((group) => group.id === shop.group).title}\n${shop.description}\n${shop.note}\n${mapUrl(shop.query)}`).join("\n\n")}\n\n行前清单\n${CHECKLIST.map((group) => `${group.group}\n${group.items.map(([, title, description]) => "□ " + title + "\n" + description).join("\n")}`).join("\n\n")}\n\n天气\n11 月气候参考：济州机场平均最高 16.4°C、平均最低 10.4°C，不是每日预报。分层穿衣，带防风外层与薄羽绒；大风不出海，雨后不登高。21—23 日日落约 17:27—17:28。\n\n紧急电话\n韩国报警 112；急救 / 消防 119；驻济州总领馆 +82-64-722-8802；领保 +86-10-12308。\n\n资料来源\n${SOURCES.map((source) => source.name + "\n" + source.url + "\n" + source.note).join("\n\n")}`;
}
function preparePrint() {
  document.querySelector("#print-days")?.remove();
  const printDays = document.createElement("div");
  printDays.id = "print-days";
  printDays.className = "print-days";
  printDays.innerHTML = TRIP_DAYS.map(
    (day) =>
      `<section class="print-day"><h3>${day.date} ${day.weekday} · ${escapeHtml(day.subtitle)}</h3><p>${escapeHtml(day.summary)}</p><p class="day-warning">${escapeHtml(day.warning)}</p><div class="timeline">${currentEvents(
        day,
        planSettings.dayModes[day.id] === "rain",
      )
        .map((event) => eventHtml(event, true))
        .join(
          "",
        )}</div><p class="transport-note">交通：${escapeHtml(day.transport)}</p>${day.rain ? '<p class="day-warning">大风 / 下雨：' + escapeHtml(day.rain.summary) + "</p>" : ""}</section>`,
  ).join("");
  document.querySelector("#plan").append(printDays);
  document.querySelector("#sources details").open = true;
}
function openSourceHash() {
  if (location.hash.startsWith("#source-"))
    document.querySelector("#sources details").open = true;
}

document.querySelector("#day-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-day]");
  if (button) selectDay(button.dataset.day);
});
document.querySelector("#day-tabs").addEventListener("keydown", (event) => {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const index = TRIP_DAYS.findIndex((day) => day.id === activeDayId);
  let nextIndex =
    event.key === "ArrowLeft"
      ? (index + TRIP_DAYS.length - 1) % TRIP_DAYS.length
      : (index + 1) % TRIP_DAYS.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = TRIP_DAYS.length - 1;
  selectDay(TRIP_DAYS[nextIndex].id);
  document.querySelector(`#tab-${activeDayId}`).focus();
});
document.querySelector("#day-panel").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  activeMode = button.dataset.mode;
  planSettings.dayModes[activeDayId] = activeMode;
  savePlanSettings();
  renderNowPanel();
  renderDayPanel();
  document.querySelector(`[data-mode="${activeMode}"]`).focus();
});

for (const [containerId, dataAttribute, render] of [
  ["map-filters", "mapFilter", renderMap],
  ["food-filters", "foodFilter", renderFoods],
  [
    "food-area-filters",
    "foodArea",
    (area) => {
      activeFoodArea = area;
      renderFoods();
    },
  ],
]) {
  document
    .querySelector(`#${containerId}`)
    .addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      for (const sibling of button.parentElement.querySelectorAll("button")) {
        sibling.classList.toggle("active", sibling === button);
        sibling.setAttribute("aria-pressed", String(sibling === button));
      }
      render(button.dataset[dataAttribute]);
    });
}
document.addEventListener("change", (event) => {
  const checkId = event.target.dataset.checkId;
  if (validChecklistIds.has(checkId)) {
    event.target.checked ? checkedIds.add(checkId) : checkedIds.delete(checkId);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...checkedIds]));
    } catch {
      showToast("浏览器未允许保存，勾选仅在本次页面有效。");
    }
    document.querySelectorAll("[data-check-id]").forEach((input) => {
      input.checked = checkedIds.has(input.dataset.checkId);
    });
    updateChecklistProgress();
    renderNowPanel();
    return;
  }
  const eventId = event.target.dataset.mealEvent;
  if (eventId) {
    planSettings.foodChoices[eventId] = event.target.value;
    savePlanSettings();
    renderNowPanel();
    renderDayPanel();
  }
});
document.addEventListener("click", (event) => {
  const locate = event.target.closest("[data-locate-now]");
  if (locate) {
    locateCurrentTime(true);
    return;
  }
  const jump = event.target.closest("[data-jump-event]");
  if (jump) {
    selectDay(jump.dataset.eventDay);
    jumpToEvent(jump.dataset.jumpEvent);
    return;
  }
  const dayButton = event.target.closest("[data-view-day]");
  if (dayButton) {
    selectDay(dayButton.dataset.viewDay);
    jumpToEvent(null);
    return;
  }
  const remove = event.target.closest("[data-remove-event]");
  if (remove) {
    planSettings.customEvents = planSettings.customEvents.filter(
      (item) => item.id !== remove.dataset.removeEvent,
    );
    savePlanSettings();
    renderDayPanel();
    renderNowPanel();
    showToast("已删除这条自定安排。");
  }
});
document.querySelector("#preview-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = document.querySelector("#preview-time").value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return;
  const [date, time] = value.split("T");
  const instant = koreaInstant(date, time);
  if (!Number.isFinite(instant)) return;
  previewInstant = instant;
  locateCurrentTime(true);
  showToast("正在按指定的济州时间预览；可点“恢复真实时间”退出。");
});
document.querySelector("#resume-clock").addEventListener("click", () => {
  previewInstant = null;
  locateCurrentTime(true);
  showToast("已恢复真实的济州时间。");
});
document
  .querySelector("#custom-event-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const item = {
      id: crypto.randomUUID(),
      date: form.elements.eventDate.value,
      time: form.elements.eventTime.value,
      title: form.elements.eventTitle.value.trim(),
      description: form.elements.eventDescription.value.trim(),
    };
    if (!validCustomEvent(item)) {
      showToast("请填写 11/13—24 的日期、时间和安排标题。");
      return;
    }
    planSettings.customEvents.push(item);
    savePlanSettings();
    const dayId =
      item.date < "2026-11-20"
        ? "before"
        : TRIP_DAYS.find((day) => day.isoDate === item.date).id;
    form.reset();
    document.querySelector("#custom-event-details").open = false;
    selectDay(dayId);
    jumpToEvent(`${dayId}-custom-${item.id}`);
    showToast(`已新增并定位到 ${item.date.slice(5)} ${item.time}。`);
  });

document.querySelector("#copy-plan").addEventListener("click", async () => {
  const text = dayText(
    TRIP_DAYS.find((day) => day.id === activeDayId),
    activeMode === "rain",
  );
  try {
    await navigator.clipboard.writeText(text);
    showToast("当前日行程已复制，可以发给同行人。");
  } catch {
    showToast("浏览器未允许复制，可使用“下载完整文字行程”。");
  }
});
document.querySelector("#download-plan").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + fullTextPlan()], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "济州晚秋旅行计划-2026.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("完整文字行程已开始下载。");
});
document.querySelector("#print-button").addEventListener("click", () => {
  preparePrint();
  window.print();
});
window.addEventListener("beforeprint", preparePrint);
window.addEventListener("hashchange", openSourceHash);
document.querySelector("#meal-budget").addEventListener("input", updateBudget);
document
  .querySelector("#budget-transport")
  .addEventListener("change", updateBudget);
document.querySelector("#source-list").innerHTML = SOURCES.map(
  (source) =>
    `<article class="source-item" id="source-${source.id}">${externalLink(source.url, source.name + " ↗")}<p>${escapeHtml(source.note)}</p></article>`,
).join("");
loadChecklist();
locateCurrentTime(false);
renderMap();
renderFoods();
renderShops();
if (/^#shops(?:$|-)|^#shop-/.test(location.hash)) {
  openShoppingDialog(location.hash);
}
updateBudget();
openSourceHash();
startClockUpdates();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      const notifyCached = () => {
        document.querySelector("#offline-status").textContent =
          "核心行程可在此设备离线查看；首次离线前请让本页加载完成。外部地图、船况与官方预报仍需网络，缓存不包含实时信息。";
      };
      if (registration.active) notifyCached();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", (event) => {
          if (event.target.state === "activated") notifyCached();
        });
      });
    })
    .catch(() => {
      document.querySelector("#offline-status").textContent =
        "当前浏览器未能启用离线缓存。可下载完整文字行程或打印 PDF，离线时地图和预报不可用。";
    });
}
