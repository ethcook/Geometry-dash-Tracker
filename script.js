// Data storage keys
const GOALS_KEY = 'gdGoals';
const DEMONS_KEY = 'gdDemons';
const SESSIONS_KEY = 'gdSessions';
const WEAKNESSES_KEY = 'gdWeaknesses';
const USERNAME_KEY = 'gdUsername';
const DARK_MODE_KEY = 'gdDarkMode';
const PFP_IMAGE_KEY = 'gdPfpImage';
const DEFAULT_USERNAME = 'Player';

// Weakness types
const WEAKNESS_TYPES = [
    { name: 'Wave', emoji: '〰️' },
    { name: 'Ship', emoji: '🚀' },
    { name: 'Ball', emoji: '⚽' },
    { name: 'UFO', emoji: '🛸' },
    { name: 'Robot', emoji: '🤖' },
    { name: 'Spider', emoji: '🕷️' },
    { name: 'Timing', emoji: '⏱️' },
    { name: 'Jumps', emoji: '📍' },
    { name: 'Duals', emoji: '👥' },
    { name: 'Speed', emoji: '⚡' }
];

// Temporary demon data for modal
let tempDemonData = {};
let timelineFilter = 'all';
let editingDemonId = null;

function getStoredData(key, fallback = []) {
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : fallback;
}

function saveStoredData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getUsername() {
    return localStorage.getItem(USERNAME_KEY) || DEFAULT_USERNAME;
}

function saveUsername() {
    const input = document.getElementById('usernameInput');
    const username = (input ? input.value : '').trim() || DEFAULT_USERNAME;
    localStorage.setItem(USERNAME_KEY, username);
    updateWelcomeMessage();
    showSettingsMessage(`Username saved as ${username}.`);
}

function showSettingsMessage(message) {
    const msg = document.getElementById('settingsMessage');
    if (msg) {
        msg.textContent = message;
    }
}

function updateWelcomeMessage() {
    const el = document.getElementById('welcomeMessage');
    if (el) {
        const username = getUsername();
        el.textContent = username === DEFAULT_USERNAME ? `Welcome, ${DEFAULT_USERNAME}` : `Welcome, ${username}`;
    }
}

function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem(DARK_MODE_KEY, String(isDark));

    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.checked = isDark;
    }
}

function toggleDarkMode(isDark) {
    applyTheme(isDark);
    showSettingsMessage(isDark ? 'Dark mode enabled.' : 'Dark mode disabled.');
}

function getDarkModeSetting() {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
}

function getPfpImage() {
    return localStorage.getItem(PFP_IMAGE_KEY) || '';
}

function savePfpImage(dataUrl) {
    localStorage.setItem(PFP_IMAGE_KEY, dataUrl);
}

function renderPfpPreview() {
    const headerAvatar = document.getElementById('headerAvatar');
    const settingsPreview = document.getElementById('settingsAvatarPreview');
    const imageData = getPfpImage();

    const avatarMarkup = imageData
        ? `<img src="${imageData}" alt="Profile picture">`
        : '<span style="font-size: 2rem;">🧑</span>';

    if (headerAvatar) {
        headerAvatar.innerHTML = avatarMarkup;
    }

    if (settingsPreview) {
        settingsPreview.innerHTML = avatarMarkup;
    }
}

function handlePfpUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const dataUrl = e.target.result;
        savePfpImage(dataUrl);
        renderPfpPreview();
        showSettingsMessage('Profile picture uploaded.');
    };
    reader.readAsDataURL(file);
}

function clearPfpImage() {
    localStorage.removeItem(PFP_IMAGE_KEY);
    renderPfpPreview();
    showSettingsMessage('Profile picture removed.');
}

function getDefaultDemonDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDemonDate(dateValue) {
    if (!dateValue) return 'Not set';
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? dateValue : date.toLocaleDateString();
}

function getDemonDateInputValue(dateValue) {
    if (!dateValue) return getDefaultDemonDate();
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return dateValue;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateWelcomeMessage();
    applyTheme(getDarkModeSetting());
    renderPfpPreview();
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.value = getUsername();
    }

    loadGoals();
    loadDemons();
    loadSessions();
    loadWeaknesses();
    updateAllStats();

    // Allow Enter key to add items
    document.getElementById('goalInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addGoal();
    });

    document.getElementById('demonInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') showDemonModal();
    });

    document.getElementById('practiceNotes').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPracticeSession();
    });

    document.getElementById('levelNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPracticeSession();
    });

    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveUsername();
        });
    }

    // Close modal when clicking outside
    document.getElementById('demonModal').addEventListener('click', (e) => {
        if (e.target.id === 'demonModal') closeDemonModal();
    });

    // Initialize weakness buttons
    initWeaknessButtons();

    // Percentage input sync
    document.getElementById('demonPercentageRange').addEventListener('input', (e) => {
        document.getElementById('demonPercentageInput').value = e.target.value;
        document.getElementById('percentageDisplay').textContent = e.target.value + '%';
    });

    document.getElementById('demonPercentageInput').addEventListener('input', (e) => {
        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        e.target.value = value;
        document.getElementById('demonPercentageRange').value = value;
        document.getElementById('percentageDisplay').textContent = value + '%';
    });
});

// ============= PAGE SWITCHING =============

function switchPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(pageName + '-page');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Update nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update stats when switching to dashboard
    if (pageName === 'dashboard') {
        updateAllStats();
        loadRecentActivity();
    }

    // Update timeline when switching to timeline page
    if (pageName === 'timeline') {
        loadTimeline();
    }

    // Update stats page when switching
    if (pageName === 'stats') {
        updateDetailedStats();
    }
}

// ============= GOALS MANAGEMENT =============

function addGoal() {
    const input = document.getElementById('goalInput');
    const goal = input.value.trim();

    if (!goal) {
        alert('Please enter a goal!');
        return;
    }

    const goals = getGoals();
    goals.push({
        id: Date.now(),
        text: goal,
        dateAdded: new Date().toLocaleDateString()
    });

    saveGoals(goals);
    input.value = '';
    loadGoals();
    updateStats();
}

function deleteGoal(id) {
    let goals = getGoals();
    goals = goals.filter(goal => goal.id !== id);
    saveGoals(goals);
    loadGoals();
    updateStats();
}

function getGoals() {
    return getStoredData(GOALS_KEY, []);
}

function saveGoals(goals) {
    saveStoredData(GOALS_KEY, goals);
}

function loadGoals() {
    const goals = getGoals();
    const goalsList = document.getElementById('goalsList');

    goalsList.innerHTML = '';

    if (goals.length === 0) {
        goalsList.innerHTML = '<div class="empty-message">No goals yet. Add one to get started!</div>';
    } else {
        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'goal-item';
            li.innerHTML = `
                <div class="item-content">
                    <div class="item-name">🎯 ${escapeHtml(goal.text)}</div>
                    <div style="font-size: 0.85em; color: #999;">Added: ${goal.dateAdded}</div>
                </div>
                <button class="btn-delete" onclick="deleteGoal(${goal.id})">Delete</button>
            `;
            goalsList.appendChild(li);
        });
    }

    document.getElementById('goalCount').textContent = goals.length;
}

function clearGoals() {
    if (confirm('Are you sure you want to delete all goals?')) {
        saveGoals([]);
        loadGoals();
        updateStats();
    }
}

// ============= DEMONS MANAGEMENT =============

function showDemonModal() {
    const demonInput = document.getElementById('demonInput');
    const demon = demonInput.value.trim();

    if (!demon) {
        alert('Please enter a demon name!');
        return;
    }

    editingDemonId = null;
    tempDemonData = {
        name: demon,
        difficulty: document.getElementById('difficultySelect').value,
        attempts: parseInt(document.getElementById('attemptsInput').value) || 1,
        percentage: parseInt(document.getElementById('percentageInput').value) || 100,
        dateBeaten: getDefaultDemonDate()
    };

    document.getElementById('modalTitle').textContent = 'Add Demon Details';
    document.getElementById('confirmBtn').textContent = 'Add Demon';
    document.getElementById('demonPercentageRange').value = tempDemonData.percentage;
    document.getElementById('demonPercentageInput').value = tempDemonData.percentage;
    document.getElementById('percentageDisplay').textContent = tempDemonData.percentage + '%';
    document.getElementById('demonAttemptsEdit').value = tempDemonData.attempts;
    document.getElementById('demonPREdit').value = '';
    document.getElementById('demonNotesEdit').value = '';
    document.getElementById('demonDateEdit').value = getDemonDateInputValue(tempDemonData.dateBeaten);
    document.getElementById('demonModal').classList.add('show');
}

function closeDemonModal() {
    document.getElementById('demonModal').classList.remove('show');
    tempDemonData = {};
    editingDemonId = null;
}

function confirmAddDemon() {
    const percentage = parseInt(document.getElementById('demonPercentageInput').value) || 100;
    const attempts = parseInt(document.getElementById('demonAttemptsEdit').value) || 1;
    const pr = document.getElementById('demonPREdit').value.trim();
    const notes = document.getElementById('demonNotesEdit').value.trim();
    const dateBeaten = document.getElementById('demonDateEdit').value || getDefaultDemonDate();

    if (editingDemonId !== null) {
        // Update existing demon
        const demons = getDemons();
        const demon = demons.find(d => d.id === editingDemonId);
        if (demon) {
            demon.percentage = percentage;
            demon.attempts = attempts;
            demon.personalRecord = pr;
            demon.notes = notes;
            demon.dateBeaten = dateBeaten;
        }
        saveDemons(demons);
    } else {
        // Add new demon
        const demons = getDemons();
        demons.push({
            id: Date.now(),
            name: tempDemonData.name,
            difficulty: tempDemonData.difficulty,
            attempts: attempts,
            percentage: percentage,
            notes: notes,
            personalRecord: pr,
            dateBeaten: dateBeaten
        });
        saveDemons(demons);
    }

    document.getElementById('demonInput').value = '';
    document.getElementById('attemptsInput').value = '1';
    document.getElementById('percentageInput').value = '100';
    closeDemonModal();
    loadDemons();
    updateAllStats();
}

function editDemon(id) {
    const demons = getDemons();
    const demon = demons.find(d => d.id === id);
    if (!demon) return;

    editingDemonId = id;
    tempDemonData = demon;

    document.getElementById('modalTitle').textContent = `Edit: ${demon.name}`;
    document.getElementById('confirmBtn').textContent = 'Save Changes';
    document.getElementById('demonPercentageRange').value = demon.percentage || 100;
    document.getElementById('demonPercentageInput').value = demon.percentage || 100;
    document.getElementById('percentageDisplay').textContent = (demon.percentage || 100) + '%';
    document.getElementById('demonAttemptsEdit').value = demon.attempts || 1;
    document.getElementById('demonPREdit').value = demon.personalRecord || '';
    document.getElementById('demonNotesEdit').value = demon.notes || '';
    document.getElementById('demonDateEdit').value = getDemonDateInputValue(demon.dateBeaten);
    document.getElementById('demonModal').classList.add('show');
}

function deleteDemon(id) {
    let demons = getDemons();
    demons = demons.filter(demon => demon.id !== id);
    saveDemons(demons);
    loadDemons();
    updateAllStats();
}

function getDemons() {
    return getStoredData(DEMONS_KEY, []);
}

function saveDemons(demons) {
    saveStoredData(DEMONS_KEY, demons);
}

function loadDemons() {
    const demons = getDemons();
    const demonsList = document.getElementById('demonsList');

    demonsList.innerHTML = '';

    if (demons.length === 0) {
        demonsList.innerHTML = '<div class="empty-message">No demons beaten yet. Go show those demons who\'s boss!</div>';
    } else {
        // Group demons by difficulty
        const grouped = groupDemonsByDifficulty(demons);
        const difficultyOrder = ['Easy', 'Medium', 'Hard', 'Insane', 'Extreme'];

        difficultyOrder.forEach(difficulty => {
            if (grouped[difficulty] && grouped[difficulty].length > 0) {
                const group = document.createElement('div');
                group.className = 'difficulty-group';

                const title = document.createElement('div');
                title.className = `difficulty-group-title ${difficulty.toLowerCase()}`;
                title.textContent = `${getDifficultyEmoji(difficulty)} ${difficulty} Demons (${grouped[difficulty].length})`;
                group.appendChild(title);

                grouped[difficulty].forEach(demon => {
                    const item = document.createElement('div');
                    item.className = 'demon-item';
                    
                    let detailsHtml = '';
                    if (demon.attempts || demon.notes || demon.personalRecord || (demon.percentage !== undefined && demon.percentage !== 100)) {
                        detailsHtml = '<div class="demon-details">';
                        
                        // Show progress bar if percentage is less than 100
                        if (demon.percentage !== undefined && demon.percentage !== 100) {
                            detailsHtml += `
                                <div class="detail-item">
                                    <span class="detail-label">Progress: ${demon.percentage}%</span>
                                    <div class="demon-progress-bar">
                                        <div class="demon-progress-fill" style="width: ${demon.percentage}%"></div>
                                    </div>
                                </div>
                            `;
                        } else {
                            detailsHtml += `<div class="detail-item"><span class="detail-label">Status:</span> Completed</div>`;
                        }
                        
                        if (demon.attempts) detailsHtml += `<div class="detail-item"><span class="detail-label">Attempts:</span> ${demon.attempts}</div>`;
                        if (demon.personalRecord) detailsHtml += `<div class="detail-item"><span class="detail-label">PR:</span> ${escapeHtml(demon.personalRecord)}</div>`;
                        if (demon.notes) detailsHtml += `<div class="detail-item"><span class="detail-label">Notes:</span> ${escapeHtml(demon.notes)}</div>`;
                        detailsHtml += '</div>';
                    }

                    item.innerHTML = `
                        <div class="item-content">
                            <div class="item-name">👹 ${escapeHtml(demon.name)}</div>
                            <div style="font-size: 0.85em; color: #999;">Beaten: ${formatDemonDate(demon.dateBeaten)}</div>
                            ${detailsHtml}
                        </div>
                        <div class="demon-actions">
                            <button class="btn-icon edit" onclick="editDemon(${demon.id})">✏️</button>
                            <button class="btn-icon" onclick="deleteDemon(${demon.id})">Delete</button>
                        </div>
                    `;
                    group.appendChild(item);
                });

                demonsList.appendChild(group);
            }
        });
    }

    document.getElementById('demonCount').textContent = demons.length;
}

function clearDemons() {
    if (confirm('Are you sure you want to delete all beaten demons?')) {
        saveDemons([]);
        loadDemons();
        updateAllStats();
    }
}

function groupDemonsByDifficulty(demons) {
    const grouped = {
        'Easy': [],
        'Medium': [],
        'Hard': [],
        'Insane': [],
        'Extreme': []
    };

    demons.forEach(demon => {
        if (grouped[demon.difficulty]) {
            grouped[demon.difficulty].push(demon);
        }
    });

    return grouped;
}

function getDifficultyEmoji(difficulty) {
    const emojis = {
        'Easy': '🟢',
        'Medium': '🔵',
        'Hard': '🟡',
        'Insane': '🔴',
        'Extreme': '⭐'
    };
    return emojis[difficulty] || '👹';
}

// ============= PRACTICE SESSIONS =============

function addPracticeSession() {
    const minutesInput = document.getElementById('minutesInput');
    const levelNameInput = document.getElementById('levelNameInput');
    const notesInput = document.getElementById('practiceNotes');
    const minutes = parseInt(minutesInput.value);
    const levelName = levelNameInput.value.trim();
    const notes = notesInput.value.trim();

    if (isNaN(minutes) || minutes < 1) {
        alert('Please enter valid minutes');
        return;
    }

    const sessions = getSessions();
    sessions.push({
        id: Date.now(),
        minutes: minutes,
        levelName: levelName,
        notes: notes,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    });

    saveSessions(sessions);
    minutesInput.value = '30';
    levelNameInput.value = '';
    notesInput.value = '';
    loadSessions();
    updateAllStats();
}

function deletePracticeSession(id) {
    let sessions = getSessions();
    sessions = sessions.filter(session => session.id !== id);
    saveSessions(sessions);
    loadSessions();
    updateAllStats();
}

function getSessions() {
    return getStoredData(SESSIONS_KEY, []);
}

function saveSessions(sessions) {
    saveStoredData(SESSIONS_KEY, sessions);
}

function loadSessions() {
    const sessions = getSessions();
    const sessionsList = document.getElementById('sessionsList');

    sessionsList.innerHTML = '';

    if (sessions.length === 0) {
        sessionsList.innerHTML = '<div class="empty-message">No practice sessions logged yet. Start your first session!</div>';
    } else {
        // Sort by most recent
        const sorted = [...sessions].sort((a, b) => b.id - a.id);

        sorted.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.innerHTML = `
                <div class="session-info">
                    <div class="session-time">⏱️ ${session.minutes} minutes</div>
                    ${session.levelName ? `<div class="session-level">🎮 ${escapeHtml(session.levelName)}</div>` : ''}
                    <div class="session-details">
                        ${session.notes ? `Practiced: ${escapeHtml(session.notes)}` : 'No notes'}
                        <br>
                        ${session.date} at ${session.time}
                    </div>
                </div>
                <button class="btn-delete" onclick="deletePracticeSession(${session.id})">Delete</button>
            `;
            sessionsList.appendChild(item);
        });
    }

    document.getElementById('sessionCount').textContent = sessions.length;
}

function clearSessions() {
    if (confirm('Are you sure you want to delete all practice sessions?')) {
        saveSessions([]);
        loadSessions();
        updateAllStats();
    }
}

// ============= WEAKNESS TRACKER =============

function initWeaknessButtons() {
    const grid = document.getElementById('weaknessGrid');
    grid.innerHTML = '';

    const weaknesses = getWeaknesses();

    WEAKNESS_TYPES.forEach(type => {
        const count = weaknesses[type.name] || 0;
        const card = document.createElement('div');
        card.className = 'weakness-card' + (count > 0 ? ' active' : '');
        card.innerHTML = `
            <div class="weakness-label">${type.emoji} ${type.name}</div>
            <div class="weakness-controls">
                <button class="weakness-action-btn decrease" onclick="changeWeakness('${type.name}', -1)">−</button>
                <span class="weakness-count">${count}</span>
                <button class="weakness-action-btn increase" onclick="changeWeakness('${type.name}', 1)">+</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function changeWeakness(weaknessType, delta) {
    const weaknesses = getWeaknesses();
    const current = weaknesses[weaknessType] || 0;
    const next = Math.max(0, current + delta);
    if (next > 0) {
        weaknesses[weaknessType] = next;
    } else {
        delete weaknesses[weaknessType];
    }
    saveWeaknesses(weaknesses);
    initWeaknessButtons();
    updateWeaknessStats();
}

function getWeaknesses() {
    return getStoredData(WEAKNESSES_KEY, {});
}

function saveWeaknesses(weaknesses) {
    saveStoredData(WEAKNESSES_KEY, weaknesses);
}

function loadWeaknesses() {
    initWeaknessButtons();
}

// ============= PROGRESS TIMELINE =============

function loadTimeline() {
    const demons = getDemons();
    const timeline = document.getElementById('timeline');

    timeline.innerHTML = '';

    if (demons.length === 0) {
        timeline.innerHTML = '<div class="empty-message">No demons beaten yet. Start your journey!</div>';
        return;
    }

    // Sort by date beaten (most recent first)
    const sorted = [...demons].sort((a, b) => {
        const dateA = new Date(a.dateBeaten);
        const dateB = new Date(b.dateBeaten);
        return dateB - dateA;
    });

    // Filter by difficulty if needed
    let filtered = sorted;
    if (timelineFilter !== 'all') {
        filtered = sorted.filter(d => d.difficulty.toLowerCase() === timelineFilter);
    }

    if (filtered.length === 0) {
        timeline.innerHTML = '<div class="empty-message">No demons in this difficulty category.</div>';
        return;
    }

    filtered.forEach(demon => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const marker = document.createElement('div');
        marker.className = `timeline-marker ${demon.difficulty.toLowerCase()}`;
        marker.textContent = getDifficultyEmoji(demon.difficulty);

        const content = document.createElement('div');
        content.className = 'timeline-content';
        content.innerHTML = `
            <div class="timeline-demon-name">${escapeHtml(demon.name)}</div>
            <div class="timeline-meta">
                <span>Difficulty: ${demon.difficulty}</span>
                <span>Beaten: ${formatDemonDate(demon.dateBeaten)}</span>
                ${demon.attempts ? `<span>Attempts: ${demon.attempts}</span>` : ''}
            </div>
        `;

        item.appendChild(marker);
        item.appendChild(content);
        timeline.appendChild(item);
    });
}

// ============= QUICK STATS =============

function updateQuickStats() {
    const demons = getDemons();
    const weaknesses = getWeaknesses();

    // Demon streak
    const sorted = [...demons].sort((a, b) => {
        const dateA = new Date(a.dateBeaten);
        const dateB = new Date(b.dateBeaten);
        return dateB - dateA;
    });

    let streak = 0;
    if (sorted.length > 0) {
        const today = new Date();
        let currentDate = new Date(sorted[0].dateBeaten);

        for (let demon of sorted) {
            const demonDate = new Date(demon.dateBeaten);
            if (Math.abs(currentDate - demonDate) <= 86400000) { // 1 day in ms
                streak++;
                currentDate = new Date(demonDate.getTime() - 86400000);
            } else {
                break;
            }
        }
    }

    // Recently beaten
    let recentlyBeaten = '-';
    if (sorted.length > 0) {
        recentlyBeaten = sorted[0].name.substring(0, 15) + (sorted[0].name.length > 15 ? '...' : '');
    }

    // Hardest demon (most attempts)
    let hardestDemon = '-';
    let maxAttempts = 0;
    demons.forEach(d => {
        if (d.attempts && d.attempts > maxAttempts) {
            maxAttempts = d.attempts;
            hardestDemon = d.name.substring(0, 15) + (d.name.length > 15 ? '...' : '');
        }
    });

    // Most attempts value
    const mostAttempts = maxAttempts > 0 ? maxAttempts : 0;

    document.getElementById('demonStreak').textContent = streak;
    document.getElementById('recentlyBeaten').textContent = recentlyBeaten;
    document.getElementById('hardestDemon').textContent = hardestDemon;
    document.getElementById('mostAttempts').textContent = mostAttempts;
}

// ============= STATISTICS =============

function updateStats() {
    const goals = getGoals();
    const demons = getDemons();
    const grouped = groupDemonsByDifficulty(demons);

    document.getElementById('totalGoals').textContent = goals.length;
    document.getElementById('totalDemons').textContent = demons.length;
    document.getElementById('easyCount').textContent = grouped['Easy'].length;
    document.getElementById('mediumCount').textContent = grouped['Medium'].length;
    document.getElementById('hardCount').textContent = grouped['Hard'].length;
    document.getElementById('insaneCount').textContent = grouped['Insane'].length;
    document.getElementById('extremeCount').textContent = grouped['Extreme'].length;
}

function updateAllStats() {
    updateStats();
    updateQuickStats();
    loadTimeline();
    updateSessionStats();
    updateWeaknessStats();
}

// ============= RECENT ACTIVITY =============

function loadRecentActivity() {
    const goals = getGoals();
    const demons = getDemons();
    const sessions = getSessions();
    
    const activities = [];
    
    // Add recent goals
    goals.slice(-3).forEach(goal => {
        activities.push({
            type: 'goal',
            text: `Added goal: ${goal.text}`,
            date: new Date(goal.dateAdded),
            emoji: '🎯'
        });
    });
    
    // Add recent demons
    demons.slice(-3).forEach(demon => {
        activities.push({
            type: 'demon',
            text: `Beaten ${demon.difficulty}: ${demon.name}`,
            date: new Date(demon.dateBeaten),
            emoji: '👹'
        });
    });
    
    // Add recent sessions
    sessions.slice(-3).forEach(session => {
        const levelName = session.levelName ? ` on ${session.levelName}` : '';
        activities.push({
            type: 'session',
            text: `Practice session: ${session.minutes}min${levelName} (${session.notes || 'General'})`,
            date: new Date(session.date),
            emoji: '🏋️'
        });
    });
    
    // Sort by date descending
    activities.sort((a, b) => b.date - a.date);
    
    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = '';
    
    if (activities.length === 0) {
        activityList.innerHTML = '<div class="empty-message">No recent activity yet. Start tracking!</div>';
    } else {
        activities.slice(0, 5).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-time">${activity.date.toLocaleString()}</div>
                <div class="activity-text">${activity.emoji} ${activity.text}</div>
            `;
            activityList.appendChild(item);
        });
    }
}

// ============= TIMELINE FILTERING =============

function filterTimeline(difficulty) {
    timelineFilter = difficulty;
    
    // Update active filter button
    const filterBtns = document.querySelectorAll('.timeline-filter');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadTimeline();
}

// ============= DETAILED STATS =============

function updateDetailedStats() {
    const goals = getGoals();
    const demons = getDemons();
    const sessions = getSessions();
    const grouped = groupDemonsByDifficulty(demons);
    const weaknesses = getWeaknesses();
    
    // Update stat cards
    document.getElementById('statsGoals').textContent = goals.length;
    document.getElementById('statsDemons').textContent = demons.length;
    document.getElementById('statsEasy').textContent = grouped['Easy'].length;
    document.getElementById('statsMedium').textContent = grouped['Medium'].length;
    document.getElementById('statsHard').textContent = grouped['Hard'].length;
    document.getElementById('statsInsane').textContent = grouped['Insane'].length;
    document.getElementById('statsExtreme').textContent = grouped['Extreme'].length;
    
    // Total practice time
    let totalMinutes = 0;
    sessions.forEach(session => {
        totalMinutes += session.minutes;
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    document.getElementById('statsTotalTime').textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    // Average attempts
    let totalAttempts = 0;
    let demonicCount = 0;
    demons.forEach(d => {
        if (d.attempts) {
            totalAttempts += d.attempts;
            demonicCount++;
        }
    });
    const avgAttempts = demonicCount > 0 ? (totalAttempts / demonicCount).toFixed(1) : '-';
    document.getElementById('avgAttempts').textContent = avgAttempts;
    
    // Completion rate
    const completionRate = demons.length > 0 ? `${demons.length} beaten` : '-';
    document.getElementById('completionRate').textContent = completionRate;
    
    // Most active weakness
    let maxWeakness = '-';
    let maxCount = 0;
    Object.entries(weaknesses).forEach(([name, count]) => {
        if (count > maxCount) {
            maxCount = count;
            maxWeakness = name;
        }
    });
    document.getElementById('mostActiveWeakness').textContent = maxWeakness;
}

// ============= WEAKNESS RESET =============

function resetWeaknesses() {
    if (confirm('Are you sure you want to reset all weakness data?')) {
        saveWeaknesses({});
        initWeaknessButtons();
        updateWeaknessStats();
    }
}

// ============= CLEAR ALL DATA =============

function clearAllData() {
    if (confirm('⚠️ This will delete ALL your data (goals, demons, sessions, weaknesses). Are you sure?')) {
        if (confirm('This action cannot be undone. Delete everything?')) {
            localStorage.removeItem(GOALS_KEY);
            localStorage.removeItem(DEMONS_KEY);
            localStorage.removeItem(SESSIONS_KEY);
            localStorage.removeItem(WEAKNESSES_KEY);

            loadGoals();
            loadDemons();
            loadSessions();
            loadWeaknesses();
            updateAllStats();

            alert('All data has been cleared.');
        }
    }
}

// ============= SESSION STATS =============

function updateSessionStats() {
    const sessions = getSessions();
    let totalMinutes = 0;
    
    sessions.forEach(session => {
        totalMinutes += session.minutes;
    });
    
    const avgMinutes = sessions.length > 0 ? (totalMinutes / sessions.length).toFixed(1) : 0;
    
    document.getElementById('totalMinutes').textContent = totalMinutes;
    document.getElementById('avgMinutes').textContent = avgMinutes;
    document.getElementById('totalSessionCount').textContent = sessions.length;
    document.getElementById('totalSessions').textContent = sessions.length;
}

// ============= WEAKNESS STATS =============

function updateWeaknessStats() {
    const weaknesses = getWeaknesses();
    const statsContainer = document.getElementById('weaknessStats');
    
    statsContainer.innerHTML = '';
    
    const sortedWeaknesses = Object.entries(weaknesses)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedWeaknesses.length === 0) {
        statsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No weakness data yet. Start tracking in the Weakness Tracker!</div>';
    } else {
        sortedWeaknesses.forEach(([name, count]) => {
            const type = WEAKNESS_TYPES.find(w => w.name === name);
            const emoji = type ? type.emoji : '❓';
            const item = document.createElement('div');
            item.className = 'weakness-stat-item';
            item.innerHTML = `
                <div class="weakness-stat-item-name">${emoji} ${name}</div>
                <div class="weakness-stat-item-count">${count}</div>
            `;
            statsContainer.appendChild(item);
        });
    }
}

// ============= EXPORT DATA =============

function exportData() {
    const goals = getGoals();
    const demons = getDemons();
    const sessions = getSessions();
    const weaknesses = getWeaknesses();

    const data = {
        exportDate: new Date().toLocaleString(),
        goals: goals,
        demons: demons,
        sessions: sessions,
        weaknesses: weaknesses,
        statistics: {
            totalGoals: goals.length,
            totalDemons: demons.length,
            totalSessions: sessions.length
        }
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gd-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// ============= UTILITY FUNCTIONS =============

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
