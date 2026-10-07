const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;
const BASE = '/docs';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.xml': 'application/xml',
  '.txt': 'text/plain', '.md': 'text/plain', '.woff2': 'font/woff2',
};

const sections = [
  { slug: 'introduction', title: 'Introduction', description: 'Wiro is a unified AI API platform that lets you run any model — video, image, audio, LLM, 3D — with a single API key and pay-per-use pricing.' },
  { slug: 'authentication', title: 'Authentication', description: 'Authenticate with the Wiro API using Bearer tokens or query-string API keys. Learn how to generate and manage your credentials securely.' },
  { slug: 'projects', title: 'Projects', description: 'Create projects to organize your Wiro API usage. Each project has its own API key, usage tracking, and webhook configuration.' },
  { slug: 'models', title: 'Models', description: 'Browse, search, and discover AI models on Wiro. Filter by category, view pricing, parameters, and sample outputs for each model.' },
  { slug: 'run-a-model', title: 'Run a Model', description: 'Execute any AI model on Wiro with a single POST request, or wait on /sync for a finite task. Pass parameters, upload files, and receive outputs.' },
  { slug: 'completions-api', title: 'Direct LLM Gateway', description: 'Use Wiro LLMs through OpenAI Chat Completions, OpenAI Responses, Anthropic Messages, and a beta Cursor-compatible route on llm.wiro.ai.' },
  { slug: 'model-parameters', title: 'Model Parameters', description: 'Understand Wiro model parameter types including text, numeric, file uploads, dropdowns, and boolean inputs. Learn about content-type handling.' },
  { slug: 'tasks', title: 'Tasks', description: 'Track the status and results of your Wiro API tasks. Poll for completion, retrieve outputs, and handle asynchronous model execution.' },
  { slug: 'llm-chat-streaming', title: 'LLM & Chat Streaming', description: 'Stream LLM responses with cumulative ordered text and tool-call segments over WebSocket, plus session history and multi-turn conversations.' },
  { slug: 'websocket', title: 'WebSocket', description: 'Receive real-time task progress and completion updates via WebSocket connections. Avoid polling and get instant status changes for your Wiro tasks.' },
  { slug: 'realtime-voice-conversation', title: 'Realtime Voice', description: 'Build interactive voice conversation applications using Wiro realtime AI models. Stream audio input and receive spoken responses in real time.' },
  { slug: 'realtime-text-to-speech', title: 'Realtime Text to Speech', description: 'Stream text-to-speech audio in real time. Send text and receive synthesized audio chunks via WebSocket for instant speech playback.' },
  { slug: 'realtime-speech-to-text', title: 'Realtime Speech to Text', description: 'Stream microphone audio and receive live transcription via WebSocket. Build real-time dictation and transcription applications.' },
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
  { slug: 'agent-overview', title: 'Agent Overview', description: 'Deploy and manage autonomous AI agents with the Wiro Agent API. Browse the catalog, configure instances, select models, and understand skill-driven tiers with per-turn token billing.' },
  { slug: 'agent-builder', title: 'Agent Builder', description: 'Build a custom agent from scratch — pick your own skill set, preview the live tier price, and deploy in one call. PricingPreview, custom: true Deploy, SkillsApply.' },
  { slug: 'agent-messaging', title: 'Agent Messaging', description: 'Send messages to AI agents and consume an ordered timeline of safe reasoning, answer, and tool label/status blocks with authoritative Detail recovery.' },
  { slug: 'agent-websocket', title: 'Agent WebSocket', description: 'Receive agent_timeline_delta public block updates, merge by opaque blockid and strictly newer per-block version, and stream provisional cumulative answer text.' },
  { slug: 'agent-webhooks', title: 'Agent Webhooks', description: 'Receive agent response notifications via HTTP webhooks. Configure callback URLs for async message processing with automatic retries.' },
  { slug: 'agent-credentials', title: 'Agent Credentials & OAuth', description: 'Configure agent credentials via API keys, direct machine credentials, or OAuth flows. Connect third-party services like Twitter, Google Ads, Meta, HubSpot, and more.' },
  { slug: 'agent-skills', title: 'Agent Skills', description: 'Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the skill registry, capabilities, and per-skill pricing recipes.' },
  { slug: 'agent-transactions', title: 'Agent Transactions', description: 'Per-instance credit ledger — every credit deduction, renewal, purchase, refund, grant, and cancel for a useragent in a single immutable feed.' },
  { slug: 'agent-logs', title: 'Agent Logs', description: 'Per-instance activity feed — tool calls, scheduled cron runs, message exchanges, and turn boundaries — for any deployed agent.' },
  { slug: 'agent-use-cases', title: 'Agent Use Cases', description: 'Learn how to build products with Wiro Agents. Deploy agents for your customers, integrate OAuth flows, and create multi-agent workflows.' },
  { slug: 'integration-metaads-skills', title: 'Meta Ads Integration', description: 'Use direct Graph API v26 with recommended token-only System User mode or advanced customer-owned OAuth, then select ad accounts and optional account-scoped Facebook Pages.' },
  { slug: 'integration-tiktokads-skills', title: 'TikTok Ads Integration', description: 'Connect TikTok for Business in one click through the official TikTok for Business MCP server, pick advertisers, and let the agent report on and manage TikTok Ads with approval-gated changes and a 30-day re-authorization.' },
  { slug: 'integration-shopify-skills', title: 'Shopify Integration', description: 'Use GraphQL Admin API 2026-07 with same-organization client credentials (86399-second tokens) or expiring offline OAuth access and refresh tokens.' },
  { slug: 'integration-woocommerce-skills', title: 'WooCommerce Integration', description: 'Connect a Wiro agent directly to WooCommerce REST API v3 with a customer-owned consumer key and secret.' },
  { slug: 'integration-reddit-skills', title: 'Reddit Integration', description: 'Review the technical Reddit OAuth contract; the commercial feature remains unavailable until Reddit approval and Wiro’s written contract are complete.' },
  { slug: 'integration-facebook-skills', title: 'Facebook Page Integration', description: 'Publish to one or more Facebook Pages with a recommended Business Manager System User token or advanced customer-owned OAuth through Meta Graph API v26.' },
  { slug: 'integration-instagram-skills', title: 'Instagram Integration', description: 'Publish to Instagram professional accounts with a recommended System User connection or advanced Instagram Login OAuth through Graph API v26.' },
  { slug: 'integration-linkedin-skills', title: 'LinkedIn Integration', description: 'LinkedIn Company Page publishing via Community Management API. OAuth 2.0 setup with organizationId configuration.' },
  { slug: 'integration-twitter-skills', title: 'Twitter / X Integration', description: 'Twitter (X) OAuth 2.0 PKCE flow for posting, reading timelines, and replying to mentions.' },
  { slug: 'integration-tiktok-skills', title: 'TikTok Integration', description: 'TikTok Content Posting API setup. Video publishing with Login Kit + Content Posting scopes.' },
  { slug: 'integration-googleads-skills', title: 'Google Ads Integration', description: 'Google Ads API setup: Developer Token, MCC customer ID, Google Cloud OAuth configuration, customer ID selection.' },
  { slug: 'integration-youtube-skills', title: 'YouTube Integration', description: 'YouTube Data API v3 + Analytics API v2 setup: channel listing, video assets for Google Ads Video/Demand Gen, channel picker via SetPickerAccounts.' },
  { slug: 'integration-ga4-skills', title: 'Google Analytics 4 Integration', description: 'Google Analytics 4 setup: GA4 Data API + Admin API, OAuth, property picker via SetPickerAccounts for conversion reporting and attribution cross-checks.' },
  { slug: 'integration-roasit-skills', title: 'Roasit Integration', description: 'Roasit mobile attribution with a read-only API token: creative, campaign and network ROAS, cohort revenue and retention, iOS SKAN reports and install reconciliation, mapped back to Google Ads, Meta Ads and TikTok Ads ids.' },
  { slug: 'integration-merchantcenter-skills', title: 'Google Merchant Center Integration', description: 'Google Merchant Center (Shopping) setup: Merchant API v1, OAuth, merchant account picker via SetPickerAccounts, developer registration for own mode.' },
  { slug: 'integration-hubspot-skills', title: 'HubSpot Integration', description: 'HubSpot CRM integration: OAuth 2.0 setup, scopes configuration for contacts, deals, and engagement.' },
  { slug: 'integration-mailchimp-skills', title: 'Mailchimp Integration', description: 'Mailchimp email marketing: OAuth flow or direct API key auth. Audience and campaign management.' },
  { slug: 'integration-googledrive-skills', title: 'Google Drive Integration', description: 'Per-user Google Cloud service account upload. User shares Drive folders with the service account email; the agent scans only those folders.' },
  { slug: 'integration-google-calendar-skills', title: 'Google Calendar Integration', description: 'Per-user Google Cloud service account + per-calendar sharing. Read availability, find slots, and draft events. Used by appointment-booking and voice-receptionist agents.' },
  { slug: 'integration-serper-search-skills', title: 'Serper Web Search Integration', description: 'Real Google web-search results as clean JSON via Serper.dev — title/link/snippet for research before writing, then fetch the top pages. One API key, no Google Cloud project or cx. Used by content and marketing agents.' },
  { slug: 'integration-gmail-skills', title: 'Gmail Integration', description: 'Gmail IMAP/SMTP setup using Google App Passwords. Inbox monitoring and email sending.' },
  { slug: 'integration-telegram-skills', title: 'Telegram Integration', description: 'Telegram bot setup: BotFather token, allowed users, private vs collaborative session modes.' },
  { slug: 'integration-firebase-skills', title: 'Firebase Integration', description: 'Firebase Cloud Messaging setup: Admin SDK service account, topic targeting, multi-project configuration.' },
  { slug: 'integration-wordpress-skills', title: 'WordPress Integration', description: 'WordPress REST API setup using Application Passwords for blog post and page publishing.' },
  { slug: 'integration-appstore-skills', title: 'App Store Connect Integration', description: 'App Store Connect API setup: ES256 signing, Key ID, Issuer ID, private key for reviews and metadata.' },
  { slug: 'integration-googleplay-skills', title: 'Google Play Integration', description: 'Google Play Developer API setup: service account + Play Console permissions for reviews and metadata.' },
  { slug: 'integration-apollo-skills', title: 'Apollo Integration', description: 'Apollo.io lead generation setup: API key + optional master key for sequence management.' },
  { slug: 'integration-lemlist-skills', title: 'Lemlist Integration', description: 'Lemlist cold email outreach: API key setup for campaign and lead management.' },
  { slug: 'integration-brevo-skills', title: 'Brevo Integration', description: 'Brevo transactional and marketing email API key setup.' },
  { slug: 'integration-sendgrid-skills', title: 'SendGrid Integration', description: 'Twilio SendGrid email setup: API key generation with appropriate scopes.' },
  { slug: 'integration-twiliovoice-skills', title: 'Twilio Voice Integration', description: 'Inbound phone call channel via Twilio Voice Webhooks + Media Streams. Account SID + Auth Token, auto-configured webhooks, hold media, max-duration timer. Used by Voice Receptionist agents.' },
  { slug: 'integration-webvoice-skills', title: 'Web Voice Integration', description: 'Browser-embedded realtime voice channel. POST /UserAgent/Realtime/WebStart issues a short-lived JWT + WebSocket URL; the browser presents it as the first WS message and streams 24 kHz PCM mono. Used by Voice Receptionist and Voice Sales Rep agents.' },
  { slug: 'organizations-overview', title: 'Organizations & Teams', description: 'Collaborate with your team under a shared workspace with unified billing, access controls, and resource management. Learn about organizations, teams, and personal workspaces.' },
  { slug: 'organizations-managing-teams', title: 'Managing Teams', description: 'Create organizations, invite members, manage roles and permissions. Transfer agents and projects between workspaces.' },
  { slug: 'organizations-billing', title: 'Team Billing & Spending', description: 'Manage team wallets, set spend limits per team and per member, control model access, and track usage across your organization.' },
  { slug: 'organizations-api-access', title: 'Team API Access', description: 'How workspace context is resolved in API requests. Learn about API key context resolution, resource filtering, and agent context guards.' },
];

const sectionMap = Object.fromEntries(sections.map(s => [s.slug, s]));


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// index.html has written these tags self-closing (` />`) since its Prettier
// reformat, which silently broke patterns that expected `">`; accept both.
// Replacer functions keep a `$` in the text from acting as a backreference.
function injectMeta(html, section) {
  const title = escapeHtml(`${section.title} - Wiro API Docs`);
  const desc = escapeHtml(section.description);
  const url = `https://wiro.ai${BASE}/${section.slug}`;

  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    () => `<meta name="description" content="${desc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    () => `<meta property="og:title" content="${title}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    () => `<meta property="og:description" content="${desc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    () => `<meta property="og:url" content="${url}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    () => `<meta name="twitter:title" content="${title}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    () => `<meta name="twitter:description" content="${desc}" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    () => `<link rel="canonical" href="${url}" />`
  );
  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (match, open, json, close) => {
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        return match;
      }
      data.name = data.headline = `${section.title} - Wiro API Docs`;
      data.description = section.description;
      data.url = url;
      if (data.mainEntityOfPage) data.mainEntityOfPage['@id'] = url;
      return `${open}${JSON.stringify(data).replace(/</g, '\\u003c')}${close}`;
    }
  );

  return html;
}

function setHeaderPage(html, text) {
  return html.replace(
    /(<span class="docs-header-product-page" id="docsHeaderPage">)[^<]*/,
    (match, prefix) => `${prefix}${escapeHtml(text)}`
  );
}

// Unknown paths get the frame with a 404: no canonical, and noindex so they
// stop counting as soft-404 copies of the introduction.
function injectNotFoundMeta(html) {
  html = html.replace(/<title>[^<]*<\/title>/, () => '<title>Page Not Found - Wiro API Docs</title>\n    <meta name="robots" content="noindex" />');
  html = html.replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g, '');
  return setHeaderPage(html, 'Not found');
}

const SECTION_OPEN = '<div class="docs-page-section" data-page="';
const SECTION_LIST_END = '<nav class="docs-pagination"';
const SECTION_DISPLAY = /(<div class="docs-page-section" data-page="[^"]+" style="display:\s*)(?:block|none)/;
const EMPTY_PAGINATION = '<nav class="docs-pagination" id="docsPagination"></nav>';

// A section's markup begins at the banner comment directly above it, if any.
function sectionStart(html, index) {
  const commentEnd = html.lastIndexOf('-->', index);
  if (commentEnd !== -1 && /^\s*$/.test(html.slice(commentEnd + 3, index))) {
    return html.lastIndexOf('<!--', commentEnd);
  }
  return index;
}

// index.html keeps every section inline for view-source and LLM readers, but
// each /docs/<slug> URL is its own document: the frame (head, header, sidebar
// with every link, layout) around that one section. Serving the whole ~2 MB
// file for 68 URLs got them clustered as duplicates and cut at Google's 2 MB.
// Split once per index.html version: frame before the first section, each
// section's markup, and the frame after the last one.
function splitDocs(html) {
  const pages = new Map();
  const first = html.indexOf(SECTION_OPEN);
  const listEnd = first === -1 ? -1 : html.indexOf(SECTION_LIST_END, first);
  if (listEnd === -1) return { pages, head: '', tail: '' };

  for (let open = first; open !== -1 && open < listEnd;) {
    const next = html.indexOf(SECTION_OPEN, open + SECTION_OPEN.length);
    const end = next === -1 || next > listEnd ? listEnd : sectionStart(html, next);
    const slug = html.slice(open + SECTION_OPEN.length, html.indexOf('"', open + SECTION_OPEN.length));
    if (!pages.has(slug)) pages.set(slug, html.slice(sectionStart(html, open), end));
    open = next;
  }

  let tail = html.slice(listEnd);
  const bodyEnd = tail.lastIndexOf('</body>');
  const indexTag = `<script type="application/json" id="docs-search-index">${buildSearchIndex(pages)}</script>\n  `;
  tail = bodyEnd === -1 ? tail + indexTag : tail.slice(0, bodyEnd) + indexTag + tail.slice(bodyEnd);

  return { pages, head: html.slice(0, sectionStart(html, first)), tail };
}

// ---------------------------------------------------------------------------
// Search index. app.js used to scan all 68 sections in the DOM; with one
// section per page it reads this instead (content is never fetched by JS).
// Same entries as that scan: every h2/h3, its own id or its parent's, and the
// sibling blocks after it up to the next sibling h1-h3, stopping after the
// block that takes the text past 300 characters. Results show the first 300
// characters; search matches the whole text, so each entry carries the rest
// separately. Cutting the match text at 300 made about a quarter of the words
// the scan found (max_tokens, json_schema, finish_reason) return nothing.
// ---------------------------------------------------------------------------

const SEARCH_TEXT_CHARS = 300;
// Only a runaway guard: a heading follows its sibling blocks, not this cap.
const SEARCH_MATCH_CAP = 20000;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'template', 'textarea']);
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details', 'div', 'dl', 'dt', 'figcaption', 'figure',
  'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
  'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  mdash: '—', ndash: '–', rarr: '→', larr: '←', harr: '↔', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', times: '×', middot: '·', hellip: '…', bull: '•',
  copy: '©', reg: '®', trade: '™',
};
const ID_ATTRIBUTE = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

function decodeEntities(text) {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (entity, code) => {
    if (code[0] === '#') {
      const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, code) ? NAMED_ENTITIES[code] : entity;
  });
}

function idAttribute(attrs) {
  const match = ID_ATTRIBUTE.exec(attrs);
  if (!match) return '';
  return decodeEntities(match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[3]);
}

function excerpt(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, SEARCH_TEXT_CHARS);
}

// A small tag-stack walk over one section's markup; enough for the
// Prettier-formatted, explicitly closed HTML in index.html. Text is only
// decoded while a heading or an unfilled window is collecting it.
function indexHeadings(markup) {
  const entries = [];
  const stack = [];
  let followers = [];
  let heading = null;
  let textStart = 0;
  let match;
  const tagPattern = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  const addText = (from, to) => {
    if ((!heading && followers.length === 0) || from >= to) return;
    const text = decodeEntities(markup.slice(from, to)).replace(/\s+/g, ' ');
    if (heading) heading.text += text;
    for (const follower of followers) follower.entry.text += text;
    followers = followers.filter((follower) => follower.entry.text.length <= SEARCH_MATCH_CAP);
  };
  const addBreak = () => {
    if (heading) heading.text += ' ';
    for (const follower of followers) follower.entry.text += ' ';
  };

  while ((match = tagPattern.exec(markup))) {
    addText(textStart, match.index);
    textStart = tagPattern.lastIndex;
    if (match[1] === undefined) continue;

    const name = match[2].toLowerCase();
    const attrs = match[3];
    if (BLOCK_TAGS.has(name)) addBreak();

    if (match[1] === '/') {
      let at = stack.length - 1;
      while (at >= 0 && stack[at].name !== name) at--;
      if (at >= 0) stack.length = at;
      if (heading && stack.length <= heading.depth) {
        const text = heading.text.replace(/\s+/g, ' ').trim();
        if (text) {
          const entry = { id: heading.id, heading: text, text: '' };
          entries.push(entry);
          followers.push({ entry, depth: heading.depth });
        }
        heading = null;
      }
      // A heading's text runs until its parent ends, or until the sibling
      // block that took it past 300 characters has closed...
      if (followers.length) {
        followers = followers.filter((follower) => stack.length > follower.depth
          || (stack.length === follower.depth
            && follower.entry.text.replace(/\s+/g, ' ').trim().length <= SEARCH_TEXT_CHARS));
      }
      continue;
    }

    if (RAW_TEXT_TAGS.has(name)) {
      const end = new RegExp(`</${name}\\s*>`, 'gi');
      end.lastIndex = tagPattern.lastIndex;
      const found = end.exec(markup);
      // The DOM scan read textContent, which includes the code examples' JSON
      // (script.code-examples-data); match on it too, but never on CSS.
      if (name !== 'style' && followers.length) {
        const raw = markup.slice(tagPattern.lastIndex, found ? found.index : markup.length).replace(/\s+/g, ' ');
        for (const follower of followers) follower.entry.text += ` ${raw} `;
        followers = followers.filter((follower) => follower.entry.text.length <= SEARCH_MATCH_CAP);
      }
      tagPattern.lastIndex = textStart = found ? end.lastIndex : markup.length;
      continue;
    }

    // ...or until a sibling h1-h3 begins.
    if (name === 'h1' || name === 'h2' || name === 'h3') {
      if (followers.length) followers = followers.filter((follower) => stack.length !== follower.depth);
      if (name !== 'h1' && !heading) {
        const parent = stack[stack.length - 1];
        heading = { depth: stack.length, id: idAttribute(attrs) || (parent ? idAttribute(parent.attrs) : ''), text: '' };
      }
    }
    if (!VOID_TAGS.has(name) && !/\/\s*$/.test(attrs)) stack.push({ name, attrs });
  }
  addText(textStart, markup.length);

  return entries.map((entry) => {
    const text = entry.text.replace(/\s+/g, ' ').trim();
    const rest = text.slice(SEARCH_TEXT_CHARS);
    return rest ? [entry.id, entry.heading, excerpt(text), rest] : [entry.id, entry.heading, excerpt(text)];
  });
}

// JSON inside <script>: escape `<` so no text can close the element early.
function buildSearchIndex(pages) {
  const index = [];
  for (const [slug, markup] of pages) {
    const section = sectionMap[slug];
    if (section) index.push({ slug, title: section.title, headings: indexHeadings(markup) });
  }
  return JSON.stringify({ sections: index }).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

let docsCache = null;
function getDocs() {
  const filePath = path.join(ROOT, 'index.html');
  const mtime = fs.statSync(filePath).mtimeMs;
  if (docsCache === null || docsCache.mtime !== mtime) {
    const raw = fs.readFileSync(filePath);
    const docs = splitDocs(raw.toString('utf8'));
    if (docs.pages.size === 0) console.warn('index.html: no docs sections found, serving the whole file for every page');
    docsCache = { ...docs, raw, mtime };
  }
  return docsCache;
}

// Same neighbours and markup as app.js renderPagination(), which replaces it.
function renderPagination(slug) {
  const idx = sections.findIndex((s) => s.slug === slug);
  let html = '';
  if (idx > 0) {
    const prev = sections[idx - 1];
    html += `<a href="${BASE}/${prev.slug}" class="docs-pagination-link prev">
      <i class="lni lni-arrow-left"></i>
      <span><small>Previous</small>${escapeHtml(prev.title)}</span>
    </a>`;
  }
  if (idx !== -1 && idx < sections.length - 1) {
    const next = sections[idx + 1];
    html += `<a href="${BASE}/${next.slug}" class="docs-pagination-link next">
      <span><small>Next</small>${escapeHtml(next.title)}</span>
      <i class="lni lni-arrow-right"></i>
    </a>`;
  }
  return `<nav class="docs-pagination" id="docsPagination">${html}</nav>`;
}

function renderSectionPage(docs, section) {
  const head = setHeaderPage(injectMeta(docs.head, section), section.title);
  const body = docs.pages.get(section.slug).replace(SECTION_DISPLAY, (match, prefix) => `${prefix}block`);
  const tail = docs.tail.replace(EMPTY_PAGINATION, () => renderPagination(section.slug));
  return head + body + tail;
}

const NOT_FOUND_SECTION = `<!-- ==================== NOT FOUND ==================== -->
              <div class="docs-not-found" data-docs-not-found>
                <article class="docs-section">
                  <h1>Page not found</h1>
                  <p class="section-subtitle">There is no documentation page at this address.</p>
                  <p>Pick a page from the navigation, search the documentation, or start with the <a href="${BASE}/introduction">Introduction</a>.</p>
                </article>
              </div>

              `;

function renderNotFoundPage(docs) {
  return injectNotFoundMeta(docs.head) + NOT_FOUND_SECTION + docs.tail;
}

// Maps a URL path to a path inside ROOT. Decoding happens once, before the
// resolve, so ../ and %2e%2e%2f are the same thing to the prefix check; dot
// entries (.git, .claude, .env) are never served.
function resolveRequestPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return { status: 400 };
  }
  if (decoded.includes('\0')) return { status: 400 };

  const filePath = path.resolve(ROOT, `.${decoded.startsWith('/') ? '' : '/'}${decoded}`);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return { status: 403 };

  const relPath = path.relative(ROOT, filePath).split(path.sep).join('/');
  if (relPath.split('/').some((part) => part.startsWith('.'))) return { status: 404 };
  return { filePath, relPath };
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

const STATIC_CACHE_CONTROL = 'public, max-age=300, must-revalidate';
const HTML_CACHE_CONTROL = 'no-cache, no-store, must-revalidate';
const STATUS_TEXT = { 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };

function sendText(res, status) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': HTML_CACHE_CONTROL });
  res.end(STATUS_TEXT[status] || String(status));
}

function sendHtml(res, status, body, docs) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': HTML_CACHE_CONTROL,
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Deploy-Version': String(docs.mtime),
  });
  res.end(body);
}

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  if (urlPath.startsWith(BASE + '/')) urlPath = urlPath.slice(BASE.length);
  else if (urlPath === BASE) urlPath = '/';

  const resolved = resolveRequestPath(urlPath);
  if (resolved.status) {
    sendText(res, resolved.status);
    return;
  }
  const { filePath, relPath } = resolved;

  if (relPath !== '' && relPath !== 'index.html' && isFile(filePath)) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': STATIC_CACHE_CONTROL,
    });
    fs.createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
    return;
  }

  let docs;
  try {
    docs = getDocs();
  } catch (err) {
    console.error('index.html could not be loaded:', err.message);
    sendText(res, 500);
    return;
  }

  // The file itself, byte for byte: every section inline, for LLMs and
  // view-source readers. Also the fallback if the split ever finds nothing.
  if (relPath === 'index.html' || docs.pages.size === 0) {
    sendHtml(res, 200, docs.raw, docs);
    return;
  }

  const slug = relPath || 'introduction';
  const section = sectionMap[slug];
  if (section && docs.pages.has(slug)) {
    sendHtml(res, 200, renderSectionPage(docs, section), docs);
    return;
  }

  sendHtml(res, 404, renderNotFoundPage(docs), docs);
}).listen(PORT, () => {
  try {
    getDocs();
  } catch (err) {
    console.error('index.html could not be loaded:', err.message);
  }
  console.log(`Docs server running at http://localhost:${PORT}${BASE}/`);
  if (typeof process.send === 'function') {
    process.send('ready');
  }
});
