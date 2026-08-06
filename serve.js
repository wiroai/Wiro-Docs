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
  { slug: 'run-a-model', title: 'Run a Model', description: 'Execute any AI model on Wiro with a single POST request. Pass parameters, upload files, and receive outputs — all through one unified endpoint.' },
  { slug: 'model-parameters', title: 'Model Parameters', description: 'Understand Wiro model parameter types including text, numeric, file uploads, dropdowns, and boolean inputs. Learn about content-type handling.' },
  { slug: 'tasks', title: 'Tasks', description: 'Track the status and results of your Wiro API tasks. Poll for completion, retrieve outputs, and handle asynchronous model execution.' },
  { slug: 'llm-chat-streaming', title: 'LLM & Chat Streaming', description: 'Stream large language model responses in real time with Server-Sent Events. Supports thinking/answer separation and multi-turn chat history.' },
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
  { slug: 'integration-merchantcenter-skills', title: 'Google Merchant Center Integration', description: 'Google Merchant Center (Shopping) setup: Merchant API v1, OAuth, merchant account picker via SetPickerAccounts, developer registration for own mode.' },
  { slug: 'integration-hubspot-skills', title: 'HubSpot Integration', description: 'HubSpot CRM integration: OAuth 2.0 setup, scopes configuration for contacts, deals, and engagement.' },
  { slug: 'integration-mailchimp-skills', title: 'Mailchimp Integration', description: 'Mailchimp email marketing: OAuth flow or direct API key auth. Audience and campaign management.' },
  { slug: 'integration-googledrive-skills', title: 'Google Drive Integration', description: 'Per-user Google Cloud service account upload. User shares Drive folders with the service account email; the agent scans only those folders.' },
  { slug: 'integration-google-calendar-skills', title: 'Google Calendar Integration', description: 'Per-user Google Cloud service account + per-calendar sharing. Read availability, find slots, and draft events. Used by appointment-booking and voice-receptionist agents.' },
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

let indexHtmlCache = null;
let indexHtmlMtime = 0;
function getIndexHtml() {
  const filePath = path.join(ROOT, 'index.html');
  const mtime = fs.statSync(filePath).mtimeMs;
  if (indexHtmlCache === null || mtime !== indexHtmlMtime) {
    indexHtmlCache = fs.readFileSync(filePath, 'utf8');
    indexHtmlMtime = mtime;
  }
  return indexHtmlCache;
}

function injectMeta(html, section) {
  const title = `${section.title} - Wiro API Docs`;
  const desc = section.description;
  const url = `https://wiro.ai${BASE}/${section.slug}`;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${desc}">`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${title}">`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${desc}">`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${url}">`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${title}">`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${desc}">`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${url}">`
  );

  return html;
}

const STATIC_CACHE_CONTROL = 'public, max-age=300, must-revalidate';
const HTML_CACHE_CONTROL = 'no-cache, no-store, must-revalidate';

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  if (urlPath.startsWith(BASE + '/')) urlPath = urlPath.slice(BASE.length);
  else if (urlPath === BASE) urlPath = '/';

  const filePath = path.join(ROOT, urlPath);
  const isRootHtml = urlPath === '/' || urlPath === '/index.html';

  if (!isRootHtml && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': STATIC_CACHE_CONTROL,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const slug = urlPath.replace(/^\//, '').replace(/\/$/, '') || 'introduction';
  const section = sectionMap[slug];

  let html = getIndexHtml();
  if (section) html = injectMeta(html, section);

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': HTML_CACHE_CONTROL,
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Deploy-Version': String(indexHtmlMtime),
  });
  res.end(html);
}).listen(PORT, () => {
  console.log(`Docs server running at http://localhost:${PORT}${BASE}/`);
  if (typeof process.send === 'function') {
    process.send('ready');
  }
});
