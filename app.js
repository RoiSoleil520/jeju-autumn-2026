'use strict';
const storageKey = 'jeju-autumn-2026-checklist-v1';
const validChecklistIds = new Set(CHECKLIST.flatMap(group => group.items.map(item => item[0])));
let activeDayId = 'east';
let activeMode = 'normal';
let autumnChoice = 'saebyeol';
let toastTimer;
let checkedIds = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
function mapUrl(query) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
function externalLink(url, label, className = '') {
  return `<a href="${escapeHtml(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}
function sourceLink(sourceId) {
  const source = SOURCES.find(item => item.id === sourceId);
  return source ? externalLink(source.url, '资料 ↗') : '';
}
function currentEvents(day, useRain = false) {
  if (useRain && day.rain) return day.rain.events;
  const events = day.events.map(event => [...event]);
  if (day.id === 'autumn' && autumnChoice !== 'saebyeol') {
    const option = AUTUMN_OPTIONS[autumnChoice];
    events[0][1] = `早餐后出发：${option.name}`;
    events[0][2] = autumnChoice === 'university'
      ? '今天选择轻松的银杏线，单程约 25—40 分钟；具体车程按当日交通。先看近期落叶情况与校园通行要求。'
      : '前一天确认溪谷开放情况与往返接送，单程约 40—60 分钟；大风雨后不走溪谷。';
    events[1] = ['09:30–11:00', option.name, option.description, option.place, '秋色'];
  }
  return events;
}
function eventHtml(event) {
  const [time, title, description, placeId, category] = event;
  const place = PLACES[placeId];
  return `<article class="timeline-event"><div class="event-time">${escapeHtml(time)}</div><div><h4 class="event-title">${escapeHtml(title)}</h4><p class="event-description">${escapeHtml(description)}</p><div class="event-meta"><span class="event-category">${escapeHtml(category)}</span>${place ? externalLink(mapUrl(place.query), `${place.ko} ↗`, 'map-link') : ''}</div></div></article>`;
}
function renderDayTabs() {
  document.querySelector('#day-tabs').innerHTML = DAYS.map(day => `<button type="button" class="day-tab" role="tab" id="tab-${day.id}" aria-controls="day-panel" aria-selected="${day.id === activeDayId}" tabindex="${day.id === activeDayId ? 0 : -1}" data-day="${day.id}"><small>${day.weekday} · ${day.id === 'arrival' || day.id === 'return' ? '航班日' : '完整游玩日'}</small><strong>${day.date}</strong><span>${day.label}</span></button>`).join('');
}
function renderDayPanel() {
  const day = DAYS.find(item => item.id === activeDayId);
  const isRain = activeMode === 'rain' && Boolean(day.rain);
  const panel = document.querySelector('#day-panel');
  panel.setAttribute('aria-labelledby', `tab-${day.id}`);
  const dayIndex = DAYS.indexOf(day);
  const counter = dayIndex === 0 ? 'ARRIVAL NIGHT' : dayIndex === 4 ? 'HOMEWARD BOUND' : `DAY 0${dayIndex}`;
  panel.innerHTML = `<div class="day-topline"><span class="day-counter">${counter} / ${day.date}</span><span class="tag">${escapeHtml(day.badge)}</span></div><h3 class="day-title">${escapeHtml(isRain ? day.rain.title : day.title)}</h3><p class="day-subtitle">${escapeHtml(day.subtitle)}</p><p class="day-description">${escapeHtml(isRain ? day.rain.summary : day.summary)}</p>${day.rain ? `<div class="mode-controls"><span>跟着实际天气，选今天的走法</span><div class="segmented" aria-label="天气路线"><button type="button" data-mode="normal" aria-pressed="${!isRain}">原计划</button><button type="button" data-mode="rain" aria-pressed="${isRain}">大风 / 下雨备选</button></div></div>` : ''}${day.id === 'autumn' && !isRain ? `<div class="autumn-choice"><label for="autumn-choice">上午秋色只选一条</label><select id="autumn-choice">${Object.entries(AUTUMN_OPTIONS).map(([id,option]) => `<option value="${id}" ${id === autumnChoice ? 'selected' : ''}>${escapeHtml(option.name)} · ${escapeHtml(option.tag)}</option>`).join('')}</select><p>${escapeHtml(AUTUMN_OPTIONS[autumnChoice].description)}</p></div>` : ''}<p class="day-warning">${escapeHtml(day.warning)}</p><div class="timeline">${currentEvents(day, isRain).map(eventHtml).join('')}</div><div class="transport-note"><strong>这一天，怎么走</strong>${escapeHtml(day.transport)}</div>`;
  document.querySelector('#share-summary').textContent = `${day.date} ${day.weekday}｜${isRain ? day.rain.title : day.subtitle}`;
}
function selectDay(dayId) {
  if (!DAYS.some(day => day.id === dayId)) return;
  activeDayId = dayId;
  activeMode = 'normal';
  renderDayTabs();
  renderDayPanel();
}
function renderMap(filter = 'all') {
  const entries = Object.entries(PLACES).filter(([,place]) => filter === 'all' || place.area === filter);
  document.querySelector('#map-places').innerHTML = entries.map(([,place]) => `<a class="place-row" href="${mapUrl(place.query)}" target="_blank" rel="noopener noreferrer"><div><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.ko)} · ${escapeHtml(place.area)}</small></div><span aria-hidden="true">↗</span></a>`).join('');
  // Pin labels are intentionally limited to avoid overlapping on the schematic map.
  const labelOffsets = {peak:[12,0],port:[-90,-8],udo:[-17,-47],seopji:[8,22],aewol:[-15,25],hyeopjae:[-50,25],cafe:[-80,-8],saebyeol:[-55,30],university:[0,28],cheonah:[-65,25],dongmun:[10,-3],nuwemaru:[5,29],stay:[-135,-9],airport:[-46,-16],arte:[-35,26],museum:[5,18]};
  document.querySelector('#map-pins').innerHTML = entries.map(([id,place]) => {
    const [dx,dy] = labelOffsets[id];
    const shortName = {stay:'住宿区域',aewol:'汉潭',cafe:'涯月',university:'济州大学',nuwemaru:'保健路',museum:'博物馆',airport:'机场',hyeopjae:'挟才',arte:'ARTE'}[id] || place.name;
    const color = {'东线':'#c67a47','西线':'#597c73','秋色':'#a29450','市区':'#385746','雨天':'#78849b'}[place.area];
    return `<a class="map-pin" href="${escapeHtml(mapUrl(place.query))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(place.name)}，在 Naver Map 打开"><title>${escapeHtml(place.name)}</title><circle cx="${place.x}" cy="${place.y}" r="8" fill="${color}" stroke="#faf8f1" stroke-width="3"/><text x="${place.x+dx}" y="${place.y+dy}" fill="${color}" font-size="13">${escapeHtml(shortName)}</text></a>`;
  }).join('');
}
function renderFoods(filter = '全部') {
  document.querySelector('#food-grid').innerHTML = FOODS.map((food,index) => ({food,index})).filter(({food}) => filter === '全部' || food.type === filter).map(({food,index}) => `<article class="food-card"><div class="food-index"><span>0${index+1}</span><span class="tag">${escapeHtml(food.type)}</span></div><h3>${escapeHtml(food.name)}</h3><p class="food-ko">${escapeHtml(food.ko)}</p><p class="food-shop">${escapeHtml(food.shop)}</p><p class="food-description">${escapeHtml(food.description)}</p><strong class="food-price">${escapeHtml(food.price)}</strong><p class="food-when">${escapeHtml(food.when)}</p><p class="fine-print">${escapeHtml(food.note)}</p><div class="food-links">${externalLink(mapUrl(food.query), '在地图找店 ↗')}${sourceLink(food.source)}</div></article>`).join('');
}
function updateChecklistProgress() {
  const total = validChecklistIds.size;
  document.querySelector('#checklist-count').textContent = `${checkedIds.size} / ${total}`;
  const progress = document.querySelector('#checklist-progress');
  progress.max = total;
  progress.value = checkedIds.size;
}
function loadChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) checkedIds = new Set(saved.filter(id => validChecklistIds.has(id)));
  } catch {
    document.querySelector('#storage-notice').textContent = '当前浏览器无法读取本地记录；仍可勾选，本次离开页面后可能不保留。';
  }
  document.querySelector('#checklist-groups').innerHTML = CHECKLIST.map(group => `<div class="checklist-group"><h3>${escapeHtml(group.group)}</h3>${group.items.map(([id,title,description]) => `<label class="check-item"><input type="checkbox" data-check-id="${id}" ${checkedIds.has(id) ? 'checked' : ''}><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span></label>`).join('')}</div>`).join('');
  updateChecklistProgress();
}
function formatWon(value) {
  return `₩${Math.round(value).toLocaleString('en-US')}`;
}
function updateBudget() {
  const mealPerPersonPerDay = Number(document.querySelector('#meal-budget').value);
  const isCharter = document.querySelector('#budget-transport').value === 'charter';
  const eastTransportGroup = isCharter ? 280000 : 80000 * 3;
  const baseGroupTotal = mealPerPersonPerDay * 3 * 3 + 20000 * 3 + eastTransportGroup + 100000 + 90000 + 50000 + 50000 * 3;
  const totalWithBuffer = Math.ceil(baseGroupTotal * 1.15 / 1000) * 1000;
  document.querySelector('#meal-output').textContent = formatWon(mealPerPersonPerDay);
  document.querySelector('#budget-total').textContent = formatWon(totalWithBuffer);
  document.querySelector('#budget-per-person').textContent = formatWon(totalWithBuffer / 3);
}
function dayText(day, useRain = false) {
  return `${day.date} ${day.weekday}｜${day.subtitle}${useRain ? '（大风 / 下雨备选）' : ''}\n${useRain && day.rain ? day.rain.summary : day.summary}\n\n${currentEvents(day,useRain).map(event => `${event[0]} ${event[1]}\n${event[2]}${PLACES[event[3]] ? '\n地图：'+mapUrl(PLACES[event[3]].query) : ''}`).join('\n\n')}\n\n交通：${day.transport}\n提醒：${day.warning}`;
}
function fullTextPlan() {
  return `济州，晚秋见。｜2026.11.20—11.24，3 人旅行手册\n核验日期：2026.11.12\n除杭州航班时间外，行程使用韩国时间 UTC+9（比中国快 1 小时）。\n住宿：新济州乐天免税店附近；精确地址请看私人订单。\n车程和预算均为规划估算，船班和开放情况临行复核。\n\n${DAYS.map(day => dayText(day)+(day.rain ? '\n\n'+dayText(day,true) : '')).join('\n\n----------------\n\n')}\n\n秋色三选一\n${Object.values(AUTUMN_OPTIONS).map(option=>option.name+'：'+option.description).join('\n')}\n\n吃点好的\n${FOODS.map(food=>`${food.name} / ${food.shop}\n${food.price}（预算）｜${food.when}\n${food.description}\n${food.note}\n${mapUrl(food.query)}`).join('\n\n')}\n\n行前清单\n${CHECKLIST.map(group=>`${group.group}\n${group.items.map(([,title,description])=>'□ '+title+'\n'+description).join('\n')}`).join('\n\n')}\n\n天气\n11 月气候参考：济州机场平均最高 16.4°C、平均最低 10.4°C，不是每日预报。分层穿衣，带防风外层与薄羽绒；大风不出海，雨后不登高。21—23 日日落约 17:27—17:28。\n\n紧急电话\n韩国报警 112；急救 / 消防 119；驻济州总领馆 +82-64-722-8802；领保 +86-10-12308。\n\n资料来源\n${SOURCES.map(source=>source.name+'\n'+source.url+'\n'+source.note).join('\n\n')}`;
}
function preparePrint() {
  document.querySelector('#print-days')?.remove();
  const printDays = document.createElement('div');
  printDays.id = 'print-days';
  printDays.className = 'print-days';
  printDays.innerHTML = DAYS.map(day=>`<section class="print-day"><h3>${day.date} ${day.weekday} · ${escapeHtml(day.subtitle)}</h3><p>${escapeHtml(day.summary)}</p><p class="day-warning">${escapeHtml(day.warning)}</p><div class="timeline">${currentEvents(day).map(eventHtml).join('')}</div><p class="transport-note">交通：${escapeHtml(day.transport)}</p>${day.id==='autumn' ? '<p class="transport-note">秋色选择：'+Object.values(AUTUMN_OPTIONS).map(option=>escapeHtml(option.name+'：'+option.description)).join('<br>')+'</p>' : ''}${day.rain ? '<p class="day-warning">大风 / 下雨：'+escapeHtml(day.rain.summary)+'</p>' : ''}</section>`).join('');
  document.querySelector('#plan').append(printDays);
  document.querySelector('#sources details').open = true;
}
function openSourceHash() {
  if (location.hash.startsWith('#source-')) document.querySelector('#sources details').open = true;
}

document.querySelector('#day-tabs').addEventListener('click',event => {
  const button = event.target.closest('[data-day]');
  if (button) selectDay(button.dataset.day);
});
document.querySelector('#day-tabs').addEventListener('keydown',event => {
  const keys = ['ArrowLeft','ArrowRight','Home','End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const index = DAYS.findIndex(day => day.id === activeDayId);
  let nextIndex = event.key === 'ArrowLeft' ? (index + DAYS.length - 1) % DAYS.length : (index + 1) % DAYS.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = DAYS.length - 1;
  selectDay(DAYS[nextIndex].id);
  document.querySelector(`#tab-${activeDayId}`).focus();
});
document.querySelector('#day-panel').addEventListener('click',event => {
  const button = event.target.closest('[data-mode]');
  if (!button) return;
  activeMode = button.dataset.mode;
  renderDayPanel();
  document.querySelector(`[data-mode="${activeMode}"]`).focus();
});
document.querySelector('#day-panel').addEventListener('change',event => {
  if (event.target.id !== 'autumn-choice') return;
  autumnChoice = event.target.value;
  renderDayPanel();
  document.querySelector('#autumn-choice').focus();
});
for (const [containerId,dataAttribute,render] of [['map-filters','mapFilter',renderMap],['food-filters','foodFilter',renderFoods]]) {
  document.querySelector(`#${containerId}`).addEventListener('click',event=>{
    const button = event.target.closest('button');
    if (!button) return;
    for (const sibling of button.parentElement.querySelectorAll('button')) {
      sibling.classList.toggle('active',sibling===button);
      sibling.setAttribute('aria-pressed',String(sibling===button));
    }
    render(button.dataset[dataAttribute]);
  });
}
document.querySelector('#checklist-groups').addEventListener('change',event=>{
  const id = event.target.dataset.checkId;
  if (!validChecklistIds.has(id)) return;
  event.target.checked ? checkedIds.add(id) : checkedIds.delete(id);
  try {localStorage.setItem(storageKey,JSON.stringify([...checkedIds]));}
  catch {document.querySelector('#storage-notice').textContent='浏览器未允许保存：当前勾选仅在本次页面有效。';}
  updateChecklistProgress();
});
document.querySelector('#copy-plan').addEventListener('click',async()=>{
  const text = dayText(DAYS.find(day=>day.id===activeDayId),activeMode==='rain');
  try {await navigator.clipboard.writeText(text);showToast('当前日行程已复制，可以发给同行人。');}
  catch {showToast('浏览器未允许复制，可使用“下载完整文字行程”。');}
});
document.querySelector('#download-plan').addEventListener('click',()=>{
  const url = URL.createObjectURL(new Blob(['\uFEFF'+fullTextPlan()],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url;link.download='济州晚秋旅行计划-2026.txt';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('完整文字行程已开始下载。');
});
document.querySelector('#print-button').addEventListener('click',()=>{preparePrint();window.print();});
window.addEventListener('beforeprint',preparePrint);
window.addEventListener('hashchange',openSourceHash);
document.querySelector('#meal-budget').addEventListener('input',updateBudget);
document.querySelector('#budget-transport').addEventListener('change',updateBudget);
document.querySelector('#source-list').innerHTML = SOURCES.map(source=>`<article class="source-item" id="source-${source.id}">${externalLink(source.url,source.name+' ↗')}<p>${escapeHtml(source.note)}</p></article>`).join('');
renderDayTabs();
renderDayPanel();
renderMap();
renderFoods();
loadChecklist();
updateBudget();
openSourceHash();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(registration=>{
    const notifyCached=()=>{document.querySelector('#offline-status').textContent='核心行程可在此设备离线查看；首次离线前请让本页加载完成。外部地图、船况与官方预报仍需网络，缓存不包含实时信息。';};
    if (registration.active) notifyCached();
    registration.addEventListener('updatefound',()=>{
      registration.installing?.addEventListener('statechange',event=>{
        if(event.target.state==='activated') notifyCached();
      });
    });
  }).catch(()=>{document.querySelector('#offline-status').textContent='当前浏览器未能启用离线缓存。可下载完整文字行程或打印 PDF，离线时地图和预报不可用。';});
}
