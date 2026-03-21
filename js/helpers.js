const API_BASE = 'https://api.wiro.ai/v1';
const SITE_BASE = 'https://wiro.ai';

let modelBrowserInitialized = false;

export function initModelBrowser() {
  if (modelBrowserInitialized) return;
  modelBrowserInitialized = true;

  const searchInput = document.getElementById('modelSearch');
  const grid = document.getElementById('modelResults');
  const loadingEl = document.getElementById('modelLoading');
  const emptyEl = document.getElementById('modelEmpty');
  if (!searchInput || !grid) return;

  let debounce = null;

  async function fetchModels(search) {
    if (loadingEl) loadingEl.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';
    grid.innerHTML = '';

    try {
      const res = await fetch(`${API_BASE}/Tool/List`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: '0',
          limit: '12',
          search: search || '',
          hideworkflows: true,
          summary: true,
        }),
      });
      const data = await res.json();
      if (loadingEl) loadingEl.style.display = 'none';

      const models = data.tool || [];
      if (models.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
        return;
      }

      grid.innerHTML = models
        .map((m) => {
          const owner = m.cleanslugowner || m.slugowner;
          const project = m.cleanslugproject || m.slugproject;
          const name = m.title || `${m.slugowner}/${m.slugproject}`;
          return `<a href="${SITE_BASE}/models/${owner}/${project}" class="model-card" target="_blank" data-name="${escapeAttr(name.toLowerCase())}">
          <div class="model-card-name">${escapeHtml(name)}</div>
          <code class="model-card-slug">${escapeHtml(owner)}/${escapeHtml(project)}</code>
        </a>`;
        })
        .join('');
    } catch {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
    }
  }

  searchInput.addEventListener('input', () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => fetchModels(searchInput.value), 400);
  });

  fetchModels('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}
