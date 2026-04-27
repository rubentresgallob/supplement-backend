requireAuth();

let user = null;
let streaks = null;

// Load profile
async function loadProfile() {
    try {
        const [userData, streaksData] = await Promise.all([
            API.getProfile(),
            API.getStreaks()
        ]);

        user = userData;
        streaks = streaksData;

        renderProfile();
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Render profile
function renderProfile() {
    if (user) {
        document.getElementById('userName').textContent = user.username || user.email;
        document.getElementById('userEmail').textContent = user.email;
    }

    if (streaks) {
        document.getElementById('profileStreak').textContent = `${streaks.currentStreak} días`;
        document.getElementById('profileMaxStreak').textContent = `${streaks.maxStreak} días`;
        document.getElementById('profileAdherence').textContent = `${Math.round(streaks.adherencePercentage)}%`;
    }
}

// Load profile on page load
loadProfile();