import { on } from '../bus.js';

const tabRenderers = new Map();
const tabSubscriptions = new Map();
let currentState = null;
let activeTab = 'dashboard';
let panelEls = {};

export function registerTab(name, renderer, slices = []) {
  tabRenderers.set(name, renderer);
  tabSubscriptions.set(name, slices);
}

export function mountRender(state) {
  currentState = state;
  // collect panel elements
  document.querySelectorAll('[data-tab-panel]').forEach(el => {
    panelEls[el.dataset.tabPanel] = el;
  });
  activeTab = state.ui.activeTab || 'dashboard';

  // subscribe each tab to its slices; when dirty, re-render only if it's the visible tab
  for (const [tab, slices] of tabSubscriptions) {
    for (const s of slices) {
      on(s, () => {
        if (activeTab === tab) renderActive();
      });
    }
  }
  showTab(activeTab);
}

export function showTab(tab) {
  activeTab = tab;
  currentState.ui.activeTab = tab;
  for (const [name, el] of Object.entries(panelEls)) {
    el.hidden = name !== tab;
  }
  // highlight tab button
  document.querySelectorAll('[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.setAttribute('aria-current', active ? 'page' : 'false');
    btn.classList.toggle('bg-white/80', active);
    btn.classList.toggle('dark:bg-white/15', active);
    btn.classList.toggle('text-slate-900', active);
    btn.classList.toggle('dark:text-white', active);
  });
  renderActive();
}

export function renderActive() {
  const fn = tabRenderers.get(activeTab);
  const el = panelEls[activeTab];
  if (fn && el && currentState) fn(currentState, el);
}
