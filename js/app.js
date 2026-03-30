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
  { slug: 'nodejs-library', title: 'Node.js Library', description: 'Use Wiro AI models directly in Node.js and TypeScript projects. Install @wiro-ai/wiro-mcp and use WiroClient for model discovery, execution, task polling, and file uploads.' },
  { slug: 'n8n-wiro-integration', title: 'n8n Wiro Integration', description: 'Use all Wiro AI models as drag-and-drop nodes in n8n workflows. Install the community node for video, image, audio, LLM, and 3D automation.' },
  { slug: 'agent-overview', title: 'Agent Overview', description: 'Deploy and manage autonomous AI agents with the Wiro Agent API. Browse the agent catalog, deploy instances, configure credentials, and control agent lifecycle.' },
  { slug: 'agent-messaging', title: 'Agent Messaging', description: 'Send messages to AI agents and receive streaming responses. Manage conversation sessions, poll message status, and handle async agent interactions.' },
  { slug: 'agent-websocket', title: 'Agent WebSocket', description: 'Receive real-time agent response streaming via WebSocket. Subscribe to agent events and display thinking, answer, and performance metrics live.' },
  { slug: 'agent-webhooks', title: 'Agent Webhooks', description: 'Receive agent response notifications via HTTP webhooks. Configure callback URLs for async message processing with automatic retries.' },
  { slug: 'agent-credentials', title: 'Agent Credentials & OAuth', description: 'Configure agent credentials via API keys or OAuth flows. Connect third-party services like Twitter, Google Ads, Meta Ads, HubSpot, and more.' },
  { slug: 'agent-use-cases', title: 'Agent Use Cases', description: 'Learn how to build products with Wiro Agents. Deploy agents for your customers, integrate OAuth flows, and create multi-agent workflows.' },
];

const SHIKI_LANGS = ['bash', 'python', 'javascript', 'typescript', 'json', 'php', 'csharp', 'go', 'swift', 'kotlin', 'dart'];

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
      highlightInlineCode(currentSlug);
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
  buildToc(slug);
  closeCodeDrawer();

  const centerEl = document.querySelector('.docs-center');
  if (centerEl) centerEl.scrollTo({ top: 0, behavior: 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });

  initSectionFeatures(slug);
}

function initSectionFeatures(slug) {
  if (slug === 'authentication') initAuthToggle();
  if (slug === 'models') initModelBrowser();
  if (slug === 'faq') initFaqAccordion();
  initSetupToggle(slug);
  highlightInlineCode(slug);
}

function initSetupToggle(slug) {
  const section = document.querySelector(`.docs-page-section[data-page="${slug}"]`);
  if (!section) return;

  section.querySelectorAll('.mcp-client-grid[data-toggle-group]').forEach((grid) => {
    if (grid.dataset.toggleInit) return;
    grid.dataset.toggleInit = '1';

    const groupName = grid.dataset.toggleGroup;
    const panels = section.querySelector(`[data-toggle-panels="${groupName}"]`);
    if (!panels) return;

    grid.querySelectorAll('.mcp-client-card[data-toggle-target]').forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = card.dataset.toggleTarget;

        grid.querySelectorAll('.mcp-client-card').forEach((c) => c.classList.remove('is-active'));
        card.classList.add('is-active');

        panels.querySelectorAll('.mcp-setup-panel').forEach((p) => p.classList.remove('is-visible'));
        const target = panels.querySelector(`#${targetId}`);
        if (target) target.classList.add('is-visible');
      });
    });
  });
}

function highlightInlineCode(slug) {
  if (!highlighter) return;
  const section = document.querySelector(`.docs-page-section[data-page="${slug}"]`);
  if (!section) return;

  section.querySelectorAll('pre > code').forEach((block) => {
    if (block.closest('.docs-code-rendered')) return;
    if (block.dataset.highlighted) return;

    const raw = block.textContent;
    const lang = detectLang(raw);
    if (!lang || !SHIKI_LANGS.includes(lang)) return;

    const html = highlighter.codeToHtml(raw, { lang, theme: 'github-dark' });
    const wrapper = block.closest('pre');
    wrapper.outerHTML = html;
  });
}

function detectLang(code) {
  const trimmed = code.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || (trimmed.startsWith('//') && trimmed.includes('{'))) return 'json';
  if (trimmed.startsWith('curl ') || trimmed.startsWith('#!/bin') || trimmed.startsWith('npm ') || trimmed.startsWith('git ') || trimmed.startsWith('export ') || trimmed.startsWith('claude ')) return 'bash';
  if (/^#\s/.test(trimmed) && trimmed.includes('curl ')) return 'bash';
  if (trimmed.startsWith('import ') && trimmed.includes('from ')) return trimmed.includes('import type ') ? 'typescript' : 'javascript';
  if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ') || trimmed.startsWith('async ') || trimmed.startsWith('function ')) return 'javascript';
  if (trimmed.startsWith('import requests') || trimmed.startsWith('import asyncio') || /^(def |class |from |async def )/.test(trimmed)) return 'python';
  if (trimmed.startsWith('<?php')) return 'php';
  if (trimmed.startsWith('package main')) return 'go';
  if (trimmed.startsWith('using ') || trimmed.startsWith('var client = new Http')) return 'csharp';
  if (trimmed.startsWith('import Foundation')) return 'swift';
  if (trimmed.startsWith("import 'dart:")) return 'dart';
  if (trimmed.startsWith('import java.') || /^val \w+ =/.test(trimmed)) return 'kotlin';
  return null;
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


let searchIndex = null;
let searchSelectedIdx = -1;
const RECENT_SEARCH_KEY = 'wiro-docs-recent-searches';
const MAX_RECENT = 8;

function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY)) || []; }
  catch { return []; }
}

function saveRecentSearch(entry) {
  const recents = getRecentSearches();
  const exists = recents.findIndex((r) => r.slug === entry.slug && r.headingId === entry.headingId);
  if (exists !== -1) recents.splice(exists, 1);
  recents.unshift({ slug: entry.slug, pageTitle: entry.pageTitle, headingId: entry.headingId, heading: entry.heading });
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function removeRecentSearch(index) {
  const recents = getRecentSearches();
  recents.splice(index, 1);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(recents));
}

function renderRecentSearches() {
  const container = document.getElementById('searchResults');
  if (!container) return;

  const recents = getRecentSearches();
  if (recents.length === 0) {
    container.innerHTML = '<div class="docs-search-empty">Type to search the documentation</div>';
    searchSelectedIdx = -1;
    return;
  }

  searchSelectedIdx = -1;
  container.innerHTML =
    '<div class="docs-search-recent-label">Recent searches</div>' +
    recents
      .map((r, i) => `<div class="docs-search-item" data-slug="${r.slug}" data-heading-id="${r.headingId || ''}">
        <div class="docs-search-item-breadcrumb">${escapeHtml(r.pageTitle)} › ${escapeHtml(r.heading)}</div>
        <div class="docs-search-item-title"><i class="lni lni-timer"></i> ${escapeHtml(r.heading)}</div>
        <button class="docs-search-item-remove" data-recent-idx="${i}" title="Remove">×</button>
      </div>`)
      .join('');
}

function buildSearchIndex() {
  const entries = [];

  document.querySelectorAll('.docs-page-section[data-page]').forEach((section) => {
    const slug = section.dataset.page;
    const sectionObj = sections.find((s) => s.slug === slug);
    if (!sectionObj) return;
    const pageTitle = sectionObj.title;

    section.querySelectorAll('h2, h3').forEach((heading) => {
      const id = heading.id || (heading.parentElement && heading.parentElement.id);
      const headingText = heading.textContent.trim();
      if (!headingText) return;

      let textParts = [];
      let sibling = heading.nextElementSibling;
      while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
        const t = sibling.textContent.trim();
        if (t) textParts.push(t);
        sibling = sibling.nextElementSibling;
        if (textParts.join(' ').length > 300) break;
      }

      entries.push({
        slug,
        pageTitle,
        headingId: id,
        heading: headingText,
        text: textParts.join(' ').slice(0, 300),
        searchable: (headingText + ' ' + textParts.join(' ')).toLowerCase(),
      });
    });
  });

  searchIndex = entries;
}

function searchDocs(query) {
  if (!searchIndex || !query) return [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const results = [];
  for (const entry of searchIndex) {
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      if (entry.searchable.includes(term)) {
        if (entry.heading.toLowerCase().includes(term)) score += 10;
        else score += 1;
      } else {
        allMatch = false;
        break;
      }
    }
    if (allMatch && score > 0) results.push({ ...entry, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 15);
}

function highlightMatch(text, query) {
  if (!query) return text;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let result = text;
  for (const term of terms) {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }
  return result;
}

function renderSearchResults(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (!query || query.length < 2) {
    renderRecentSearches();
    return;
  }

  const results = searchDocs(query);
  if (results.length === 0) {
    container.innerHTML = `<div class="docs-search-empty">No results for "${escapeHtml(query)}"</div>`;
    searchSelectedIdx = -1;
    return;
  }

  searchSelectedIdx = -1;
  container.innerHTML = results
    .map((r, i) => {
      const snippet = r.text ? highlightMatch(r.text.slice(0, 120), query) : '';
      return `<div class="docs-search-item" data-slug="${r.slug}" data-heading-id="${r.headingId || ''}">
        <div class="docs-search-item-breadcrumb">${escapeHtml(r.pageTitle)}${r.headingId ? ' › ' + escapeHtml(r.heading) : ''}</div>
        <div class="docs-search-item-title">${highlightMatch(r.heading, query)}</div>
        ${snippet ? `<div class="docs-search-item-snippet">${snippet}</div>` : ''}
      </div>`;
    })
    .join('');
}

function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  if (!overlay) return;

  if (!searchIndex) buildSearchIndex();

  overlay.classList.add('is-open');
  setTimeout(() => input && input.focus(), 50);
  renderRecentSearches();
}

function closeSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  if (overlay) overlay.classList.remove('is-open');
  if (input) input.value = '';
  searchSelectedIdx = -1;
}

function initSearch() {
  const trigger = document.getElementById('searchTrigger');
  const overlay = document.getElementById('searchOverlay');
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('searchInput');

  if (trigger) trigger.addEventListener('click', openSearch);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (!modal.contains(e.target)) closeSearch();
    });
  }

  if (input) {
    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => renderSearchResults(input.value.trim()), 80);
    });

    input.addEventListener('keydown', (e) => {
      const items = document.querySelectorAll('.docs-search-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchSelectedIdx = Math.min(searchSelectedIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('is-selected', i === searchSelectedIdx));
        items[searchSelectedIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle('is-selected', i === searchSelectedIdx));
        items[searchSelectedIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && searchSelectedIdx >= 0) {
        e.preventDefault();
        items[searchSelectedIdx]?.click();
      }
    });
  }

  document.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.docs-search-item-remove');
    if (removeBtn) {
      e.stopPropagation();
      const idx = parseInt(removeBtn.dataset.recentIdx, 10);
      removeRecentSearch(idx);
      renderRecentSearches();
      return;
    }

    const item = e.target.closest('.docs-search-item');
    if (!item) return;
    const slug = item.dataset.slug;
    const headingId = item.dataset.headingId;

    const sectionObj = sections.find((s) => s.slug === slug);
    if (sectionObj) {
      saveRecentSearch({ slug, pageTitle: sectionObj.title, headingId, heading: item.querySelector('.docs-search-item-title')?.textContent?.trim() || sectionObj.title });
    }

    closeSearch();
    navigateTo(slug);
    if (headingId) {
      setTimeout(() => {
        const target = document.getElementById(headingId);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const isOpen = document.getElementById('searchOverlay')?.classList.contains('is-open');
      if (isOpen) closeSearch();
      else openSearch();
    }
    if (e.key === 'Escape') closeSearch();
  });
}

let tocScrollHandler = null;

function buildToc(slug) {
  const tocPanel = document.getElementById('tocPanel');
  if (!tocPanel) return;

  const scrollContainer = document.querySelector('.docs-center') || window;
  if (tocScrollHandler && tocScrollHandler._el) {
    tocScrollHandler._el.removeEventListener('scroll', tocScrollHandler);
    tocScrollHandler = null;
  }

  const activeEl = document.querySelector(`.docs-page-section[data-page="${slug}"]`);
  if (!activeEl) {
    tocPanel.innerHTML = '';
    tocPanel.classList.remove('has-items');
    return;
  }

  const headings = activeEl.querySelectorAll('h2[id], section[id] > h2');
  if (headings.length < 2) {
    tocPanel.innerHTML = '';
    tocPanel.classList.remove('has-items');
    return;
  }

  const items = [];
  headings.forEach((h) => {
    const id = h.id || (h.parentElement && h.parentElement.id);
    if (!id) return;
    items.push({ id, text: h.textContent.trim() });
  });

  if (items.length < 2) {
    tocPanel.innerHTML = '';
    tocPanel.classList.remove('has-items');
    return;
  }

  let html = '<div class="docs-toc-title"><i class="lni lni-list"></i> On this page</div>';
  html += '<ul class="docs-toc-list">';
  items.forEach((item) => {
    html += `<li class="docs-toc-item"><a href="#${item.id}" class="docs-toc-link" data-toc-id="${item.id}">${item.text}</a></li>`;
  });
  html += '</ul>';

  tocPanel.innerHTML = html;
  tocPanel.classList.add('has-items');

  tocPanel.querySelectorAll('.docs-toc-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.tocId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  tocScrollHandler = () => updateTocActive(items, scrollContainer);
  tocScrollHandler._el = scrollContainer;
  scrollContainer.addEventListener('scroll', tocScrollHandler, { passive: true });
  updateTocActive(items, scrollContainer);
}

function updateTocActive(items, container) {
  const el = container === window ? document.documentElement : container;
  const atBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5;

  let activeId = items[0]?.id;

  if (atBottom) {
    activeId = items[items.length - 1]?.id;
  } else {
    const offsetTop = container === window ? 0 : container.getBoundingClientRect().top;
    for (let i = items.length - 1; i >= 0; i--) {
      const target = document.getElementById(items[i].id);
      if (target && target.getBoundingClientRect().top <= offsetTop + 100) {
        activeId = items[i].id;
        break;
      }
    }
  }

  document.querySelectorAll('.docs-toc-link').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.tocId === activeId);
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
  initSearch();
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
