class DiscordHypeSquadManager {
    constructor() {
        this.selectedHouse = null;
        this.token = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedToken();
    }

    bindEvents() {
        // Token visibility toggle
        document.getElementById('toggleToken').addEventListener('click', this.toggleTokenVisibility.bind(this));
        
        // Token input change
        document.getElementById('token').addEventListener('input', this.onTokenChange.bind(this));
        
        // Badge selection
        document.querySelectorAll('.badge-option').forEach(option => {
            option.addEventListener('click', this.selectBadge.bind(this));
        });
        
        // Action buttons
        document.getElementById('setBadge').addEventListener('click', this.setBadge.bind(this));
        document.getElementById('removeBadge').addEventListener('click', this.removeBadge.bind(this));
    }

    loadSavedToken() {
        const savedToken = localStorage.getItem('discord_token');
        if (savedToken) {
            const sanitized = this.sanitizeToken(savedToken);
            document.getElementById('token').value = sanitized;
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
            } else if (response.status === 401) {
                this.showStatus('❌ Invalid token! Please check your token.', 'error');
            } else if (response.status === 429) {
                this.showStatus('⏳ Too many requests! Please wait a moment.', 'error');
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
            } else if (response.status === 401) {
                this.showStatus('❌ Invalid token! Please check your token.', 'error');
            } else if (response.status === 429) {
                this.showStatus('⏳ Too many requests! Please wait a moment.', 'error');
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
            1: 'Bravery (Green)',
            2: 'Brilliance (Purple)',
            3: 'Balance (Red)'
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
window.addEventListener('beforeunload', (event) => {
    const token = document.getElementById('token').value;
    if (token && !confirm('Your token will be stored in the browser. Do you want to continue?')) {
        event.preventDefault();
        event.returnValue = '';
    }
});
