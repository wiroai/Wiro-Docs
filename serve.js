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
  { slug: 'agent-overview', title: 'Agent Overview', description: 'Deploy and manage autonomous AI agents with the Wiro Agent API. Browse the agent catalog, deploy instances, configure credentials, and control agent lifecycle.' },
  { slug: 'agent-messaging', title: 'Agent Messaging', description: 'Send messages to AI agents and receive streaming responses. Manage conversation sessions, poll message status, and handle async agent interactions.' },
  { slug: 'agent-websocket', title: 'Agent WebSocket', description: 'Receive real-time agent response streaming via WebSocket. Subscribe to agent events and display thinking, answer, and performance metrics live.' },
  { slug: 'agent-webhooks', title: 'Agent Webhooks', description: 'Receive agent response notifications via HTTP webhooks. Configure callback URLs for async message processing with automatic retries.' },
  { slug: 'agent-credentials', title: 'Agent Credentials & OAuth', description: 'Configure agent credentials via API keys or OAuth flows. Connect third-party services like Twitter, Google Ads, Meta Ads, HubSpot, and more.' },
  { slug: 'agent-use-cases', title: 'Agent Use Cases', description: 'Learn how to build products with Wiro Agents. Deploy agents for your customers, integrate OAuth flows, and create multi-agent workflows.' },
  { slug: 'integration-metaads', title: 'Meta Ads Integration', description: 'End-to-end setup for Meta Ads: Meta Developer App, OAuth, ad account selection via MetaAdsSetAdAccount. No App Review required in Development Mode + App Roles.' },
  { slug: 'integration-facebook', title: 'Facebook Page Integration', description: 'Facebook Page publishing setup: OAuth with multi-page selection via FBSetPage, permissions, and Development Mode workflow.' },
  { slug: 'integration-instagram', title: 'Instagram Integration', description: 'Instagram Business Account setup: Facebook Page linkage prerequisite, OAuth, content publishing permissions.' },
  { slug: 'integration-linkedin', title: 'LinkedIn Integration', description: 'LinkedIn Company Page publishing via Community Management API. OAuth 2.0 setup with organizationId configuration.' },
  { slug: 'integration-twitter', title: 'Twitter / X Integration', description: 'Twitter (X) OAuth 2.0 PKCE flow for posting, reading timelines, and replying to mentions.' },
  { slug: 'integration-tiktok', title: 'TikTok Integration', description: 'TikTok Content Posting API setup. Video publishing with Login Kit + Content Posting scopes.' },
  { slug: 'integration-googleads', title: 'Google Ads Integration', description: 'Google Ads API setup: Developer Token, MCC customer ID, Google Cloud OAuth configuration, customer ID selection.' },
  { slug: 'integration-hubspot', title: 'HubSpot Integration', description: 'HubSpot CRM integration: OAuth 2.0 setup, scopes configuration for contacts, deals, and engagement.' },
  { slug: 'integration-mailchimp', title: 'Mailchimp Integration', description: 'Mailchimp email marketing: OAuth flow or direct API key auth. Audience and campaign management.' },
  { slug: 'integration-googledrive', title: 'Google Drive Integration', description: 'Google Drive folder-scoped access via drive.file OAuth scope. Select specific folders for agent read/write.' },
  { slug: 'integration-gmail', title: 'Gmail Integration', description: 'Gmail IMAP/SMTP setup using Google App Passwords. Inbox monitoring and email sending.' },
  { slug: 'integration-telegram', title: 'Telegram Integration', description: 'Telegram bot setup: BotFather token, allowed users, private vs collaborative session modes.' },
  { slug: 'integration-firebase', title: 'Firebase Integration', description: 'Firebase Cloud Messaging setup: Admin SDK service account, topic targeting, multi-project configuration.' },
  { slug: 'integration-wordpress', title: 'WordPress Integration', description: 'WordPress REST API setup using Application Passwords for blog post and page publishing.' },
  { slug: 'integration-appstore', title: 'App Store Connect Integration', description: 'App Store Connect API setup: ES256 signing, Key ID, Issuer ID, private key for reviews and metadata.' },
  { slug: 'integration-googleplay', title: 'Google Play Integration', description: 'Google Play Developer API setup: service account + Play Console permissions for reviews and metadata.' },
  { slug: 'integration-apollo', title: 'Apollo Integration', description: 'Apollo.io lead generation setup: API key + optional master key for sequence management.' },
  { slug: 'integration-lemlist', title: 'Lemlist Integration', description: 'Lemlist cold email outreach: API key setup for campaign and lead management.' },
  { slug: 'integration-brevo', title: 'Brevo Integration', description: 'Brevo transactional and marketing email API key setup.' },
  { slug: 'integration-sendgrid', title: 'SendGrid Integration', description: 'Twilio SendGrid email setup: API key generation with appropriate scopes.' },
  { slug: 'organizations-overview', title: 'Organizations & Teams', description: 'Collaborate with your team under a shared workspace with unified billing, access controls, and resource management. Learn about organizations, teams, and personal workspaces.' },
  { slug: 'organizations-managing-teams', title: 'Managing Teams', description: 'Create organizations, invite members, manage roles and permissions. Transfer agents and projects between workspaces.' },
  { slug: 'organizations-billing', title: 'Team Billing & Spending', description: 'Manage team wallets, set spend limits per team and per member, control model access, and track usage across your organization.' },
  { slug: 'organizations-api-access', title: 'Team API Access', description: 'How workspace context is resolved in API requests. Learn about API key context resolution, resource filtering, and agent context guards.' },
];

const sectionMap = Object.fromEntries(sections.map(s => [s.slug, s]));

let indexHtml = null;
function getIndexHtml() {
  if (!indexHtml) indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return indexHtml;
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

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  if (urlPath.startsWith(BASE + '/')) urlPath = urlPath.slice(BASE.length);
  else if (urlPath === BASE) urlPath = '/';

  const filePath = path.join(ROOT, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const slug = urlPath.replace(/^\//, '').replace(/\/$/, '') || 'introduction';
  const section = sectionMap[slug];

  let html = getIndexHtml();
  if (section) html = injectMeta(html, section);

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(PORT, () => {
  console.log(`Docs server running at http://localhost:${PORT}${BASE}/`);
});
