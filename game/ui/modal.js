let root;

export function initModal() {
  root = document.getElementById('modal-root');
}

export function closeModal() {
  if (!root) return;
  root.innerHTML = '';
  root.classList.add('hidden');
  document.removeEventListener('keydown', escHandler);
}

function escHandler(e) {
  if (e.key === 'Escape') closeModal();
}

export function openModal({ title, body, actions = [], dismissible = true, size = 'md' }) {
  if (!root) return;
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="w-full ${sizeClasses[size] || sizeClasses.md} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/30 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
        <div class="mb-4 flex items-start justify-between gap-3">
          <h2 class="text-xl font-bold">${title}</h2>
          ${dismissible ? '<button data-modal-close class="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Закрыть">✕</button>' : ''}
        </div>
        <div data-modal-body>${body}</div>
        <div data-modal-actions class="mt-6 flex flex-wrap justify-end gap-2"></div>
      </div>
    </div>
  `;
  const actionsEl = root.querySelector('[data-modal-actions]');
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.className = a.primary
      ? 'rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-purple-700 hover:to-indigo-500'
      : 'rounded-2xl border border-white/40 bg-white/70 px-4 py-2 font-semibold text-slate-800 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800';
    if (a.disabled) { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); }
    btn.addEventListener('click', () => {
      const res = a.onClick?.(root.querySelector('[data-modal-body]'));
      if (res !== false) closeModal();
    });
    actionsEl.appendChild(btn);
  }
  if (dismissible) {
    root.querySelector('[data-modal-close]')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', escHandler);
  }
  return root.querySelector('[data-modal-body]');
}

export function toast(text, kind = 'info') {
  const div = document.createElement('div');
  const colors = {
    info: 'bg-slate-900/90 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warn: 'bg-amber-500 text-slate-900',
  };
  div.className = `fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-2 shadow-lg ${colors[kind] || colors.info}`;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3200);
}
