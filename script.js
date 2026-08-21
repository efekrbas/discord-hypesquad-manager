class DiscordHypeSquadManager {
    constructor() {
        this.selectedHouse = null;
        this.token = null;
        this.currentUserFlags = 0;
        this.legacyBadgeEquipped = undefined;
        this.legacyEligible = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSavedSession();
        this.playIntroAnimation();
    }

    async saveTokenData(token) {
        if (window.electronAPI) {
            await window.electronAPI.saveToken(token);
        } else {
            localStorage.setItem('discord_token', token);
        }
    }

    async loadTokenData() {
        if (window.electronAPI) {
            return await window.electronAPI.getToken();
        } else {
            return localStorage.getItem('discord_token');
        }
    }

    async deleteTokenData() {
        if (window.electronAPI) {
            await window.electronAPI.deleteToken();
        } else {
            localStorage.removeItem('discord_token');
        }
    }

    async makeRequest(url, options) {
        if (window.electronAPI && window.electronAPI.discordRequest) {
            const response = await window.electronAPI.discordRequest(url, options);
            return {
                ok: response.ok,
                status: response.status,
                json: async () => response.data
            };
        } else {
            try {
                return await fetch(url, options);
            } catch (error) {
                if (error instanceof TypeError) {
                    throw new Error("Browser blocked this request (CORS).");
                }
                throw error;
            }
        }
    }

    playIntroAnimation() {
        // Initial page load animation using GSAP - snappy and instant
        if (typeof gsap !== 'undefined') {
            const tl = gsap.timeline();
            tl.fromTo('.glass-panel', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", clearProps: "transform" })
                .fromTo('.gs-reveal', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.05, ease: "power2.out", clearProps: "transform" }, "-=0.2");

            // Add 3D tilt effect on cards based on mouse move
            document.querySelectorAll('.badge-option').forEach(card => {
                // Force GSAP to cache transform values as 0/1 so it never reads and compounds the CSS translate/scale properties.
                gsap.set(card, { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 });

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -10;
                    const rotateY = ((x - centerX) / centerX) * 10;

                    gsap.to(card, {
                        x: 0,
                        y: 0,
                        scale: 1,
                        rotateX: rotateX,
                        rotateY: rotateY,
                        duration: 0.3,
                        ease: "power1.out"
                    });
                });

                card.addEventListener('mouseleave', () => {
                    gsap.to(card, {
                        x: 0,
                        y: 0,
                        scale: 1,
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
            if (e.target.id === 'helpModal') e.target.classList.remove('show');
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
                await this.saveTokenData(this.token);
                this.updateSetButtonState();
                await this.fetchUserProfile();
            } else {
                this.showStatus('Login cancelled or failed.', 'error');
            }
        } catch (error) {
            console.error('Electron login error:', error);
            this.showStatus('An error occurred during login.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async checkSavedSession() {
        const savedToken = await this.loadTokenData();
        if (savedToken) {
            this.token = this.sanitizeToken(savedToken);
            const tokenInput = document.getElementById('token');
            if (tokenInput) tokenInput.value = this.token;
            this.fetchUserProfile(true);
        }
    }

    async fetchUserProfile(silent = false) {
        if (!silent) {
            this.showStatus('Loading profile...', 'info');
        }

        try {
            // Initiate requests in parallel for maximum speed
            const mePromise = this.makeRequest(`https://discord.com/api/v9/users/@me?_=${Date.now()}`, {
                headers: { 'Authorization': this.token }
            });
            const settingsPromise = this.makeRequest('https://discord.com/api/v9/users/@me/settings-proto/1', {
                headers: { 'Authorization': this.token }
            }).catch(() => ({ ok: false }));

            const response = await mePromise;

            if (response.ok) {
                const user = await response.json();

                // Fetch public profile in parallel with settings decoding
                const profilePromise = this.makeRequest(`https://discord.com/api/v9/users/${user.id}/profile?_=${Date.now()}`, {
                    headers: { 'Authorization': this.token }
                }).catch(() => ({ ok: false }));

                const [settingsResponse, profileRes] = await Promise.all([settingsPromise, profilePromise]);

                if (settingsResponse.ok) {
                    try {
                        const settingsData = await settingsResponse.json();
                        if (settingsData && settingsData.settings) {
                            const binaryString = atob(settingsData.settings);
                            let hexString = '';
                            for (let i = 0; i < binaryString.length; i++) {
                                hexString += binaryString.charCodeAt(i).toString(16).padStart(2, '0');
                            }
                            // b201020801 means legacy badge is explicitly hidden
                            this.legacyBadgeEquipped = !hexString.includes('b201020801');
                        } else {
                            this.legacyBadgeEquipped = true;
                        }
                    } catch (e) {
                        this.legacyBadgeEquipped = false;
                    }
                }

                if (profileRes.ok) {
                    try {
                        const profileData = await profileRes.json();
                        const badges = profileData.badges || [];
                        const hasLegacyBadge = badges.some(b => (b.id || '').includes('legacy_username'));
                        const hasLegacyUsername = Boolean(profileData.legacy_username || (profileData.user && profileData.user.legacy_username));

                        if (hasLegacyBadge || hasLegacyUsername) {
                            this.legacyEligible = true;
                        }
                    } catch (e) {}
                }

                if (!this.legacyEligible) {
                    this.legacyBadgeEquipped = false;
                }

                // Extract HypeSquad house directly from user flags (authoritative real-time data)
                const mergedFlags = (user.flags || 0) | (user.public_flags || 0);
                this.currentUserFlags = mergedFlags;
                user.merged_flags = mergedFlags;

                this.updateLegacyCardVisibility();
                this.updateProfileUI(user);
                this.updateSetButtonState();
                this.hideStatus();
            } else {
                // Only clear token if we already had a valid session previously, otherwise just show error
                const tokenInput = document.getElementById('token');
                const isTyping = tokenInput && tokenInput.value.length > 0 && document.activeElement === tokenInput;
                
                if (!isTyping) {
                    this.logout();
                } else {
                    this.token = null;
                    await this.deleteTokenData();
                    this.updateSetButtonState();
                }
                this.showStatus('Invalid token or session expired.', 'error');
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            this.showStatus('Could not fetch profile.', 'error');
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
                        { opacity: 0, y: 20, height: 0 },
                        { opacity: 1, y: 0, height: 'auto', duration: 0.5, ease: "back.out(1.5)", clearProps: "height" }
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

        const flags = user.merged_flags !== undefined ? user.merged_flags : ((user.flags || 0) | (user.public_flags || 0));
        let badgeIcon = null;

        if (flags & 256) badgeIcon = 'hypesquadbalance.svg';
        else if (flags & 128) badgeIcon = 'hypesquadbrilliance.svg';
        else if (flags & 64) badgeIcon = 'hypesquadbravery.svg';

        if (badgeIcon) {
            const badgeImg = document.createElement('img');
            badgeImg.src = `images/${badgeIcon}`;
            badgeImg.className = 'current-badge-icon';
            badgeImg.title = 'Current HypeSquad Badge';
            usernameEl.appendChild(badgeImg);
        }

        if (this.legacyBadgeEquipped) {
            const legacyBadgeImg = document.createElement('img');
            legacyBadgeImg.src = `images/legacy.svg`;
            legacyBadgeImg.className = 'current-badge-icon legacy';
            legacyBadgeImg.title = 'Legacy Username Badge';
            legacyBadgeImg.style.width = '28px';
            legacyBadgeImg.style.height = '28px';
            legacyBadgeImg.style.marginLeft = '-10px'; // Counteract flex gap and SVG padding
            legacyBadgeImg.style.marginTop = '-1px'; // Fine-tune vertical alignment
            usernameEl.appendChild(legacyBadgeImg);
        }

        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

        document.getElementById('userAvatar').src = avatarUrl;

        // Auto-select behavior has been disabled per user request
        // The user will start with no house selected by default.
        this.updateLegacyCardVisibility();
    }

    async logout() {
        this.token = null;
        this.selectedHouse = null;
        this.currentUserFlags = 0;
        this.legacyBadgeEquipped = undefined;
        this.legacyEligible = false;
        await this.deleteTokenData();
        this.updateLegacyCardVisibility();

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
                        { opacity: 1, height: 'auto', duration: 0.4, ease: "power2.out", clearProps: "height" }
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

    async loadSavedToken() {
        const savedToken = await this.loadTokenData();
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

    async onTokenChange(event) {
        this.token = this.sanitizeToken(event.target.value);
        await this.saveTokenData(this.token);
        this.updateSetButtonState();

        // Auto login when pasting a token
        if (this.tokenTimeout) clearTimeout(this.tokenTimeout);
        this.tokenTimeout = setTimeout(() => {
            if (this.token && this.token.length > 50) {
                this.fetchUserProfile();
            }
        }, 100);
    }

    selectBadge(event) {
        const selectedOption = event.currentTarget;
        
        // If clicking the currently selected badge, deselect it
        if (selectedOption.classList.contains('selected')) {
            selectedOption.classList.remove('selected');
            this.selectedHouse = null;
            this.updateSetButtonState();
            return;
        }

        // Animate deselect
        document.querySelectorAll('.badge-option.selected').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selection
        selectedOption.classList.add('selected');
        const houseVal = selectedOption.dataset.house;
        this.selectedHouse = houseVal === 'legacy' ? 'legacy' : parseInt(houseVal);

        // Add pop animation via GSAP
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(selectedOption.querySelector('img'),
                { scale: 0.8 },
                { scale: 1.1, duration: 0.4, ease: "back.out(2)" }
            );
        }

        this.updateSetButtonState();
    }

    updateLegacyCardVisibility() {
        const legacyCard = document.querySelector('.badge-option[data-house="legacy"]');
        if (!legacyCard) return;

        if (this.legacyEligible) {
            legacyCard.style.display = '';
            legacyCard.style.opacity = '1';
            legacyCard.style.pointerEvents = '';
            legacyCard.title = '';
        } else {
            legacyCard.style.display = 'none';
            // If legacy was selected, deselect it
            if (this.selectedHouse === 'legacy') {
                legacyCard.classList.remove('selected');
                this.selectedHouse = null;
                this.updateSetButtonState();
            }
        }
    }

    updateSetButtonState() {
        const setBadgeBtn = document.getElementById('setBadge');
        if (setBadgeBtn) {
            setBadgeBtn.disabled = !(this.token && this.selectedHouse);
        }
        const removeBadgeBtn = document.getElementById('removeBadge');
        if (removeBadgeBtn) {
            removeBadgeBtn.disabled = !this.token;
        }
    }

    async setBadge() {
        if (!this.token || !this.selectedHouse) {
            this.showStatus('Token and badge selection are required!', 'error');
            return;
        }

        this.showLoading(true);

        try {
            if (this.selectedHouse === 'legacy') {
                const base64 = 'QgWyAQIIAA=='; // Pre-computed protobuf payload for showing badge

                const response = await this.makeRequest('https://discord.com/api/v9/users/@me/settings-proto/1', {
                    method: 'PATCH',
                    headers: { 'Authorization': this.token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: base64 })
                });

                if (response.ok || response.status === 204) {
                    this.showStatus('Legacy badge equipped successfully!', 'success');
                    this.legacyBadgeEquipped = true;
                    await this.fetchUserProfile(true);
                } else if (response.status === 401) {
                    this.showStatus('Invalid token! Please check your token.', 'error');
                } else if (response.status === 429) {
                    const data = await response.json().catch(() => ({}));
                    const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                    this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    this.showStatus(`Error equipping legacy badge: ${errorData.message || 'Unknown error'}`, 'error');
                }
            } else {
                const houseIdMap = { 1: 3, 2: 1, 3: 2 };
                const apiHouseId = houseIdMap[this.selectedHouse] || this.selectedHouse;

                const response = await this.makeRequest('https://discord.com/api/v9/hypesquad/online', {
                    method: 'POST',
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        house_id: apiHouseId
                    })
                });

                if (response.ok || response.status === 204) {
                    const houseName = this.getHouseName(this.selectedHouse);
                    this.showStatus(`${houseName} badge added successfully!`, 'success');
                    await this.fetchUserProfile(true);
                } else if (response.status === 401) {
                    this.showStatus('Invalid token! Please check your token.', 'error');
                } else if (response.status === 429) {
                    const data = await response.json().catch(() => ({}));
                    const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                    this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    this.showStatus(`Error: ${errorData.message || 'Unknown error'}`, 'error');
                }
            }
        } catch (error) {
            console.error('API Error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
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
            // Case 1: Legacy badge explicitly selected
            if (this.selectedHouse === 'legacy') {
                const base64 = 'QgWyAQIIAQ=='; // Protobuf payload for hiding legacy badge
                const response = await this.makeRequest('https://discord.com/api/v9/users/@me/settings-proto/1', {
                    method: 'PATCH',
                    headers: { 'Authorization': this.token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: base64 })
                });

                if (response.ok || response.status === 204) {
                    this.legacyBadgeEquipped = false;
                    this.showStatus('Legacy badge hidden successfully!', 'success');
                    document.querySelectorAll('.badge-option').forEach(option => {
                        option.classList.remove('selected');
                    });
                    this.selectedHouse = null;
                    this.updateSetButtonState();
                    await this.fetchUserProfile(true);
                } else if (response.status === 401) {
                    this.showStatus('Invalid token! Please check your token.', 'error');
                } else if (response.status === 429) {
                    const data = await response.json().catch(() => ({}));
                    const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                    this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    this.showStatus(`Error hiding legacy badge: ${errorData.message || 'Unknown error'}`, 'error');
                }
                return;
            }

            // Case 2: HypeSquad house explicitly selected (1, 2, or 3)
            if (this.selectedHouse !== null) {
                const response = await this.makeRequest('https://discord.com/api/v9/hypesquad/online', {
                    method: 'DELETE',
                    headers: { 'Authorization': this.token }
                });

                if (response.ok || response.status === 204) {
                    this.showStatus('HypeSquad badge removed successfully!', 'success');
                    document.querySelectorAll('.badge-option').forEach(option => {
                        option.classList.remove('selected');
                    });
                    this.selectedHouse = null;
                    this.updateSetButtonState();
                    await this.fetchUserProfile(true);
                } else if (response.status === 401) {
                    this.showStatus('Invalid token! Please check your token.', 'error');
                } else if (response.status === 429) {
                    const data = await response.json().catch(() => ({}));
                    const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                    this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
                } else if (response.status === 500) {
                    this.showStatus('Discord no longer allows removing HypeSquad badges (Discord 500 Server Error). You can switch between houses instead.', 'error');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    this.showStatus(`Error removing HypeSquad badge: ${errorData.message || 'Unknown error'}`, 'error');
                }
                return;
            }

            // Case 3: No badge card selected - determine by current user profile
            const hasHypeBadge = (this.currentUserFlags & (64 | 128 | 256)) !== 0;
            const hasLegacyBadge = this.legacyBadgeEquipped === true;

            // If user only has legacy badge and no hypesquad badge, hide legacy badge
            if (!hasHypeBadge && hasLegacyBadge) {
                const base64 = 'QgWyAQIIAQ==';
                const response = await this.makeRequest('https://discord.com/api/v9/users/@me/settings-proto/1', {
                    method: 'PATCH',
                    headers: { 'Authorization': this.token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: base64 })
                });

                if (response.ok || response.status === 204) {
                    this.legacyBadgeEquipped = false;
                    this.showStatus('Legacy badge hidden successfully!', 'success');
                    document.querySelectorAll('.badge-option').forEach(option => {
                        option.classList.remove('selected');
                    });
                    this.selectedHouse = null;
                    this.updateSetButtonState();
                    await this.fetchUserProfile(true);
                } else if (response.status === 401) {
                    this.showStatus('Invalid token! Please check your token.', 'error');
                } else if (response.status === 429) {
                    const data = await response.json().catch(() => ({}));
                    const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                    this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    this.showStatus(`Error hiding legacy badge: ${errorData.message || 'Unknown error'}`, 'error');
                }
                return;
            }

            // Otherwise, remove HypeSquad badge
            const response = await this.makeRequest('https://discord.com/api/v9/hypesquad/online', {
                method: 'DELETE',
                headers: { 'Authorization': this.token }
            });

            if (response.ok || response.status === 204) {
                this.showStatus('HypeSquad badge removed successfully!', 'success');
                document.querySelectorAll('.badge-option').forEach(option => {
                    option.classList.remove('selected');
                });
                this.selectedHouse = null;
                this.updateSetButtonState();
                await this.fetchUserProfile(true);
            } else if (response.status === 401) {
                this.showStatus('Invalid token! Please check your token.', 'error');
            } else if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                const retryAfter = data.retry_after ? Math.ceil(data.retry_after) : 'few';
                this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
            } else if (response.status === 500) {
                this.showStatus('Discord no longer allows removing HypeSquad badges (Discord 500 Server Error). You can switch between houses instead.', 'error');
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showStatus(`Error removing badge: ${errorData.message || 'Unknown error'}`, 'error');
            }

        } catch (error) {
            console.error('API Error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
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
                if (!statusElement.classList.contains('show')) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, 300); // Wait for fade out
        }, 5000);
    }

    hideStatus() {
        const statusElement = document.getElementById('status');
        if (!statusElement) return;

        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        
        statusElement.classList.remove('show');
        setTimeout(() => {
            if (!statusElement.classList.contains('show')) {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }
        }, 300);
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
    // Detect if running in Electron
    if (navigator.userAgent.includes('Electron')) {
        document.body.classList.add('electron-app');
    }

    new DiscordHypeSquadManager();

    setTimeout(() => {
        const statusElement = document.getElementById('status');
        if (!statusElement.textContent) {
            statusElement.textContent = '💡 Enter your Discord token to begin.';
            statusElement.className = 'status-message info show';

            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 6000);
        }
    }, 1500);
});
