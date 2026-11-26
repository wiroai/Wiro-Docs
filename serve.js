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
  { slug: 'introduction', title: 'Introduction', description: 'Wiro is a unified AI API platform that lets you run any model (video, image, audio, LLM, 3D) with a single API key and pay-per-use pricing.' },
  { slug: 'authentication', title: 'Authentication', description: 'Authenticate with the Wiro API using your project API key in the x-api-key header, alone or with an HMAC-SHA256 signature made with your API secret.' },
  { slug: 'projects', title: 'Projects', description: 'Create projects to organize your Wiro API usage. Each project has its own API key, usage tracking, and webhook configuration.' },
  { slug: 'models', title: 'Models', description: 'Browse, search, and discover AI models on Wiro. Filter by category, view pricing, parameters, and sample outputs for each model.' },
  { slug: 'run-a-model', title: 'Run a Model', description: 'Execute any AI model on Wiro with a single POST request, or wait on /sync for a finite task. Pass parameters, upload files, and receive outputs.' },
  { slug: 'completions-api', title: 'Direct LLM Gateway', description: 'Use Wiro LLMs through OpenAI Chat Completions, OpenAI Responses, and Anthropic Messages on llm.wiro.ai.' },
  { slug: 'model-parameters', title: 'Model Parameters', description: 'Understand Wiro model parameter types including text, numeric, file uploads, dropdowns, and boolean inputs. Learn about content-type handling.' },
  { slug: 'tasks', title: 'Tasks', description: 'Track the status and results of your Wiro API tasks. Poll for completion, retrieve outputs, and handle asynchronous model execution.' },
  { slug: 'llm-chat-streaming', title: 'LLM & Chat Streaming', description: 'Stream LLM responses with cumulative ordered text and tool-call segments over WebSocket, plus session history and multi-turn conversations.' },
  { slug: 'websocket', title: 'WebSocket', description: 'Receive real-time task progress and completion updates via WebSocket connections. Avoid polling and get instant status changes for your Wiro tasks.' },
  { slug: 'realtime-voice-conversation', title: 'Realtime Voice', description: 'Build interactive voice conversation applications using Wiro realtime AI models. Stream audio input and receive spoken responses in real time.' },
  { slug: 'realtime-text-to-speech', title: 'Realtime Text to Speech', description: 'Stream text-to-speech audio in real time. Send text and receive synthesized audio chunks via WebSocket for instant speech playback.' },
  { slug: 'realtime-speech-to-text', title: 'Realtime Speech to Text', description: 'Stream microphone audio and receive live transcription via WebSocket. Build real-time dictation and transcription applications.' },
  { slug: 'files', title: 'Files', description: 'Upload files to Wiro for use as model inputs. Manage folders, retrieve file metadata, and reference uploaded assets across multiple API calls.' },
  { slug: 'pricing', title: 'Pricing', description: 'Wiro uses pay-per-use pricing with no subscriptions. Each model has its own cost per run. Add credits to your account and pay only for what you use.' },
  { slug: 'concurrency-limits', title: 'Concurrency Limits', description: 'How many unfinished tasks your Wiro balance allows at once, one for each full $10 up to $250 and no limit above that, and how to handle error code 96.' },
  { slug: 'spend-limits', title: 'Spend Limits', description: 'Monthly or daily spend limits for a personal account or a team: the whole wallet, a member, an API key, a surface or an agent, alert emails, error code 93 and the SpendLimit endpoints.' },
  { slug: 'model-access', title: 'Model Access', description: 'Choose which models a personal account or a team can run: allow or block single models and whole categories for the whole wallet, a member, an API key, a surface or an agent, error code 92 and the ModelAccess endpoints.' },
  { slug: 'error-reference', title: 'Error Reference', description: 'Complete reference of Wiro API error codes and messages. Troubleshoot authentication failures, rate limits, invalid parameters, and more.' },
  { slug: 'faq', title: 'FAQ', description: 'Frequently asked questions about the Wiro API, covering authentication, billing, model support, rate limits, webhooks, and integrations.' },
  { slug: 'code-examples', title: 'Code Examples', description: 'Ready-to-use Wiro API code examples in 9 languages: cURL, Python, Node.js, PHP, C#, Go, Swift, Kotlin, and Dart.' },
  { slug: 'wiro-mcp-server', title: 'Wiro MCP Server', description: 'Connect AI assistants like Cursor, Claude, and ChatGPT to Wiro models, workflows, Studio and agents through the Model Context Protocol (MCP) server.' },
  { slug: 'mcp-self-hosted', title: 'Self-Hosted MCP', description: 'Run the Wiro MCP server locally on your machine with npx: the same tools for models, workflows, Studio and agents, and environment variables to pick the tool groups.' },
  { slug: 'nodejs-library', title: 'Node.js Library', description: 'Use Wiro AI models directly in Node.js and TypeScript projects. Install @wiro-ai/wiro-mcp and use WiroClient for model discovery, execution, task polling, file uploads, and calls to any other Wiro endpoint.' },
  { slug: 'n8n-wiro-integration', title: 'n8n Wiro Integration', description: 'Run any Wiro AI model from one n8n node. Install the Wiro AI community node for video, image, audio, LLM, and 3D automation.' },
  { slug: 'workflows', title: 'Workflows', description: 'Save multi-step workflows that chain Wiro models and built-in utilities, run them with new inputs, follow and resume runs, and browse the public gallery through the API.' },
  { slug: 'workflow-agent', title: 'Workflow Agent', description: 'Design and edit Wiro workflows by chat through the API: send briefs to the Workflow Agent, attach a workflow to change, read its proposals and save them.' },
  { slug: 'studio', title: 'Studio', description: 'Ask Wiro Studio, the creative agent that picks and runs models for you, for images, video and audio through the API, and collect every result it made.' },
  { slug: 'agent-overview', title: 'Agent Overview', description: 'Deploy and manage autonomous AI agents with the Wiro Agent API. Browse the catalog, configure instances, select models, and run each agent on one of three monthly plans with per-turn token billing.' },
  { slug: 'agent-builder', title: 'Agent Builder', description: 'Build a custom agent from scratch: pick your own skill set and a plan, deploy in one call, then connect its connectors. PricingPreview, custom: true Deploy, SkillsApply.' },
  { slug: 'agent-messaging', title: 'Agent Messaging', description: 'Send messages to AI agents and consume an ordered timeline of safe reasoning, answer, and tool label/status blocks with authoritative Detail recovery.' },
  { slug: 'agent-websocket', title: 'Agent WebSocket', description: 'Receive agent_timeline_delta public block updates, merge by opaque blockid and strictly newer per-block version, and stream provisional cumulative answer text.' },
  { slug: 'agent-webhooks', title: 'Agent Webhooks', description: 'Receive agent response notifications via HTTP webhooks. Configure callback URLs for async message processing with automatic retries.' },
  { slug: 'agent-connectors', title: 'Agent Connectors', description: 'Connect an agent to the services it works with: the public connector catalog, connecting with fields, a key or the vendor\'s sign-in, the callback and redirect URL, connection states, account pickers and disconnecting, with every request and answer.' },
  { slug: 'agent-credentials', title: 'Agent Credentials', description: 'The values an agent keeps as credentials: its Telegram, Slack and Discord channels, Twilio Voice, the Wiro project it runs models with and settings. The credential registry, CredentialUpsert and credential history.' },
  { slug: 'agent-chat-integration', title: 'Agent Chat Integration', description: 'Build your own chat for a Wiro agent: send messages, render timeline and setup card blocks, apply cards with SetupCardApply, connect connectors from a card or your settings screen, show your own Connect button from next, show the agent\'s live Screen with Take Control, and take voice calls in the browser with Web Voice.' },
  { slug: 'agent-skills', title: 'Agent Skills', description: 'Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the skill registry and capabilities, and put connector tools to work in custom skills.' },
  { slug: 'agent-transactions', title: 'Agent Transactions', description: 'An agent\'s transactions in dollars: its AI usage in the plan or from the balance, the model runs it starts, its plan payments and funds added.' },
  { slug: 'agent-logs', title: 'Agent Logs', description: 'Per-instance activity feed (tool calls, Scheduled Task runs, message exchanges, and turn boundaries) for any deployed agent.' },
  { slug: 'agent-use-cases', title: 'Agent Use Cases', description: 'Learn how to build products with Wiro Agents. Deploy agents for your customers, connect their services with connectors, and create multi-agent workflows.' },
  { slug: 'organizations-overview', title: 'Organizations & Teams', description: 'Collaborate with your team under a shared workspace with unified billing, access controls, and resource management. Learn about organizations, teams, and personal workspaces.' },
  { slug: 'organizations-managing-teams', title: 'Managing Teams', description: 'Create organizations, invite members, manage roles and permissions. Transfer agents and projects between workspaces.' },
  { slug: 'organizations-billing', title: 'Team Billing & Spending', description: 'Manage team wallets, transfer credit and track usage across your organization.' },
  { slug: 'organizations-api-access', title: 'Team API Access', description: 'How workspace context is resolved in API requests. Learn about API key context resolution, resource filtering, and agent context guards.' },
];

const sectionMap = Object.fromEntries(sections.map(s => [s.slug, s]));

// Pages that left the docs. The per-connector integration pages became the connector
// catalog's own pages on the site, https://wiro.ai/connectors/{slug}, and the API they
// described is the Agent Connectors page: each old address, and the address of its
// Markdown copy, answers 301 with the connector's page. The channel pages followed:
// Telegram and Twilio Voice have their channel pages there too, with their API on
// Agent Credentials, and Web Voice, which has no channel page, is a part of Agent Chat
// Integration. Links from before path URLs (/docs#/integration-metaads-skills) get
// here too: app.js sends a #/slug that names no page in the docs to /docs/slug.
const CONNECTOR_PAGE = 'https://wiro.ai/connectors/';
const RETIRED_PAGES = {
  'integration-metaads-skills': CONNECTOR_PAGE + 'meta-ads',
  'integration-tiktokads-skills': CONNECTOR_PAGE + 'tiktok-ads',
  'integration-shopify-skills': CONNECTOR_PAGE + 'shopify',
  'integration-woocommerce-skills': CONNECTOR_PAGE + 'woocommerce',
  'integration-reddit-skills': CONNECTOR_PAGE + 'reddit',
  'integration-facebook-skills': CONNECTOR_PAGE + 'facebook-pages',
  'integration-instagram-skills': CONNECTOR_PAGE + 'instagram',
  'integration-linkedin-skills': CONNECTOR_PAGE + 'linkedin',
  'integration-twitter-skills': CONNECTOR_PAGE + 'twitter',
  'integration-tiktok-skills': CONNECTOR_PAGE + 'tiktok',
  'integration-googleads-skills': CONNECTOR_PAGE + 'google-ads',
  'integration-youtube-skills': CONNECTOR_PAGE + 'youtube',
  'integration-ga4-skills': CONNECTOR_PAGE + 'ga4',
  'integration-roasit-skills': CONNECTOR_PAGE + 'roasit',
  'integration-merchantcenter-skills': CONNECTOR_PAGE + 'google-merchant-center',
  'integration-googlebusiness-skills': CONNECTOR_PAGE + 'google-business',
  'integration-searchconsole-skills': CONNECTOR_PAGE + 'google-search-console',
  'integration-dataforseo-skills': CONNECTOR_PAGE + 'dataforseo',
  'integration-keepa-skills': CONNECTOR_PAGE + 'keepa',
  'integration-revenuecat-skills': CONNECTOR_PAGE + 'revenuecat',
  'integration-adapty-skills': CONNECTOR_PAGE + 'adapty',
  'integration-hubspot-skills': CONNECTOR_PAGE + 'hubspot',
  'integration-mailchimp-skills': CONNECTOR_PAGE + 'mailchimp',
  'integration-googledrive-skills': CONNECTOR_PAGE + 'google-drive',
  'integration-google-calendar-skills': CONNECTOR_PAGE + 'google-calendar',
  'integration-serper-search-skills': CONNECTOR_PAGE + 'serper',
  'integration-gmail-skills': CONNECTOR_PAGE + 'gmail',
  'integration-firebase-skills': CONNECTOR_PAGE + 'firebase',
  'integration-wordpress-skills': CONNECTOR_PAGE + 'wordpress',
  'integration-appstore-skills': CONNECTOR_PAGE + 'apple-appstore',
  'integration-googleplay-skills': CONNECTOR_PAGE + 'google-play',
  'integration-apollo-skills': CONNECTOR_PAGE + 'apollo',
  'integration-lemlist-skills': CONNECTOR_PAGE + 'lemlist',
  'integration-brevo-skills': CONNECTOR_PAGE + 'brevo',
  'integration-sendgrid-skills': CONNECTOR_PAGE + 'sendgrid',
  'integration-blogger-skills': CONNECTOR_PAGE + 'blogger',
  'integration-devto-skills': CONNECTOR_PAGE + 'devto',
  'integration-hashnode-skills': CONNECTOR_PAGE + 'hashnode',
  'integration-qiita-skills': CONNECTOR_PAGE + 'qiita',
  'integration-hackmd-skills': CONNECTOR_PAGE + 'hackmd',
  'integration-notion-skills': CONNECTOR_PAGE + 'notion',
  'integration-gitbook-skills': CONNECTOR_PAGE + 'gitbook',
  'integration-beehiiv-skills': CONNECTOR_PAGE + 'beehiiv',
  'integration-kaggle-skills': CONNECTOR_PAGE + 'kaggle',
  'integration-threads-skills': CONNECTOR_PAGE + 'threads',
  'integration-bluesky-skills': CONNECTOR_PAGE + 'bluesky',
  'integration-mastodon-skills': CONNECTOR_PAGE + 'mastodon',
  'integration-pinterest-skills': CONNECTOR_PAGE + 'pinterest',
  'integration-tumblr-skills': CONNECTOR_PAGE + 'tumblr',
  'integration-apollo': CONNECTOR_PAGE + 'apollo',
  'integration-appstore': CONNECTOR_PAGE + 'apple-appstore',
  'integration-brevo': CONNECTOR_PAGE + 'brevo',
  'integration-facebook': CONNECTOR_PAGE + 'facebook-pages',
  'integration-firebase': CONNECTOR_PAGE + 'firebase',
  'integration-gmail': CONNECTOR_PAGE + 'gmail',
  'integration-googleads': CONNECTOR_PAGE + 'google-ads',
  'integration-googledrive': CONNECTOR_PAGE + 'google-drive',
  'integration-googleplay': CONNECTOR_PAGE + 'google-play',
  'integration-hubspot': CONNECTOR_PAGE + 'hubspot',
  'integration-instagram': CONNECTOR_PAGE + 'instagram',
  'integration-lemlist': CONNECTOR_PAGE + 'lemlist',
  'integration-linkedin': CONNECTOR_PAGE + 'linkedin',
  'integration-mailchimp': CONNECTOR_PAGE + 'mailchimp',
  'integration-metaads': CONNECTOR_PAGE + 'meta-ads',
  'integration-sendgrid': CONNECTOR_PAGE + 'sendgrid',
  'integration-tiktok': CONNECTOR_PAGE + 'tiktok',
  'integration-twitter': CONNECTOR_PAGE + 'twitter',
  'integration-wordpress': CONNECTOR_PAGE + 'wordpress',
  'integration-google-search-skills': CONNECTOR_PAGE + 'serper',
  'integration-telegram-skills': CONNECTOR_PAGE + 'telegram',
  'integration-twiliovoice-skills': CONNECTOR_PAGE + 'twilio-voice',
  'integration-webvoice-skills': `${BASE}/agent-chat-integration#web-voice-in-your-app`,
  'integration-telegram': CONNECTOR_PAGE + 'telegram',
  'voice-agent-twilio-channel': CONNECTOR_PAGE + 'twilio-voice',
};
const RETIRED_MARKDOWN = /^markdown\/([a-z0-9-]+)\.md$/;

// The address a retired page or its Markdown copy moved to, or null.
function retiredTarget(relPath) {
  const md = RETIRED_MARKDOWN.exec(relPath);
  const slug = md ? md[1] : relPath;
  return Object.prototype.hasOwnProperty.call(RETIRED_PAGES, slug) ? RETIRED_PAGES[slug] : null;
}




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
const CENTER_OPEN = '<article class="docs-center">';
const CENTER_OPEN_NO_CODE = '<article class="docs-center no-code-panel">';
const CODE_PANEL_OPEN = '<aside class="docs-right-panel" id="codePanel">';
const CODE_PANEL_OPEN_EMPTY = '<aside class="docs-right-panel is-empty" id="codePanel">';
const SUBMENU_OPEN = '<details class="docs-nav-group-submenu';
const CODE_EXAMPLES = /<script\b[^>]*\bclass="code-examples-data"[^>]*>([\s\S]*?)<\/script>/;

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

// Cloudflare's email obfuscation turns anything shaped like an address into a
// "[email protected]" link that only its own script decodes again, so anyone
// reading the HTML itself (view-source, crawlers, LLM tools) got broken code:
// `npx -y @wiro-ai/wiro-mcp@1.3.3`, curl's `-F "inputImage=@photo.jpg"`, the
// example addresses in JSON. Cloudflare skips whatever sits between email_off
// comments, so each <pre> and inline <code> holding an @ gets a pair, and
// addresses in prose stay obfuscated. Comments and raw-text elements are left
// as they are: a marker inside one would end the comment early or show up as
// text.
const CODE_WITH_ADDRESSES = /<!--[\s\S]*?-->|<(script|style|textarea|template)(?=[\s>])[\s\S]*?<\/\1\s*>|<(pre|code)(?=[\s>])[\s\S]*?<\/\2\s*>/gi;

function keepCodeAddresses(html) {
  return html.replace(CODE_WITH_ADDRESSES, (match, rawText, code) =>
    code && match.includes('@') ? `<!--email_off-->${match}<!--/email_off-->` : match);
}

let docsCache = null;
function getDocs() {
  const filePath = path.join(ROOT, 'index.html');
  const mtime = fs.statSync(filePath).mtimeMs;
  if (docsCache === null || docsCache.mtime !== mtime) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const docs = splitDocs(raw);
    if (docs.pages.size === 0) console.warn('index.html: no docs sections found, serving the whole file for every page');
    // The search index was built from the markup as written.
    for (const [slug, markup] of docs.pages) docs.pages.set(slug, keepCodeAddresses(markup));
    docsCache = { ...docs, raw: keepCodeAddresses(raw), mtime };
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

// Whether app.js will fill the right panel: the section's first examples list,
// or the first group of it when they are grouped (Authentication).
function hasCodeExamples(markup) {
  const match = CODE_EXAMPLES.exec(markup);
  if (!match) return false;
  try {
    const parsed = JSON.parse(match[1]);
    const examples = parsed && !Array.isArray(parsed) ? parsed[Object.keys(parsed)[0]] : parsed;
    return Boolean(examples && examples.length);
  } catch {
    return false;
  }
}

// The sidebar as updateNavActive() in app.js leaves it: active link marked, its
// group open, so the links keep their places from the first paint.
function markActiveNavLink(head, slug) {
  const link = `<a href="${BASE}/${slug}" class="docs-nav-link"`;
  const at = head.indexOf(link);
  if (at === -1) return head;
  const active = `${head.slice(0, at)}<a href="${BASE}/${slug}" class="docs-nav-link is-active"${head.slice(at + link.length)}`;
  const submenu = active.lastIndexOf(SUBMENU_OPEN, at);
  if (submenu === -1 || active.indexOf('</details>', submenu) < at) return active;
  const afterTagName = submenu + '<details'.length;
  return `${active.slice(0, afterTagName)} open${active.slice(afterTagName)}`;
}

// The first HTML carries the classes app.js sets on a page without code examples,
// so the right panel and the center column have their final widths from the first
// paint. app.js still sets them for the full index.html, which switches sections
// in place.
function renderSectionPage(docs, section) {
  const markup = docs.pages.get(section.slug);
  let head = markActiveNavLink(setHeaderPage(injectMeta(docs.head, section), section.title), section.slug);
  let tail = docs.tail.replace(EMPTY_PAGINATION, () => renderPagination(section.slug));
  if (!hasCodeExamples(markup)) {
    head = head.replace(CENTER_OPEN, CENTER_OPEN_NO_CODE);
    tail = tail.replace(CODE_PANEL_OPEN, CODE_PANEL_OPEN_EMPTY);
  }
  return head + markup.replace(SECTION_DISPLAY, (match, prefix) => `${prefix}block`) + tail;
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
  const head = injectNotFoundMeta(docs.head).replace(CENTER_OPEN, CENTER_OPEN_NO_CODE);
  return head + NOT_FOUND_SECTION + docs.tail.replace(CODE_PANEL_OPEN, CODE_PANEL_OPEN_EMPTY);
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

// A permanent move. Cached for a day: the old address will not come back.
function sendRedirect(res, location) {
  res.writeHead(301, {
    'Location': location,
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  });
  res.end(`<!doctype html><title>Moved</title><p>This page moved to <a href="${escapeHtml(location)}">${escapeHtml(location)}</a>.</p>`);
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

  const moved = retiredTarget(relPath);
  if (moved) {
    sendRedirect(res, moved);
    return;
  }

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

  // The file itself, every section inline, for LLMs and view-source readers:
  // byte for byte apart from the email_off comments. Also the fallback if the
  // split ever finds nothing.
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
