// Toggle between login and register forms
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const data = await API.login(email, password);
        setToken(data.access_token);
        window.location.href = '/dashboard.html';
    } catch (error) {
        errorDiv.textContent = error.message || 'Error al iniciar sesión';
        errorDiv.classList.add('show');
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');
    
    try {
        await API.register(username, email, password);
        // Auto login after register
        const loginData = await API.login(email, password);
        setToken(loginData.access_token);
        window.location.href = '/dashboard.html';
    } catch (error) {
        errorDiv.textContent = error.message || 'Error al registrarse';
        errorDiv.classList.add('show');
    }
}

// Redirect if already logged in
if (isAuthenticated()) {
    window.location.href = '/dashboard.html';
}