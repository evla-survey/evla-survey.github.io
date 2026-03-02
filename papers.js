// Papers List Functionality
(async function() {
    // Load papers data from JSON
    let papersData = null;
    let allPapers = [];

    try {
        const response = await fetch('papers.json');
        papersData = await response.json();
        allPapers = papersData.papers;
        console.log(`Loaded ${allPapers.length} papers`);
    } catch (error) {
        console.error('Error loading papers:', error);
        return;
    }

    // State
    let currentCategory = 'all';
    let currentSubcategory = null;
    let searchQuery = '';
    let sortBy = 'year'; // 'year', 'title'
    let sortOrder = 'desc'; // 'asc', 'desc'

    // Category mapping
    const categoryMap = {
        'Efficient Model Design': 'model-design',
        'Efficient Training': 'training',
        'Efficient Data Collection': 'data'
    };

    const reverseCategoryMap = {
        'model-design': 'Efficient Model Design',
        'training': 'Efficient Training',
        'data': 'Efficient Data Collection'
    };

    // Get unique subcategories for each main category
    function getSubcategories(mainCategory) {
        const subcats = new Set();
        allPapers.forEach(paper => {
            paper.categories.forEach(cat => {
                if (cat.category === mainCategory) {
                    subcats.add(cat.subcategory);
                }
            });
        });
        return Array.from(subcats).sort();
    }

    // Initialize
    function init() {
        renderPapers();
        updateStatistics();
        setupEventListeners();
    }

    // Render papers
    function renderPapers() {
        const tbody = document.getElementById('paperTableBody');
        const noResults = document.getElementById('noResults');

        if (!tbody) return;

        // Filter papers
        let filtered = allPapers.filter(paper => {
            // Must have at least one category
            if (!paper.categories || paper.categories.length === 0) return false;

            // Category filter
            if (currentCategory !== 'all') {
                const hasCategory = paper.categories.some(cat =>
                    categoryMap[cat.category] === currentCategory
                );
                if (!hasCategory) return false;
            }

            // Subcategory filter
            if (currentSubcategory) {
                const hasSubcategory = paper.categories.some(cat =>
                    cat.subcategory === currentSubcategory
                );
                if (!hasSubcategory) return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const titleMatch = paper.title.toLowerCase().includes(query);
                const authorMatch = paper.authors.toLowerCase().includes(query);
                const venueMatch = paper.venue.toLowerCase().includes(query);
                return titleMatch || authorMatch || venueMatch;
            }

            return true;
        });

        // Sort papers
        filtered.sort((a, b) => {
            if (sortBy === 'year') {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                return sortOrder === 'desc' ? yearB - yearA : yearA - yearB;
            } else if (sortBy === 'title') {
                return sortOrder === 'desc'
                    ? b.title.localeCompare(a.title)
                    : a.title.localeCompare(b.title);
            }
            return 0;
        });

        // Render
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';

        filtered.forEach((paper, index) => {
            const row = createPaperRow(paper, index);
            tbody.appendChild(row);
        });
    }

    // Create paper row with accordion
    function createPaperRow(paper, index) {
        const tr = document.createElement('tr');
        tr.className = 'paper-row';
        tr.dataset.paperId = index;

        // Get all categories for this paper (show main category + subcategory)
        const categoryTags = paper.categories.map(cat =>
            `<span class="category-tag" title="${cat.category}">${cat.category.replace('Efficient ', '')} / ${cat.subcategory}</span>`
        ).join(' ');

        // Title with arXiv link
        let titleHTML = paper.title;
        if (paper.arxiv_id) {
            titleHTML = `<a href="https://arxiv.org/abs/${paper.arxiv_id}" target="_blank" class="paper-link">${paper.title}</a>`;
        } else if (paper.url) {
            titleHTML = `<a href="${paper.url}" target="_blank" class="paper-link">${paper.title}</a>`;
        }

        tr.innerHTML = `
            <td style="width: 45%;">
                <div class="paper-title-cell">
                    <button class="accordion-btn" data-paper-id="${index}">
                        <span class="accordion-icon">▶</span>
                    </button>
                    <div class="paper-title-content">
                        <div class="paper-title">${titleHTML}</div>
                        <div class="paper-authors">${formatAuthors(paper.authors)}</div>
                    </div>
                </div>
            </td>
            <td style="width: 8%;">${paper.year}</td>
            <td style="width: 15%;">${paper.venue || 'N/A'}</td>
            <td style="width: 32%;">
                <div class="category-tags">${categoryTags}</div>
            </td>
        `;

        // Add click handler for accordion
        const accordionBtn = tr.querySelector('.accordion-btn');
        accordionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAccordion(index, tr);
        });

        return tr;
    }

    // Toggle accordion
    function toggleAccordion(paperId, row) {
        const existingDetail = row.nextElementSibling;

        if (existingDetail && existingDetail.classList.contains('paper-detail-row')) {
            // Close
            existingDetail.remove();
            row.querySelector('.accordion-icon').textContent = '▶';
            row.classList.remove('expanded');
        } else {
            // Close all other accordions
            document.querySelectorAll('.paper-detail-row').forEach(el => el.remove());
            document.querySelectorAll('.accordion-icon').forEach(el => el.textContent = '▶');
            document.querySelectorAll('.paper-row').forEach(el => el.classList.remove('expanded'));

            // Open this one
            const paper = allPapers[paperId];
            const detailRow = createDetailRow(paper);
            row.after(detailRow);
            row.querySelector('.accordion-icon').textContent = '▼';
            row.classList.add('expanded');
        }
    }

    // Create detail row
    function createDetailRow(paper) {
        const tr = document.createElement('tr');
        tr.className = 'paper-detail-row';

        const abstract = paper.abstract || 'No abstract available.';

        tr.innerHTML = `
            <td colspan="4">
                <div class="paper-detail-content">
                    <h4>Abstract</h4>
                    <p class="paper-abstract">${abstract}</p>
                    ${paper.arxiv_id ? `<div class="paper-links">
                        <a href="https://arxiv.org/abs/${paper.arxiv_id}" target="_blank" class="detail-link">📄 arXiv</a>
                        <a href="https://arxiv.org/pdf/${paper.arxiv_id}.pdf" target="_blank" class="detail-link">📑 PDF</a>
                    </div>` : ''}
                </div>
            </td>
        `;

        return tr;
    }

    // Format authors
    function formatAuthors(authors) {
        if (!authors) return 'Unknown';
        const authorList = authors.split(' and ').map(a => a.trim());
        if (authorList.length > 3) {
            return `${authorList.slice(0, 3).join(', ')}, et al.`;
        }
        return authorList.join(', ');
    }

    // Update statistics
    function updateStatistics() {
        const total = allPapers.length;
        const modelDesign = allPapers.filter(p =>
            p.categories.some(c => c.category === 'Efficient Model Design')
        ).length;
        const training = allPapers.filter(p =>
            p.categories.some(c => c.category === 'Efficient Training')
        ).length;
        const data = allPapers.filter(p =>
            p.categories.some(c => c.category === 'Efficient Data Collection')
        ).length;

        document.getElementById('totalPapers').textContent = total;
        document.getElementById('modelDesignCount').textContent = modelDesign;
        document.getElementById('trainingCount').textContent = training;
        document.getElementById('dataCount').textContent = data;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentCategory = btn.dataset.category;
                currentSubcategory = null;

                // Hide all subcategory containers
                document.querySelectorAll('.subcategory-container').forEach(c => c.classList.remove('active'));

                // Show relevant subcategory container
                if (currentCategory !== 'all') {
                    const subcatContainer = document.getElementById(`subcategory-${currentCategory}`);
                    if (subcatContainer) {
                        subcatContainer.classList.add('active');
                        // Populate subcategories
                        populateSubcategories(currentCategory);
                    }
                }

                renderPapers();
            });
        });

        // Search
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderPapers();
            });
        }
    }

    // Populate subcategories dynamically
    function populateSubcategories(category) {
        const container = document.getElementById(`subcategory-${category}`);
        if (!container) return;

        const mainCategory = reverseCategoryMap[category];
        const subcats = getSubcategories(mainCategory);

        const buttonsHTML = subcats.map(subcat =>
            `<button class="filter-btn subcategory-btn" data-subcategory="${subcat}">${subcat}</button>`
        ).join('');

        container.innerHTML = `
            <span class="filter-label">Subcategories:</span>
            <div class="category-filters">
                ${buttonsHTML}
            </div>
        `;

        // Add event listeners to subcategory buttons
        container.querySelectorAll('.subcategory-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    currentSubcategory = null;
                } else {
                    container.querySelectorAll('.subcategory-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentSubcategory = btn.dataset.subcategory;
                }
                renderPapers();
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
