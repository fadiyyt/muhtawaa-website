(() => {
  const state = { tools: [], category: 'all', query: '' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  function categoryName(slug) {
    const names = { calculators: 'الحاسبات', dates: 'التاريخ والوقت', text: 'النصوص', images: 'الصور', documents: 'المستندات' };
    return names[slug] || 'أدوات';
  }

  function toolCard(tool) {
    return `<a class="tool-card" href="/tools/${escapeHTML(tool.slug)}.html">
      <div>
        <div class="tool-card-top"><span class="tool-icon" aria-hidden="true">${escapeHTML(tool.icon)}</span><span class="category-pill">${escapeHTML(categoryName(tool.category))}</span></div>
        <h3>${escapeHTML(tool.name)}</h3>
        <p>${escapeHTML(tool.description)}</p>
      </div>
      <span class="tool-card-link">استخدم الأداة ←</span>
    </a>`;
  }

  function quickTool(tool) {
    return `<a class="quick-tool" href="/tools/${escapeHTML(tool.slug)}.html"><span class="tool-icon" aria-hidden="true">${escapeHTML(tool.icon)}</span><span>${escapeHTML(tool.name)}</span></a>`;
  }

  function renderTools(root, tools) {
    if (!root) return;
    root.innerHTML = tools.length ? tools.map(toolCard).join('') : '<div class="empty-state">لم نجد أداة تطابق بحثك. جرّب كلمة أخرى.</div>';
  }

  function filteredTools() {
    const query = state.query.trim().toLowerCase();
    return state.tools.filter(tool => {
      const categoryOk = state.category === 'all' || tool.category === state.category;
      const queryOk = !query || `${tool.name} ${tool.description} ${categoryName(tool.category)}`.toLowerCase().includes(query);
      return categoryOk && queryOk;
    });
  }

  async function loadTools() {
    try {
      const response = await fetch('/data/tools.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('تعذر تحميل قائمة الأدوات');
      const data = await response.json();
      state.tools = Array.isArray(data.tools) ? data.tools : [];
      const grid = $('#tool-grid');
      if (grid) renderTools(grid, state.tools);
      const quick = $('#quick-tools');
      if (quick) quick.innerHTML = state.tools.slice(0, 4).map(quickTool).join('');
      bindCatalog();
    } catch (error) {
      console.error(error);
      const grid = $('#tool-grid');
      if (grid) grid.innerHTML = '<div class="empty-state">تعذر تحميل الأدوات الآن. أعد المحاولة بعد قليل.</div>';
    }
  }

  function bindCatalog() {
    const grid = $('#tool-grid');
    const search = $('#tools-search');
    $$('.filter-button').forEach(button => button.addEventListener('click', () => {
      $$('.filter-button').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      state.category = button.dataset.category || 'all';
      renderTools(grid, filteredTools());
    }));
    search?.addEventListener('input', event => {
      state.query = event.target.value;
      renderTools(grid, filteredTools());
    });
  }

  function bindHomeSearch() {
    const search = $('#home-search');
    search?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const query = encodeURIComponent(event.target.value.trim());
        window.location.href = `/tools.html${query ? `?q=${query}` : ''}`;
      }
    });
  }

  function init() {
    bindHomeSearch();
    loadTools();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  document.addEventListener('DOMContentLoaded', init);
})();
