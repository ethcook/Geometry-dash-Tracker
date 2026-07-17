// Data storage keys
const GOALS_KEY = 'gdGoals';
const DEMONS_KEY = 'gdDemons';
const SESSIONS_KEY = 'gdSessions';
const WEAKNESSES_KEY = 'gdWeaknesses';
const USERNAME_KEY = 'gdUsername';
const DARK_MODE_KEY = 'gdDarkMode';
const PFP_IMAGE_KEY = 'gdPfpImage';
const DEFAULT_USERNAME = 'Player';
const DAILY_QUESTS_KEY = 'gdDailyQuests';
const QUEST_POINTS_KEY = 'gdQuestPoints';

// Authentication keys
const USERS_KEY = 'gdUsers';
const CURRENT_USER_KEY = 'gdCurrentUser';

let dailyQuests = [];

// Simple hash function for password hashing (not production-ready, just for basic security)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// Get all registered users
function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : {};
}

// Save users to storage
function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Check if username exists
function userExists(username) {
    const users = getUsers();
    return users.hasOwnProperty(username);
}

// Register a new user
function registerUser(username, password) {
    if (!username || !password) {
        return { success: false, message: 'Username and password are required.' };
    }
    if (username.length < 3) {
        return { success: false, message: 'Username must be at least 3 characters long.' };
    }
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    if (userExists(username)) {
        return { success: false, message: 'Username already taken. Please choose another.' };
    }
    
    const users = getUsers();
    users[username] = {
        password: hashPassword(password),
        createdAt: new Date().toISOString()
    };
    saveUsers(users);
    return { success: true, message: 'Account created successfully!' };
}

// Authenticate user
function authenticateUser(username, password) {
    if (!username || !password) {
        return { success: false, message: 'Username and password are required.' };
    }
    
    const users = getUsers();
    if (!users.hasOwnProperty(username)) {
        return { success: false, message: 'Username not found.' };
    }
    
    const user = users[username];
    const passwordHash = hashPassword(password);
    
    if (user.password !== passwordHash) {
        return { success: false, message: 'Incorrect password.' };
    }
    
    return { success: true, message: 'Login successful!' };
}

// Handle sign up
function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const errorEl = document.getElementById('signupError');
    
    errorEl.textContent = '';
    
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
    }
    
    const result = registerUser(username, password);
    
    if (!result.success) {
        errorEl.textContent = result.message;
        return;
    }
    
    // Clear form and switch to login
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirm').value = '';
    errorEl.textContent = '';
    
    // Show login form with success
    toggleAuthForm(null, true);
}

// Handle login
function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    errorEl.textContent = '';
    
    const result = authenticateUser(username, password);
    
    if (!result.success) {
        errorEl.textContent = result.message;
        return;
    }
    
    // Login successful
    localStorage.setItem(CURRENT_USER_KEY, username);
    localStorage.setItem(USERNAME_KEY, username);
    
    // Hide auth modal and show main app
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    
    // Clear form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Update welcome message
    updateWelcomeMessage();
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem(CURRENT_USER_KEY);
        // Don't remove USERNAME_KEY - keep it for display purposes if needed
        location.reload();
    }
}

// Toggle between login and signup forms
function toggleAuthForm(event, toLogin = false) {
    if (event) {
        event.preventDefault();
    }
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (toLogin || loginForm.classList.contains('active')) {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
    } else {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    }
}

// Check if user is logged in and redirect to login if not
function checkAuth() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    const authModal = document.getElementById('authModal');
    const mainContainer = document.getElementById('mainContainer');
    
    if (!currentUser) {
        authModal.style.display = 'flex';
        mainContainer.style.display = 'none';
    } else {
        authModal.style.display = 'none';
        mainContainer.style.display = 'block';
        updateWelcomeMessage();
    }
}

// Update welcome message with current username
function updateWelcomeMessage() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem(USERNAME_KEY) || DEFAULT_USERNAME;
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${currentUser}`;
    }
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getQuestPoints() {
    return parseInt(localStorage.getItem(QUEST_POINTS_KEY) || '0', 10);
}

function saveQuestPoints(points) {
    localStorage.setItem(QUEST_POINTS_KEY, String(points));
}

function showDailyQuestMessage(message) {
    const messageEl = document.getElementById('dailyQuestMessage');
    if (messageEl) messageEl.textContent = message;
}

// Refresh cooldown (30 minutes) helpers
const LAST_REFRESH_KEY = 'gdLastQuestRefresh';
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function getLastRefresh() {
    const v = parseInt(localStorage.getItem(LAST_REFRESH_KEY) || '0', 10);
    return isNaN(v) ? 0 : v;
}

function setLastRefresh(ts) {
    localStorage.setItem(LAST_REFRESH_KEY, String(ts));
}

function canRefreshNow() {
    const last = getLastRefresh();
    return Date.now() - last >= REFRESH_COOLDOWN_MS;
}

function getRemainingCooldownMs() {
    const last = getLastRefresh();
    const remaining = REFRESH_COOLDOWN_MS - (Date.now() - last);
    return Math.max(0, remaining);
}

function formatMsToMMSS(ms) {
    const total = Math.ceil(ms / 1000);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateRefreshTimerUI() {
    const timerEl = document.getElementById('refreshTimer');
    const btn = document.getElementById('refreshDailyQuestsBtn');
    if (!timerEl || !btn) return;
    if (canRefreshNow()) {
        timerEl.textContent = 'Ready';
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
    } else {
        const rem = getRemainingCooldownMs();
        timerEl.textContent = `Refresh in ${formatMsToMMSS(rem)}`;
        btn.disabled = true;
        btn.classList.add('btn-disabled');
    }
}

// Coins (visual currency) helpers
const COINS_KEY = 'gdCoins';
const ICON_MACHINE_KEY = 'gdIconMachineState';
const ICON_MACHINE_STORE = [
    { id: 'flame', emoji: '🔥', title: 'Flaming Icon', cost: 20 },
    { id: 'ghost', emoji: '👻', title: 'Ghost Icon', cost: 15 },
    { id: 'star', emoji: '⭐', title: 'Star Icon', cost: 25 },
    { id: 'robot', emoji: '🤖', title: 'Robot Icon', cost: 18 },
    { id: 'diamond', emoji: '💎', title: 'Crystal Icon', cost: 30 }
];

const ICON_KIND_MESSAGES = [
    'Hello there! 👋',
    'You are awesome today!',
    'Hope you have a fun session!',
    'Stay kind and keep going!',
    'Nice to see you!',
    'Friendly icon says hi!'
];

function maybeGetIconKindMessage() {
    if (Math.random() > 0.25) return '';
    return ICON_KIND_MESSAGES[Math.floor(Math.random() * ICON_KIND_MESSAGES.length)];
}

function getCoins() {
    return parseInt(localStorage.getItem(COINS_KEY) || '0', 10);
}

function saveCoins(n) {
    localStorage.setItem(COINS_KEY, String(n));
}

function addCoins(n) {
    const next = Math.max(0, getCoins() + (parseInt(n, 10) || 0));
    saveCoins(next);
    updateQuestStats();
}

function updateCoinStat() {
    const el = document.getElementById('coinCount');
    if (el) el.textContent = String(getCoins());
    const iconEl = document.getElementById('iconMachineCoins');
    if (iconEl) iconEl.textContent = String(getCoins());
}

function showIconMachineMessage(message) {
    const messageEl = document.getElementById('iconMachineMessage');
    if (messageEl) messageEl.textContent = message;
}

function getIconMachineState() {
    return getStoredData(ICON_MACHINE_KEY, { purchased: [], showcase: [] });
}

function saveIconMachineState(state) {
    localStorage.setItem(ICON_MACHINE_KEY, JSON.stringify(state));
}

function getStoreIcon(iconId) {
    return ICON_MACHINE_STORE.find(icon => icon.id === iconId);
}

let iconMachineModalState = null;

function loadIconMachine() {
    renderIconMachine();
}

function openIconMachineModal({ title, message, iconId, mode, submitText, showRenameInput = false }) {
    iconMachineModalState = { iconId, mode };
    const modal = document.getElementById('iconMachineModal');
    const titleEl = document.getElementById('iconMachineModalTitle');
    const messageEl = document.getElementById('iconMachineModalMessage');
    const renameGroup = document.getElementById('iconMachineModalRenameGroup');
    const renameInput = document.getElementById('iconMachineRenameInput');
    const confirmBtn = document.getElementById('iconMachineModalConfirm');

    if (!modal || !titleEl || !messageEl || !renameGroup || !renameInput || !confirmBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = submitText;
    confirmBtn.disabled = false;

    const icon = getStoreIcon(iconId);
    const preview = document.getElementById('iconMachineModalPreview');
    if (preview) {
        preview.textContent = icon ? icon.emoji : '🎨';
    }

    if (showRenameInput) {
        const item = getIconMachineState().purchased.find(x => x.id === iconId);
        renameGroup.style.display = 'block';
        renameInput.value = item?.customName || icon?.title || '';
        renameInput.focus();
    } else {
        renameGroup.style.display = 'none';
        renameInput.value = '';
    }

    modal.classList.add('show');
}

function closeIconMachineModal() {
    const modal = document.getElementById('iconMachineModal');
    if (modal) modal.classList.remove('show');
    iconMachineModalState = null;
}

function confirmIconMachineModal() {
    if (!iconMachineModalState) {
        closeIconMachineModal();
        return;
    }

    const { iconId, mode } = iconMachineModalState;
    if (mode === 'buy') {
        completePurchaseIcon(iconId);
    } else if (mode === 'sell') {
        completeSellIcon(iconId);
    } else if (mode === 'rename') {
        if (completeRenameIcon(iconId)) closeIconMachineModal();
        return;
    }

    closeIconMachineModal();
}

function completePurchaseIcon(iconId) {
    const state = getIconMachineState();
    if (state.purchased.some(item => item.id === iconId)) {
        showIconMachineMessage('You already own this icon.');
        return;
    }

    const icon = getStoreIcon(iconId);
    if (!icon) return;

    const currentCoins = getCoins();
    if (currentCoins < icon.cost) {
        const coinsNeeded = icon.cost - currentCoins;
        showIconMachineMessage(`Not enough coins. You have ${currentCoins}, but ${icon.title} costs ${icon.cost}. You need ${coinsNeeded} more.`);
        return;
    }

    saveCoins(currentCoins - icon.cost);
    state.purchased.push({
        id: icon.id,
        customName: icon.title,
        purchasedAt: new Date().toISOString()
    });
    saveIconMachineState(state);
    renderIconMachine();
    showIconMachineMessage(`You had enough coins! Purchased ${icon.title} for ${icon.cost} coins. You have ${getCoins()} coins left.`);
}

function completeSellIcon(iconId) {
    const state = getIconMachineState();
    const index = state.purchased.findIndex(item => item.id === iconId);
    if (index === -1) return;

    const icon = getStoreIcon(iconId);
    if (!icon) return;

    const sellValue = Math.floor(icon.cost / 2);
    state.purchased.splice(index, 1);
    state.showcase = state.showcase.filter(id => id !== iconId);
    saveIconMachineState(state);
    saveCoins(getCoins() + sellValue);
    renderIconMachine();
    showIconMachineMessage(`Sold ${icon.title} for ${sellValue} coins. You now have ${getCoins()} coins.`);
}

function completeRenameIcon(iconId) {
    const state = getIconMachineState();
    const item = state.purchased.find(x => x.id === iconId);
    if (!item) return false;

    const renameInput = document.getElementById('iconMachineRenameInput');
    if (!renameInput) return false;

    const trimmed = renameInput.value.trim();
    if (trimmed.length === 0) {
        showIconMachineMessage('Icon name cannot be empty.');
        return false;
    }

    item.customName = trimmed;
    saveIconMachineState(state);
    renderIconMachine();
    showIconMachineMessage(`Renamed icon to ${trimmed}.`);
    return true;
}

function renderIconMachine() {
    updateCoinStat();
    renderAvailableIcons();
    renderOwnedIcons();
    renderShowcaseShelf();
}

function renderAvailableIcons() {
    const list = document.getElementById('availableIconList');
    if (!list) return;

    const state = getIconMachineState();
    list.innerHTML = '';

    ICON_MACHINE_STORE.forEach(icon => {
        const purchasedItem = state.purchased.find(item => item.id === icon.id);
        const purchased = Boolean(purchasedItem);
        const displayTitle = purchasedItem ? purchasedItem.customName || icon.title : icon.title;
        const subtitle = purchasedItem && purchasedItem.customName
            ? `Named: ${escapeHtml(purchasedItem.customName)}`
            : (purchased ? 'Owned' : `Cost: ${icon.cost} coins`);
        const kindMessage = maybeGetIconKindMessage();
        const kindMessageHtml = kindMessage ? `<div class="icon-kind-message">${escapeHtml(kindMessage)}</div>` : '';
        const card = document.createElement('div');
        card.className = 'icon-card' + (purchased ? ' owned' : '');
        card.innerHTML = `
            <div class="icon-preview">${icon.emoji}</div>
            <div class="icon-meta">
                <div class="icon-title">${escapeHtml(displayTitle)}</div>
                <div class="icon-subtitle">${subtitle}</div>
                ${kindMessageHtml}
            </div>
            <div class="icon-actions">
                ${purchased ? '<span class="meta">Owned</span>' : `<button class="btn btn-primary btn-small" onclick="purchaseIcon('${icon.id}')">Buy</button>`}
            </div>
        `;
        list.appendChild(card);
    });
}

function renderOwnedIcons() {
    const list = document.getElementById('ownedIconList');
    if (!list) return;

    const state = getIconMachineState();
    list.innerHTML = '';

    if (state.purchased.length === 0) {
        list.innerHTML = '<div class="empty-message">No icons owned yet. Buy one to start your showcase!</div>';
        return;
    }

    state.purchased.forEach(item => {
        const icon = getStoreIcon(item.id);
        if (!icon) return;

        const kindMessage = maybeGetIconKindMessage();
        const kindMessageHtml = kindMessage ? `<div class="icon-kind-message">${escapeHtml(kindMessage)}</div>` : '';
        const card = document.createElement('div');
        card.className = 'icon-card owned';
        card.setAttribute('draggable', 'true');
        card.setAttribute('ondragstart', `handleIconDragStart(event, '${item.id}')`);
        card.innerHTML = `
            <div class="icon-preview">${icon.emoji}</div>
            <div class="icon-meta">
                <div class="icon-title">${escapeHtml(item.customName || icon.title)}</div>
                <div class="icon-subtitle">Owned</div>
                ${kindMessageHtml}
            </div>
            <div class="icon-actions">
                <button class="btn btn-primary btn-small" onclick="renameIcon('${item.id}')">Rename</button>
                <button class="btn btn-danger btn-small" onclick="sellIcon('${item.id}')">Sell</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderShowcaseShelf() {
    const shelf = document.getElementById('showcaseShelf');
    if (!shelf) return;

    const state = getIconMachineState();
    shelf.innerHTML = '';

    if (state.showcase.length === 0) {
        shelf.innerHTML = '<div class="empty-message">Drag owned icons here to show them off.</div>';
        return;
    }

    state.showcase.forEach(iconId => {
        const item = state.purchased.find(x => x.id === iconId);
        const icon = getStoreIcon(iconId);
        if (!item || !icon) return;

        const box = document.createElement('div');
        box.className = 'showcase-icon';
        box.setAttribute('draggable', 'true');
        box.setAttribute('ondragstart', `handleIconDragStart(event, '${iconId}')`);
        box.innerHTML = `
            <div class="showcase-emoji">${icon.emoji}</div>
            <div class="showcase-name">${escapeHtml(item.customName || icon.title)}</div>
            <div class="showcase-meta">Drag to move or remove to hide</div>
            <div class="showcase-actions">
                <button class="btn btn-small btn-danger" onclick="removeFromShowcase('${iconId}')">Remove</button>
            </div>
        `;
        shelf.appendChild(box);
    });
}

function purchaseIcon(iconId) {
    const icon = getStoreIcon(iconId);
    if (!icon) return;

    const currentCoins = getCoins();
    const canAfford = currentCoins >= icon.cost;
    const purchaseMessage = canAfford
        ? `You have enough coins! ${icon.title} costs ${icon.cost} coins and you have ${currentCoins}.`
        : `Not enough coins. ${icon.title} costs ${icon.cost}, but you have ${currentCoins}. You need ${icon.cost - currentCoins} more.`;

    openIconMachineModal({
        title: `Buy ${icon.title}`,
        message: purchaseMessage,
        iconId,
        mode: 'buy',
        submitText: canAfford ? 'Buy' : 'Not Enough Coins'
    });

    const confirmBtn = document.getElementById('iconMachineModalConfirm');
    if (confirmBtn) confirmBtn.disabled = !canAfford;
}

function renameIcon(iconId) {
    const icon = getStoreIcon(iconId);
    if (!icon) return;

    openIconMachineModal({
        title: `Rename ${icon.title}`,
        message: 'Enter a new name for this icon.',
        iconId,
        mode: 'rename',
        submitText: 'Rename',
        showRenameInput: true
    });
}

function sellIcon(iconId) {
    const icon = getStoreIcon(iconId);
    if (!icon) return;

    openIconMachineModal({
        title: `Sell ${icon.title}`,
        message: `Sell this icon for ${Math.floor(icon.cost / 2)} coins?`,
        iconId,
        mode: 'sell',
        submitText: 'Sell'
    });
}

function handleIconDragStart(event, iconId) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', iconId);
    event.dataTransfer.effectAllowed = 'move';
}

function handleIconDragOver(event) {
    event.preventDefault();
    const target = event.currentTarget;
    if (target && target.classList.contains('showcase-dropzone')) {
        target.classList.add('drag-over');
    }
}

function handleIconDrop(event) {
    event.preventDefault();
    const target = event.currentTarget;
    if (target && target.classList.contains('showcase-dropzone')) {
        target.classList.remove('drag-over');
    }

    const iconId = event.dataTransfer.getData('text/plain');
    if (!iconId) return;

    const state = getIconMachineState();
    if (!state.purchased.some(item => item.id === iconId)) {
        return;
    }

    if (!state.showcase.includes(iconId)) {
        state.showcase.push(iconId);
        saveIconMachineState(state);
        renderShowcaseShelf();
    }
}

function removeFromShowcase(iconId) {
    const state = getIconMachineState();
    state.showcase = state.showcase.filter(id => id !== iconId);
    saveIconMachineState(state);
    renderShowcaseShelf();
}

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
        : '<span class="avatar-fallback">🧑</span>';

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
    // Check authentication first
    checkAuth();
    
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
    loadDailyQuests();
    updateAllStats();
    loadIconMachine();

    // Allow Enter key to add items (guarded)
    const goalInputEl = document.getElementById('goalInput');
    if (goalInputEl) {
        goalInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addGoal();
        });
    }

    const demonInputEl = document.getElementById('demonInput');
    if (demonInputEl) {
        demonInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') showDemonModal();
        });
    }

    const practiceNotesEl = document.getElementById('practiceNotes');
    if (practiceNotesEl) {
        practiceNotesEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPracticeSession();
        });
    }

    const levelNameInputEl = document.getElementById('levelNameInput');
    if (levelNameInputEl) {
        levelNameInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPracticeSession();
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveUsername();
        });
    }

    // Close modal when clicking outside
    const demonModalEl = document.getElementById('demonModal');
    if (demonModalEl) {
        demonModalEl.addEventListener('click', (e) => {
            if (e.target.id === 'demonModal') closeDemonModal();
        });
    }

    const infoModalEl = document.getElementById('infoModal');
    if (infoModalEl) {
        infoModalEl.addEventListener('click', (e) => {
            if (e.target.id === 'infoModal') closeInfoModal();
        });
    }

    // Initialize weakness buttons
    initWeaknessButtons();

    // Start refresh timer UI updater
    updateRefreshTimerUI();
    if (_refreshTimerInterval) clearInterval(_refreshTimerInterval);
    _refreshTimerInterval = setInterval(updateRefreshTimerUI, 1000);

    // Percentage input sync
    const demonRangeEl = document.getElementById('demonPercentageRange');
    const demonNumberEl = document.getElementById('demonPercentageInput');
    const percentageDisplayEl = document.getElementById('percentageDisplay');

    if (demonRangeEl && demonNumberEl && percentageDisplayEl) {
        demonRangeEl.addEventListener('input', (e) => {
            demonNumberEl.value = e.target.value;
            percentageDisplayEl.textContent = e.target.value + '%';
        });

        demonNumberEl.addEventListener('input', (e) => {
            const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
            e.target.value = value;
            demonRangeEl.value = value;
            percentageDisplayEl.textContent = value + '%';
        });
    }
});

// ============= PAGE SWITCHING =============

// ============= DAILY QUESTS =============

function generateDailyQuests() {
    const templates = [
        { type: 'practice', makeText: (p) => `Practice for ${p} minutes`, param: () => (Math.random() > 0.5 ? 30 : 20), baseReward: 10 },
        { type: 'beat', makeText: (p) => `Beat a ${p} demon`, param: () => ['Easy', 'Medium', 'Hard', 'Insane'][Math.floor(Math.random() * 4)], baseReward: 15 },
        { type: 'sessions', makeText: (p) => `Log ${p} practice sessions`, param: () => Math.floor(Math.random() * 3) + 1, baseReward: 12 },
        { type: 'attempts', makeText: (p) => `Attempt any level ${p} times`, param: () => Math.floor(Math.random() * 10) + 5, baseReward: 8 },
        { type: 'weakness', makeText: (p) => `Work on ${p} mechanic`, param: () => WEAKNESS_TYPES[Math.floor(Math.random() * WEAKNESS_TYPES.length)].name, baseReward: 7 }
    ];

    const chosen = new Set();
    const quests = [];
    while (quests.length < 3) {
        const idx = Math.floor(Math.random() * templates.length);
        if (chosen.has(idx)) continue;
        chosen.add(idx);
        const t = templates[idx];
        const p = t.param();
        quests.push({
            id: Date.now() + Math.floor(Math.random() * 9999),
            type: t.type,
            text: t.makeText(p),
            param: p,
            completed: false,
            claimed: false,
            reward: t.baseReward
        });
    }

    const payload = { date: getTodayStr(), quests };
    localStorage.setItem(DAILY_QUESTS_KEY, JSON.stringify(payload));
    dailyQuests = quests;
    return quests;
}

function saveDailyQuests() {
    const payload = { date: getTodayStr(), quests: dailyQuests };
    localStorage.setItem(DAILY_QUESTS_KEY, JSON.stringify(payload));
}

function loadDailyQuests() {
    const raw = localStorage.getItem(DAILY_QUESTS_KEY);
    const today = getTodayStr();
    if (!raw) {
        generateDailyQuests();
    } else {
        try {
            const obj = JSON.parse(raw);
            if (obj && obj.date === today && Array.isArray(obj.quests)) {
                dailyQuests = obj.quests;
            } else {
                generateDailyQuests();
            }
        } catch (e) {
            generateDailyQuests();
        }
    }
    renderDailyQuests();
    updateQuestStats();
}

// Hook refresh timer updater
let _refreshTimerInterval = null;

function renderDailyQuests() {
    const list = document.getElementById('dailyQuestsList');
    if (!list) return;
    list.innerHTML = '';
    if (!dailyQuests || dailyQuests.length === 0) {
        list.innerHTML = '<div class="empty-message">No daily quests available.</div>';
        return;
    }

    dailyQuests.forEach(q => {
        const li = document.createElement('div');
        li.className = 'goal-item quest-item';
        // Complete button shows a simple square; disable if already claimed
        const completeLabel = q.completed ? '⬛' : '⬜';
        const completeDisabled = q.claimed ? 'disabled' : '';
        const claimDisabled = (q.completed && !q.claimed) ? '' : 'disabled';
        li.innerHTML = `
            <div class="item-content">
                <div class="item-name">${escapeHtml(q.text)}</div>
                <div class="meta">Reward: ${q.reward} coins</div>
            </div>
            <div class="quest-actions">
                <button class="quest-complete-btn" onclick="toggleCompleteQuest(${q.id})" ${completeDisabled} aria-label="Toggle complete">${completeLabel}</button>
                <button class="btn btn-primary btn-small" onclick="claimQuest(${q.id})" ${claimDisabled}>${q.claimed ? 'Claimed' : 'Claim'}</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function toggleCompleteQuest(id) {
    const q = dailyQuests.find(x => x.id === id);
    if (!q) return;
    // If already claimed, do not allow toggling completion
    if (q.claimed) {
        showDailyQuestMessage('This quest has already been claimed.');
        return;
    }
    q.completed = !q.completed;
    // If user unchecks, ensure claimed is false (defensive)
    if (!q.completed) q.claimed = false;
    saveDailyQuests();
    renderDailyQuests();
}

function claimQuest(id) {
    const q = dailyQuests.find(x => x.id === id);
    if (!q) return;
    if (!q.completed) {
        alert('Complete the quest before claiming the reward.');
        return;
    }
    if (q.claimed) return;
    // Grant coins as reward
    addCoins(q.reward || 0);
    q.claimed = true;
    saveDailyQuests();
    renderDailyQuests();
    updateQuestStats();
    showDailyQuestMessage(`+${q.reward} coins claimed! You now have ${getCoins()} coins.`);
}

function refreshDailyQuests() {
    if (!canRefreshNow()) {
        const rem = getRemainingCooldownMs();
        alert(`Please wait ${formatMsToMMSS(rem)} before refreshing quests.`);
        return;
    }
    if (confirm('Generate a new set of daily quests now? This will replace today\'s quests.')) {
        generateDailyQuests();
        setLastRefresh(Date.now());
        renderDailyQuests();
        updateQuestStats();
        updateRefreshTimerUI();
    }
}

function updateQuestStats() {
    const el = document.getElementById('questPoints');
    if (el) el.textContent = String(getQuestPoints());
    updateCoinStat();
}


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
    // Try to find the nav button that triggered this action (fallback to onclick attribute match)
    const activeBtn = document.querySelector(`.nav-btn[onclick*="switchPage('${pageName}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

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

    // Update tier display when switching to tiers page
    if (pageName === 'tiers') {
        renderTierDisplay();
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
                    <div class="meta">Added: ${goal.dateAdded}</div>
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

function openInfoModal() {
    const infoModal = document.getElementById('infoModal');
    if (infoModal) {
        infoModal.classList.add('show');
    }
}

function closeInfoModal() {
    const infoModal = document.getElementById('infoModal');
    if (infoModal) {
        infoModal.classList.remove('show');
    }
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

function getDemonSearchQuery() {
    const searchInput = document.getElementById('demonSearchInput');
    return searchInput ? searchInput.value.trim().toLowerCase() : '';
}

function filterDemons(demons, query) {
    if (!query) return demons;
    return demons.filter(demon => {
        const text = `${demon.name} ${demon.difficulty}`.toLowerCase();
        return text.includes(query);
    });
}

function loadDemons() {
    const demons = getDemons();
    const query = getDemonSearchQuery();
    const filteredDemons = filterDemons(demons, query);
    const demonsList = document.getElementById('demonsList');

    demonsList.innerHTML = '';

    if (demons.length === 0) {
        demonsList.innerHTML = '<div class="empty-message">No demons beaten yet. Go show those demons who\'s boss!</div>';
    } else if (filteredDemons.length === 0) {
        demonsList.innerHTML = '<div class="empty-message">No demons match your search. Try a different name or difficulty.</div>';
    } else {
        // Group demons by difficulty
        const grouped = groupDemonsByDifficulty(filteredDemons);
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
                            <div class="meta">Beaten: ${formatDemonDate(demon.dateBeaten)}</div>
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
    const activeFilterBtn = document.querySelector(`.timeline-filter[onclick*="filterTimeline('${difficulty}')"]`);
    if (activeFilterBtn) activeFilterBtn.classList.add('active');
    
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
        statsContainer.innerHTML = '<div class="meta" style="text-align: center; padding: 20px;">No weakness data yet. Start tracking in the Weakness Tracker!</div>';
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

// ============= TIER SYSTEM =============

const TIER_DEFINITIONS = [
    {
        name: 'God',
        emoji: '👑',
        color: '#FFD700',
        requirements: {
            minDemonsBeaten: 50,
            extremeDemonsBeaten: 10,
            insaneDemonsBeaten: 20,
            minTotalPracticeTime: 5000,
            description: 'You are a true GD legend! Master of all difficulties with exceptional dedication.'
        }
    },
    {
        name: 'Unreal',
        emoji: '⭐',
        color: '#FF6B9D',
        requirements: {
            minDemonsBeaten: 30,
            extremeDemonsBeaten: 5,
            insaneDemonsBeaten: 12,
            minTotalPracticeTime: 2500,
            description: 'Incredible skill and dedication! You\'ve conquered many challenging demons.'
        }
    },
    {
        name: 'Gold',
        emoji: '✨',
        color: '#FFD700',
        requirements: {
            minDemonsBeaten: 15,
            extremeDemonsBeaten: 1,
            insaneDemonsBeaten: 5,
            minTotalPracticeTime: 1000,
            description: 'Excellent progress! You\'ve beaten solid demons and shown great commitment.'
        }
    },
    {
        name: 'Silver',
        emoji: '🥈',
        color: '#C0C0C0',
        requirements: {
            minDemonsBeaten: 5,
            extremeDemonsBeaten: 0,
            insaneDemonsBeaten: 1,
            minTotalPracticeTime: 300,
            description: 'Good start! You\'re building solid skills and experience.'
        }
    },
    {
        name: 'Bronze',
        emoji: '🥉',
        color: '#CD7F32',
        requirements: {
            minDemonsBeaten: 1,
            extremeDemonsBeaten: 0,
            insaneDemonsBeaten: 0,
            minTotalPracticeTime: 0,
            description: 'Welcome to the GD journey! You\'ve started your demon-beating adventure.'
        }
    }
];

function calculatePlayerTier() {
    const demons = getDemons();
    const sessions = getSessions();
    const grouped = groupDemonsByDifficulty(demons);
    
    // Calculate metrics
    const totalDemonsBeaten = demons.length;
    const extremeDemonsBeaten = grouped['Extreme'].length;
    const insaneDemonsBeaten = grouped['Insane'].length;
    
    let totalPracticeTime = 0;
    sessions.forEach(session => {
        totalPracticeTime += session.minutes;
    });
    
    // Find the appropriate tier
    for (let tierDef of TIER_DEFINITIONS) {
        const req = tierDef.requirements;
        const meetsRequirements = 
            totalDemonsBeaten >= req.minDemonsBeaten &&
            extremeDemonsBeaten >= req.extremeDemonsBeaten &&
            insaneDemonsBeaten >= req.insaneDemonsBeaten &&
            totalPracticeTime >= req.minTotalPracticeTime;
        
        if (meetsRequirements) {
            return {
                tier: tierDef,
                metrics: {
                    totalDemonsBeaten,
                    extremeDemonsBeaten,
                    insaneDemonsBeaten,
                    hardDemonsBeaten: grouped['Hard'].length,
                    mediumDemonsBeaten: grouped['Medium'].length,
                    easyDemonsBeaten: grouped['Easy'].length,
                    totalPracticeTime
                }
            };
        }
    }
    
    // Return Bronze as default
    return {
        tier: TIER_DEFINITIONS[4], // Bronze
        metrics: {
            totalDemonsBeaten,
            extremeDemonsBeaten,
            insaneDemonsBeaten,
            hardDemonsBeaten: grouped['Hard'].length,
            mediumDemonsBeaten: grouped['Medium'].length,
            easyDemonsBeaten: grouped['Easy'].length,
            totalPracticeTime
        }
    };
}

function getTierProgress() {
    const currentTierInfo = calculatePlayerTier();
    const currentTierIndex = TIER_DEFINITIONS.findIndex(t => t.name === currentTierInfo.tier.name);
    
    const demons = getDemons();
    const sessions = getSessions();
    const grouped = groupDemonsByDifficulty(demons);
    
    let totalPracticeTime = 0;
    sessions.forEach(session => {
        totalPracticeTime += session.minutes;
    });
    
    // If already at God tier, show completion
    if (currentTierIndex === 0) {
        return {
            currentTier: currentTierInfo.tier,
            nextTier: null,
            progressPercent: 100,
            metricsToNext: null
        };
    }
    
    // Get next tier requirements
    const nextTierIndex = currentTierIndex - 1;
    const nextTier = TIER_DEFINITIONS[nextTierIndex];
    const nextReq = nextTier.requirements;
    
    const totalDemonsBeaten = demons.length;
    const extremeDemonsBeaten = grouped['Extreme'].length;
    const insaneDemonsBeaten = grouped['Insane'].length;
    
    // Calculate progress to next tier
    const demonProgress = Math.min(totalDemonsBeaten / nextReq.minDemonsBeaten, 1);
    const extremeProgress = nextReq.extremeDemonsBeaten > 0 ? 
        Math.min(extremeDemonsBeaten / nextReq.extremeDemonsBeaten, 1) : 1;
    const insaneProgress = nextReq.insaneDemonsBeaten > 0 ?
        Math.min(insaneDemonsBeaten / nextReq.insaneDemonsBeaten, 1) : 1;
    const practiceProgress = nextReq.minTotalPracticeTime > 0 ?
        Math.min(totalPracticeTime / nextReq.minTotalPracticeTime, 1) : 1;
    
    const avgProgress = (demonProgress + extremeProgress + insaneProgress + practiceProgress) / 4;
    
    return {
        currentTier: currentTierInfo.tier,
        nextTier: nextTier,
        progressPercent: Math.round(avgProgress * 100),
        metricsToNext: {
            demonsNeeded: Math.max(0, nextReq.minDemonsBeaten - totalDemonsBeaten),
            extremeNeeded: Math.max(0, nextReq.extremeDemonsBeaten - extremeDemonsBeaten),
            insaneNeeded: Math.max(0, nextReq.insaneDemonsBeaten - insaneDemonsBeaten),
            practiceNeeded: Math.max(0, nextReq.minTotalPracticeTime - totalPracticeTime)
        }
    };
}

function renderTierDisplay() {
    const tierContainer = document.getElementById('tierContainer');
    if (!tierContainer) return;
    
    const tierInfo = calculatePlayerTier();
    const progressInfo = getTierProgress();
    
    const tier = tierInfo.tier;
    const metrics = tierInfo.metrics;
    const progress = progressInfo.progressPercent;
    const nextTier = progressInfo.nextTier;
    const metricsToNext = progressInfo.metricsToNext;
    
    let nextTierHTML = '';
    if (nextTier) {
        nextTierHTML = `
            <div class="tier-next">
                <div class="next-tier-label">Progress to ${nextTier.name} ${nextTier.emoji}</div>
                <div class="tier-progress-bar">
                    <div class="tier-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="tier-progress-text">${progress}% Complete</div>
                <div class="tier-metrics-needed">
                    <div class="metric-needed">Demons: ${metrics.totalDemonsBeaten}/${metrics.totalDemonsBeaten + metricsToNext.demonsNeeded}</div>
                    <div class="metric-needed">Extreme: ${metrics.extremeDemonsBeaten}/${metrics.extremeDemonsBeaten + metricsToNext.extremeNeeded}</div>
                    <div class="metric-needed">Insane: ${metrics.insaneDemonsBeaten}/${metrics.insaneDemonsBeaten + metricsToNext.insaneNeeded}</div>
                    <div class="metric-needed">Practice: ${metrics.totalPracticeTime}/${metrics.totalPracticeTime + metricsToNext.practiceNeeded} min</div>
                </div>
            </div>
        `;
    }
    
    tierContainer.innerHTML = `
        <div class="tier-display" style="border-color: ${tier.color}">
            <div class="tier-header">
                <div class="tier-icon">${tier.emoji}</div>
                <div class="tier-name" style="color: ${tier.color}">${tier.name}</div>
            </div>
            <div class="tier-description">${tier.description}</div>
            <div class="tier-stats">
                <div class="tier-stat">
                    <span class="tier-stat-label">Demons Beaten:</span>
                    <span class="tier-stat-value">${metrics.totalDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Extreme:</span>
                    <span class="tier-stat-value">${metrics.extremeDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Insane:</span>
                    <span class="tier-stat-value">${metrics.insaneDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Hard:</span>
                    <span class="tier-stat-value">${metrics.hardDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Medium:</span>
                    <span class="tier-stat-value">${metrics.mediumDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Easy:</span>
                    <span class="tier-stat-value">${metrics.easyDemonsBeaten}</span>
                </div>
                <div class="tier-stat">
                    <span class="tier-stat-label">Practice Time:</span>
                    <span class="tier-stat-value">${metrics.totalPracticeTime} min</span>
                </div>
            </div>
            ${nextTierHTML}
        </div>
    `;
    
    renderTierRankDisplay();
}

function renderTierRankDisplay() {
    const rankContainer = document.getElementById('tierRankDisplay');
    if (!rankContainer) return;
    
    const tierInfo = calculatePlayerTier();
    const currentTierName = tierInfo.tier.name;
    
    let rankHTML = '<div class="tier-rank-container">';
    rankHTML += '<div class="tier-rank-label">Tier Progression:</div>';
    rankHTML += '<div class="tier-rank-progression">';
    
    // Reverse the tier order so God is on the right
    const reversedTiers = [...TIER_DEFINITIONS].reverse();
    
    reversedTiers.forEach((tier, index) => {
        const isCurrentTier = tier.name === currentTierName;
        const tierPosition = reversedTiers.length - index;
        
        rankHTML += `
            <div class="tier-rank-item ${isCurrentTier ? 'active' : ''}" title="${tier.name}: ${tier.description}">
                <div class="rank-icon">${tier.emoji}</div>
                <div class="rank-name">${tier.name}</div>
                ${isCurrentTier ? '<div class="rank-badge">✓ YOU ARE HERE</div>' : ''}
            </div>
        `;
    });
    
    rankHTML += '</div></div>';
    rankContainer.innerHTML = rankHTML;
}
