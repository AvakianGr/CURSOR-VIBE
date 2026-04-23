import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { save, reset, exportJson, importJson, newGame } from '../state.js';
import { openModal, toast } from './modal.js';

function render(state, el) {
  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Компания</h3>
        <div class="text-sm text-slate-700 dark:text-slate-200">
          <div>Название: <b>${escapeHtml(state.company.name)}</b></div>
          <div>Сложность: <b>${escapeHtml(state.difficulty)}</b></div>
          <div>Сид: <b class="font-mono">${state.seed}</b></div>
          <div>Дней в игре: <b>${state.day}</b></div>
          <div>Стартовый капитал: <b>${formatRub(state.finance.startingCash)}</b></div>
        </div>
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Сохранение</h3>
        <div class="flex flex-wrap gap-2">
          <button data-save class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">💾 Сохранить</button>
          <button data-export class="rounded-xl border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white dark:border-white/10 dark:bg-slate-800/80 dark:hover:bg-slate-800">📤 Экспорт JSON</button>
          <button data-import class="rounded-xl border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white dark:border-white/10 dark:bg-slate-800/80 dark:hover:bg-slate-800">📥 Импорт JSON</button>
          <button data-new class="rounded-xl border border-rose-500/40 bg-white/70 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50 dark:border-rose-400/40 dark:bg-slate-800/80 dark:text-rose-300 dark:hover:bg-rose-500/10">🔄 Новая игра</button>
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Автосохранение каждые 10 игровых дней.</p>
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Как играть</h3>
        <ol class="list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <li>Наймите в HR прораба, инженера и рабочих.</li>
          <li>Купите или арендуйте технику во вкладке «Техника».</li>
          <li>Купите материалы (бетон, сталь) во вкладке «Материалы».</li>
          <li>Подайте ставку на тендер во вкладке «Тендеры». Шанс победы зависит от ставки и репутации.</li>
          <li>Выиграв, во вкладке «Проекты» назначьте команду и технику.</li>
          <li>Следите за кассой и моралью. В «Финансах» можно взять кредит.</li>
          <li>«R&D» открывает бонусы. «Карта» — новые города.</li>
          <li>Нажмите <kbd>Space</kbd> для паузы, <kbd>1</kbd>/<kbd>2</kbd>/<kbd>4</kbd> для скоростей.</li>
        </ol>
      </div>
    </div>
  `;

  el.querySelector('[data-save]')?.addEventListener('click', () => { save(state); toast('Сохранено', 'success'); });
  el.querySelector('[data-export]')?.addEventListener('click', () => exportJsonDialog(state));
  el.querySelector('[data-import]')?.addEventListener('click', () => importJsonDialog());
  el.querySelector('[data-new]')?.addEventListener('click', () => newGameDialog());
}

function exportJsonDialog(state) {
  const text = exportJson(state);
  const body = `<textarea class="h-64 w-full rounded-xl border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">${escapeHtml(text)}</textarea>`;
  openModal({
    title: 'Экспорт сохранения',
    body,
    actions: [
      { label: 'Скачать файл', primary: true, onClick: () => {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `construction-empire-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }},
      { label: 'Закрыть' },
    ],
    size: 'lg',
  });
}

function importJsonDialog() {
  const body = `<textarea placeholder="Вставьте JSON" data-import-text class="h-64 w-full rounded-xl border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"></textarea>`;
  openModal({
    title: 'Импорт сохранения',
    body,
    actions: [
      { label: 'Отмена' },
      { label: 'Загрузить', primary: true, onClick: (bd) => {
        try {
          const text = bd.querySelector('[data-import-text]').value;
          const s = importJson(text);
          if (!s) throw new Error('Некорректный JSON');
          localStorage.setItem('ci2-save-v1', JSON.stringify(s));
          location.reload();
        } catch (e) {
          toast('Ошибка импорта: ' + e.message, 'error');
          return false;
        }
      }},
    ],
    size: 'lg',
  });
}

function newGameDialog() {
  openModal({
    title: 'Начать новую игру?',
    body: '<p class="text-sm text-slate-600 dark:text-slate-300">Текущий прогресс будет стёрт.</p>',
    actions: [
      { label: 'Отмена' },
      { label: 'Начать заново', primary: true, onClick: () => {
        reset();
        location.reload();
      }},
    ],
    size: 'sm',
  });
}

registerTab('settings', render, [SLICES.TIME, SLICES.FINANCE]);
