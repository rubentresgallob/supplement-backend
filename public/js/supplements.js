requireAuth();

let catalogSupplements = [];

// Load catalog for select
async function loadCatalogSelect() {
    try {
        const data = await API.getCatalog({ limit: 100 });
        catalogSupplements = data.data;
        
        const select = document.getElementById('catalogSelect');
        select.innerHTML = '<option value="">-- Seleccionar --</option>' + 
            catalogSupplements.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading catalog:', error);
    }
}

// Handle catalog select
function handleCatalogSelect() {
    const select = document.getElementById('catalogSelect');
    const selectedId = select.value;
    
    if (!selectedId) {
        // Clear form
        document.getElementById('supplementName').value = '';
        document.getElementById('supplementDosage').value = '';
        return;
    }

    const supplement = catalogSupplements.find(s => s.id === selectedId);
    if (supplement) {
        document.getElementById('supplementName').value = supplement.name;
        document.getElementById('supplementCategory').value = supplement.category;
        document.getElementById('supplementDosage').value = supplement.dosage || '';
    }
}

// Add schedule input
function addScheduleInput() {
    const container = document.getElementById('scheduleInputs');
    const input = document.createElement('input');
    input.type = 'time';
    input.className = 'schedule-time';
    container.appendChild(input);
}

// Handle add supplement
async function handleAddSupplement(event) {
    event.preventDefault();
    
    const errorDiv = document.getElementById('addError');
    const catalogSelect = document.getElementById('catalogSelect');
    
    // Get schedule times
    const scheduleInputs = document.querySelectorAll('.schedule-time');
    const schedule = Array.from(scheduleInputs)
        .map(input => input.value)
        .filter(val => val !== '');
    
    const data = {
        name: document.getElementById('supplementName').value,
        category: document.getElementById('supplementCategory').value,
        dosage: document.getElementById('supplementDosage').value || undefined,
        dailyFrequency: parseInt(document.getElementById('supplementFrequency').value),
        schedule: schedule.length > 0 ? schedule : undefined,
        notes: document.getElementById('supplementNotes').value || undefined
    };

    // If selected from catalog, use supplementId
    if (catalogSelect.value) {
        data.supplementId = catalogSelect.value;
        delete data.name;
        delete data.category;
    }

    try {
        await API.addUserSupplement(data);
        window.location.href = '/dashboard.html';
    } catch (error) {
        errorDiv.textContent = error.message || 'Error al añadir el suplemento';
        errorDiv.classList.add('show');
    }
}

// Load catalog on page load
loadCatalogSelect();