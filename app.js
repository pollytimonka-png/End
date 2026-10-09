// ============ Утилиты ============
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ============ 5.1 Toast-уведомления ============
const toastRegion = document.getElementById("toasts");
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast toast--" + type;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ 5.1 Табы (спринты / релизы / команда) ============
const tabs = $$(".tab");
const panels = $$("[role='tabpanel']");

function activateTab(tab) {
  tabs.forEach(t => {
    const isActive = t === tab;
    t.setAttribute("aria-selected", isActive ? "true" : "false");
    t.tabIndex = isActive ? 0 : -1;
  });
  panels.forEach(p => {
    p.hidden = p.id !== tab.getAttribute("aria-controls");
  });
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (e) => {
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === "Home") next = tabs[0];
    if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); next.focus(); activateTab(next); }
  });
});

// ============ 5.1 Dropdown-меню (сортировка релизов) ============
const dropdown = document.getElementById("sort-dropdown");
const dropdownBtn = document.getElementById("sort-btn");
const dropdownMenu = document.getElementById("sort-menu");

function closeDropdown() {
  dropdown.classList.remove("is-open");
  dropdownBtn.setAttribute("aria-expanded", "false");
}
function openDropdown() {
  dropdown.classList.add("is-open");
  dropdownBtn.setAttribute("aria-expanded", "true");
  const first = dropdownMenu.querySelector("[role='menuitem']");
  if (first) first.focus();
}
dropdownBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdown.classList.contains("is-open") ? closeDropdown() : openDropdown();
});
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) closeDropdown();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDropdown();
});
dropdownMenu.addEventListener("keydown", (e) => {
  const items = $$("[role='menuitem']", dropdownMenu);
  const idx = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown") { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
  if (e.key === "ArrowUp")   { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
  if (e.key === "Escape")    { closeDropdown(); dropdownBtn.focus(); }
});
dropdownMenu.addEventListener("click", (e) => {
  const item = e.target.closest("[role='menuitem']");
  if (!item) return;
  const key = item.dataset.sort;
  sortReleases(key);
  closeDropdown();
});

// ============ Рендер ============
const sprintsList = $('[data-list="sprints"]');
const teamList = $('[data-list="team"]');
const releaseBody = $('[data-table="releases"]');
const summary = $('[data-summary="total"]');

function renderSprints(list) {
  sprintsList.replaceChildren();
  if (!list.length) {
    sprintsList.append(renderEmptyState("Спринтов по фильтрам не найдено"));
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(s => frag.append(renderSprint(s)));
  sprintsList.append(frag); // 5.4 — одна вставка вместо N
}

function renderReleases(list) {
  releaseBody.replaceChildren();
  const frag = document.createDocumentFragment();
  list.forEach(r => frag.append(renderReleaseRow(r)));
  releaseBody.append(frag);
}

// 5.4 Симуляция загрузки + skeleton
function simulateLoading() {
  sprintsList.replaceChildren();
  for (let i = 0; i < 6; i++) sprintsList.append(renderSkeletonCard());

  setTimeout(() => {
    renderSprints(sprints);
    teamLoad.forEach(m => teamList.append(renderTeamMember(m)));
    renderReleases(releases);
    summary.textContent = "Спринтов: " + sprints.length +
                          ", релизов: " + releases.length +
                          ", сотрудников: " + teamLoad.length;
  }, 700);
}
simulateLoading();

// ============ Фильтры ============
const searchInput = $("#filter-search");
const statusSelect = $("#filter-status");
const priorityChecks = $$('input[name="pr"]');
const resetBtn = $("#filter-reset");

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const st = statusSelect.value;
  const checkedPr = priorityChecks.filter(c => c.checked).map(c => c.value);

  const result = sprints.filter(s => {
    const okQ = !q || s.title.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q);
    const okS = !st || s.status === st;
    const okP = !checkedPr.length || checkedPr.includes(s.priority);
    return okQ && okS && okP;
  });
  renderSprints(result);
  summary.textContent = "Спринтов: " + result.length +
                        ", релизов: " + releases.length +
                        ", сотрудников: " + teamLoad.length;
}

searchInput.addEventListener("input", applyFilters);
statusSelect.addEventListener("change", applyFilters);
priorityChecks.forEach(c => c.addEventListener("change", applyFilters));
resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusSelect.value = "";
  priorityChecks.forEach(c => c.checked = false);
  applyFilters();
});

// ============ Сортировка релизов (вызывается из dropdown) ============
let sortKey = null;
let sortDir = "asc";
function sortReleases(key) {
  sortDir = (sortKey === key && sortDir === "asc") ? "desc" : "asc";
  sortKey = key;
  const sorted = releases.slice().sort((a, b) => {
    const va = String(a[key]).toLowerCase();
    const vb = String(b[key]).toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  renderReleases(sorted);
  showToast("Отсортировано по «" + key + "» (" + sortDir + ")", "info");
}

// ============ 5.1 Делегирование клика на список спринтов ============
sprintsList.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const sprint = sprints.find(s => s.id === card.dataset.id);
  if (sprint) openModal("sprint", sprint);
});
sprintsList.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("card")) {
    const sprint = sprints.find(s => s.id === e.target.dataset.id);
    if (sprint) openModal("sprint", sprint);
  }
});

// ============ Модальное окно + focus trap ============
const modal = $("#modal");
const modalBody = $("#modal-body");
const modalClose = $("#modal-close");
const modalOk = $("#modal-ok");
let lastFocused = null;

function getFocusable(root) {
  return $$("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", root)
    .filter(el => !el.disabled && el.offsetParent !== null);
}

function openModal(entity, data) {
  lastFocused = document.activeElement;
  modalBody.replaceChildren(renderModalContent(entity, data));
  modal.classList.add("is-open");
  document.body.classList.add("no-scroll");
  modalClose.focus();
  document.addEventListener("keydown", trapFocus);
}
function closeModal() {
  modal.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  document.removeEventListener("keydown", trapFocus);
  if (lastFocused) lastFocused.focus();
}
function trapFocus(e) {
  if (e.key === "Escape") { closeModal(); return; }
  if (e.key !== "Tab") return;
  const focusables = getFocusable(modal);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

modalClose.addEventListener("click", closeModal);
modalOk.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// ============ Мобильное меню ============
const burger = $("#burger");
const navPanel = $("#app-nav");
const overlay = $("#overlay");

function openMenu() {
  document.body.classList.add("menu-open");
  burger.setAttribute("aria-expanded", "true");
  document.addEventListener("keydown", onMenuKeydown);
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  burger.setAttribute("aria-expanded", "false");
  document.removeEventListener("keydown", onMenuKeydown);
}
function onMenuKeydown(e) { if (e.key === "Escape") closeMenu(); }

burger.addEventListener("click", () => {
  document.body.classList.contains("menu-open") ? closeMenu() : openMenu();
});
overlay.addEventListener("click", closeMenu);

// Делегирование: клик по ссылке в меню открывает нужную вкладку и закрывает меню (на мобилке)
navPanel.addEventListener("click", (e) => {
  const link = e.target.closest("a[href^='#']");
  if (!link) return;
  e.preventDefault();

  const id = link.getAttribute("href").slice(1); // "sprints" | "releases" | "team" | "feedback"
  // id вкладки — "tab-" + id, панели — "panel-" + id
  const tabBtn = document.getElementById("tab-" + id);
  if (tabBtn) {
    activateTab(tabBtn);
    tabBtn.focus();
  }

  closeMenu();
});

// ============ 4.2 Переключатель темы ============
const themeSelect = $("#theme-select");
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeSelect.value = theme;
}
themeSelect.value = document.documentElement.getAttribute("data-theme") || "light";
themeSelect.addEventListener("change", () => {
  setTheme(themeSelect.value);
  showToast("Тема: " + themeSelect.value, "success");
});

// ============ 4.3 Акцентный цвет ============
const accentPicker = $("#accent-picker");
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
}
function setAccent(hex) {
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-rgb", hexToRgb(hex));
  localStorage.setItem("accent", hex);
}
accentPicker.value = localStorage.getItem("accent") || "#38bdf8";
accentPicker.addEventListener("input", () => setAccent(accentPicker.value));

// ============ 5.3 Форма валидации ============
const form = document.getElementById("feedback-form");
const nameInput = document.getElementById("fb-name");
const emailInput = document.getElementById("fb-email");
const msgInput = document.getElementById("fb-msg");

function setError(input, message) {
  const err = document.getElementById(input.id + "-error");
  if (message) {
    err.textContent = message;
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", err.id);
  } else {
    err.textContent = "";
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function validateName() {
  const v = nameInput.value.trim();
  if (!v) return setError(nameInput, "Введите имя"), false;
  if (v.length < 2) return setError(nameInput, "Минимум 2 символа"), false;
  setError(nameInput, "");
  return true;
}
function validateEmail() {
  const v = emailInput.value.trim();
  if (!v) return setError(emailInput, "Введите email"), false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError(emailInput, "Неверный формат email"), false;
  setError(emailInput, "");
  return true;
}
function validateMsg() {
  const v = msgInput.value.trim();
  if (v.length < 10) return setError(msgInput, "Минимум 10 символов"), false;
  setError(msgInput, "");
  return true;
}

// real-time: на blur сразу, на input — с задержкой
let inputTimer;
[nameInput, emailInput, msgInput].forEach(inp => {
  inp.addEventListener("blur", () => {
    if (inp === nameInput) validateName();
    if (inp === emailInput) validateEmail();
    if (inp === msgInput) validateMsg();
  });
  inp.addEventListener("input", () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      if (inp === nameInput) validateName();
      if (inp === emailInput) validateEmail();
      if (inp === msgInput) validateMsg();
    }, 400);
  });
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = [validateName(), validateEmail(), validateMsg()].every(Boolean);
  if (!ok) {
    showToast("Проверьте форму", "error");
    return;
  }
  showToast("Спасибо, заявка отправлена!", "success");
  form.reset();
  [nameInput, emailInput, msgInput].forEach(i => setError(i, ""));
});