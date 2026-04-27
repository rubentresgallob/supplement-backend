requireAuth();

let userSupplements = [];
let todayIntakes = [];
let streaks = null;

// Load dashboard data
async function loadDashboard() {
    try {
        // Load all data in parallel
        const [supplements, intakes, streaksData] = await Promise.all([
            API.getUserSupplements(),
            API.getTodayIntakes(),
            API.getStreaks()
        ]);

        userSupplements = supplements;
        todayIntakes = intakes;
        streaks = streaksData;

        renderStats();
        renderSupplements();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('supplementsList').innerHTML = 
            '<div class="error-message show">Error al cargar los datos</div>';
    }
}

// Render stats
function renderStats() {
    const totalToday = userSupplements.reduce((sum, s) => sum + s.dailyFrequency, 0);
    const takenToday = todayIntakes.length;
    const currentStreak = streaks?.currentStreak || 0;
    const adherence = streaks?.adherencePercentage || 0;

    document.getElementById('todayIntakes').textContent = `${takenToday}/${totalToday}`;
    document.getElementById('currentStreak').textContent = `${currentStreak} 🔥`;
    document.getElementById('adherence').textContent = `${Math.round(adherence)}%`;
}

// Render supplements list
function renderSupplements() {
    const container = document.getElementById('supplementsList');
    const emptyState = document.getElementById('emptyState');

    if (userSupplements.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';

    container.innerHTML = userSupplements.map(supplement => {
        const takenToday = todayIntakes.filter(i => i.userSupplementId === supplement.id).length;
        const progress = (takenToday / supplement.dailyFrequency) * 100;
        const isComplete = takenToday >= supplement.dailyFrequency;
        const streak = supplement.streak || 0;

        return `
            <div class="supplement-card">
                <div class="supplement-header">
                    <div class="supplement-info">
                        <h3>${supplement.name}</h3>
                        <span class="supplement-badge">${getCategoryName(supplement.category)}</span>
                    </div>
                    ${streak > 0 ? `<div class="supplement-streak">🔥${streak}</div>` : ''}
                </div>
                <div class="supplement-progress">
                    <div class="progress-text">${takenToday}/${supplement.dailyFrequency} tomas hoy</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="supplement-actions">
                    <button class="btn-take" onclick="takeSupplement(${supplement.id})" ${isComplete ? 'disabled' : ''}>
                        ${isComplete ? '✅ Completado' : '💊 Tomar'}
                    </button>
                    <button class="btn-details" onclick="deleteSupplement(${supplement.id})">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

// Get category name in Spanish
function getCategoryName(category) {
    const names = {
        vitamins: 'Vitaminas',
        minerals: 'Minerales',
        protein: 'Proteínas',
        other: 'Otros'
    };
    return names[category] || category;
}

// Take supplement
async function takeSupplement(userSupplementId) {
    try {
        await API.recordIntake(userSupplementId);
        // Reload dashboard
        await loadDashboard();
    } catch (error) {
        alert('Error al registrar la toma: ' + error.message);
    }
}

// Delete supplement
async function deleteSupplement(id) {
    if (!confirm('¿Seguro que quieres eliminar este suplemento?')) {
        return;
    }

    try {
        await API.deleteUserSupplement(id);
        await loadDashboard();
    } catch (error) {
        alert('Error al eliminar el suplemento: ' + error.message);
    }
}

// Load dashboard on page load
loadDashboard();