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
    } catch (_) {
      // ignore storage errors
    }
  }

  function initThemeToggle() {
    applyTheme(getPreferredTheme());

    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const root = document.documentElement;
      const current = root.classList.contains("dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  function renderNav() {
    const placeholder = document.getElementById("nav-placeholder");
    if (!placeholder) return;

    const page = document.body.dataset.page || "";
    const isHome = page === "home";
    const isAbout = page === "about";
    const isGame = page === "game";

    const homeClassesActive =
      "rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/15";
    const homeClassesInactive =
      "rounded-lg px-3 py-2 text-sm font-semibold text-slate-900/80 hover:bg-white/60 hover:text-slate-900 dark:text-slate-100/80 dark:hover:bg-white/10 dark:hover:text-white";

    const aboutClassesActive = homeClassesActive;
    const aboutClassesInactive = homeClassesInactive;
    const gameClassesActive = homeClassesActive;
    const gameClassesInactive = homeClassesInactive;

    const homeAttrs = isHome ? ' aria-current="page"' : "";
    const aboutAttrs = isAbout ? ' aria-current="page"' : "";
    const gameAttrs = isGame ? ' aria-current="page"' : "";

    placeholder.innerHTML = `
      <header class="sticky top-0 z-10 border-b border-white/20 bg-white/50 backdrop-blur-xl dark:bg-slate-950/40 dark:border-white/10">
        <nav class="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <a href="./index.html" class="flex items-center gap-2 font-extrabold tracking-tight">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm">V</span>
            <span>My Vibe App</span>
          </a>
          <div class="flex items-center gap-2">
            <a href="./index.html"${homeAttrs} class="${isHome ? homeClassesActive : homeClassesInactive}">
              Home
            </a>
            <a href="./about.html"${aboutAttrs} class="${isAbout ? aboutClassesActive : aboutClassesInactive}">
              About
            </a>
            <a href="./game.html"${gameAttrs} class="${isGame ? gameClassesActive : gameClassesInactive}">
              Игра
            </a>
            <button id="themeToggle" type="button" class="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/60 shadow-sm transition hover:bg-white/80 active:scale-[0.98] dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/10" aria-label="Переключить тему" title="Переключить тему">
              <span class="text-lg leading-none">🌓</span>
            </button>
          </div>
        </nav>
      </header>
    `;
  }

  renderNav();
  initThemeToggle();
})();

