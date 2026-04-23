(function () {
  const THEME_KEY = "vibe-theme";

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }

  function getPreferredTheme() {
    const stored = readStoredTheme();
    if (stored === "light" || stored === "dark") return stored;
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    return mql && mql.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {}
  }

  function initThemeToggle() {
    applyTheme(getPreferredTheme());
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const root = document.documentElement;
      const current = root.classList.contains("dark") ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  function renderNav() {
    const placeholder = document.getElementById("nav-placeholder");
    if (!placeholder) return;
    placeholder.innerHTML = `
      <header class="sticky top-0 z-10 border-b border-white/20 bg-white/50 backdrop-blur-xl dark:bg-slate-950/40 dark:border-white/10">
        <nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div class="flex items-center gap-2 font-extrabold tracking-tight">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">🏗️</span>
            <span>Строительная Империя</span>
          </div>
          <button id="themeToggle" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/60 shadow-sm transition hover:bg-white/80 active:scale-[0.98] dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/10" aria-label="Переключить тему" title="Переключить тему">
            <span class="text-lg leading-none">🌓</span>
          </button>
        </nav>
      </header>
    `;
  }

  renderNav();
  initThemeToggle();
})();
