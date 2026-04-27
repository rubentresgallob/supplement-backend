requireAuth();

let currentDate = new Date();
let intakes = [];

// Load history
async function loadHistory() {
    try {
        const dateStr = currentDate.toISOString().split('T')[0];
        intakes = await API.getIntakesByDate(dateStr);
        renderHistory();
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('historyList').innerHTML = 
            '<div class="error-message show">Error al cargar el historial</div>';
    }
}

// Render history
function renderHistory() {
    updateDateDisplay();
    
    const container = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyHistory');

    if (intakes.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';

    container.innerHTML = intakes.map(intake => {
        const time = new Date(intake.takenAt).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="history-item">
                <div class="history-info">
                    <h4>${intake.userSupplement?.name || 'Suplemento'}</h4>
                    <div class="history-time">${time}</div>
                </div>
                <div class="history-check">✅</div>
            </div>
        `;
    }).join('');
}

// Update date display
function updateDateDisplay() {
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    if (isToday) {
        document.getElementById('currentDate').textContent = 'Hoy';
    } else {
        const dateStr = currentDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('currentDate').textContent = dateStr;
    }
}

// Change date
function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    loadHistory();
}

// Load history on page load
loadHistory();