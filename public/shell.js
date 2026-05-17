// Altbieratlas — Shared layout (header, footer, cookie banner)
// Jede Seite ruft renderShell() auf.

window.renderShell = function ({ activeNav }) {
  const cfg = window.ATLAS_CONFIG;
  const consent = localStorage.getItem("atlas-consent");

  // ---- Header ----
  const header = `
    <header class="atlas-header">
      <div class="container inner">
        <a class="brand" href="/">
          <span class="mark" aria-hidden="true">A</span>
          <span class="wordmark">Altbieratlas</span>
        </a>
        <nav class="nav" aria-label="primary">
          <a href="/" class="${activeNav === "map" ? "active" : ""}" data-i18n="nav.map">Karte</a>
          <a href="/ranglisten" class="${activeNav === "rankings" ? "active" : ""}" data-i18n="nav.rankings">Ranglisten</a>
          <a href="/wissen" class="${activeNav === "knowledge" ? "active" : ""}" data-i18n="nav.knowledge">Wissen</a>
          <a href="/beitragen" class="${activeNav === "contribute" ? "active" : ""}" data-i18n="nav.contribute">Beitragen</a>
        </nav>
        <div class="header-controls">
          <button class="lang-toggle" id="lang-toggle" title="Sprache / Language">DE</button>
          <button class="theme-toggle" id="theme-toggle" aria-label="Theme">☾</button>
          <button class="hamburger" id="hamburger" aria-label="Menü öffnen" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="Hauptnavigation" hidden>
        <a href="/" class="${activeNav === "map" ? "active" : ""}" data-i18n="nav.map">Karte</a>
        <a href="/ranglisten" class="${activeNav === "rankings" ? "active" : ""}" data-i18n="nav.rankings">Ranglisten</a>
        <a href="/wissen" class="${activeNav === "knowledge" ? "active" : ""}" data-i18n="nav.knowledge">Wissen</a>
        <a href="/beitragen" class="${activeNav === "contribute" ? "active" : ""}" data-i18n="nav.contribute">Beitragen</a>
      </nav>
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
    if (author.instagram) {
      socialLinks.push(`<a href="${author.instagram}" target="_blank" rel="noopener" class="social-link" aria-label="Instagram">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>
        <span>Instagram</span></a>`);
    }
    if (author.mastodon) {
      socialLinks.push(`<a href="${author.mastodon}" target="_blank" rel="noopener" class="social-link" aria-label="Mastodon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a3.614 3.614 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522c0-.859.22-1.541.66-2.046.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983l.417.695.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764.442.505.661 1.187.661 2.046v4.203z"/></svg>
        <span>Mastodon</span></a>`);
    }
    if (author.kofi) {
      socialLinks.push(`<a href="${author.kofi}" target="_blank" rel="noopener" class="social-link" aria-label="Ko-fi">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.5 3.5h-11A1.5 1.5 0 0 0 1 5v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 15 11V5a1.5 1.5 0 0 0-1.5-1.5zM10 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM4 7.5h3M4 9h1.5"/></svg>
        <span>Ko-fi</span></a>`);
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
              <li><a href="/beitragen?typ=preis" data-i18n="contrib.type.price">Preis melden</a></li>
              <li><a href="/beitragen?typ=ort" data-i18n="contrib.type.brewery">Ort eintragen</a></li>
              <li><a href="/beitragen?typ=sorte" data-i18n="contrib.type.style">Sorte ergänzen</a></li>
              <li><a href="/beitragen?typ=event" data-i18n="contrib.type.event">Event melden</a></li>
            </ul>
          </div>
          <div>
            <h4 data-i18n="footer.about">Über den Atlas</h4>
            <ul>
              <li><a href="/wissen" data-i18n="know.title">Altbier-Wissen</a></li>
              <li><a href="/ranglisten" data-i18n="nav.rankings">Ranglisten</a></li>
              ${cfg.features && cfg.features.admin ? `<li><a href="/admin" data-i18n="nav.admin">Admin</a></li>` : ""}
            </ul>
          </div>
          <div>
            <h4 data-i18n="footer.legal">Rechtliches</h4>
            <ul>
              <li><a href="/impressum" data-i18n="nav.imprint">Impressum</a></li>
              <li><a href="/impressum#datenschutz" data-i18n="footer.privacy">Datenschutz</a></li>
            </ul>
          </div>
        </div>
        <div class="bottom">
          <span>© ${new Date().getFullYear()} Altbieratlas</span>
          <span id="atlas-mode-tag" class="mono"><span id="atlas-version">${cfg.version ? "v" + cfg.version : ""}</span> · <span id="atlas-mode">…</span></span>
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

  // ---- Banner ----
  function renderBanner() {
    const b = cfg.banner;
    const el = document.getElementById("shell-banner");
    if (!el || el.dataset.dismissed === "1") return;
    if (!b || !b.enabled || b.enabled === "false") { el.innerHTML = ""; el.hidden = true; return; }
    const lang = window.__atlasLang || "de";
    const text = lang === "en" ? (b.text_en || b.text_de || "") : (b.text_de || b.text_en || "");
    if (!text) { el.innerHTML = ""; el.hidden = true; return; }
    el.innerHTML = `<div class="site-banner"><span>${text}</span><button class="banner-close" aria-label="Schließen" onclick="document.getElementById('shell-banner').dataset.dismissed='1';this.closest('.site-banner').remove()">×</button></div>`;
    el.hidden = false;
  }
  renderBanner();
  document.addEventListener("atlas:config-ready", renderBanner);
  document.addEventListener("atlas:lang-changed", renderBanner);

  // Social-Row initial (mit ggf. leeren Defaults) + neu rendern, sobald die
  // Server-Config nachgeladen ist.
  renderSocialRow();
  document.addEventListener("atlas:config-ready", renderSocialRow);

  // Versionsnummer aus Server-Config übernehmen, sobald verfügbar
  document.addEventListener("atlas:config-ready", () => {
    const vEl = document.getElementById("atlas-version");
    if (vEl && cfg.version) vEl.textContent = "v" + cfg.version;
  });

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
    langBtn.textContent = (window.__atlasLang === "de" ? "DE" : "EN");
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

  // Funktion global, damit sie von der Impressum-/Datenschutz-Seite
  // aus aufgerufen werden kann (Cookie-Einstellungen ändern).
  window.openCookieBanner = function () {
    banner.classList.remove("hidden");
  };

  // ---- Hamburger menu ----
  const hamburger = document.getElementById("hamburger");
  const mobileNav = document.getElementById("mobile-nav");
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !mobileNav.hidden;
    mobileNav.hidden = open;
    hamburger.setAttribute("aria-expanded", String(!open));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".atlas-header")) {
      mobileNav.hidden = true;
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !mobileNav.hidden) {
      mobileNav.hidden = true;
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
  // Close menu when a mobile nav link is clicked
  mobileNav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      mobileNav.hidden = true;
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

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
