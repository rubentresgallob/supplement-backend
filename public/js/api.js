// API Configuration
const API_BASE_URL = window.location.origin;

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Set token to localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('token');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/';
    }
}

// Logout function
function logout() {
    removeToken();
    window.location.href = '/';
}

// API Call wrapper
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            removeToken();
            window.location.href = '/';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// API Methods
const API = {
    // Auth
    login: (email, password) => apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }),

    register: (username, email, password) => apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
    }),

    getProfile: () => apiCall('/auth/profile'),

    // Supplements Catalog
    getCatalog: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/supplements/database?${query}`);
    },

    // User Supplements
    getUserSupplements: () => apiCall('/user-supplements'),

    addUserSupplement: (data) => apiCall('/user-supplements', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    deleteUserSupplement: (id) => apiCall(`/user-supplements/${id}`, {
        method: 'DELETE'
    }),

    // Intakes
    recordIntake: (userSupplementId) => apiCall('/intakes', {
        method: 'POST',
        body: JSON.stringify({ userSupplementId })
    }),

    getTodayIntakes: () => apiCall('/intakes/today'),

    getIntakesByDate: (date) => apiCall(`/intakes?startDate=${date}&endDate=${date}`),

    // Streaks
    getStreaks: () => apiCall('/streaks/user')
};