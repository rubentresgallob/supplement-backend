requireAuth();

let allSupplements = [];
let currentCategory = 'all';

// Load catalog
async function loadCatalog() {
    try {
        const data = await API.getCatalog({ limit: 100 });
        allSupplements = data.data;
        renderCatalog();
    } catch (error) {
        console.error('Error loading catalog:', error);
        document.getElementById('catalogList').innerHTML = 
            '<div class="error-message show">Error al cargar el catálogo</div>';
    }
}

// Render catalog
function renderCatalog() {
    const container = document.getElementById('catalogList');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allSupplements.filter(supplement => {
        const matchesCategory = currentCategory === 'all' || supplement.category === currentCategory;
        const matchesSearch = supplement.name.toLowerCase().includes(searchTerm) ||
                            supplement.description?.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron suplementos</p></div>';
        return;
    }

    container.innerHTML = filtered.map(supplement => `
        <div class="catalog-item">
            <div class="catalog-info">
                <h3>${supplement.name}</h3>
                <p>${supplement.description || getCategoryName(supplement.category)}</p>
                ${supplement.dosage ? `<p style="font-size: 11px; color: #aaa; margin-top: 4px;">${supplement.dosage}</p>` : ''}
            </div>
            <button class="btn-add" onclick="addFromCatalog('${supplement.id}')">➕</button>
        </div>
    `).join('');
}

// Filter by category
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active chip
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.category === category) {
            chip.classList.add('active');
        }
    });

    renderCatalog();
}

// Filter by search
function filterSupplements() {
    renderCatalog();
}

// Get category name
function getCategoryName(category) {
    const names = {
        vitamins: 'Vitaminas',
        minerals: 'Minerales',
        protein: 'Proteínas',
        other: 'Otros'
    };
    return names[category] || category;
}

// Add from catalog
async function addFromCatalog(supplementId) {
    try {
        await API.addUserSupplement({
            supplementId,
            dailyFrequency: 1
        });
        alert('✅ Suplemento añadido correctamente');
        window.location.href = '/dashboard.html';
    } catch (error) {
        alert('Error al añadir el suplemento: ' + error.message);
    }
}

// Load catalog on page load
loadCatalog();