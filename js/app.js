import { initModelBrowser } from './helpers.js';

const sections = [
  { slug: 'introduction', title: 'Introduction', description: 'Overview of the Wiro API platform' },
  { slug: 'authentication', title: 'Authentication', description: 'Two authentication methods' },
  { slug: 'projects', title: 'Projects', description: 'Create and manage API keys' },
  { slug: 'models', title: 'Models', description: 'Browse and search AI models' },
  { slug: 'run-a-model', title: 'Run a Model', description: 'Execute AI models via API' },
  { slug: 'model-parameters', title: 'Model Parameters', description: 'Parameter types, file uploads, and content types' },
  { slug: 'tasks', title: 'Tasks', description: 'Track task status and results' },
  { slug: 'llm-chat-streaming', title: 'LLM & Chat Streaming', description: 'Stream LLM responses with thinking/answer separation and chat history' },
  { slug: 'websocket', title: 'WebSocket', description: 'Real-time task updates' },
  { slug: 'realtime-voice-conversation', title: 'Realtime Voice', description: 'Build voice conversation apps with realtime AI models' },
  { slug: 'files', title: 'Files', description: 'Upload files and manage folders' },
  { slug: 'code-examples', title: 'Code Examples', description: 'Complete examples in 9 languages' },
];

const SHIKI_LANGS = ['bash', 'python', 'javascript', 'json', 'php', 'csharp', 'go', 'swift', 'kotlin', 'dart'];

let highlighter = null;
let currentSlug = null;
let currentCodeExamples = null;
let currentCodeExamplesRaw = null;
let activeCodeTab = null;

async function initHighlighter() {
  try {
    const { createHighlighter } = await import('https://esm.sh/shiki@3');
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: SHIKI_LANGS,
    });
    if (currentSlug) {
      const activeEl = document.querySelector(`.docs-page-section[data-page="${currentSlug}"]`);
      if (activeEl) {
        const parsed = parseCodeExamples(activeEl);
        if (parsed && !Array.isArray(parsed)) {
          const firstKey = Object.keys(parsed)[0];
          renderCodePanel(parsed[firstKey]);
        } else {
          renderCodePanel(parsed);
        }
      }
    }
  } catch (e) {
    console.warn('Shiki failed to load, using plain text fallback:', e);
  }
}

function highlight(code, lang) {
  if (!highlighter || !SHIKI_LANGS.includes(lang)) {
    return `<pre style="background:transparent;margin:0;padding:16px"><code>${escapeHtml(code)}</code></pre>`;
  }
  return highlighter.codeToHtml(code, { lang, theme: 'github-dark' });
}

function getSlugFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return sections.find((s) => s.slug === hash) ? hash : 'introduction';
}

function getSectionIndex(slug) {
  return sections.findIndex((s) => s.slug === slug);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateNavActive(slug) {
  document.querySelectorAll('.docs-nav-link').forEach((link) => {
    link.classList.toggle('is-active', link.getAttribute('href') === `#/${slug}`);
  });
}

function updateMeta(section) {
  document.title = `${section.title} - Wiro API Docs`;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = section.description;
}

function renderPagination(slug) {
  const container = document.getElementById('docsPagination');
  if (!container) return;

  const idx = getSectionIndex(slug);
  let html = '';

  if (idx > 0) {
    const prev = sections[idx - 1];
    html += `<a href="#/${prev.slug}" class="docs-pagination-link prev">
      <i class="lni lni-arrow-left"></i>
      <span><small>Previous</small>${prev.title}</span>
    </a>`;
  }

  if (idx < sections.length - 1) {
    const next = sections[idx + 1];
    html += `<a href="#/${next.slug}" class="docs-pagination-link next">
      <span><small>Next</small>${next.title}</span>
      <i class="lni lni-arrow-right"></i>
    </a>`;
  }

  container.innerHTML = html;
}

function renderCodePanel(examples) {
  const content = document.getElementById('codePanelContent');
  if (!content) return;

  if (!examples || examples.length === 0) {
    content.innerHTML = '';
    activeCodeTab = null;
    currentCodeExamples = null;
    return;
  }

  currentCodeExamples = examples;
  activeCodeTab = 0;

  const tabs = examples
    .map((ex, i) => {
      const label = ex.label || ex.language || ex.lang;
      return `<button class="docs-code-tab${i === 0 ? ' is-active' : ''}" data-idx="${i}">${label}</button>`;
    })
    .join('');

  const firstExample = examples[0];
  const highlighted = highlight(firstExample.code, firstExample.language || firstExample.lang);

  content.innerHTML = `
    <div class="docs-code-panel">
      <div class="docs-code-panel-title">Code Examples</div>
      <div class="docs-code-tabs">${tabs}</div>
      <div class="docs-code-content">
        <button class="docs-code-copy" title="Copy to clipboard"><i class="lni lni-clipboard"></i></button>
        <div class="docs-code-rendered">${highlighted}</div>
      </div>
    </div>
  `;

  content.querySelectorAll('.docs-code-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchCodeTab(parseInt(tab.dataset.idx)));
  });

  content.querySelector('.docs-code-copy').addEventListener('click', copyCurrentCode);
}

function switchCodeTab(idx) {
  if (!currentCodeExamples || idx >= currentCodeExamples.length) return;
  activeCodeTab = idx;

  const content = document.getElementById('codePanelContent');
  if (!content) return;

  content.querySelectorAll('.docs-code-tab').forEach((tab) => {
    tab.classList.toggle('is-active', parseInt(tab.dataset.idx) === idx);
  });

  const example = currentCodeExamples[idx];
  if (!example) return;

  const rendered = content.querySelector('.docs-code-rendered');
  rendered.innerHTML = highlight(example.code, example.language || example.lang);
}

function copyCurrentCode() {
  if (!currentCodeExamples || activeCodeTab === null) return;
  const example = currentCodeExamples[activeCodeTab];
  if (!example) return;

  navigator.clipboard.writeText(example.code).then(() => {
    showToast('Copied to clipboard');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = example.code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard');
  });
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2000);
}

function parseCodeExamples(sectionEl) {
  const scriptTag = sectionEl.querySelector('script.code-examples-data');
  if (!scriptTag) return null;
  try {
    return JSON.parse(scriptTag.textContent);
  } catch {
    return null;
  }
}

function showSection(slug) {
  if (currentSlug === slug) return;
  currentSlug = slug;

  const section = sections.find((s) => s.slug === slug);
  if (!section) return;

  updateNavActive(slug);
  updateMeta(section);

  document.querySelectorAll('.docs-page-section').forEach((el) => {
    el.style.display = el.dataset.page === slug ? 'block' : 'none';
  });

  const activeEl = document.querySelector(`.docs-page-section[data-page="${slug}"]`);
  if (activeEl) {
    const parsed = parseCodeExamples(activeEl);

    if (parsed && !Array.isArray(parsed)) {
      currentCodeExamplesRaw = parsed;
      const firstKey = Object.keys(parsed)[0];
      renderCodePanel(parsed[firstKey]);
    } else {
      currentCodeExamplesRaw = null;
      renderCodePanel(parsed);
    }
  } else {
    currentCodeExamplesRaw = null;
    renderCodePanel(null);
  }

  renderPagination(slug);
  closeCodeDrawer();

  window.scrollTo({ top: 0, behavior: 'instant' });

  initSectionFeatures(slug);
}

function initSectionFeatures(slug) {
  if (slug === 'authentication') initAuthToggle();
  if (slug === 'models') initModelBrowser();
}

let authToggleInitialized = false;

function initAuthToggle() {
  if (authToggleInitialized || !currentCodeExamplesRaw) return;
  authToggleInitialized = true;

  const buttons = document.querySelectorAll('[data-method]');
  const contentSections = document.querySelectorAll('.auth-content');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.dataset.method;

      contentSections.forEach((el) => {
        el.style.display = el.id === `auth-${method}` ? '' : 'none';
      });

      if (currentCodeExamplesRaw[method]) {
        renderCodePanel(currentCodeExamplesRaw[method]);
      }
    });
  });
}


function initDarkMode() {
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('wiro-docs-dark');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;

  if (isDark) document.body.classList.add('is-dark');
  updateDarkModeIcon(isDark);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const dark = document.body.classList.toggle('is-dark');
      localStorage.setItem('wiro-docs-dark', dark);
      updateDarkModeIcon(dark);
    });
  }
}

function updateDarkModeIcon(isDark) {
  const icon = document.querySelector('#themeToggle i');
  if (icon) icon.className = isDark ? 'lni lni-sun' : 'lni lni-night';
}

function initMobileNav() {
  const menuToggle = document.getElementById('mobileNavToggle');
  const navWrapper = document.getElementById('navWrapper');
  if (!menuToggle || !navWrapper) return;

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navWrapper.classList.toggle('is-open');
  });

  navWrapper.querySelectorAll('.docs-nav-link').forEach((link) => {
    link.addEventListener('click', () => navWrapper.classList.remove('is-open'));
  });

  document.addEventListener('click', (e) => {
    if (!navWrapper.contains(e.target) && !menuToggle.contains(e.target)) {
      navWrapper.classList.remove('is-open');
    }
  });
}

function initCodeDrawer() {
  const toggleBtn = document.getElementById('codePanelToggle');
  const panel = document.getElementById('codePanel');
  const closeBtn = document.getElementById('codePanelClose');
  const overlay = document.getElementById('codePanelOverlay');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('is-open');
      if (overlay) overlay.classList.toggle('is-open');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeCodeDrawer);
  if (overlay) overlay.addEventListener('click', closeCodeDrawer);
}

function closeCodeDrawer() {
  const panel = document.getElementById('codePanel');
  const overlay = document.getElementById('codePanelOverlay');
  if (panel) panel.classList.remove('is-open');
  if (overlay) overlay.classList.remove('is-open');
}

function onHashChange() {
  showSection(getSlugFromHash());
}

/** Each section's View/Download buttons use markdown/{slug}.md — slug comes from data-page (same as #/slug). */
function initMarkdownSectionLinks() {
  document.querySelectorAll('.docs-page-section[data-page]').forEach((section) => {
    const slug = section.getAttribute('data-page');
    if (!slug) return;
    const path = `markdown/${slug}.md`;
    section.querySelectorAll('.docs-section-md-row .docs-section-md-btn').forEach((a) => {
      a.setAttribute('href', path);
    });
  });
}

function init() {
  initDarkMode();
  initMobileNav();
  initCodeDrawer();
  initMarkdownSectionLinks();

  window.addEventListener('hashchange', onHashChange);

  const slug = getSlugFromHash();
  if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
    window.location.hash = `#/${slug}`;
  } else {
    showSection(slug);
  }

  initHighlighter();
}

init();
