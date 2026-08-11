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
const PLAYER_ID_KEY = 'gdPlayerId';
const CHAT_HISTORY_KEY = 'gdChatHistory';
const CHAT_MAX_MESSAGES = 20;
const CHAT_MAX_MESSAGE_LENGTH = 4000;
const ADMIN_OWNER_UNLOCKED_KEY = 'gdAdminOwnerUnlocked';
const ADMIN_OWNER_DELETED_KEY = 'gdAdminOwnerDeleted';
const ADMIN_OWNER_UNLOCK_CODE = atob('MTIzNA==');
const TOP_10_DEMONS_KEY = 'gdTop10Beaten';

let dailyQuests = [];
let chatMessages = [];
let chatRequestPending = false;

// ============= CUSTOM ALERT MODAL =============

function openAlertModal(message, title = 'Notice', icon = 'ℹ️') {
    const modal = document.getElementById('alertModal');
    const titleEl = document.getElementById('alertModalTitle');
    const messageEl = document.getElementById('alertModalMessage');
    const iconEl = document.getElementById('alertModalIcon');
    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    modal.classList.add('show');
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.classList.remove('show');
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

let serverSyncTimer = null;
function scheduleServerProfileSync() {
    if (serverSyncTimer) clearTimeout(serverSyncTimer);
    serverSyncTimer = setTimeout(() => {
        saveProfileToServer();
    }, 500);
}

function saveCoins(n) {
    try {
        localStorage.setItem(COINS_KEY, String(n));
        scheduleServerProfileSync();
    } catch (e) {
        console.error('Failed to save coins:', e);
    }
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
    try {
        localStorage.setItem(ICON_MACHINE_KEY, JSON.stringify(state));
        scheduleServerProfileSync();
    } catch (e) {
        console.error('Failed to save icon machine state:', e);
    }
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
    if (currentCoins < icon.cost) {
        showIconMachineMessage(`Not enough coins. You have ${currentCoins}, but ${icon.title} costs ${icon.cost}.`);
        return;
    }

    openIconMachineModal({
        title: `Buy ${icon.title}`,
        message: `Are you sure you want to buy ${icon.title} for ${icon.cost} coins? You currently have ${currentCoins} coins.`,
        iconId,
        mode: 'buy',
        submitText: 'Buy Icon'
    });
}

function sellIcon(iconId) {
    const icon = getStoreIcon(iconId);
    if (!icon) return;

    const sellValue = Math.floor(icon.cost / 2);
    openIconMachineModal({
        title: `Sell ${icon.title}`,
        message: `Sell ${icon.title} for ${sellValue} coins? (Half price)`,
        iconId,
        mode: 'sell',
        submitText: 'Sell Icon'
    });
}

function renameIcon(iconId) {
    const icon = getStoreIcon(iconId);
    if (!icon) return;

    openIconMachineModal({
        title: `Rename ${icon.title}`,
        message: 'Give your icon a custom name below:',
        iconId,
        mode: 'rename',
        submitText: 'Save Name',
        showRenameInput: true
    });
}

function handleIconDragStart(event, iconId) {
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', iconId);
    }
}

function handleIconDragOver(event) {
    event.preventDefault();
    const dropzone = document.getElementById('showcaseShelf');
    if (dropzone) dropzone.classList.add('drag-over');
}

function handleIconDrop(event) {
    event.preventDefault();
    const dropzone = document.getElementById('showcaseShelf');
    if (dropzone) dropzone.classList.remove('drag-over');

    const iconId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    if (!iconId) return;

    const state = getIconMachineState();
    if (!state.purchased.some(item => item.id === iconId)) return;
    if (state.showcase.includes(iconId)) return;

    state.showcase.push(iconId);
    saveIconMachineState(state);
    renderShowcaseShelf();
    showIconMachineMessage('Added icon to your showcase!');
}

function removeFromShowcase(iconId) {
    const state = getIconMachineState();
    state.showcase = state.showcase.filter(id => id !== iconId);
    saveIconMachineState(state);
    renderShowcaseShelf();
    showIconMachineMessage('Removed icon from showcase.');
}

// Confirmation Modal Helpers
let confirmModalCallback = null;

function openConfirmModal(message, title, callback, confirmText = 'Confirm') {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalConfirm');

    if (!modal || !titleEl || !messageEl || !confirmBtn) return;

    titleEl.textContent = title || 'Confirm Action';
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmModalCallback = callback;

    modal.classList.add('show');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('show');
    confirmModalCallback = null;
}

function commitConfirmModal() {
    if (typeof confirmModalCallback === 'function') {
        confirmModalCallback();
    }
    closeConfirmModal();
}

// Helper functions for localStorage management
function getStoredData(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
        return JSON.parse(data);
    } catch {
        return defaultValue;
    }
}

function saveStoredData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        if (typeof updateSettingsBackupStats === 'function') updateSettingsBackupStats();
        scheduleServerProfileSync();
    } catch (e) {
        console.error(`Failed to save key ${key} to localStorage:`, e);
    }
}

// Date helpers for demons
function getDefaultDemonDate() {
    return new Date().toISOString().split('T')[0];
}

function getDemonDateInputValue(dateStr) {
    if (!dateStr) return getDefaultDemonDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return getDefaultDemonDate();
}

function formatDemonDate(dateStr) {
    if (!dateStr) return 'Unknown Date';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return new Date(year, month - 1, day).toLocaleDateString();
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString();
}

// State tracking
let editingDemonId = null;
let tempDemonData = {};
let timelineFilter = 'all';

function saveAllDataOnUnload() {
    try {
        const pid = ensurePlayerId();
        const username = getUsername();
        const pfpImage = getPfpImage();
        const payload = {
            playerId: pid,
            username,
            pfpImage,
            goals: getGoals(),
            demons: getDemons(),
            sessions: getSessions(),
            weaknesses: getWeaknesses(),
            top10Beaten: getTop10Beaten(),
            iconMachineState: getIconMachineState(),
            coins: getCoins(),
            questPoints: getQuestPoints(),
            darkMode: localStorage.getItem(DARK_MODE_KEY) === 'true'
        };

        localStorage.setItem(GOALS_KEY, JSON.stringify(payload.goals));
        localStorage.setItem(DEMONS_KEY, JSON.stringify(payload.demons));
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(payload.sessions));
        localStorage.setItem(WEAKNESSES_KEY, JSON.stringify(payload.weaknesses));
        localStorage.setItem(TOP_10_DEMONS_KEY, JSON.stringify(payload.top10Beaten));
        localStorage.setItem(ICON_MACHINE_KEY, JSON.stringify(payload.iconMachineState));
        localStorage.setItem(COINS_KEY, String(payload.coins));
        localStorage.setItem(QUEST_POINTS_KEY, String(payload.questPoints));
        localStorage.setItem(USERNAME_KEY, payload.username);
        if (payload.pfpImage) {
            localStorage.setItem(PFP_IMAGE_KEY, payload.pfpImage);
        } else {
            localStorage.removeItem(PFP_IMAGE_KEY);
        }

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('/api/profiles', blob);
        }
    } catch (e) {
        console.warn('Unload save error:', e);
    }
}

window.addEventListener('beforeunload', saveAllDataOnUnload);
window.addEventListener('pagehide', saveAllDataOnUnload);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    ensurePlayerId();

    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        const storedUser = localStorage.getItem(USERNAME_KEY);
        usernameInput.value = storedUser || '';
        persistUsernameDraft();
    }
    loadProfileFromServer();

    loadGoals();
    loadDemons();
    loadSessions();
    loadWeaknesses();
    loadDailyQuests();
    updateAllStats();
    loadIconMachine();
    loadChatHistory();
    loadYouTubers();
    loadDemonList();
    updateSettingsBackupStats();

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
        usernameInput.addEventListener('input', persistUsernameDraft);
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveUsername();
        });
        usernameInput.addEventListener('change', saveUsername);
    }

    const chatInputEl = document.getElementById('chatInput');
    if (chatInputEl) {
        chatInputEl.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage();
            }
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

    const alertModalEl = document.getElementById('alertModal');
    if (alertModalEl) {
        alertModalEl.addEventListener('click', (e) => {
            if (e.target.id === 'alertModal') closeAlertModal();
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

    // Update YouTubers page when switching
    if (pageName === 'youtubers') {
        loadYouTubers();
    }

    // Update Demon List page when switching
    if (pageName === 'demonlist') {
        loadDemonList();
    }

    // Update Settings page backup stats when switching
    if (pageName === 'settings') {
        updateSettingsBackupStats();
    }
}

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
    if (q.claimed) {
        showDailyQuestMessage('This quest has already been claimed.');
        return;
    }
    q.completed = !q.completed;
    if (!q.completed) q.claimed = false;
    saveDailyQuests();
    renderDailyQuests();
}

function claimQuest(id) {
    const q = dailyQuests.find(x => x.id === id);
    if (!q) return;
    if (!q.completed) {
        openAlertModal('Complete the quest before claiming the reward.', 'Quest Incomplete', '🎁');
        return;
    }
    if (q.claimed) return;
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
        openAlertModal(`Please wait ${formatMsToMMSS(rem)} before refreshing quests.`, 'Refresh Cooldown', '⏳');
        return;
    }

    openConfirmModal('Generate a new set of daily quests now? This will replace today\'s quests.', 'Refresh quests', () => {
        generateDailyQuests();
        setLastRefresh(Date.now());
        renderDailyQuests();
        updateQuestStats();
        updateRefreshTimerUI();
    }, 'Refresh');
}

function updateQuestStats() {
    const el = document.getElementById('questPoints');
    if (el) el.textContent = String(getQuestPoints());
    updateCoinStat();
}

// ============= GOALS MANAGEMENT =============

function addGoal() {
    const input = document.getElementById('goalInput');
    const goal = input.value.trim();

    if (!goal) {
        openAlertModal('Please enter a goal!', 'Missing Goal', '📋');
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
    updateSettingsBackupStats();
}

function deleteGoal(id) {
    let goals = getGoals();
    goals = goals.filter(goal => goal.id !== id);
    saveGoals(goals);
    loadGoals();
    updateStats();
    updateSettingsBackupStats();
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
    openConfirmModal('Are you sure you want to delete all goals?', 'Delete all goals', () => {
        saveGoals([]);
        loadGoals();
        updateStats();
        updateSettingsBackupStats();
    }, 'Delete');
}

// ============= DEMONS MANAGEMENT =============

function showDemonModal() {
    const demonInput = document.getElementById('demonInput');
    const demon = demonInput.value.trim();

    if (!demon) {
        openAlertModal('Please enter a demon name!', 'Missing Demon Name', '👹');
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
    updateSettingsBackupStats();
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
    updateSettingsBackupStats();
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
    openConfirmModal('Are you sure you want to delete all beaten demons?', 'Delete all demons', () => {
        saveDemons([]);
        loadDemons();
        updateAllStats();
        updateSettingsBackupStats();
    }, 'Delete');
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
        openAlertModal('Please enter valid minutes for your practice session.', 'Invalid Practice Minutes', '🏋️');
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
    updateSettingsBackupStats();
}

function deletePracticeSession(id) {
    let sessions = getSessions();
    sessions = sessions.filter(session => session.id !== id);
    saveSessions(sessions);
    loadSessions();
    updateAllStats();
    updateSettingsBackupStats();
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
    openConfirmModal('Are you sure you want to delete all practice sessions?', 'Delete all sessions', () => {
        saveSessions([]);
        loadSessions();
        updateAllStats();
        updateSettingsBackupStats();
    }, 'Delete');
}

// ============= WEAKNESS TRACKER =============

const WEAKNESS_TYPES = [
    { name: 'Wave', emoji: '🌊' },
    { name: 'Ship', emoji: '🚀' },
    { name: 'Ball', emoji: '⚽' },
    { name: 'UFO', emoji: '🛸' },
    { name: 'Spider', emoji: '🕷️' },
    { name: 'Robot', emoji: '🤖' },
    { name: 'Swing', emoji: '🔄' },
    { name: 'Memory', emoji: '🧠' },
    { name: 'Dual', emoji: '👥' },
    { name: 'Nerve Control', emoji: '💓' },
    { name: 'Stamina', emoji: '🔋' },
    { name: 'Timing', emoji: '⏱️' }
];

function initWeaknessButtons() {
    const grid = document.getElementById('weaknessGrid');
    if (!grid) return;
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
    updateSettingsBackupStats();
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
    if (!timeline) return;

    timeline.innerHTML = '';

    if (demons.length === 0) {
        timeline.innerHTML = '<div class="empty-message">No demons beaten yet. Start your journey!</div>';
        return;
    }

    const sorted = [...demons].sort((a, b) => {
        const dateA = new Date(a.dateBeaten);
        const dateB = new Date(b.dateBeaten);
        return dateB - dateA;
    });

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

    const sorted = [...demons].sort((a, b) => {
        const dateA = new Date(a.dateBeaten);
        const dateB = new Date(b.dateBeaten);
        return dateB - dateA;
    });

    let streak = 0;
    if (sorted.length > 0) {
        let currentDate = new Date(sorted[0].dateBeaten);

        for (let demon of sorted) {
            const demonDate = new Date(demon.dateBeaten);
            if (Math.abs(currentDate - demonDate) <= 86400000) {
                streak++;
                currentDate = new Date(demonDate.getTime() - 86400000);
            } else {
                break;
            }
        }
    }

    let recentlyBeaten = '-';
    if (sorted.length > 0) {
        recentlyBeaten = sorted[0].name.substring(0, 15) + (sorted[0].name.length > 15 ? '...' : '');
    }

    let hardestDemon = '-';
    let maxAttempts = 0;
    demons.forEach(d => {
        if (d.attempts && d.attempts > maxAttempts) {
            maxAttempts = d.attempts;
            hardestDemon = d.name.substring(0, 15) + (d.name.length > 15 ? '...' : '');
        }
    });

    const mostAttempts = maxAttempts > 0 ? maxAttempts : 0;

    const streakEl = document.getElementById('demonStreak');
    const recentEl = document.getElementById('recentlyBeaten');
    const hardestEl = document.getElementById('hardestDemon');
    const attemptsEl = document.getElementById('mostAttempts');

    if (streakEl) streakEl.textContent = streak;
    if (recentEl) recentEl.textContent = recentlyBeaten;
    if (hardestEl) hardestEl.textContent = hardestDemon;
    if (attemptsEl) attemptsEl.textContent = mostAttempts;
}

// ============= STATISTICS =============

function updateStats() {
    const goals = getGoals();
    const demons = getDemons();
    const grouped = groupDemonsByDifficulty(demons);

    const goalsEl = document.getElementById('totalGoals');
    const demonsEl = document.getElementById('totalDemons');
    const easyEl = document.getElementById('easyCount');
    const mediumEl = document.getElementById('mediumCount');
    const hardEl = document.getElementById('hardCount');
    const insaneEl = document.getElementById('insaneCount');
    const extremeEl = document.getElementById('extremeCount');

    if (goalsEl) goalsEl.textContent = goals.length;
    if (demonsEl) demonsEl.textContent = demons.length;
    if (easyEl) easyEl.textContent = grouped['Easy'].length;
    if (mediumEl) mediumEl.textContent = grouped['Medium'].length;
    if (hardEl) hardEl.textContent = grouped['Hard'].length;
    if (insaneEl) insaneEl.textContent = grouped['Insane'].length;
    if (extremeEl) extremeEl.textContent = grouped['Extreme'].length;
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
    
    goals.slice(-3).forEach(goal => {
        activities.push({
            type: 'goal',
            text: `Added goal: ${goal.text}`,
            date: new Date(goal.dateAdded),
            emoji: '🎯'
        });
    });
    
    demons.slice(-3).forEach(demon => {
        activities.push({
            type: 'demon',
            text: `Beaten ${demon.difficulty}: ${demon.name}`,
            date: new Date(demon.dateBeaten),
            emoji: '👹'
        });
    });
    
    sessions.slice(-3).forEach(session => {
        const levelName = session.levelName ? ` on ${session.levelName}` : '';
        activities.push({
            type: 'session',
            text: `Practice session: ${session.minutes}min${levelName} (${session.notes || 'General'})`,
            date: new Date(session.date),
            emoji: '🏋️'
        });
    });
    
    activities.sort((a, b) => b.date - a.date);
    
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
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
    
    const goalsEl = document.getElementById('statsGoals');
    if (goalsEl) goalsEl.textContent = goals.length;
    
    const demonsEl = document.getElementById('statsDemons');
    if (demonsEl) demonsEl.textContent = demons.length;
    
    const easyEl = document.getElementById('statsEasy');
    if (easyEl) easyEl.textContent = grouped['Easy'].length;
    
    const mediumEl = document.getElementById('statsMedium');
    if (mediumEl) mediumEl.textContent = grouped['Medium'].length;
    
    const hardEl = document.getElementById('statsHard');
    if (hardEl) hardEl.textContent = grouped['Hard'].length;
    
    const insaneEl = document.getElementById('statsInsane');
    if (insaneEl) insaneEl.textContent = grouped['Insane'].length;
    
    const extremeEl = document.getElementById('statsExtreme');
    if (extremeEl) extremeEl.textContent = grouped['Extreme'].length;
    
    let totalMinutes = 0;
    sessions.forEach(session => {
        totalMinutes += session.minutes;
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeEl = document.getElementById('statsTotalTime');
    if (timeEl) timeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    let totalAttempts = 0;
    let demonicCount = 0;
    demons.forEach(d => {
        if (d.attempts) {
            totalAttempts += d.attempts;
            demonicCount++;
        }
    });
    const avgAttempts = demonicCount > 0 ? (totalAttempts / demonicCount).toFixed(1) : '-';
    const avgEl = document.getElementById('avgAttempts');
    if (avgEl) avgEl.textContent = avgAttempts;
    
    const completionRate = demons.length > 0 ? `${demons.length} beaten` : '-';
    const compEl = document.getElementById('completionRate');
    if (compEl) compEl.textContent = completionRate;
    
    let maxWeakness = '-';
    let maxCount = 0;
    Object.entries(weaknesses).forEach(([name, count]) => {
        if (count > maxCount) {
            maxCount = count;
            maxWeakness = name;
        }
    });
    const weakEl = document.getElementById('mostActiveWeakness');
    if (weakEl) weakEl.textContent = maxWeakness;
}

// ============= WEAKNESS RESET =============

function resetWeaknesses() {
    openConfirmModal('Are you sure you want to reset all weakness data?', 'Reset weakness data', () => {
        saveWeaknesses({});
        initWeaknessButtons();
        updateWeaknessStats();
        updateSettingsBackupStats();
    }, 'Reset');
}

// ============= CLEAR ALL DATA =============

function clearAllData() {
    openConfirmModal('⚠️ This will delete ALL your data (goals, beaten demons, practice, weaknesses, top 10 demons, icon machine, chatbot history, PFP, and username). Are you sure?', 'Delete all data', () => {
        openConfirmModal('This action cannot be undone. Delete everything including profile, username, and PFP?', 'Final confirmation', async () => {
            const oldPid = localStorage.getItem(PLAYER_ID_KEY);

            // 1. Wipe ALL keys from LocalStorage completely
            localStorage.clear();

            // 2. Reset input controls & header username
            const usernameInput = document.getElementById('usernameInput');
            if (usernameInput) usernameInput.value = '';

            const pfpUpload = document.getElementById('pfpUpload');
            if (pfpUpload) pfpUpload.value = '';

            const welcomeMsg = document.getElementById('welcomeMessage');
            if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${DEFAULT_USERNAME}`;

            // 3. Reset in-memory chat state & render default smiley PFP
            chatMessages = [];
            renderPfp();

            // 4. Reload & re-render all app views
            loadGoals();
            loadDemons();
            loadSessions();
            loadWeaknesses();
            loadDemonList();
            loadIconMachine();
            updateCoinsUI();
            clearChat();

            if (typeof renderDailyQuests === 'function') renderDailyQuests();
            if (typeof renderTiers === 'function') renderTiers();

            // 5. Clean up old server profile record if present
            if (oldPid) {
                try {
                    await fetch('/api/profiles', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: oldPid, username: DEFAULT_USERNAME, pfpImage: '' })
                    });
                } catch {
                    // Ignore offline errors
                }
            }

            // 6. Generate fresh Player ID and sync clean profile
            ensurePlayerId();
            await saveProfileToServer({ username: DEFAULT_USERNAME, pfpImage: '' });

            // 7. Update stats cards & backup indicators
            updateAllStats();
            updateSettingsBackupStats();

            openAlertModal('All tracker data, beaten demons, goals, icon machine items, chatbot history, profile picture, and username have been completely cleared.', 'Data Cleared', '🗑️');
        }, 'Delete everything');
    }, 'Continue');
}

// ============= SESSION STATS =============

function updateSessionStats() {
    const sessions = getSessions();
    let totalMinutes = 0;
    
    sessions.forEach(session => {
        totalMinutes += session.minutes;
    });
    
    const avgMinutes = sessions.length > 0 ? (totalMinutes / sessions.length).toFixed(1) : 0;
    
    const totalMinsEl = document.getElementById('totalMinutes');
    const avgMinsEl = document.getElementById('avgMinutes');
    const totalCountEl = document.getElementById('totalSessionCount');
    const totalSessEl = document.getElementById('totalSessions');

    if (totalMinsEl) totalMinsEl.textContent = totalMinutes;
    if (avgMinsEl) avgMinsEl.textContent = avgMinutes;
    if (totalCountEl) totalCountEl.textContent = sessions.length;
    if (totalSessEl) totalSessEl.textContent = sessions.length;
}

// ============= WEAKNESS STATS =============

function updateWeaknessStats() {
    const weaknesses = getWeaknesses();
    const statsContainer = document.getElementById('weaknessStats');
    if (!statsContainer) return;
    
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

// ============= DATA IMPORT & EXPORT =============

function updateSettingsBackupStats() {
    const goals = getGoals();
    const demons = getDemons();
    const sessions = getSessions();
    const weaknesses = getWeaknesses();
    const top10Beaten = getTop10Beaten();
    const statsEl = document.getElementById('backupDataStats');

    if (statsEl) {
        statsEl.innerHTML = `
            <span>📋 <strong>${goals.length}</strong> Goals</span>
            <span class="meta-dot">•</span>
            <span>👹 <strong>${demons.length}</strong> Demons</span>
            <span class="meta-dot">•</span>
            <span>🏋️ <strong>${sessions.length}</strong> Practice Logs</span>
            <span class="meta-dot">•</span>
            <span>🔥 <strong>${top10Beaten.length}/10</strong> Top 10 Beaten</span>
        `;
    }
}

function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async () => {
        const [file] = fileInput.files || [];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            if (!parsed || typeof parsed !== 'object') {
                throw new Error('The selected file is not a valid tracker export.');
            }

            const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
            const demons = Array.isArray(parsed.demons) ? parsed.demons : [];
            const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
            const weaknesses = parsed.weaknesses && typeof parsed.weaknesses === 'object' ? parsed.weaknesses : {};
            const top10Beaten = Array.isArray(parsed.top10Beaten) ? parsed.top10Beaten : [];

            openConfirmModal('Import this data and replace current tracker data?', 'Import data', () => {
                localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
                localStorage.setItem(DEMONS_KEY, JSON.stringify(demons));
                localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
                localStorage.setItem(WEAKNESSES_KEY, JSON.stringify(weaknesses));
                localStorage.setItem(TOP_10_DEMONS_KEY, JSON.stringify(top10Beaten));

                loadGoals();
                loadDemons();
                loadSessions();
                loadWeaknesses();
                loadDemonList();
                updateAllStats();
                renderTierDisplay();
                renderTierRankDisplay();
                updateSettingsBackupStats();

                openAlertModal('Data imported successfully.', 'Import Complete', '🎉');
            }, 'Import');
        } catch (error) {
            console.error(error);
            openAlertModal(error.message || 'There was a problem importing that data file.', 'Import Error', '⚠️');
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.remove();
}

function exportData() {
    const goals = getGoals();
    const demons = getDemons();
    const sessions = getSessions();
    const weaknesses = getWeaknesses();
    const top10Beaten = getTop10Beaten();

    const data = {
        exportDate: new Date().toLocaleString(),
        goals: goals,
        demons: demons,
        sessions: sessions,
        weaknesses: weaknesses,
        top10Beaten: top10Beaten,
        statistics: {
            totalGoals: goals.length,
            totalDemons: demons.length,
            totalSessions: sessions.length,
            top10BeatenCount: top10Beaten.length
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============= GD YOUTUBERS DATA & LOGIC =============

const GD_YOUTUBERS = [
    {
        id: 'ethcook',
        name: '[GD] Ethcook',
        emoji: '👨‍💻',
        role: 'Website Creator & Player',
        category: 'Creators & Hosts',
        subscribers: 'Creator',
        description: 'Developer of Geometry Dash Tracker, Sakupen Egg clear, and GD content creator.',
        tags: ['Website Creator', 'Sakupen Egg', 'GD Developer', 'Tracker Creator'],
        url: 'https://www.youtube.com/@Ethcook'
    },
    {
        id: 'zoink',
        name: 'Zoink',
        emoji: '🌊',
        role: '#1 Verifier',
        category: 'Top Players & Verifiers',
        subscribers: '150K+ Subs',
        description: 'Undisputed #1 Verifier in Geometry Dash history — Verified Tidal Wave (hardest demon in GD) & Avernus.',
        tags: ['Tidal Wave Verified', '#1 Demon Verifier', 'Avernus Verified', 'Pointercrate Legend'],
        url: 'https://www.youtube.com/@Zoink'
    },
    {
        id: 'doggie',
        name: 'Doggie',
        emoji: '🐶',
        role: 'Top Player & Verifier',
        category: 'Top Players & Verifiers',
        subscribers: '350K+ Subs',
        description: 'Verified Acheron (former #1 demon), verifier of Grief, Tidal Wave 100%.',
        tags: ['Acheron Verified', 'Grief Verifier', 'Tidal Wave 100%', 'Top Demon Slayer'],
        url: 'https://www.youtube.com/@DoggieDasher'
    },
    {
        id: 'vortrox',
        name: 'Vortrox',
        emoji: '⚡',
        role: 'Content Creator',
        category: 'Showcase & Entertainment',
        subscribers: '500K+ Subs',
        description: 'Zero to Hero series, 100-Hour challenges, extreme demon clears.',
        tags: ['Zero to Hero', '100-Hour Challenge', 'Extreme Demons', 'Entertainer'],
        url: 'https://www.youtube.com/@Vortrox'
    },
    {
        id: 'denni',
        name: 'Denni',
        emoji: '🎭',
        role: 'Commentator & Player',
        category: 'Showcase & Entertainment',
        subscribers: '100K+ Subs',
        description: 'Demon level reactions, challenges, and commentary.',
        tags: ['Demon Reactions', 'GD Challenges', 'Commentary', 'Community Leader'],
        url: 'https://www.youtube.com/@fakedenni'
    },
    {
        id: 'trick',
        name: 'Trick',
        emoji: '🎩',
        role: 'Top Player & Verifier',
        category: 'Top Players & Verifiers',
        subscribers: '200K+ Subs',
        description: 'Verified Silent Clubstep, Acheron 100%, Firework 100%.',
        tags: ['Silent Clubstep Verified', 'Acheron 100%', 'Firework 100%', 'Top Verifier'],
        url: 'https://www.youtube.com/@TrickGMD'
    },
    {
        id: 'npesta',
        name: 'npesta',
        emoji: '👓',
        role: 'Top Player & Streamer',
        category: 'Top Players & Verifiers',
        subscribers: '400K+ Subs',
        description: 'Verified Deimos, Kowareta 100%, iconic GD reactions.',
        tags: ['Deimos Verified', 'Kowareta 100%', 'Iconic Reactions', 'Technical Player'],
        url: 'https://www.youtube.com/@npesta'
    },
    {
        id: 'technical',
        name: 'Technical',
        emoji: '⚙️',
        role: 'Top Verifier & Player',
        category: 'Top Players & Verifiers',
        subscribers: '250K+ Subs',
        description: 'Verified Zodiac & Tartarus, top Demon List victories.',
        tags: ['Zodiac Verified', 'Tartarus Verified', 'Demon List Legend', 'Top Slayer'],
        url: 'https://www.youtube.com/@TechnicalJL'
    },
    {
        id: 'gdcolon',
        name: 'GD Colon',
        emoji: '🦊',
        role: 'Tool Developer & Creator',
        category: 'Creators & Hosts',
        subscribers: '600K+ Subs',
        description: 'GD browser tools, GDBrowser.com, video essays.',
        tags: ['GDBrowser', 'Tool Developer', 'Video Essays', 'GD Modder'],
        url: 'https://www.youtube.com/@GDColon'
    },
    {
        id: 'nexus',
        name: 'Nexus',
        emoji: '💎',
        role: 'Showcase Creator',
        category: 'Showcase & Entertainment',
        subscribers: '500K+ Subs',
        description: '100% level showcases and official updates.',
        tags: ['Level Showcases', '100% Completions', 'Update News', 'Clean Edits'],
        url: 'https://www.youtube.com/@NexusGD10'
    },
    {
        id: 'viprin',
        name: 'Viprin',
        emoji: '👑',
        role: 'Collab Host & Legend',
        category: 'Creators & Hosts',
        subscribers: '600K+ Subs',
        description: 'Host of Bloodbath, Artificial Ascent, Digital Descent.',
        tags: ['Bloodbath Host', 'Artificial Ascent', 'Mega Collab Host', 'GD Award Winner'],
        url: 'https://www.youtube.com/@Viprin'
    },
    {
        id: 'riot',
        name: 'Riot',
        emoji: '🔥',
        role: 'Original Legend',
        category: 'Top Players & Verifiers',
        subscribers: '300K+ Subs',
        description: 'Original legend who verified Bloodbath & Cataclysm.',
        tags: ['Bloodbath Verified', 'Cataclysm Verified', 'Original Legend', 'GD Pioneer'],
        url: 'https://www.youtube.com/@Riottt'
    },
    {
        id: 'partitionzion',
        name: 'Partition Zion',
        emoji: '🌟',
        role: 'Guide & Spotlight Creator',
        category: 'Showcase & Entertainment',
        subscribers: '900K+ Subs',
        description: 'Secret coin guides, 2.2 updates, level spotlights.',
        tags: ['Secret Coin Guides', '2.2 Updates', 'Level Spotlights', 'Walkthroughs'],
        url: 'https://www.youtube.com/@PartitionSion'
    }
];

let selectedYouTuberCategory = 'All';

function setYouTuberCategory(cat) {
    selectedYouTuberCategory = cat;
    const btns = document.querySelectorAll('#youtuberCategoryFilters .filter-btn');
    btns.forEach(btn => {
        if (btn.textContent.trim() === cat) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    filterYouTubers();
}

function filterYouTubers() {
    const input = document.getElementById('youtuberSearchInput');
    const query = input ? input.value.trim().toLowerCase() : '';
    const grid = document.getElementById('youtubersGrid');
    if (!grid) return;

    const filtered = GD_YOUTUBERS.filter(item => {
        const matchesCategory = selectedYouTuberCategory === 'All' || item.category === selectedYouTuberCategory;
        if (!matchesCategory) return false;
        if (!query) return true;

        const textSearch = `${item.name} ${item.role} ${item.description} ${item.tags.join(' ')} ${item.subscribers}`.toLowerCase();
        return textSearch.includes(query);
    });

    grid.innerHTML = '';
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-message">No YouTubers or creators match your search.</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'youtuber-card';
        card.innerHTML = `
            <div class="youtuber-card-header">
                <div class="youtuber-avatar">${item.emoji}</div>
                <div class="youtuber-title-box">
                    <h3 class="youtuber-name">${escapeHtml(item.name)}</h3>
                    <div class="youtuber-badges">
                        <span class="badge role-badge">${escapeHtml(item.role)}</span>
                        <span class="badge sub-badge">📈 ${escapeHtml(item.subscribers)}</span>
                    </div>
                </div>
            </div>
            <p class="youtuber-description">${escapeHtml(item.description)}</p>
            <div class="youtuber-tags">
                ${item.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
            </div>
            <div class="youtuber-card-footer">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-small watch-btn">
                    ▶ Watch on YouTube
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

function loadYouTubers() {
    filterYouTubers();
}

// ============= DEMON LIST TOP 10 DATA & LOGIC =============

const TOP_10_DEMONS = [
    { rank: 1, name: 'Society', creator: 'Neomar', verifier: 'bilan', difficulty: 'Extreme Demon' },
    { rank: 2, name: 'Thinking Space II', creator: 'CairoX', verifier: 'CairoX', difficulty: 'Extreme Demon' },
    { rank: 3, name: 'Flamewall', creator: 'Narwall', verifier: 'Narwall', difficulty: 'Extreme Demon' },
    { rank: 4, name: 'Amethyst', creator: 'iMist', verifier: 'iMist', difficulty: 'Extreme Demon' },
    { rank: 5, name: 'Tidal Wave', creator: 'OniLink', verifier: 'Zoink', difficulty: 'Extreme Demon' },
    { rank: 6, name: 'Green Bullet', creator: 'cherryteam', verifier: 'cherryteam', difficulty: 'Extreme Demon' },
    { rank: 7, name: 'ORBIT', creator: 'MindCap', verifier: 'MindCap', difficulty: 'Extreme Demon' },
    { rank: 8, name: 'Nullscapes', creator: 'Kiba', verifier: 'Zoink', difficulty: 'Extreme Demon' },
    { rank: 9, name: 'Quanteuse processing', creator: 'Renn241', verifier: 'Renn241', difficulty: 'Extreme Demon' },
    { rank: 10, name: 'BOOBAWAMBA', creator: 'Akunakunn', verifier: 'Akunakunn', difficulty: 'Extreme Demon' }
];

let selectedDemonListCategory = 'All Top 10';

function getTop10Beaten() {
    return getStoredData(TOP_10_DEMONS_KEY, []);
}

function saveTop10Beaten(beatenRanks) {
    saveStoredData(TOP_10_DEMONS_KEY, beatenRanks);
}

function toggleTop10Beaten(rank) {
    let beaten = getTop10Beaten();
    if (beaten.includes(rank)) {
        beaten = beaten.filter(r => r !== rank);
    } else {
        beaten.push(rank);
    }
    saveTop10Beaten(beaten);
    loadDemonList();
    updateSettingsBackupStats();
}

function setDemonListCategory(cat) {
    selectedDemonListCategory = cat;
    const btns = document.querySelectorAll('#demonListCategoryFilters .filter-btn');
    btns.forEach(btn => {
        if (btn.textContent.trim() === cat) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    filterDemonList();
}

function filterDemonList() {
    const input = document.getElementById('demonListSearchInput');
    const query = input ? input.value.trim().toLowerCase() : '';
    const grid = document.getElementById('demonListGrid');
    const beatenList = getTop10Beaten();

    if (!grid) return;

    const countBeaten = beatenList.length;
    const countEl = document.getElementById('top10BeatenCount');
    const percentEl = document.getElementById('top10PercentText');
    const fillEl = document.getElementById('top10ProgressFill');

    if (countEl) countEl.textContent = `${countBeaten} / 10 Beaten`;
    const pct = Math.round((countBeaten / 10) * 100);
    if (percentEl) percentEl.textContent = `${pct}%`;
    if (fillEl) fillEl.style.width = `${pct}%`;

    const filtered = TOP_10_DEMONS.filter(item => {
        const isBeaten = beatenList.includes(item.rank);

        if (selectedDemonListCategory === 'Top 3 Elite' && item.rank > 3) return false;
        if (selectedDemonListCategory === 'My Beaten Demons' && !isBeaten) return false;

        if (!query) return true;
        const searchStr = `#${item.rank} ${item.name} ${item.creator} ${item.verifier}`.toLowerCase();
        return searchStr.includes(query);
    });

    grid.innerHTML = '';
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-message">No demons match your selected filter or search.</div>';
        return;
    }

    filtered.forEach(item => {
        const isBeaten = beatenList.includes(item.rank);
        const card = document.createElement('div');
        card.className = `demonlist-card rank-${item.rank}` + (isBeaten ? ' beaten' : '');
        card.innerHTML = `
            <div class="demonlist-rank-badge">#${item.rank}</div>
            <div class="demonlist-card-content">
                <div class="demonlist-title-row">
                    <h3 class="demonlist-level-name">⭐ ${escapeHtml(item.name)}</h3>
                    <span class="badge extreme-badge">Extreme Demon</span>
                </div>
                <div class="demonlist-meta-row">
                    <span>By <strong>${escapeHtml(item.creator)}</strong></span>
                    <span class="meta-dot">•</span>
                    <span>Verified by <strong>${escapeHtml(item.verifier)}</strong></span>
                </div>
            </div>
            <div class="demonlist-card-action">
                <button 
                    onclick="toggleTop10Beaten(${item.rank})" 
                    class="btn btn-small ${isBeaten ? 'btn-success beaten-btn' : 'btn-secondary'}"
                >
                    ${isBeaten ? '✓ Beaten' : 'Mark as Beaten'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function loadDemonList() {
    filterDemonList();
}

// ============= USERNAME & PROFILE =============

function getUsername() {
    return localStorage.getItem(USERNAME_KEY) || DEFAULT_USERNAME;
}

function persistUsernameDraft() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    const value = input.value.trim() || DEFAULT_USERNAME;
    const headerMeta = document.getElementById('welcomeMessage');
    if (headerMeta) {
        headerMeta.textContent = `Welcome, ${value}`;
    }
}

function saveUsername() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    const value = input.value.trim();

    if (!value) {
        openAlertModal('Please enter a username.', 'Username Required', '👤');
        return;
    }

    localStorage.setItem(USERNAME_KEY, value);
    persistUsernameDraft();
    saveProfileToServer({ username: value });

    const msg = document.getElementById('settingsMessage');
    if (msg) msg.textContent = 'Username saved successfully!';
}

function resetUsername() {
    localStorage.removeItem(USERNAME_KEY);
    const input = document.getElementById('usernameInput');
    if (input) input.value = '';
    const headerMeta = document.getElementById('welcomeMessage');
    if (headerMeta) {
        headerMeta.textContent = `Welcome, ${DEFAULT_USERNAME}`;
    }
    saveProfileToServer({ username: DEFAULT_USERNAME });
    const msg = document.getElementById('settingsMessage');
    if (msg) msg.textContent = 'Username reset to default (Player).';
}

function getPfpImage() {
    return localStorage.getItem(PFP_IMAGE_KEY) || '';
}

function createEmojiSvgDataUrl(emoji, bgColor = '#3b82f6') {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="presetGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bgColor}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#presetGrad)"/><text x="50" y="55" font-size="54" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`;
    const base64 = btoa(unescape(encodeURIComponent(svgContent)));
    return `data:image/svg+xml;base64,${base64}`;
}

function renderPfp() {
    const pfp = getPfpImage();
    const headerAvatar = document.getElementById('headerAvatar');
    const settingsPreview = document.getElementById('settingsAvatarPreview');

    const defaultDataUrl = createEmojiSvgDataUrl('😊', '#3b82f6');
    const displaySrc = pfp || defaultDataUrl;

    const imgHtml = `<img src="${displaySrc}" alt="Avatar" onerror="this.onerror=null; this.src='${defaultDataUrl}';">`;

    if (headerAvatar) {
        headerAvatar.innerHTML = imgHtml;
    }
    if (settingsPreview) {
        settingsPreview.innerHTML = imgHtml;
    }
}

function resizeImageToCanvas(file, maxWidth = 256, maxHeight = 256, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const minDim = Math.min(width, height);
                    const sx = (width - minDim) / 2;
                    const sy = (height - minDim) / 2;

                    canvas.width = maxWidth;
                    canvas.height = maxHeight;
                    const ctx = canvas.getContext('2d');

                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxWidth, maxHeight);

                    let resizedDataUrl = canvas.toDataURL('image/webp', quality);
                    if (!resizedDataUrl || resizedDataUrl.length < 100 || !resizedDataUrl.startsWith('data:image/webp')) {
                        resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(resizedDataUrl);
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image file.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

async function handlePfpUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        openAlertModal('Please select a valid image file.', 'Invalid File', '🖼️');
        return;
    }

    const msg = document.getElementById('settingsMessage');
    if (msg) msg.textContent = 'Processing profile picture...';

    try {
        const base64 = await resizeImageToCanvas(file, 256, 256, 0.85);
        try {
            localStorage.setItem(PFP_IMAGE_KEY, base64);
        } catch (storageErr) {
            console.warn('LocalStorage save failed:', storageErr);
        }
        renderPfp();
        await saveProfileToServer({ pfpImage: base64 });

        if (msg) msg.textContent = 'Profile picture updated successfully!';
    } catch (err) {
        console.error('PFP upload error:', err);
        openAlertModal('Could not process the selected image. Please try a different image.', 'Upload Error', '⚠️');
        if (msg) msg.textContent = '';
    }
}

function selectPresetAvatar(emoji, bgColor = '#3b82f6') {
    const svgDataUrl = createEmojiSvgDataUrl(emoji, bgColor);

    try {
        localStorage.setItem(PFP_IMAGE_KEY, svgDataUrl);
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
    renderPfp();
    saveProfileToServer({ pfpImage: svgDataUrl });
    const msg = document.getElementById('settingsMessage');
    if (msg) msg.textContent = `Profile picture set to ${emoji}!`;
}

async function clearPfpImage() {
    localStorage.removeItem(PFP_IMAGE_KEY);
    const pfpUpload = document.getElementById('pfpUpload');
    if (pfpUpload) pfpUpload.value = '';
    renderPfp();
    await saveProfileToServer({ pfpImage: '' });
    const msg = document.getElementById('settingsMessage');
    if (msg) msg.textContent = 'Profile picture removed.';
}

// Player ID and Profile Sync
function ensurePlayerId() {
    let pid = localStorage.getItem(PLAYER_ID_KEY);
    if (!pid) {
        pid = 'player_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(PLAYER_ID_KEY, pid);
    }
    return pid;
}

async function loadProfileFromServer() {
    renderPfp();
    const pid = ensurePlayerId();
    try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(pid)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.username && data.username !== DEFAULT_USERNAME) {
                localStorage.setItem(USERNAME_KEY, data.username);
                const usernameInput = document.getElementById('usernameInput');
                if (usernameInput) usernameInput.value = data.username;
                persistUsernameDraft();
            } else if (data.username === DEFAULT_USERNAME) {
                localStorage.removeItem(USERNAME_KEY);
                const usernameInput = document.getElementById('usernameInput');
                if (usernameInput) usernameInput.value = '';
                persistUsernameDraft();
            }
            if (typeof data.pfpImage === 'string') {
                if (data.pfpImage) {
                    localStorage.setItem(PFP_IMAGE_KEY, data.pfpImage);
                } else {
                    localStorage.removeItem(PFP_IMAGE_KEY);
                }
                renderPfp();
            }
            if (Array.isArray(data.goals) && data.goals.length > 0 && getGoals().length === 0) {
                localStorage.setItem(GOALS_KEY, JSON.stringify(data.goals));
                loadGoals();
            }
            if (Array.isArray(data.demons) && data.demons.length > 0 && getDemons().length === 0) {
                localStorage.setItem(DEMONS_KEY, JSON.stringify(data.demons));
                loadDemons();
            }
            if (Array.isArray(data.sessions) && data.sessions.length > 0 && getSessions().length === 0) {
                localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
                loadSessions();
            }
            if (data.weaknesses && typeof data.weaknesses === 'object' && Object.keys(getWeaknesses()).length === 0) {
                localStorage.setItem(WEAKNESSES_KEY, JSON.stringify(data.weaknesses));
                loadWeaknesses();
            }
            if (Array.isArray(data.top10Beaten) && data.top10Beaten.length > 0 && getTop10Beaten().length === 0) {
                localStorage.setItem(TOP_10_DEMONS_KEY, JSON.stringify(data.top10Beaten));
                loadDemonList();
            }
            if (data.iconMachineState && getIconMachineState().purchased.length === 0) {
                localStorage.setItem(ICON_MACHINE_KEY, JSON.stringify(data.iconMachineState));
                loadIconMachine();
            }
            if (typeof data.coins === 'number' && getCoins() === 0) {
                localStorage.setItem(COINS_KEY, String(data.coins));
                updateCoinStat();
            }
            updateAllStats();
            updateSettingsBackupStats();
        }
    } catch {
        // Fallback to local data if offline or server API isn't running
    }
}

async function saveProfileToServer(updates = {}) {
    const pid = ensurePlayerId();
    const username = updates.username !== undefined ? updates.username : getUsername();
    const pfpImage = updates.pfpImage !== undefined ? updates.pfpImage : getPfpImage();

    const payload = {
        playerId: pid,
        username,
        pfpImage,
        goals: getGoals(),
        demons: getDemons(),
        sessions: getSessions(),
        weaknesses: getWeaknesses(),
        top10Beaten: getTop10Beaten(),
        iconMachineState: getIconMachineState(),
        coins: getCoins(),
        questPoints: getQuestPoints(),
        darkMode: localStorage.getItem(DARK_MODE_KEY) === 'true'
    };

    try {
        await fetch('/api/profiles', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch {
        // Silently preserve local storage
    }
}

// Dark Mode Toggle
function initDarkMode() {
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function toggleDarkMode(isDark) {
    localStorage.setItem(DARK_MODE_KEY, String(isDark));
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Chatbot functionality
function loadChatHistory() {
    chatMessages = getStoredData(CHAT_HISTORY_KEY, []);
    renderChatMessages();
    updateChatSendButtonState();
}

function saveChatHistory() {
    saveStoredData(CHAT_HISTORY_KEY, chatMessages);
}

function formatChatMessageMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code blocks: ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    container.innerHTML = '';
    if (chatMessages.length === 0) {
        container.innerHTML = '<div class="chat-empty" id="chatEmpty">Start a conversation by asking a question below.</div>';
        return;
    }

    chatMessages.forEach(msg => {
        const div = document.createElement('div');
        const isUser = msg.role === 'user';
        div.className = `chat-message ${isUser ? 'user' : 'assistant'}`;
        div.innerHTML = `
            <div class="chat-message-label">${isUser ? '👤 You' : '🤖 GD Assistant'}</div>
            <div class="chat-message-content">${isUser ? escapeHtml(msg.content) : formatChatMessageMarkdown(msg.content)}</div>
        `;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

function updateChatSendButtonState() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    if (!input || !sendBtn) return;
    const hasText = Boolean(input.value.trim());
    sendBtn.disabled = !hasText || chatRequestPending;
}

function useQuickPrompt(promptText) {
    const input = document.getElementById('chatInput');
    if (!input) return;
    input.value = promptText;
    updateChatSendButtonState();
    sendChatMessage();
}

function showChatTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    hideChatTypingIndicator();
    const typingEl = document.createElement('div');
    typingEl.id = 'chatTypingIndicator';
    typingEl.className = 'chat-message assistant typing';
    typingEl.innerHTML = `
        <div class="chat-message-label">🤖 GD Assistant</div>
        <div class="chat-message-content">
            <span class="chat-loading">Thinking...</span>
        </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
}

function hideChatTypingIndicator() {
    const typingEl = document.getElementById('chatTypingIndicator');
    if (typingEl) typingEl.remove();
}

function getLocalGdChatbotReply(userQuery) {
    const q = userQuery.toLowerCase();
    
    if (q.includes('top 1') || q.includes('hardest demon') || q.includes('pointercrate')) {
        return "🏆 **Pointercrate Demon List Top 1:**\nCurrently, **Tidal Wave** by OniLink (verified by Trick) or **Acheron** / **Avernus** / **Slaughterhouse** top the Demon List as the hardest rated Extreme Demons in Geometry Dash!";
    }
    if (q.includes('bloodlust') || q.includes('cataclysm') || q.includes('bloodbath')) {
        return "👹 **Classic Extreme Demons:**\n- **Cataclysm** by GBOY: The pioneer of Extreme Demons.\n- **Bloodbath** by Riot & More: The iconic mega-collab that defined GD history.\n- **Bloodlust** by Knobbelboy: The massive, buffed extension of Bloodbath!";
    }
    if (q.includes('2.2') || q.includes('update') || q.includes('swing')) {
        return "⚡ **Geometry Dash 2.2 Features:**\n- **New Game Mode:** Swing Copter!\n- **Platformer Mode:** Play custom platformer levels with checkpoints.\n- **New Shop & Secret Rooms:** Mechanics, Music Library, and 2.2 Editor Triggers (Camera, Reverse, Teleport, Shader FX).";
    }
    if (q.includes('practice') || q.includes('checkpoint') || q.includes('beat') || q.includes('tip')) {
        return "🏋️ **Demon Slaying & Practice Tips:**\n1. **Use Startpos / Practice Mode:** Place checkpoints to master difficult transitions (especially 60-100%).\n2. **Break it into runs:** Do 50-100%, 30-70%, and 0-50% before full attempts.\n3. **Consistency over grinding:** Take breaks when frustrated to prevent nerve control fails!";
    }
    if (q.includes('icon') || q.includes('coin') || q.includes('store')) {
        return "🎨 **GD Icon Machine & Coins:**\nEarn GD Coins in this tracker by beating Demons and completing Daily Quests! Use your coins in the **GD Icon Machine** page to buy, rename, and showcase custom icons.";
    }

    return `🎮 **Geometry Dash Assistant:**\nThat's a great question about *"${userQuery}"*! As a GD Tracker companion, I can help you track your goals, analyze demon difficulties, optimize practice runs, and manage your progress. Keep grinding and slaying those demons! 🚀`;
}

async function sendChatMessage() {
    if (chatRequestPending) return;
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const errorEl = document.getElementById('chatError');

    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (errorEl) errorEl.textContent = '';

    chatMessages.push({ role: 'user', content: text });
    if (chatMessages.length > CHAT_MAX_MESSAGES) {
        chatMessages = chatMessages.slice(-CHAT_MAX_MESSAGES);
    }
    saveChatHistory();
    renderChatMessages();

    input.value = '';
    chatRequestPending = true;
    updateChatSendButtonState();
    showChatTypingIndicator();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chatMessages })
        });
        hideChatTypingIndicator();

        let replyText = '';
        if (res.ok) {
            const data = await res.json();
            replyText = data.reply;
        } else {
            // Local GD knowledge fallback if server API is unconfigured or offline
            replyText = getLocalGdChatbotReply(text);
        }

        chatMessages.push({ role: 'assistant', content: replyText });
        if (chatMessages.length > CHAT_MAX_MESSAGES) {
            chatMessages = chatMessages.slice(-CHAT_MAX_MESSAGES);
        }
        saveChatHistory();
        renderChatMessages();
    } catch (err) {
        hideChatTypingIndicator();
        // Smart fallback on network error
        const replyText = getLocalGdChatbotReply(text);
        chatMessages.push({ role: 'assistant', content: replyText });
        saveChatHistory();
        renderChatMessages();
    } finally {
        chatRequestPending = false;
        updateChatSendButtonState();
    }
}

function clearChat() {
    chatMessages = [];
    saveChatHistory();
    renderChatMessages();
    updateChatSendButtonState();
    const errorEl = document.getElementById('chatError');
    if (errorEl) errorEl.textContent = '';
}

// TIER SYSTEM IMPLEMENTATION
const TIER_DEFINITIONS = [
    {
        name: 'Admins & Owners',
        emoji: '🔐',
        color: '#8B5CF6',
        isCodeLocked: true,
        unlockCode: ADMIN_OWNER_UNLOCK_CODE,
        requirements: {
            minDemonsBeaten: 100,
            extremeDemonsBeaten: 20,
            insaneDemonsBeaten: 40,
            minTotalPracticeTime: 9000,
            description: 'Admins & Owners only. Unlock with a private code.'
        }
    },
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

function isAdminOwnerTierUnlocked() {
    return localStorage.getItem(ADMIN_OWNER_UNLOCKED_KEY) === 'true';
}

function isAdminOwnerTierDeleted() {
    return localStorage.getItem(ADMIN_OWNER_DELETED_KEY) === 'true';
}

function getEffectiveTierDefinitions() {
    if (isAdminOwnerTierDeleted()) {
        return TIER_DEFINITIONS.filter(tier => tier.name !== 'Admins & Owners');
    }
    return TIER_DEFINITIONS;
}

function getUnlockedTierDefinitions() {
    const visible = getEffectiveTierDefinitions();
    if (isAdminOwnerTierUnlocked()) {
        return visible;
    }
    return visible.filter(tier => tier.name !== 'Admins & Owners');
}

function syncAdminOwnerControls() {
    const deleteBtn = document.getElementById('deleteAdminOwnerBtn');
    const unlockBtn = document.getElementById('unlockAdminOwnerBtn');
    const codeInput = document.getElementById('adminOwnerCodeInput');

    const deleted = isAdminOwnerTierDeleted();
    const unlocked = isAdminOwnerTierUnlocked();

    if (deleteBtn) deleteBtn.disabled = deleted || !unlocked;
    if (unlockBtn) unlockBtn.disabled = unlocked;
    if (codeInput) codeInput.disabled = unlocked;
}

function deleteAdminOwnerTier() {
    const messageEl = document.getElementById('tierUnlockMessage');

    if (!isAdminOwnerTierUnlocked() || isAdminOwnerTierDeleted()) {
        if (messageEl) {
            messageEl.textContent = 'Admins & Owners rank is not unlocked, so it cannot be deleted.';
            messageEl.className = 'settings-message error-message';
        }
        syncAdminOwnerControls();
        return;
    }

    openConfirmModal('Are you sure you want to delete the Admins & Owners rank?', 'Delete Admins & Owners rank', () => {
        localStorage.setItem(ADMIN_OWNER_DELETED_KEY, 'true');
        localStorage.removeItem(ADMIN_OWNER_UNLOCKED_KEY);

        if (messageEl) {
            messageEl.textContent = 'Admins & Owners rank deleted.';
            messageEl.className = 'settings-message error-message';
        }

        const codeInput = document.getElementById('adminOwnerCodeInput');
        if (codeInput) codeInput.value = '';

        syncAdminOwnerControls();
        renderTierDisplay();
        renderTierRankDisplay();
    }, 'Delete rank');
}

function unlockAdminOwnerTier() {
    const codeInput = document.getElementById('adminOwnerCodeInput');
    const messageEl = document.getElementById('tierUnlockMessage');
    const enteredCode = codeInput ? codeInput.value.trim() : '';

    if (enteredCode === ADMIN_OWNER_UNLOCK_CODE) {
        localStorage.setItem(ADMIN_OWNER_UNLOCKED_KEY, 'true');
        localStorage.setItem(ADMIN_OWNER_DELETED_KEY, 'false');
        if (messageEl) {
            messageEl.textContent = 'Admins & Owners tier unlocked.';
            messageEl.className = 'settings-message success-message';
        }
        syncAdminOwnerControls();
        renderTierDisplay();
        renderTierRankDisplay();
        return true;
    }

    if (messageEl) {
        messageEl.textContent = 'Incorrect code. The Admins & Owners tier is restricted.';
        messageEl.className = 'settings-message error-message';
    }

    return false;
}

function calculatePlayerTier() {
    const demons = getDemons();
    const sessions = getSessions();
    const grouped = groupDemonsByDifficulty(demons);
    
    const totalDemonsBeaten = demons.length;
    const extremeDemonsBeaten = grouped['Extreme'].length;
    const insaneDemonsBeaten = grouped['Insane'].length;
    
    let totalPracticeTime = 0;
    sessions.forEach(session => {
        totalPracticeTime += session.minutes;
    });

    const metrics = {
        totalDemonsBeaten,
        extremeDemonsBeaten,
        insaneDemonsBeaten,
        hardDemonsBeaten: grouped['Hard'].length,
        mediumDemonsBeaten: grouped['Medium'].length,
        easyDemonsBeaten: grouped['Easy'].length,
        totalPracticeTime
    };

    if (isAdminOwnerTierUnlocked()) {
        return {
            tier: TIER_DEFINITIONS[0],
            metrics
        };
    }

    const effectiveTiers = getUnlockedTierDefinitions();
    
    for (let tierDef of effectiveTiers) {
        const req = tierDef.requirements;
        const meetsRequirements = 
            totalDemonsBeaten >= req.minDemonsBeaten &&
            extremeDemonsBeaten >= req.extremeDemonsBeaten &&
            insaneDemonsBeaten >= req.insaneDemonsBeaten &&
            totalPracticeTime >= req.minTotalPracticeTime;
        
        if (meetsRequirements) {
            return {
                tier: tierDef,
                metrics
            };
        }
    }
    
    return {
        tier: effectiveTiers[effectiveTiers.length - 1] || TIER_DEFINITIONS[TIER_DEFINITIONS.length - 1],
        metrics
    };
}

function getTierProgress() {
    const currentTierInfo = calculatePlayerTier();
    const effectiveTiers = getUnlockedTierDefinitions();
    const currentTierIndex = effectiveTiers.findIndex(t => t.name === currentTierInfo.tier.name);

    if (isAdminOwnerTierUnlocked() && currentTierInfo.tier.name === 'Admins & Owners') {
        return {
            currentTier: currentTierInfo.tier,
            nextTier: null,
            progressPercent: 100,
            metricsToNext: null
        };
    }
    
    const demons = getDemons();
    const sessions = getSessions();
    const grouped = groupDemonsByDifficulty(demons);
    
    let totalPracticeTime = 0;
    sessions.forEach(session => {
        totalPracticeTime += session.minutes;
    });
    
    if (currentTierIndex === 0) {
        return {
            currentTier: currentTierInfo.tier,
            nextTier: null,
            progressPercent: 100,
            metricsToNext: null
        };
    }
    
    const nextTierIndex = currentTierIndex - 1;
    const nextTier = effectiveTiers[nextTierIndex];
    const nextReq = nextTier.requirements;
    
    const totalDemonsBeaten = demons.length;
    const extremeDemonsBeaten = grouped['Extreme'].length;
    const insaneDemonsBeaten = grouped['Insane'].length;
    
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
    
    const isAdminOwnerUnlocked = isAdminOwnerTierUnlocked();
    const isAdminOwnerRank = tier.name === 'Admins & Owners';
    const currentTierLabel = isAdminOwnerRank && isAdminOwnerUnlocked
        ? 'Admins & Owners Rank'
        : `${tier.name} Rank`;

    tierContainer.innerHTML = `
        <div class="tier-display ${isAdminOwnerRank && isAdminOwnerUnlocked ? 'admin-owner-tier' : ''}" style="border-color: ${tier.color}">
            <div class="tier-header">
                <div class="tier-icon">${tier.emoji}</div>
                <div>
                    <div class="tier-card-title">Current Rank</div>
                    <div class="tier-name" style="color: ${tier.color}">${currentTierLabel}</div>
                    ${isAdminOwnerUnlocked && isAdminOwnerRank ? `<div class="tier-current-status"><span aria-hidden="true">✓</span> You are here</div>` : ''}
                </div>
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

    syncAdminOwnerControls();
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
    
    const effectiveTiers = getEffectiveTierDefinitions();
    const reversedTiers = [...effectiveTiers].reverse();
    
    reversedTiers.forEach((tier) => {
        const isCurrentTier = tier.name === currentTierName;
        const isAdminOwner = tier.name === 'Admins & Owners';
        const isLocked = isAdminOwner && !isAdminOwnerTierUnlocked();
        const isUnlocked = isAdminOwner && isAdminOwnerTierUnlocked();
        
        rankHTML += `
            <div class="tier-rank-item ${isCurrentTier ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isUnlocked ? 'unlocked-owner-tier' : ''}" title="${tier.name}: ${tier.description}">
                <div class="rank-icon">${tier.emoji}</div>
                <div class="rank-name">${tier.name}</div>
                ${isLocked ? '<div class="rank-badge locked-badge">Locked</div>' : ''}
                ${isUnlocked ? '<div class="rank-badge unlocked-badge">UNLOCKED</div>' : ''}
                ${isCurrentTier ? '<div class="rank-badge">✓ YOU ARE HERE</div>' : ''}
            </div>
        `;
    });
    
    rankHTML += '</div></div>';
    rankContainer.innerHTML = rankHTML;
}
