// ===== إعدادات التطبيق =====
const APP_CONFIG = {
    articlesPerPage: 6,
    loadMoreIncrement: 3,
    animationDuration: 300,
    searchDelay: 500
};

// ===== متغيرات التطبيق =====
let allArticles = [];
let displayedArticles = [];
let filteredArticles = [];
let currentPage = 1;
let currentFilter = 'all';
let currentSort = 'date';
let searchTimeout;

// ===== بدء تشغيل التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// ===== تهيئة التطبيق =====
async function initializeApp() {
    try {
        // تحميل البيانات
        await loadArticlesData();
        
        // تهيئة الواجهة
        initializeUI();
        
        // عرض المقالات الأولية
        displayInitialArticles();
        
        // إعداد مستمعي الأحداث
        setupEventListeners();
        
        console.log('✅ تم تحميل التطبيق بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        showErrorMessage('حدث خطأ في تحميل الموقع. يرجى المحاولة مرة أخرى.');
    }
}

// ===== تحميل بيانات المقالات =====
async function loadArticlesData() {
    try {
        const response = await fetch('articles.json');
        if (!response.ok) {
            throw new Error('فشل في تحميل البيانات');
        }
        
        const data = await response.json();
        allArticles = data.articles || [];
        filteredArticles = [...allArticles];
        
        // تحديث عدد المقالات في الواجهة
        updateArticleCount();
        
    } catch (error) {
        console.error('خطأ في تحميل المقالات:', error);
        // في حالة فشل التحميل، استخدم بيانات احتياطية مبسطة
        allArticles = getFallbackArticles();
        filteredArticles = [...allArticles];
    }
}

// ===== تهيئة واجهة المستخدم =====
function initializeUI() {
    createSearchAndFilterControls();
    createLoadingIndicator();
    enhanceExistingElements();
}

// ===== إنشاء عناصر التحكم بالبحث والفلترة =====
function createSearchAndFilterControls() {
    const articlesSection = document.querySelector('#articles');
    if (!articlesSection) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'articles-controls';
    controlsContainer.innerHTML = `
        <div class="search-filter-container">
            <div class="search-box">
                <input type="text" id="articleSearch" placeholder="🔍 ابحث في المقالات..." autocomplete="off">
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
                
                <button id="clearFilters" class="clear-filters-btn">
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
    articlesSection.insertBefore(controlsContainer, articlesGrid);
}

// ===== إنشاء مؤشر التحميل =====
function createLoadingIndicator() {
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
    if (!articlesGrid) return;

    // مسح المحتوى الحالي
    articlesGrid.innerHTML = '';
    
    // عرض المقالات الأولية
    displayedArticles = filteredArticles.slice(0, APP_CONFIG.articlesPerPage);
    renderArticles(displayedArticles);
    
    // تحديث زر "عرض المزيد"
    updateLoadMoreButton();
}

// ===== عرض المقالات =====
function renderArticles(articles, append = false) {
    const articlesGrid = document.querySelector('.articles-grid');
    if (!articlesGrid) return;

    if (!append) {
        articlesGrid.innerHTML = '';
    }

    articles.forEach((article, index) => {
        const articleElement = createArticleElement(article);
        articleElement.style.animationDelay = `${index * 0.1}s`;
        articlesGrid.appendChild(articleElement);
    });

    // إضافة تأثيرات الحركة
    animateArticleCards();
}

// ===== إنشاء عنصر المقال =====
function createArticleElement(article) {
    const articleCard = document.createElement('article');
    articleCard.className = 'article-card fade-in';
    articleCard.dataset.category = article.category;
    articleCard.dataset.id = article.id;

    const categoryColor = getCategoryColor(article.category);
    const featuredBadge = article.featured ? '<span class="featured-badge">⭐ مميز</span>' : '';
    
    articleCard.innerHTML = `
        ${featuredBadge}
        <div class="article-category" style="background: ${categoryColor}">
            ${article.category}
        </div>
        <h3>${article.title}</h3>
        <p class="article-excerpt">${article.excerpt}</p>
        
        <div class="article-meta">
            <div class="article-author">
                <span class="author-icon">👤</span>
                ${article.author}
            </div>
            <div class="article-stats">
                <span title="وقت القراءة">⏱️ ${article.readTime}</span>
                <span title="عدد المشاهدات">👀 ${formatNumber(article.views)}</span>
                <span title="عدد الإعجابات">❤️ ${formatNumber(article.likes)}</span>
            </div>
        </div>
        
        <div class="article-tags">
            ${article.tags.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
        
        <div class="article-footer">
            <a href="${article.url}" class="read-more">اقرأ المزيد</a>
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

// ===== إضافة تأثيرات التفاعل =====
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

// ===== إعداد مستمعي الأحداث =====
function setupEventListeners() {
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

    // أزرار الإجراءات (إعجاب، مشاركة، حفظ)
    document.addEventListener('click', handleArticleActions);

    // تفعيل الأجزاء الموجودة
    enhanceNavigationAndUI();
    setupScrollEffects();
    initializeContactForm();
}

// ===== معالج البحث =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query === '') {
            filteredArticles = [...allArticles];
        } else {
            filteredArticles = allArticles.filter(article => 
                article.title.toLowerCase().includes(query) ||
                article.excerpt.toLowerCase().includes(query) ||
                article.tags.some(tag => tag.toLowerCase().includes(query)) ||
                article.category.toLowerCase().includes(query)
            );
        }
        
        applySortAndDisplay();
        updateFilterStatus(`البحث: "${e.target.value}"`);
    }, APP_CONFIG.searchDelay);
}

// ===== معالج فلترة التصنيف =====
function handleCategoryFilter(e) {
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
}

// ===== معالج ترتيب المقالات =====
function handleSortFilter(e) {
    currentSort = e.target.value;
    applySortAndDisplay();
}

// ===== تطبيق الترتيب والعرض =====
function applySortAndDisplay() {
    // ترتيب المقالات
    switch (currentSort) {
        case 'popular':
            filteredArticles.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
            break;
        case 'readTime':
            filteredArticles.sort((a, b) => {
                const aTime = parseInt(a.readTime);
                const bTime = parseInt(b.readTime);
                return aTime - bTime;
            });
            break;
        case 'title':
            filteredArticles.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
            break;
        case 'date':
        default:
            filteredArticles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
            break;
    }
    
    // إعادة تعيين العرض
    currentPage = 1;
    displayInitialArticles();
}

// ===== تحميل المزيد من المقالات =====
function loadMoreArticles() {
    showLoadingIndicator();
    
    setTimeout(() => {
        const startIndex = displayedArticles.length;
        const endIndex = startIndex + APP_CONFIG.loadMoreIncrement;
        const newArticles = filteredArticles.slice(startIndex, endIndex);
        
        if (newArticles.length > 0) {
            displayedArticles = displayedArticles.concat(newArticles);
            renderArticles(newArticles, true);
        }
        
        updateLoadMoreButton();
        hideLoadingIndicator();
        
        // انتقال سلس إلى المقالات الجديدة
        if (newArticles.length > 0) {
            const newArticleElements = document.querySelectorAll('.article-card:not(.visible)');
            newArticleElements[0]?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 800);
}

// ===== تحديث زر عرض المزيد =====
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

// ===== معالج إجراءات المقالات =====
function handleArticleActions(e) {
    if (e.target.classList.contains('like-btn')) {
        handleLike(e.target);
    } else if (e.target.classList.contains('share-btn')) {
        handleShare(e.target);
    } else if (e.target.classList.contains('bookmark-btn')) {
        handleBookmark(e.target);
    }
}

// ===== معالج الإعجاب =====
function handleLike(button) {
    const articleId = button.dataset.id;
    const isLiked = button.classList.contains('liked');
    
    if (isLiked) {
        button.classList.remove('liked');
        button.style.transform = 'scale(1)';
        button.textContent = '❤️';
    } else {
        button.classList.add('liked');
        button.style.transform = 'scale(1.2)';
        button.textContent = '💖';
        
        // تأثير بصري
        createFloatingHeart(button);
    }
    
    // حفظ في التخزين المحلي
    saveLikeStatus(articleId, !isLiked);
}

// ===== معالج المشاركة =====
function handleShare(button) {
    const url = button.dataset.url;
    const article = allArticles.find(a => a.url === url);
    
    if (!article) return;
    
    // إنشاء قائمة المشاركة
    const shareOptions = [
        {
            name: 'واتساب',
            icon: '📱',
            url: `https://wa.me/?text=${encodeURIComponent(article.title + ' - ' + window.location.origin + '/' + url)}`
        },
        {
            name: 'تويتر',
            icon: '🐦',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.origin + '/' + url)}`
        },
        {
            name: 'فيسبوك',
            icon: '📘',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/' + url)}`
        },
        {
            name: 'نسخ الرابط',
            icon: '🔗',
            action: () => copyToClipboard(window.location.origin + '/' + url)
        }
    ];
    
    showShareModal(shareOptions, article.title);
}

// ===== معالج الحفظ في المفضلة =====
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

// ===== مسح جميع الفلاتر =====
function clearAllFilters() {
    // إعادة تعيين الفلاتر
    document.getElementById('articleSearch').value = '';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('sortFilter').value = 'date';
    
    // إعادة تعيين البيانات
    currentFilter = 'all';
    currentSort = 'date';
    filteredArticles = [...allArticles];
    
    // إعادة العرض
    applySortAndDisplay();
    updateFilterStatus('');
    
    showToast('تم مسح جميع الفلاتر', 'info');
}

// ===== وظائف مساعدة =====
function getCategoryColor(category) {
    const colors = {
        'تقنية': '#667eea',
        'صحة': '#48bb78',
        'ثقافة': '#ed8936',
        'نمط حياة': '#9f7aea',
        'بيئة': '#38b2ac',
        'طبخ': '#f56565',
        'رياضة': '#4299e1',
        'مال': '#38a169'
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

// ===== مؤشرات التحميل =====
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

// ===== تحسينات إضافية =====
function createFloatingHeart(button) {
    const heart = document.createElement('div');
    heart.textContent = '💖';
    heart.className = 'floating-heart';
    heart.style.cssText = `
        position: absolute;
        font-size: 1.5rem;
        pointer-events: none;
        animation: floatUp 1s ease-out forwards;
        z-index: 1000;
    `;
    
    const rect = button.getBoundingClientRect();
    heart.style.left = rect.left + 'px';
    heart.style.top = rect.top + 'px';
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        heart.remove();
    }, 1000);
}

function showToast(message, type = 'info') {
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
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ الرابط بنجاح!', 'success');
    }).catch(() => {
        showToast('فشل في نسخ الرابط', 'error');
    });
}

// ===== حفظ واسترجاع التفضيلات =====
function saveLikeStatus(articleId, liked) {
    const likes = JSON.parse(localStorage.getItem('articleLikes') || '{}');
    if (liked) {
        likes[articleId] = true;
    } else {
        delete likes[articleId];
    }
    localStorage.setItem('articleLikes', JSON.stringify(likes));
}

function saveBookmarkStatus(articleId, bookmarked) {
    const bookmarks = JSON.parse(localStorage.getItem('articleBookmarks') || '{}');
    if (bookmarked) {
        bookmarks[articleId] = true;
    } else {
        delete bookmarks[articleId];
    }
    localStorage.setItem('articleBookmarks', JSON.stringify(bookmarks));
}

// ===== بيانات احتياطية =====
function getFallbackArticles() {
    return [
        {
            id: 1,
            title: "الذكاء الاصطناعي وتأثيره على مستقبل العمل",
            category: "تقنية",
            excerpt: "كيف يغير الذكاء الاصطناعي سوق العمل؟ وما هي المهارات التي ستحتاجها في المستقبل؟",
            url: "articles/ai-future-work.html",
            author: "فريق محتوى",
            publishDate: "2024-09-15",
            readTime: "7 دقائق قراءة",
            tags: ["ذكاء اصطناعي", "تكنولوجيا", "وظائف"],
            featured: true,
            views: 1250,
            likes: 89
        }
        // ... المزيد من البيانات الاحتياطية
    ];
}

// ===== تحسينات إضافية للعناصر الموجودة =====
function enhanceExistingElements() {
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
}

// ===== تأثيرات التمرير =====
function setupScrollEffects() {
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // إخفاء/إظهار الهيدر عند التمرير
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        // تأثير خلفية الهيدر
        if (scrollTop > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = '#fff';
            header.style.backdropFilter = 'none';
        }
        
        lastScrollTop = scrollTop;
    });
}

// ===== تحسين نموذج الاتصال =====
function initializeContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // إظهار مؤشر التحميل
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'جاري الإرسال...';
        submitBtn.disabled = true;
        
        try {
            // محاكاة إرسال البيانات
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showToast('تم إرسال رسالتك بنجاح!', 'success');
            this.reset();
            
        } catch (error) {
            showToast('حدث خطأ في الإرسال. حاول مرة أخرى.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ===== تحريك بطاقات المقالات =====
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

// ===== تحسين التنقل =====
function enhanceNavigationAndUI() {
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
}

// ===== عرض خطأ =====
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>⚠️ حدث خطأ</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()" class="retry-btn">
                إعادة المحاولة
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}