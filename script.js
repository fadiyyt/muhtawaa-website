// ===== إعدادات التطبيق =====
const APP_CONFIG = {
    articlesPerPage: 6,
    loadMoreIncrement: 3,
    animationDuration: 300,
    searchDelay: 500,
    maxRetries: 3,
    retryDelay: 1000
};

// ===== متغيرات التطبيق =====
let allArticles = [];
let displayedArticles = [];
let filteredArticles = [];
let currentPage = 1;
let currentFilter = 'all';
let currentSort = 'date';
let searchTimeout;
let appInitialized = false;

// ===== بدء تشغيل التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    // إضافة تأخير صغير للتأكد من تحميل كامل
    setTimeout(initializeApp, 100);
});

// ===== تهيئة التطبيق مع معالجة أفضل للأخطاء =====
async function initializeApp() {
    if (appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }

    try {
        console.log('🚀 بدء تهيئة التطبيق...');
        
        // إظهار مؤشر التحميل
        showInitialLoadingState();
        
        // تحميل البيانات مع إعادة المحاولة
        await loadArticlesDataWithRetry();
        
        // التحقق من وجود العناصر المطلوبة
        if (!validateRequiredElements()) {
            throw new Error('العناصر المطلوبة غير موجودة في DOM');
        }
        
        // تهيئة الواجهة
        initializeUI();
        
        // عرض المقالات الأولية
        displayInitialArticles();
        
        // إعداد مستمعي الأحداث
        setupEventListeners();
        
        // إخفاء مؤشر التحميل
        hideInitialLoadingState();
        
        appInitialized = true;
        console.log('✅ تم تحميل التطبيق بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        hideInitialLoadingState();
        showDetailedErrorMessage(error);
    }
}

// ===== التحقق من وجود العناصر المطلوبة =====
function validateRequiredElements() {
    const requiredElements = [
        '#articles',
        '.articles-grid'
    ];
    
    for (const selector of requiredElements) {
        if (!document.querySelector(selector)) {
            console.error(`العنصر المطلوب غير موجود: ${selector}`);
            return false;
        }
    }
    
    return true;
}

// ===== تحميل بيانات المقالات مع إعادة المحاولة =====
async function loadArticlesDataWithRetry() {
    let lastError;
    
    for (let attempt = 1; attempt <= APP_CONFIG.maxRetries; attempt++) {
        try {
            console.log(`محاولة تحميل البيانات ${attempt}/${APP_CONFIG.maxRetries}`);
            await loadArticlesData();
            console.log('✅ تم تحميل البيانات بنجاح');
            return;
        } catch (error) {
            lastError = error;
            console.warn(`فشلت المحاولة ${attempt}: ${error.message}`);
            
            if (attempt < APP_CONFIG.maxRetries) {
                await sleep(APP_CONFIG.retryDelay * attempt);
            }
        }
    }
    
    // إذا فشلت جميع المحاولات، استخدم البيانات الاحتياطية
    console.warn('فشل تحميل البيانات، استخدام البيانات الاحتياطية');
    allArticles = getFallbackArticles();
    filteredArticles = [...allArticles];
    updateArticleCount();
}

// ===== تحميل بيانات المقالات =====
async function loadArticlesData() {
    try {
        // إضافة timestamp لتجنب caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`articles.json?v=${timestamp}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('الاستجابة ليست JSON صحيح');
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data.articles)) {
            throw new Error('بنية البيانات غير صحيحة');
        }
        
        allArticles = data.articles;
        filteredArticles = [...allArticles];
        
        // تحديث عدد المقالات في الواجهة
        updateArticleCount();
        
    } catch (error) {
        console.error('خطأ في تحميل المقالات:', error);
        throw new Error(`فشل تحميل البيانات: ${error.message}`);
    }
}

// ===== إظهار حالة التحميل الأولية =====
function showInitialLoadingState() {
    const articlesGrid = document.querySelector('.articles-grid');
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div class="initial-loading">
                <div class="loading-spinner"></div>
                <h3>جاري تحميل محتوى الموقع...</h3>
                <p>يرجى الانتظار قليلاً</p>
            </div>
        `;
    }
}

// ===== إخفاء حالة التحميل الأولية =====
function hideInitialLoadingState() {
    const loadingElement = document.querySelector('.initial-loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// ===== إظهار رسالة خطأ مفصلة =====
function showDetailedErrorMessage(error) {
    const articlesGrid = document.querySelector('.articles-grid');
    if (!articlesGrid) {
        // إنشاء عنصر بديل إذا لم تكن الشبكة موجودة
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        document.body.appendChild(errorContainer);
        articlesGrid = errorContainer;
    }
    
    articlesGrid.innerHTML = `
        <div class="detailed-error-message">
            <div class="error-icon">⚠️</div>
            <h3>حدث خطأ في تحميل الموقع</h3>
            <p class="error-description">${error.message}</p>
            
            <div class="error-suggestions">
                <h4>💡 جرب الحلول التالية:</h4>
                <ul>
                    <li>تحديث الصفحة (F5)</li>
                    <li>التحقق من اتصال الإنترنت</li>
                    <li>مسح ذاكرة التخزين المؤقت للمتصفح</li>
                    <li>إعادة المحاولة بعد دقيقة</li>
                </ul>
            </div>
            
            <div class="error-actions">
                <button onclick="window.location.reload()" class="retry-btn primary">
                    🔄 إعادة المحاولة
                </button>
                <button onclick="loadFallbackContent()" class="fallback-btn">
                    📄 تحميل المحتوى البديل
                </button>
                <button onclick="clearCacheAndReload()" class="clear-cache-btn">
                    🗑️ مسح الذاكرة المؤقتة
                </button>
            </div>
            
            <details class="error-details">
                <summary>تفاصيل تقنية للمطورين</summary>
                <pre class="error-stack">${error.stack || 'لا توجد تفاصيل إضافية'}</pre>
            </details>
        </div>
    `;
}

// ===== تحميل المحتوى البديل =====
function loadFallbackContent() {
    try {
        console.log('تحميل المحتوى البديل...');
        allArticles = getFallbackArticles();
        filteredArticles = [...allArticles];
        
        // إعادة تهيئة الواجهة
        initializeUI();
        displayInitialArticles();
        setupEventListeners();
        
        showToast('تم تحميل المحتوى البديل بنجاح!', 'success');
        appInitialized = true;
        
    } catch (error) {
        console.error('فشل في تحميل المحتوى البديل:', error);
        showToast('فشل في تحميل المحتوى البديل', 'error');
    }
}

// ===== مسح الذاكرة المؤقتة وإعادة التحميل =====
async function clearCacheAndReload() {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('تم مسح جميع الذاكرة المؤقتة');
        }
        
        // مسح localStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // إعادة تحميل الصفحة
        window.location.reload(true);
        
    } catch (error) {
        console.error('فشل في مسح الذاكرة المؤقتة:', error);
        window.location.reload();
    }
}

// ===== دالة مساعدة للانتظار =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== تهيئة واجهة المستخدم =====
function initializeUI() {
    try {
        createSearchAndFilterControls();
        createLoadingIndicator();
        enhanceExistingElements();
    } catch (error) {
        console.error('خطأ في تهيئة الواجهة:', error);
        throw new Error(`فشل تهيئة الواجهة: ${error.message}`);
    }
}

// ===== إنشاء عناصر التحكم بالبحث والفلترة =====
function createSearchAndFilterControls() {
    const articlesSection = document.querySelector('#articles');
    if (!articlesSection) {
        console.error('قسم المقالات غير موجود');
        return;
    }

    // التحقق من وجود عناصر التحكم مسبقاً
    if (document.querySelector('.articles-controls')) {
        console.log('عناصر التحكم موجودة مسبقاً');
        return;
    }

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'articles-controls';
    controlsContainer.innerHTML = `
        <div class="search-filter-container">
            <div class="search-box">
                <input type="text" id="articleSearch" placeholder="🔍 ابحث في المقالات..." autocomplete="off" aria-label="البحث في المقالات">
                <div class="search-suggestions" id="searchSuggestions"></div>
            </div>
            
            <div class="filter-controls">
                <select id="categoryFilter" aria-label="فلترة حسب التصنيف">
                    <option value="all">جميع التصنيفات</option>
                    <option value="تقنية">تقنية</option>
                    <option value="صحة">صحة</option>
                    <option value="ثقافة">ثقافة</option>
                    <option value="نمط حياة">نمط حياة</option>
                    <option value="بيئة">بيئة</option>
                    <option value="طبخ">طبخ</option>
                    <option value="رياضة">رياضة</option>
                    <option value="مال">مال</option>
                </select>
                
                <select id="sortFilter" aria-label="ترتيب حسب">
                    <option value="date">الأحدث أولاً</option>
                    <option value="popular">الأكثر شعبية</option>
                    <option value="readTime">وقت القراءة</option>
                    <option value="title">الترتيب الأبجدي</option>
                </select>
                
                <button id="clearFilters" class="clear-filters-btn" type="button">
                    ✨ مسح الفلاتر
                </button>
            </div>
        </div>
        
        <div class="articles-stats">
            <span id="articlesCount">عدد المقالات: 0</span>
            <span id="filterStatus"></span>
        </div>
    `;

    // إدراج عناصر التحكم قبل شبكة المقالات
    const articlesGrid = articlesSection.querySelector('.articles-grid');
    if (articlesGrid) {
        articlesSection.insertBefore(controlsContainer, articlesGrid);
    } else {
        console.error('شبكة المقالات غير موجودة');
    }
}

// ===== إنشاء مؤشر التحميل =====
function createLoadingIndicator() {
    // التحقق من وجود المؤشر مسبقاً
    if (document.getElementById('loadingIndicator')) {
        return;
    }

    const loadingHTML = `
        <div class="loading-indicator" id="loadingIndicator">
            <div class="spinner"></div>
            <p>جاري التحميل...</p>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

// ===== عرض المقالات الأولية =====
function displayInitialArticles() {
    const articlesGrid = document.querySelector('.articles-grid');
    if (!articlesGrid) {
        throw new Error('شبكة المقالات غير موجودة');
    }

    // مسح المحتوى الحالي
    articlesGrid.innerHTML = '';
    
    if (filteredArticles.length === 0) {
        articlesGrid.innerHTML = `
            <div class="no-articles-message">
                <h3>📝 لا توجد مقالات للعرض</h3>
                <p>يبدو أنه لا توجد مقالات متاحة حالياً</p>
                <button onclick="loadFallbackContent()" class="load-fallback-btn">
                    تحميل محتوى تجريبي
                </button>
            </div>
        `;
        return;
    }
    
    // عرض المقالات الأولية
    displayedArticles = filteredArticles.slice(0, APP_CONFIG.articlesPerPage);
    renderArticles(displayedArticles);
    
    // تحديث زر "عرض المزيد"
    updateLoadMoreButton();
}

// ===== عرض المقالات =====
function renderArticles(articles, append = false) {
    const articlesGrid = document.querySelector('.articles-grid');
    if (!articlesGrid) {
        console.error('شبكة المقالات غير موجودة');
        return;
    }

    if (!append) {
        articlesGrid.innerHTML = '';
    }

    if (!articles || articles.length === 0) {
        if (!append) {
            articlesGrid.innerHTML = `
                <div class="no-articles-found">
                    <h3>🔍 لم نجد مقالات</h3>
                    <p>لم نجد مقالات تطابق معايير البحث الحالية</p>
                </div>
            `;
        }
        return;
    }

    articles.forEach((article, index) => {
        try {
            const articleElement = createArticleElement(article);
            articleElement.style.animationDelay = `${index * 0.1}s`;
            articlesGrid.appendChild(articleElement);
        } catch (error) {
            console.error(`خطأ في إنشاء عنصر المقال ${article.id}:`, error);
        }
    });

    // إضافة تأثيرات الحركة
    setTimeout(() => animateArticleCards(), 100);
}

// ===== باقي الكود يبقى كما هو مع إضافة معالجة أفضل للأخطاء =====

// إنشاء عنصر المقال
function createArticleElement(article) {
    if (!article) {
        throw new Error('بيانات المقال غير موجودة');
    }

    const articleCard = document.createElement('article');
    articleCard.className = 'article-card fade-in';
    articleCard.dataset.category = article.category || '';
    articleCard.dataset.id = article.id || '';

    const categoryColor = getCategoryColor(article.category);
    const featuredBadge = article.featured ? '<span class="featured-badge">⭐ مميز</span>' : '';
    
    articleCard.innerHTML = `
        ${featuredBadge}
        <div class="article-category" style="background: ${categoryColor}">
            ${article.category || 'عام'}
        </div>
        <h3>${article.title || 'عنوان المقال'}</h3>
        <p class="article-excerpt">${article.excerpt || 'ملخص المقال...'}</p>
        
        <div class="article-meta">
            <div class="article-author">
                <span class="author-icon">👤</span>
                ${article.author || 'كاتب مجهول'}
            </div>
            <div class="article-stats">
                <span title="وقت القراءة">⏱️ ${article.readTime || '5 دقائق'}</span>
                <span title="عدد المشاهدات">👀 ${formatNumber(article.views || 0)}</span>
                <span title="عدد الإعجابات">❤️ ${formatNumber(article.likes || 0)}</span>
            </div>
        </div>
        
        <div class="article-tags">
            ${(article.tags || []).slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
        
        <div class="article-footer">
            <a href="${article.url || '#'}" class="read-more">اقرأ المزيد</a>
            <div class="article-actions">
                <button class="action-btn like-btn" data-id="${article.id}" title="أعجبني">
                    ❤️
                </button>
                <button class="action-btn share-btn" data-url="${article.url}" title="شارك">
                    📤
                </button>
                <button class="action-btn bookmark-btn" data-id="${article.id}" title="حفظ للمفضلة">
                    🔖
                </button>
            </div>
        </div>
    `;

    // إضافة تأثير hover
    addHoverEffects(articleCard);
    
    return articleCard;
}

// ===== بيانات احتياطية محسنة =====
function getFallbackArticles() {
    return [
        {
            id: 1,
            title: "مرحباً بك في موقع محتوى",
            category: "عام",
            excerpt: "هذا محتوى تجريبي لعرض كيفية عمل الموقع. نحن نعمل على تحسين تجربة المستخدم باستمرار.",
            url: "#",
            author: "فريق محتوى",
            publishDate: "2024-09-16",
            readTime: "3 دقائق قراءة",
            tags: ["ترحيب", "موقع", "تجريبي"],
            featured: true,
            views: 100,
            likes: 10
        },
        {
            id: 2,
            title: "كيفية استخدام الموقع",
            category: "مساعدة",
            excerpt: "دليل بسيط لاستخدام ميزات الموقع المختلفة والاستفادة القصوى من المحتوى المتاح.",
            url: "#",
            author: "فريق الدعم",
            publishDate: "2024-09-16",
            readTime: "5 دقائق قراءة",
            tags: ["دليل", "مساعدة", "استخدام"],
            featured: false,
            views: 75,
            likes: 5
        },
        {
            id: 3,
            title: "نحن نحسن الموقع",
            category: "إعلان",
            excerpt: "نعمل باستمرار على تحسين الموقع وإضافة ميزات جديدة. تابعونا للحصول على آخر التحديثات.",
            url: "#",
            author: "فريق التطوير",
            publishDate: "2024-09-16",
            readTime: "2 دقيقة قراءة",
            tags: ["تحديث", "تطوير", "جديد"],
            featured: false,
            views: 50,
            likes: 3
        }
    ];
}

// باقي الوظائف تبقى كما هي...
// [يمكنني إضافة باقي الوظائف إذا كنت تريد الملف كاملاً]

// === إعداد مستمعي الأحداث ===
function setupEventListeners() {
    try {
        // البحث
        const searchInput = document.getElementById('articleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
            searchInput.addEventListener('focus', showSearchSuggestions);
            searchInput.addEventListener('blur', hideSearchSuggestions);
        }

        // الفلترة
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        const clearFiltersBtn = document.getElementById('clearFilters');

        if (categoryFilter) categoryFilter.addEventListener('change', handleCategoryFilter);
        if (sortFilter) sortFilter.addEventListener('change', handleSortFilter);
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);

        // زر عرض المزيد
        const loadMoreBtn = document.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreArticles);
        }

        // أزرار الإجراءات
        document.addEventListener('click', handleArticleActions);

        // تحسينات أخرى
        enhanceNavigationAndUI();
        setupScrollEffects();
        initializeContactForm();

    } catch (error) {
        console.error('خطأ في إعداد مستمعي الأحداث:', error);
    }
}

// === باقي الوظائف كما هي ===

// معالج البحث
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        try {
            if (query === '') {
                filteredArticles = [...allArticles];
            } else {
                filteredArticles = allArticles.filter(article => 
                    (article.title && article.title.toLowerCase().includes(query)) ||
                    (article.excerpt && article.excerpt.toLowerCase().includes(query)) ||
                    (article.tags && article.tags.some(tag => tag.toLowerCase().includes(query))) ||
                    (article.category && article.category.toLowerCase().includes(query))
                );
            }
            
            applySortAndDisplay();
            updateFilterStatus(`البحث: "${e.target.value}"`);
        } catch (error) {
            console.error('خطأ في البحث:', error);
            showToast('حدث خطأ في البحث', 'error');
        }
    }, APP_CONFIG.searchDelay);
}

// معالج فلترة التصنيف
function handleCategoryFilter(e) {
    try {
        currentFilter = e.target.value;
        
        if (currentFilter === 'all') {
            filteredArticles = [...allArticles];
        } else {
            filteredArticles = allArticles.filter(article => 
                article.category === currentFilter
            );
        }
        
        applySortAndDisplay();
        updateFilterStatus(currentFilter === 'all' ? '' : `التصنيف: ${currentFilter}`);
    } catch (error) {
        console.error('خطأ في الفلترة:', error);
        showToast('حدث خطأ في الفلترة', 'error');
    }
}

// معالج ترتيب المقالات
function handleSortFilter(e) {
    try {
        currentSort = e.target.value;
        applySortAndDisplay();
    } catch (error) {
        console.error('خطأ في الترتيب:', error);
        showToast('حدث خطأ في الترتيب', 'error');
    }
}

// تطبيق الترتيب والعرض
function applySortAndDisplay() {
    try {
        // ترتيب المقالات
        switch (currentSort) {
            case 'popular':
                filteredArticles.sort((a, b) => ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0)));
                break;
            case 'readTime':
                filteredArticles.sort((a, b) => {
                    const aTime = parseInt((a.readTime || '0').replace(/[^\d]/g, '')) || 0;
                    const bTime = parseInt((b.readTime || '0').replace(/[^\d]/g, '')) || 0;
                    return aTime - bTime;
                });
                break;
            case 'title':
                filteredArticles.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
                break;
            case 'date':
            default:
                filteredArticles.sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0));
                break;
        }
        
        // إعادة تعيين العرض
        currentPage = 1;
        displayInitialArticles();
    } catch (error) {
        console.error('خطأ في تطبيق الترتيب:', error);
        showToast('حدث خطأ في تطبيق الترتيب', 'error');
    }
}

// === وظائف مساعدة ===

function getCategoryColor(category) {
    const colors = {
        'تقنية': '#667eea',
        'صحة': '#48bb78',
        'ثقافة': '#ed8936',
        'نمط حياة': '#9f7aea',
        'بيئة': '#38b2ac',
        'طبخ': '#f56565',
        'رياضة': '#4299e1',
        'مال': '#38a169',
        'عام': '#718096',
        'مساعدة': '#38b2ac',
        'إعلان': '#ed8936'
    };
    return colors[category] || '#667eea';
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function updateArticleCount() {
    const countElement = document.getElementById('articlesCount');
    if (countElement) {
        countElement.textContent = `عدد المقالات: ${filteredArticles.length}`;
    }
}

function updateFilterStatus(status) {
    const statusElement = document.getElementById('filterStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.style.display = status ? 'block' : 'none';
    }
    updateArticleCount();
}

// === مؤشرات التحميل ===
function showLoadingIndicator() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// === رسائل التنبيه ===
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// === تحسينات إضافة للعناصر الموجودة ===
function enhanceExistingElements() {
    try {
        // تحسين زر CTA
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.addEventListener('click', function() {
                const articlesSection = document.querySelector('#articles');
                if (articlesSection) {
                    articlesSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    } catch (error) {
        console.error('خطأ في تحسين العناصر:', error);
    }
}

// === تأثيرات التمرير ===
function setupScrollEffects() {
    // يمكن إضافة تأثيرات التمرير هنا
}

// === تحسين نموذج الاتصال ===
function initializeContactForm() {
    // يمكن إضافة تحسينات النموذج هنا
}

// === تحريك بطاقات المقالات ===
function animateArticleCards() {
    const cards = document.querySelectorAll('.article-card:not(.visible)');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    cards.forEach(card => observer.observe(card));
}

// === إضافة تأثيرات التفاعل ===
function addHoverEffects(card) {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
        this.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    });
}

// === تحديث زر عرض المزيد ===
function updateLoadMoreButton() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (!loadMoreBtn) return;

    const hasMore = displayedArticles.length < filteredArticles.length;
    const remainingCount = filteredArticles.length - displayedArticles.length;
    
    if (hasMore) {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.textContent = `عرض المزيد (${remainingCount} متبقي)`;
        loadMoreBtn.disabled = false;
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// === تحميل المزيد من المقالات ===
function loadMoreArticles() {
    showLoadingIndicator();
    
    setTimeout(() => {
        try {
            const startIndex = displayedArticles.length;
            const endIndex = startIndex + APP_CONFIG.loadMoreIncrement;
            const newArticles = filteredArticles.slice(startIndex, endIndex);
            
            if (newArticles.length > 0) {
                displayedArticles = displayedArticles.concat(newArticles);
                renderArticles(newArticles, true);
            }
            
            updateLoadMoreButton();
            
            // انتقال سلس إلى المقالات الجديدة
            if (newArticles.length > 0) {
                const newArticleElements = document.querySelectorAll('.article-card:not(.visible)');
                if (newArticleElements[0]) {
                    newArticleElements[0].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل المزيد:', error);
            showToast('حدث خطأ في تحميل المقالات الإضافية', 'error');
        } finally {
            hideLoadingIndicator();
        }
    }, 800);
}

// === معالج إجراءات المقالات ===
function handleArticleActions(e) {
    try {
        if (e.target.classList.contains('like-btn')) {
            handleLike(e.target);
        } else if (e.target.classList.contains('share-btn')) {
            handleShare(e.target);
        } else if (e.target.classList.contains('bookmark-btn')) {
            handleBookmark(e.target);
        }
    } catch (error) {
        console.error('خطأ في معالجة الإجراء:', error);
        showToast('حدث خطأ في تنفيذ الإجراء', 'error');
    }
}

// === معالج الإعجاب ===
function handleLike(button) {
    const articleId = button.dataset.id;
    const isLiked = button.classList.contains('liked');
    
    if (isLiked) {
        button.classList.remove('liked');
        button.style.transform = 'scale(1)';
        button.textContent = '❤️';
        showToast('تم إلغاء الإعجاب', 'info');
    } else {
        button.classList.add('liked');
        button.style.transform = 'scale(1.2)';
        button.textContent = '💖';
        showToast('تم الإعجاب بالمقال!', 'success');
    }
    
    // حفظ في التخزين المحلي
    saveLikeStatus(articleId, !isLiked);
}

// === معالج المشاركة ===
function handleShare(button) {
    const url = button.dataset.url;
    const article = allArticles.find(a => a.url === url);
    
    if (!article) {
        showToast('لم نتمكن من العثور على المقال للمشاركة', 'error');
        return;
    }
    
    const shareText = `${article.title} - ${window.location.origin}${article.url}`;
    
    if (navigator.share) {
        navigator.share({
            title: article.title,
            text: article.excerpt,
            url: `${window.location.origin}${article.url}`
        }).catch(err => console.log('خطأ في المشاركة:', err));
    } else {
        // نسخ الرابط إلى الحافظة
        copyToClipboard(shareText);
    }
}

// === معالج الحفظ في المفضلة ===
function handleBookmark(button) {
    const articleId = button.dataset.id;
    const isBookmarked = button.classList.contains('bookmarked');
    
    if (isBookmarked) {
        button.classList.remove('bookmarked');
        button.textContent = '🔖';
        showToast('تم إزالة المقال من المفضلة', 'info');
    } else {
        button.classList.add('bookmarked');
        button.textContent = '📌';
        showToast('تم حفظ المقال في المفضلة', 'success');
    }
    
    saveBookmarkStatus(articleId, !isBookmarked);
}

// === نسخ النص للحافظة ===
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم نسخ رابط المقال بنجاح!', 'success');
        }).catch(() => {
            showToast('فشل في نسخ الرابط', 'error');
        });
    } else {
        // بديل للمتصفحات القديمة
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('تم نسخ رابط المقال بنجاح!', 'success');
        } catch (err) {
            showToast('فشل في نسخ الرابط', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// === حفظ واسترجاع التفضيلات ===
function saveLikeStatus(articleId, liked) {
    try {
        const likes = JSON.parse(localStorage.getItem('articleLikes') || '{}');
        if (liked) {
            likes[articleId] = true;
        } else {
            delete likes[articleId];
        }
        localStorage.setItem('articleLikes', JSON.stringify(likes));
    } catch (error) {
        console.error('خطأ في حفظ حالة الإعجاب:', error);
    }
}

function saveBookmarkStatus(articleId, bookmarked) {
    try {
        const bookmarks = JSON.parse(localStorage.getItem('articleBookmarks') || '{}');
        if (bookmarked) {
            bookmarks[articleId] = true;
        } else {
            delete bookmarks[articleId];
        }
        localStorage.setItem('articleBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.error('خطأ في حفظ حالة المفضلة:', error);
    }
}

// === مسح جميع الفلاتر ===
function clearAllFilters() {
    try {
        // إعادة تعيين الفلاتر
        const searchInput = document.getElementById('articleSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'date';
        
        // إعادة تعيين البيانات
        currentFilter = 'all';
        currentSort = 'date';
        filteredArticles = [...allArticles];
        
        // إعادة العرض
        applySortAndDisplay();
        updateFilterStatus('');
        
        showToast('تم مسح جميع الفلاتر', 'info');
    } catch (error) {
        console.error('خطأ في مسح الفلاتر:', error);
        showToast('حدث خطأ في مسح الفلاتر', 'error');
    }
}

// === تحسين التنقل ===
function enhanceNavigationAndUI() {
    try {
        // تحسين القائمة المحمولة
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', function() {
                this.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // إغلاق القائمة عند النقر على رابط
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }

        // تحسين التنقل السلس
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    } catch (error) {
        console.error('خطأ في تحسين التنقل:', error);
    }
}

// === إضافة أنماط CSS للحالات الجديدة ===
if (!document.getElementById('dynamic-styles')) {
    const styles = document.createElement('style');
    styles.id = 'dynamic-styles';
    styles.textContent = `
        .initial-loading {
            text-align: center;
            padding: 4rem 2rem;
            color: #666;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 2rem;
        }
        
        .detailed-error-message {
            max-width: 600px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .error-suggestions {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            margin: 1.5rem 0;
            text-align: right;
        }
        
        .error-suggestions ul {
            list-style: none;
            padding: 0;
        }
        
        .error-suggestions li {
            padding: 0.5rem 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin: 2rem 0;
        }
        
        .retry-btn, .fallback-btn, .clear-cache-btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Cairo', sans-serif;
        }
        
        .fallback-btn {
            background: linear-gradient(45deg, #48bb78, #38a169);
        }
        
        .clear-cache-btn {
            background: linear-gradient(45deg, #ed8936, #dd7324);
        }
        
        .retry-btn:hover, .fallback-btn:hover, .clear-cache-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .error-details {
            margin-top: 2rem;
            text-align: right;
        }
        
        .error-stack {
            background: #f1f1f1;
            padding: 1rem;
            border-radius: 5px;
            font-family: monospace;
            font-size: 0.8rem;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        
        .no-articles-message, .no-articles-found {
            text-align: center;
            padding: 3rem 2rem;
            color: #666;
        }
        
        .load-fallback-btn {
            background: linear-gradient(45deg, #4299e1, #3182ce);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Cairo', sans-serif;
            margin-top: 1rem;
        }
        
        .load-fallback-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(66, 153, 225, 0.3);
        }
    `;
    document.head.appendChild(styles);
}
