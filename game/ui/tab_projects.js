import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, formatDate, escapeHtml } from './format.js';
import { MATERIALS, EMPLOYEE_ROLES } from '../data.js';
import { assignEmployee, assignEquipment } from '../market.js';
import { openModal, closeModal, toast } from './modal.js';

function render(state, el) {
  if (state.activeProjects.length === 0) {
    el.innerHTML = `
      <div class="rounded-3xl border border-white/40 bg-white/70 p-10 text-center shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="text-5xl">🏗️</div>
        <div class="mt-3 text-lg font-bold">Нет активных проектов</div>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">Подайте заявку на тендер и выигрывайте контракты.</div>
      </div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="grid gap-4 lg:grid-cols-2">
      ${state.activeProjects.map(p => card(state, p)).join('')}
    </div>
  `;
  el.querySelectorAll('[data-assign-crew]').forEach(b => b.addEventListener('click', () => openAssignCrewModal(state, b.dataset.assignCrew)));
  el.querySelectorAll('[data-assign-eq]').forEach(b => b.addEventListener('click', () => openAssignEqModal(state, b.dataset.assignEq)));
}

function card(state, p) {
  const pct = Math.min(100, Math.round((p.workDone / p.totalWork) * 100));
  const daysLeft = p.deadlineDay - state.day;
  const lateCls = daysLeft < 5 ? 'text-rose-500' : daysLeft < 15 ? 'text-amber-500' : 'text-slate-500';
  const crew = p.assignedCrew.map(id => state.employees.find(e => e.id === id)).filter(Boolean);
  const equip = p.assignedEquipment.map(id => [...state.fleet, ...state.rentals].find(e => e.id === id)).filter(Boolean);
  const matStatus = Object.entries(p.requiredMaterials).map(([mid, qty]) => {
    const consumed = p.consumedMaterials[mid] || 0;
    const invAvail = state.materials.inventory[mid] || 0;
    const remaining = Math.max(0, qty - consumed);
    const ok = invAvail >= remaining / Math.max(1, p.deadlineDay - state.day);
    return { name: MATERIALS.find(m => m.id === mid)?.name || mid, consumed: Math.round(consumed), qty, ok };
  });
  const missingMat = matStatus.some(m => !m.ok);
  return `
    <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-xs uppercase text-slate-500 dark:text-slate-400">${escapeHtml(p.cityName)}</div>
          <div class="text-lg font-bold">${escapeHtml(p.typeName)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Контракт: ${formatRub(p.contractAmount)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 dark:text-slate-400">Дедлайн</div>
          <div class="font-bold">${formatDate(p.deadlineDay)}</div>
          <div class="text-xs ${lateCls}">осталось ${daysLeft} дн.</div>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-1 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400">Прогресс</span>
          <span class="font-semibold">${pct}%</span>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-sky-500" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl border border-white/20 bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/40">
          <div class="mb-1 flex items-center justify-between text-xs font-semibold">
            <span>Команда (${crew.length})</span>
            <button data-assign-crew="${p.id}" class="rounded-lg bg-indigo-600 px-2 py-0.5 text-white hover:bg-indigo-500">Назначить</button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300">${crew.map(e => `${escapeHtml(e.name)} · ${escapeHtml(e.roleName)} (ур.${e.skill})`).join('<br>') || '<span class="text-slate-500">Никто не назначен</span>'}</div>
        </div>
        <div class="rounded-2xl border border-white/20 bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/40">
          <div class="mb-1 flex items-center justify-between text-xs font-semibold">
            <span>Техника (${equip.length})</span>
            <button data-assign-eq="${p.id}" class="rounded-lg bg-indigo-600 px-2 py-0.5 text-white hover:bg-indigo-500">Назначить</button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300">${equip.map(e => `${escapeHtml(e.typeName)} · ${Math.round(e.condition)}%`).join('<br>') || '<span class="text-slate-500">Ничего не назначено</span>'}</div>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-1 text-xs font-semibold">Материалы ${missingMat ? '<span class="text-rose-500">· дефицит!</span>' : ''}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          ${matStatus.map(m => `<div class="flex justify-between"><span>${escapeHtml(m.name)}</span><span class="${m.ok ? '' : 'text-rose-500'}">${m.consumed}/${m.qty}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function openAssignCrewModal(state, projectId) {
  const p = state.activeProjects.find(x => x.id === projectId);
  if (!p) return;
  const fieldEmps = state.employees.filter(e => e.category === 'field');
  const rows = fieldEmps.map(e => {
    const checked = p.assignedCrew.includes(e.id) ? 'checked' : '';
    const busyOther = e.assignedProjectId && e.assignedProjectId !== p.id;
    return `
      <label class="flex items-center gap-3 rounded-xl border border-white/20 bg-white/40 p-2 dark:border-white/10 dark:bg-slate-900/40">
        <input type="checkbox" value="${e.id}" ${checked} class="h-4 w-4" data-crew-check/>
        <div class="flex-1">
          <div class="text-sm font-semibold">${escapeHtml(e.name)} · ${escapeHtml(e.roleName)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Навык ${e.skill} · Мораль ${Math.round(e.morale)} · ${formatRub(e.salary)}/день ${busyOther ? '· <span class="text-amber-500">занят на другом проекте</span>' : ''}</div>
        </div>
      </label>
    `;
  }).join('');
  const body = `<div class="max-h-96 overflow-y-auto space-y-2">${rows || '<div class="text-sm text-slate-500">Нанятых полевых сотрудников нет.</div>'}</div>`;
  openModal({
    title: `Назначить команду: ${p.typeName}`,
    body,
    actions: [
      { label: 'Отмена' },
      { label: 'Сохранить', primary: true, onClick: (bd) => {
        const ids = [...bd.querySelectorAll('[data-crew-check]:checked')].map(x => x.value);
        for (const e of fieldEmps) {
          const want = ids.includes(e.id);
          const has = p.assignedCrew.includes(e.id);
          if (want && !has) assignEmployee(state, e.id, p.id);
          if (!want && has) assignEmployee(state, e.id, null);
        }
        toast('Команда обновлена', 'success');
      }},
    ],
    size: 'lg',
  });
}

function openAssignEqModal(state, projectId) {
  const p = state.activeProjects.find(x => x.id === projectId);
  if (!p) return;
  const list = [...state.fleet, ...state.rentals];
  const rows = list.map(eq => {
    const checked = p.assignedEquipment.includes(eq.id) ? 'checked' : '';
    const busyOther = eq.assignedProjectId && eq.assignedProjectId !== p.id;
    return `
      <label class="flex items-center gap-3 rounded-xl border border-white/20 bg-white/40 p-2 dark:border-white/10 dark:bg-slate-900/40">
        <input type="checkbox" value="${eq.id}" ${checked} class="h-4 w-4" data-eq-check/>
        <div class="flex-1">
          <div class="text-sm font-semibold">${escapeHtml(eq.typeName)} ${eq.mode === 'rented' ? '· аренда' : ''}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Состояние ${Math.round(eq.condition)}% · Мощность ${eq.powerRating} ${busyOther ? '· <span class="text-amber-500">на другом проекте</span>' : ''} ${eq.brokenDays > 0 ? '· <span class="text-rose-500">сломана</span>' : ''}</div>
        </div>
      </label>
    `;
  }).join('');
  const body = `<div class="max-h-96 overflow-y-auto space-y-2">${rows || '<div class="text-sm text-slate-500">Техники нет. Купите или арендуйте во вкладке «Техника».</div>'}</div>`;
  openModal({
    title: `Назначить технику: ${p.typeName}`,
    body,
    actions: [
      { label: 'Отмена' },
      { label: 'Сохранить', primary: true, onClick: (bd) => {
        const ids = [...bd.querySelectorAll('[data-eq-check]:checked')].map(x => x.value);
        for (const eq of list) {
          const want = ids.includes(eq.id);
          const has = p.assignedEquipment.includes(eq.id);
          if (want && !has) assignEquipment(state, eq.id, p.id);
          if (!want && has) assignEquipment(state, eq.id, null);
        }
        toast('Техника обновлена', 'success');
      }},
    ],
    size: 'lg',
  });
}

registerTab('projects', render, [SLICES.TIME, SLICES.PROJECTS, SLICES.HR, SLICES.FLEET, SLICES.MATERIALS]);
