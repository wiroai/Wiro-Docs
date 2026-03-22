import { initModelBrowser } from './helpers.js';

const sections = [
  { slug: 'introduction', title: 'Introduction', description: 'Wiro is a unified AI API platform that lets you run any model — video, image, audio, LLM, 3D — with a single API key and pay-per-use pricing.' },
  { slug: 'authentication', title: 'Authentication', description: 'Authenticate with the Wiro API using Bearer tokens or query-string API keys. Learn how to generate and manage your credentials securely.' },
  { slug: 'projects', title: 'Projects', description: 'Create projects to organize your Wiro API usage. Each project has its own API key, usage tracking, and webhook configuration.' },
  { slug: 'models', title: 'Models', description: 'Browse, search, and discover AI models on Wiro. Filter by category, view pricing, parameters, and sample outputs for each model.' },
  { slug: 'run-a-model', title: 'Run a Model', description: 'Execute any AI model on Wiro with a single POST request. Pass parameters, upload files, and receive outputs — all through one unified endpoint.' },
  { slug: 'model-parameters', title: 'Model Parameters', description: 'Understand Wiro model parameter types including text, numeric, file uploads, dropdowns, and boolean inputs. Learn about content-type handling.' },
  { slug: 'tasks', title: 'Tasks', description: 'Track the status and results of your Wiro API tasks. Poll for completion, retrieve outputs, and handle asynchronous model execution.' },
  { slug: 'llm-chat-streaming', title: 'LLM & Chat Streaming', description: 'Stream large language model responses in real time with Server-Sent Events. Supports thinking/answer separation and multi-turn chat history.' },
  { slug: 'websocket', title: 'WebSocket', description: 'Receive real-time task progress and completion updates via WebSocket connections. Avoid polling and get instant status changes for your Wiro tasks.' },
  { slug: 'realtime-voice-conversation', title: 'Realtime Voice', description: 'Build interactive voice conversation applications using Wiro realtime AI models. Stream audio input and receive spoken responses in real time.' },
  { slug: 'files', title: 'Files', description: 'Upload files to Wiro for use as model inputs. Manage folders, retrieve file metadata, and reference uploaded assets across multiple API calls.' },
  { slug: 'pricing', title: 'Pricing', description: 'Wiro uses pay-per-use pricing with no subscriptions. Each model has its own cost per run. Add credits to your account and pay only for what you use.' },
  { slug: 'concurrency-limits', title: 'Concurrency Limits', description: 'Understand Wiro API concurrency limits per plan tier. Learn how concurrent task slots work and how to upgrade for higher throughput.' },
  { slug: 'error-reference', title: 'Error Reference', description: 'Complete reference of Wiro API error codes and messages. Troubleshoot authentication failures, rate limits, invalid parameters, and more.' },
  { slug: 'faq', title: 'FAQ', description: 'Frequently asked questions about the Wiro API — covering authentication, billing, model support, rate limits, webhooks, and integrations.' },
  { slug: 'code-examples', title: 'Code Examples', description: 'Ready-to-use Wiro API code examples in 9 languages: cURL, Python, Node.js, PHP, C#, Go, Swift, Kotlin, and Dart.' },
  { slug: 'wiro-mcp-server', title: 'Wiro MCP Server', description: 'Connect AI coding assistants like Cursor, Claude, and Windsurf to all Wiro models using the Model Context Protocol (MCP) server.' },
  { slug: 'mcp-self-hosted', title: 'Self-Hosted MCP', description: 'Run the Wiro MCP server locally on your machine. Full control over configuration, environment variables, and model access for AI assistants.' },
  { slug: 'n8n-wiro-integration', title: 'n8n Wiro Integration', description: 'Use all Wiro AI models as drag-and-drop nodes in n8n workflows. Install the community node for video, image, audio, LLM, and 3D automation.' },
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

const BASE_PATH = detectBasePath();

function detectBasePath() {
  const el = document.documentElement;
  if (el.hasAttribute('data-base-path')) return el.dataset.basePath;
  return '/docs';
}

function getSlugFromPath() {
  const path = window.location.pathname.replace(/\/$/, '');
  const prefix = BASE_PATH ? BASE_PATH + '/' : '/';
  const slug = path.startsWith(prefix) ? path.slice(prefix.length) : '';
  return sections.find((s) => s.slug === slug) ? slug : 'introduction';
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
    link.classList.toggle('is-active', link.getAttribute('href') === `${BASE_PATH}/${slug}`);
  });
}

function setMeta(attr, value, content) {
  let el = document.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr.replace('property', 'property').replace('name', 'name'), value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateMeta(section) {
  const title = `${section.title} - Wiro API Docs`;
  const url = `https://wiro.ai${BASE_PATH}/${section.slug}`;

  document.title = title;

  setMeta('name', 'description', section.description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', section.description);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', section.description);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function renderPagination(slug) {
  const container = document.getElementById('docsPagination');
  if (!container) return;

  const idx = getSectionIndex(slug);
  let html = '';

  if (idx > 0) {
    const prev = sections[idx - 1];
    html += `<a href="${BASE_PATH}/${prev.slug}" class="docs-pagination-link prev">
      <i class="lni lni-arrow-left"></i>
      <span><small>Previous</small>${prev.title}</span>
    </a>`;
  }

  if (idx < sections.length - 1) {
    const next = sections[idx + 1];
    html += `<a href="${BASE_PATH}/${next.slug}" class="docs-pagination-link next">
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

  const rightPanel = document.getElementById('codePanel');
  const center = document.querySelector('.docs-center');
  if (rightPanel && center) {
    const hasCode = currentCodeExamples && currentCodeExamples.length > 0;
    rightPanel.classList.toggle('is-empty', !hasCode);
    center.classList.toggle('no-code-panel', !hasCode);
  }

  renderPagination(slug);
  closeCodeDrawer();

  window.scrollTo({ top: 0, behavior: 'instant' });

  initSectionFeatures(slug);
}

function initSectionFeatures(slug) {
  if (slug === 'authentication') initAuthToggle();
  if (slug === 'models') initModelBrowser();
  if (slug === 'faq') initFaqAccordion();
}

let faqInitialized = false;

function initFaqAccordion() {
  if (faqInitialized) return;
  faqInitialized = true;

  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const wasOpen = item.classList.contains('is-open');
      item.classList.toggle('is-open', !wasOpen);
    });
  });
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
    const open = navWrapper.classList.toggle('is-open');
    menuToggle.classList.toggle('is-nav-open', open);
  });

  navWrapper.querySelectorAll('.docs-nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navWrapper.classList.remove('is-open');
      menuToggle.classList.remove('is-nav-open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navWrapper.contains(e.target) && !menuToggle.contains(e.target)) {
      navWrapper.classList.remove('is-open');
      menuToggle.classList.remove('is-nav-open');
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

function navigateTo(slug) {
  if (slug === currentSlug) return;
  history.pushState({ slug }, '', `${BASE_PATH}/${slug}`);
  showSection(slug);
}

function onPopState() {
  showSection(getSlugFromPath());
}

function initLinkInterception() {
  const prefix = BASE_PATH ? BASE_PATH + '/' : '/';

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || !href.startsWith(prefix)) return;
    if (link.target === '_blank') return;

    const slug = href.slice(prefix.length);
    if (!slug || !sections.find((s) => s.slug === slug)) return;

    e.preventDefault();
    navigateTo(slug);
  });
}

/** Each section's View/Download buttons use markdown/{slug}.md — slug comes from data-page. */
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
  initLinkInterception();

  window.addEventListener('popstate', onPopState);

  const slug = getSlugFromPath();
  const rootPaths = BASE_PATH ? [BASE_PATH, BASE_PATH + '/'] : ['/', ''];
  if (rootPaths.includes(window.location.pathname)) {
    history.replaceState({ slug }, '', `${BASE_PATH}/${slug}`);
  }
  showSection(slug);

  initHighlighter();
}

init();
