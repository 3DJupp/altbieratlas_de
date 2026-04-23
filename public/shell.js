// Altbieratlas — Shared layout (header, footer, cookie banner)
// Jede Seite ruft renderShell() auf.

window.renderShell = function ({ activeNav }) {
  const cfg = window.ATLAS_CONFIG;
  const consent = localStorage.getItem("atlas-consent");

  // ---- Header ----
  const header = `
    <header class="atlas-header">
      <div class="container inner">
        <a class="brand" href="index.html">
          <span class="mark" aria-hidden="true">A</span>
          <span class="wordmark">Altbieratlas</span>
        </a>
        <nav class="nav" aria-label="primary">
          <a href="index.html" class="${activeNav === "map" ? "active" : ""}" data-i18n="nav.map">Karte</a>
          <a href="ranglisten.html" class="${activeNav === "rankings" ? "active" : ""}" data-i18n="nav.rankings">Ranglisten</a>
          <a href="wissen.html" class="${activeNav === "knowledge" ? "active" : ""}" data-i18n="nav.knowledge">Wissen</a>
          <a href="beitragen.html" class="${activeNav === "contribute" ? "active" : ""} hide-sm" data-i18n="nav.contribute">Beitragen</a>
          <button class="lang-toggle" id="lang-toggle" title="Sprache / Language">
            <span data-lang-de>DE</span> · <span data-lang-en>EN</span>
          </button>
          <button class="theme-toggle" id="theme-toggle" aria-label="Theme">☾</button>
        </nav>
      </div>
    </header>
  `;

  // ---- Social-Links im Footer (werden bei atlas:config-ready neu gerendert) ----
  function renderSocialRow() {
    const author = cfg.author || {};
    const socialLinks = [];
    if (author.github) {
      socialLinks.push(`<a href="${author.github}" target="_blank" rel="noopener" class="social-link" aria-label="GitHub">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
        <span>GitHub</span></a>`);
    }
    if (author.linkedin) {
      socialLinks.push(`<a href="${author.linkedin}" target="_blank" rel="noopener" class="social-link" aria-label="LinkedIn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.632 13.635h-2.37V9.922c0-.886-.018-2.025-1.235-2.025-1.235 0-1.424.964-1.424 1.961v3.777h-2.37V6H8.51v1.04h.03c.318-.6 1.093-1.233 2.25-1.233 2.4 0 2.843 1.581 2.843 3.637v4.19ZM3.558 4.96a1.374 1.374 0 1 1 0-2.748 1.374 1.374 0 0 1 0 2.748ZM4.747 13.635H2.368V6h2.379v7.635ZM14.816 0H1.18C.528 0 0 .516 0 1.153v13.694C0 15.484.528 16 1.18 16h13.635c.652 0 1.185-.516 1.185-1.153V1.153C16 .516 15.467 0 14.816 0Z"/></svg>
        <span>LinkedIn</span></a>`);
    }
    if (author.website) {
      socialLinks.push(`<a href="${author.website}" target="_blank" rel="noopener" class="social-link" aria-label="Website">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8c0-.86.14-1.69.4-2.46l3.68 3.68v.78c0 .55.45 1 1 1h.57v2.9A6.5 6.5 0 0 1 1.5 8Zm11.67 4.34A6.48 6.48 0 0 1 9 14.4v-.7a1 1 0 0 0-1-1h-.57v-2.15l3.4-3.4A6.5 6.5 0 0 1 13.17 12.34ZM8 6.5h.5v-.43a1 1 0 0 0-1-1h-.5V3.93c.83-.5 1.83-.75 2.87-.68l-.87 1.72L10.43 6.5H8Z"/></svg>
        <span>Website</span></a>`);
    }
    const host = document.getElementById("shell-social");
    if (!host) return;
    if (!socialLinks.length) { host.innerHTML = ""; return; }
    host.innerHTML = `
      <div class="social-row">
        <span class="social-label" data-i18n="footer.author">Entwickelt von</span>
        ${author.name ? `<span class="social-name">${author.name}</span>` : ""}
        <div class="social-icons">${socialLinks.join("")}</div>
      </div>`;
    // i18n für das neu eingefügte Label
    if (window.setLang) window.setLang(window.__atlasLang);
  }

  // ---- Footer ----
  const footer = `
    <footer class="atlas-footer">
      <div class="container">
        <div class="grid">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <span class="brand"><span class="mark">A</span><span class="wordmark">Altbieratlas</span></span>
            </div>
            <p data-i18n="footer.madeWith">Mit Liebe für das rheinische Bier gebaut. Gemeinschaftlich gepflegt.</p>
            <div id="shell-social"></div>
          </div>
          <div>
            <h4 data-i18n="footer.contribute">Mitmachen</h4>
            <ul>
              <li><a href="beitragen.html?typ=preis" data-i18n="contrib.type.price">Preis melden</a></li>
              <li><a href="beitragen.html?typ=brauerei" data-i18n="contrib.type.brewery">Brauerei eintragen</a></li>
              <li><a href="beitragen.html?typ=sorte" data-i18n="contrib.type.style">Sorte ergänzen</a></li>
              <li><a href="beitragen.html?typ=event" data-i18n="contrib.type.event">Event melden</a></li>
            </ul>
          </div>
          <div>
            <h4 data-i18n="footer.about">Über den Atlas</h4>
            <ul>
              <li><a href="wissen.html" data-i18n="know.title">Altbier-Wissen</a></li>
              <li><a href="ranglisten.html" data-i18n="nav.rankings">Ranglisten</a></li>
              ${cfg.features && cfg.features.admin ? `<li><a href="admin.html" data-i18n="nav.admin">Admin</a></li>` : ""}
            </ul>
          </div>
          <div>
            <h4 data-i18n="footer.legal">Rechtliches</h4>
            <ul>
              <li><a href="impressum.html" data-i18n="nav.imprint">Impressum</a></li>
              <li><a href="impressum.html#datenschutz">Datenschutz</a></li>
              <li><a href="#" id="cookie-open" data-i18n="cookie.settings">Cookie-Einstellungen</a></li>
            </ul>
          </div>
        </div>
        <div class="bottom">
          <span>© ${new Date().getFullYear()} Altbieratlas</span>
          <span id="atlas-mode-tag" class="mono">v0.2 · <span id="atlas-mode">…</span></span>
        </div>
      </div>
    </footer>
  `;

  // ---- Cookie banner ----
  const cookieBanner = `
    <div class="cookie-banner ${consent ? "hidden" : ""}" id="cookie-banner" role="dialog" aria-live="polite">
      <p data-i18n="cookie.text">Wir verwenden notwendige Cookies...</p>
      <div class="actions">
        <button class="btn btn-ghost" id="cookie-essential" data-i18n="cookie.essential">Nur notwendige</button>
        <button class="btn btn-primary" id="cookie-accept" data-i18n="cookie.accept">Alle akzeptieren</button>
      </div>
    </div>
  `;

  document.getElementById("shell-header").innerHTML = header;
  document.getElementById("shell-footer").innerHTML = footer;
  document.getElementById("shell-cookie").innerHTML = cookieBanner;

  // Social-Row initial (mit ggf. leeren Defaults) + neu rendern, sobald die
  // Server-Config nachgeladen ist.
  renderSocialRow();
  document.addEventListener("atlas:config-ready", renderSocialRow);

  // Mode-Badge im Footer (wird von api-client gesetzt)
  function paintMode() {
    const el = document.getElementById("atlas-mode");
    if (!el) return;
    const m = window.ATLAS_MODE;
    el.textContent = m === "live" ? "live" : m === "mock" ? "mock" : "probing…";
    el.className = "mode-" + (m || "unknown");
  }
  document.addEventListener("atlas:mode-ready", paintMode);
  paintMode();

  // ---- Bind: lang ----
  const langBtn = document.getElementById("lang-toggle");
  function paintLang() {
    const de = langBtn.querySelector("[data-lang-de]");
    const en = langBtn.querySelector("[data-lang-en]");
    de.classList.toggle("active", window.__atlasLang === "de");
    en.classList.toggle("active", window.__atlasLang === "en");
  }
  langBtn.addEventListener("click", () => {
    window.setLang(window.__atlasLang === "de" ? "en" : "de");
    paintLang();
  });
  paintLang();

  // ---- Bind: theme ----
  const themeBtn = document.getElementById("theme-toggle");
  function paintTheme() {
    const t = document.documentElement.getAttribute("data-theme") || "light";
    themeBtn.textContent = t === "dark" ? "☀" : "☾";
  }
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("atlas-theme", next);
    paintTheme();
    document.dispatchEvent(new CustomEvent("atlas:theme-changed", { detail: next }));
  });
  const savedTheme = localStorage.getItem("atlas-theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  paintTheme();

  // Cookie handlers
  const banner = document.getElementById("cookie-banner");
  document.getElementById("cookie-accept").addEventListener("click", () => {
    localStorage.setItem("atlas-consent", "all");
    banner.classList.add("hidden");
    window.ATLAS_CONFIG.analyticsEnabled = true;
    loadAnalytics();
  });
  document.getElementById("cookie-essential").addEventListener("click", () => {
    localStorage.setItem("atlas-consent", "essential");
    banner.classList.add("hidden");
  });
  const cookieOpen = document.getElementById("cookie-open");
  if (cookieOpen) {
    cookieOpen.addEventListener("click", (e) => {
      e.preventDefault();
      banner.classList.remove("hidden");
    });
  }

  window.setLang(window.__atlasLang);

  if (consent === "all") {
    window.ATLAS_CONFIG.analyticsEnabled = true;
    // GA4-ID kommt evtl. erst vom Server; dann neu laden
    loadAnalytics();
    document.addEventListener("atlas:config-ready", () => loadAnalytics());
  }
};

// GA4 stub — lädt nur wenn Consent UND echter Measurement-ID gesetzt ist
function loadAnalytics() {
  const id = window.ATLAS_CONFIG.ga4MeasurementId;
  if (!id || id === "G-XXXXXXXXXX") {
    console.info("[atlas] GA4 placeholder — set ga4MeasurementId in config.js to enable.");
    return;
  }
  if (document.getElementById("ga4-script")) return;
  const s = document.createElement("script");
  s.id = "ga4-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });
}

window.atlasTrack = function (event, params = {}) {
  if (!window.ATLAS_CONFIG.analyticsEnabled) return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
};
