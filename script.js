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
        this.playIntroAnimation();
    }

    playIntroAnimation() {
        // Initial page load animation using GSAP
        if (typeof gsap !== 'undefined') {
            const tl = gsap.timeline();
            tl.fromTo('.glass-panel', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", clearProps: "transform" })
              .fromTo('.gs-reveal', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power2.out", clearProps: "transform" }, "-=0.4");
            
            // Add 3D tilt effect on cards based on mouse move
            document.querySelectorAll('.badge-option').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = ((y - centerY) / centerY) * -10;
                    const rotateY = ((x - centerX) / centerX) * 10;
                    
                    gsap.to(card, {
                        rotateX: rotateX,
                        rotateY: rotateY,
                        duration: 0.3,
                        ease: "power1.out"
                    });
                });
                
                card.addEventListener('mouseleave', () => {
                    gsap.to(card, {
                        rotateX: 0,
                        rotateY: 0,
                        duration: 0.5,
                        ease: "elastic.out(1, 0.5)"
                    });
                });
            });
        }
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
        const helpBtn = document.getElementById('helpTokenBtn');

        if (tokenInput) {
            tokenInput.addEventListener('input', this.onTokenChange.bind(this));
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleTokenVisibility.bind(this));
        }
        
        // Help Modal Events
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                document.getElementById('helpModal').classList.add('show');
            });
        }
        
        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('show');
        });
        
        document.getElementById('helpModal')?.addEventListener('click', (e) => {
            if(e.target.id === 'helpModal') e.target.classList.remove('show');
        });

        // Modal Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById('tab-' + e.target.dataset.tab).classList.add('active');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', this.logout.bind(this));

        const electronLoginContainer = document.getElementById('electronLoginContainer');
        const webTokenContainer = document.getElementById('webTokenContainer');
        const electronLoginBtn = document.getElementById('electronLoginBtn');

        if (window.electronAPI) {
            console.log('Electron API detected. Enabling Discord Login.');
            if (electronLoginContainer) electronLoginContainer.classList.remove('hidden');
            if (webTokenContainer) webTokenContainer.classList.add('hidden');
            
            // Hide Download App button in Desktop App
            const downloadBtn = document.querySelector('.download-app-btn');
            if (downloadBtn) downloadBtn.classList.add('hidden');
            
            if (electronLoginBtn) {
                electronLoginBtn.addEventListener('click', this.loginWithElectron.bind(this));
            }
        } else {
            if (electronLoginContainer) electronLoginContainer.classList.add('hidden');
            if (webTokenContainer) webTokenContainer.classList.remove('hidden');
        }
    }

    async loginWithElectron() {
        this.showLoading(true);
        try {
            const token = await window.electronAPI.loginWithDiscord();
            if (token) {
                this.token = this.sanitizeToken(token);
                localStorage.setItem('discord_token', this.token);
                this.updateSetButtonState();
                await this.fetchUserProfile();
            } else {
                this.showStatus('❌ Login cancelled or failed.', 'error');
            }
        } catch (error) {
            console.error('Electron login error:', error);
            this.showStatus('❌ An error occurred during login.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    checkSavedSession() {
        const savedToken = localStorage.getItem('discord_token');
        if (savedToken) {
            this.token = this.sanitizeToken(savedToken);
            this.fetchUserProfile();
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
                this.logout();
                this.showStatus('❌ Session expired. Please login again.', 'error');
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            this.showStatus('❌ Could not fetch profile.', 'error');
        }
    }

    updateProfileUI(user) {
        // Animate transition using GSAP if available
        if (typeof gsap !== 'undefined') {
            gsap.to('#loginSection', {
                opacity: 0, height: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => {
                    document.getElementById('loginSection').classList.add('hidden');
                    
                    const profileSection = document.getElementById('profileSection');
                    profileSection.classList.remove('hidden');
                    gsap.fromTo(profileSection, 
                        { opacity: 0, y: 20 }, 
                        { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)" }
                    );
                }
            });
        } else {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('profileSection').classList.remove('hidden');
        }

        const usernameEl = document.getElementById('username');
        usernameEl.innerHTML = ''; 

        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.username;
        usernameEl.appendChild(nameSpan);

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

        if (typeof gsap !== 'undefined') {
            gsap.to('#profileSection', {
                opacity: 0, height: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => {
                    document.getElementById('profileSection').classList.add('hidden');
                    
                    const loginSection = document.getElementById('loginSection');
                    loginSection.classList.remove('hidden');
                    gsap.fromTo(loginSection, 
                        { opacity: 0, height: 0 }, 
                        { opacity: 1, height: 'auto', duration: 0.4, ease: "power2.out" }
                    );
                }
            });
        } else {
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('profileSection').classList.add('hidden');
        }

        document.querySelectorAll('.badge-option').forEach(option => {
            option.classList.remove('selected');
        });

        this.updateSetButtonState();
        this.showStatus('Logged out.', 'info');

        const tokenInput = document.getElementById('token');
        if (tokenInput) {
            tokenInput.value = '';
        }
    }

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
        
        // Simple SVG swap
        const eyeOpen = `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeClosed = `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.innerHTML = eyeClosed;
        } else {
            tokenInput.type = 'password';
            toggleBtn.innerHTML = eyeOpen;
        }
    }

    onTokenChange(event) {
        this.token = this.sanitizeToken(event.target.value);
        localStorage.setItem('discord_token', this.token);
        this.updateSetButtonState();
    }

    selectBadge(event) {
        // Animate deselect
        document.querySelectorAll('.badge-option.selected').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selection
        const selectedOption = event.currentTarget;
        selectedOption.classList.add('selected');
        this.selectedHouse = parseInt(selectedOption.dataset.house);

        // Add pop animation via GSAP
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(selectedOption.querySelector('img'), 
                { scale: 0.8 }, 
                { scale: 1.1, duration: 0.4, ease: "back.out(2)" }
            );
        }

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
                document.querySelectorAll('.badge-option').forEach(option => {
                    option.classList.remove('selected');
                });
                this.selectedHouse = null;
                this.updateSetButtonState();
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
        
        // Use classList for smoother transitions
        statusElement.className = `status-message ${type} show`;

        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        
        this.statusTimeout = setTimeout(() => {
            statusElement.classList.remove('show');
            setTimeout(() => {
                if(!statusElement.classList.contains('show')) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, 300); // Wait for fade out
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
            this.updateSetButtonState();
        }
    }

    validateToken(token) {
        const tokenRegex = /^[A-Za-z0-9+/]{24}\.[A-Za-z0-9+/]{6}\.[A-Za-z0-9+/\-_]{27}$/;
        return tokenRegex.test(token);
    }

    sanitizeToken(raw) {
        if (!raw) return '';
        let token = String(raw).trim();
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            token = token.slice(1, -1).trim();
        }
        return token;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DiscordHypeSquadManager();

    setTimeout(() => {
        const statusElement = document.getElementById('status');
        if(!statusElement.textContent) {
            statusElement.textContent = '💡 Enter your Discord token to begin.';
            statusElement.className = 'status-message info show';
            
            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 6000);
        }
    }, 1500);
});
