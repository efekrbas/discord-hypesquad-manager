class DiscordHypeSquadManager {
    constructor() {
        this.selectedHouse = null;
        this.token = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSavedSession();
        this.loadSavedToken();
    }

    bindEvents() {
        // Badge selection
        document.querySelectorAll('.badge-option').forEach(option => {
            option.addEventListener('click', this.selectBadge.bind(this));
        });

        // Action buttons
        document.getElementById('setBadge').addEventListener('click', this.setBadge.bind(this));
        document.getElementById('removeBadge').addEventListener('click', this.removeBadge.bind(this));

        // Manual Token Input
        const tokenInput = document.getElementById('token');
        const toggleBtn = document.getElementById('toggleToken');

        if (tokenInput) {
            tokenInput.addEventListener('input', this.onTokenChange.bind(this));
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleTokenVisibility.bind(this));
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', this.logout.bind(this));

        // Check if Electron API is available
        if (window.electronAPI) {
            console.log('Electron API handled via invoke/promise pattern');
        } else {
            console.warn('Electron API not found. Auto-login will not work.');
        }
    }

    checkSavedSession() {
        const savedToken = localStorage.getItem('discord_token');
        if (savedToken) {
            this.token = this.sanitizeToken(savedToken);
            this.fetchUserProfile();
        }
    }

    async loginWithDiscord() {
        if (!window.electronAPI) return;

        this.showLoading(true);
        try {
            const token = await window.electronAPI.loginWithDiscord();
            if (token) {
                const sanitized = this.sanitizeToken(token);
                this.token = sanitized;
                localStorage.setItem('discord_token', sanitized);
                await this.fetchUserProfile();
                this.showStatus('✅ Logged in successfully!', 'success');
            } else {
                this.showStatus('❌ Login cancelled or failed.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus('❌ Login error occurred.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchUserProfile() {
        if (!this.token) return;

        try {
            const response = await fetch('https://discord.com/api/v9/users/@me', {
                headers: {
                    'Authorization': this.token
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.updateProfileUI(user);
                this.updateSetButtonState();
            } else {
                // If token is invalid, clear it
                this.logout();
                this.showStatus('❌ Session expired. Please login again.', 'error');
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            // Don't logout on network error, just show error
            this.showStatus('❌ Could not fetch profile.', 'error');
        }
    }

    updateProfileUI(user) {
        // Hide login, show profile
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('profileSection').classList.remove('hidden');

        // Update profile info
        const usernameEl = document.getElementById('username');
        usernameEl.innerHTML = ''; // Clear previous content

        // Create name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.username;
        usernameEl.appendChild(nameSpan);

        // Check for HypeSquad Badge
        // Flags: Bravery=64, Brilliance=128, Balance=256
        const flags = user.flags || user.public_flags || 0;
        let badgeIcon = null;

        if (flags & 64) badgeIcon = 'hypesquadbravery.svg';
        else if (flags & 128) badgeIcon = 'hypesquadbrilliance.svg';
        else if (flags & 256) badgeIcon = 'hypesquadbalance.svg';

        if (badgeIcon) {
            const badgeImg = document.createElement('img');
            badgeImg.src = `images/${badgeIcon}`;
            badgeImg.className = 'current-badge-icon';
            badgeImg.title = 'Current HypeSquad Badge';
            usernameEl.appendChild(badgeImg);
        }

        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

        document.getElementById('userAvatar').src = avatarUrl;
    }

    async logout() {
        this.token = null;
        this.selectedHouse = null;
        localStorage.removeItem('discord_token');

        if (window.electronAPI) {
            await window.electronAPI.logout();
        }

        // Reset UI
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('profileSection').classList.add('hidden');

        // Clear selection
        document.querySelectorAll('.badge-option').forEach(option => {
            option.classList.remove('selected');
        });

        this.updateSetButtonState();
        this.showStatus('Logged out.', 'info');

        // Clear token input
        const tokenInput = document.getElementById('token');
        if (tokenInput) {
            tokenInput.value = '';
        }
    }

    // Load saved token if any
    loadSavedToken() {
        const savedToken = localStorage.getItem('discord_token');
        if (savedToken) {
            const sanitized = this.sanitizeToken(savedToken);
            const tokenInput = document.getElementById('token');
            if (tokenInput) tokenInput.value = sanitized;
            this.token = sanitized;
        }
    }

    toggleTokenVisibility() {
        const tokenInput = document.getElementById('token');
        const toggleBtn = document.getElementById('toggleToken');

        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            tokenInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    onTokenChange(event) {
        this.token = this.sanitizeToken(event.target.value);
        localStorage.setItem('discord_token', this.token);
        this.updateSetButtonState();
    }

    selectBadge(event) {
        // Clear previous selection
        document.querySelectorAll('.badge-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Mark new selection
        const selectedOption = event.currentTarget;
        selectedOption.classList.add('selected');
        this.selectedHouse = parseInt(selectedOption.dataset.house);

        this.updateSetButtonState();
    }

    updateSetButtonState() {
        const setBadgeBtn = document.getElementById('setBadge');
        setBadgeBtn.disabled = !(this.token && this.selectedHouse);
    }

    async setBadge() {
        if (!this.token || !this.selectedHouse) {
            this.showStatus('Token and badge selection are required!', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // In some environments there may be an offset in Discord API house IDs.
            // Map selection to ensure correct badge: 1->3, 2->1, 3->2
            const houseIdMap = { 1: 3, 2: 1, 3: 2 };
            const apiHouseId = houseIdMap[this.selectedHouse] || this.selectedHouse;

            const response = await fetch('https://discord.com/api/v9/hypesquad/online', {
                method: 'POST',
                headers: {
                    'Authorization': this.token,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    house_id: apiHouseId
                })
            });

            if (response.ok) {
                const houseName = this.getHouseName(this.selectedHouse);
                this.showStatus(`✅ ${houseName} badge added successfully!`, 'success');
                // Refresh profile to show new badge
                this.fetchUserProfile();
            } else if (response.status === 401) {
                this.showStatus('❌ Invalid token! Please check your token.', 'error');
            } else if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                this.showStatus(`⏳ Rate limited! Please wait ${retryAfter} seconds.`, 'error');
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showStatus(`❌ Error: ${errorData.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('API Error:', error);
            this.showStatus('❌ Connection error! Please check your internet.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async removeBadge() {
        if (!this.token) {
            this.showStatus('Token is required!', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('https://discord.com/api/v9/hypesquad/online', {
                method: 'DELETE',
                headers: {
                    'Authorization': this.token,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.ok || response.status === 204) {
                this.showStatus('✅ HypeSquad badge removed successfully!', 'success');
                // Clear selection
                document.querySelectorAll('.badge-option').forEach(option => {
                    option.classList.remove('selected');
                });
                this.selectedHouse = null;
                this.updateSetButtonState();
                // Refresh profile to show no badge
                this.fetchUserProfile();
            } else if (response.status === 401) {
                this.showStatus('❌ Invalid token! Please check your token.', 'error');
            } else if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                this.showStatus(`⏳ Rate limited! Please wait ${retryAfter} seconds.`, 'error');
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showStatus(`❌ Error: ${errorData.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('API Error:', error);
            this.showStatus('❌ Connection error! Please check your internet.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getHouseName(houseId) {
        const houses = {
            1: 'Balance (Green)',
            2: 'Bravery (Purple)',
            3: 'Brilliance (Red)'
        };
        return houses[houseId] || 'Unknown';
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;

        // Clear message after 5 seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        const buttons = document.querySelectorAll('.action-btn');

        if (show) {
            loadingElement.classList.remove('hidden');
            buttons.forEach(btn => btn.disabled = true);
        } else {
            loadingElement.classList.add('hidden');
            buttons.forEach(btn => btn.disabled = false);
            this.updateSetButtonState(); // Refresh set button state
        }
    }

    // Token format validation
    validateToken(token) {
        // Discord token format: 24 chars.6 chars.27 chars (base64)
        const tokenRegex = /^[A-Za-z0-9+/]{24}\.[A-Za-z0-9+/]{6}\.[A-Za-z0-9+/\-_]{27}$/;
        return tokenRegex.test(token);
    }

    // Accept tokens wrapped in quotes (single or double)
    sanitizeToken(raw) {
        if (!raw) return '';
        let token = String(raw).trim();
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            token = token.slice(1, -1).trim();
        }
        return token;
    }
}

// Uygulama başlatma
document.addEventListener('DOMContentLoaded', () => {
    new DiscordHypeSquadManager();

    // Show info message when page loads
    setTimeout(() => {
        const statusElement = document.getElementById('status');
        statusElement.textContent = '💡 Enter your Discord token and choose the badge you want.';
        statusElement.className = 'status-message info';
    }, 1000);
});

// Security warning

