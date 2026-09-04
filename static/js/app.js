/* ============================================================
   CARX STREET - CYBER HUD APPLICATION CONTROLLER
   State Management | REST API Hooks | Interactive Boosters
   Dedicated Admin Command Center | On-The-Spot Key Editor
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        hasAccess: false,
        accessType: null,
        isAdmin: false,
        isLoggedIn: false,
        email: '',
        carxId: '',
        profile: null,
        activeSection: 'booster', // 'booster' or 'admin'
        adminFilter: 'all',
        adminSearchQuery: ''
    };

    let cachedAdminKeys = {};

    // UI Elements
    const keyGateModal = document.getElementById('key-gate-modal');
    const editKeyModal = document.getElementById('edit-key-modal');
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const adminSection = document.getElementById('admin-section');
    const sectionNav = document.getElementById('section-nav');
    const navBoosterBtn = document.getElementById('nav-booster-btn');
    const navAdminBtn = document.getElementById('nav-admin-btn');
    const adminQuickBtn = document.getElementById('admin-quick-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const licenseBadge = document.getElementById('license-badge');

    // Toast helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `cyber-toast ${type}`;
        toast.innerHTML = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Sound toggle
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            window.CyberAudio.toggleSound();
        });
    }

    // ============================================================
    // MODE NAVIGATION: BOOSTER HUB vs ADMIN COMMAND CENTER
    // ============================================================
    function switchSection(target) {
        window.CyberAudio.playClick();
        state.activeSection = target;
        if (target === 'admin') {
            navAdminBtn?.classList.add('active');
            navBoosterBtn?.classList.remove('active');
            dashboardSection.style.display = 'none';
            adminSection.style.display = 'block';
            loadAdminCommandCenter();
        } else {
            navBoosterBtn?.classList.add('active');
            navAdminBtn?.classList.remove('active');
            adminSection.style.display = 'none';
            if (state.isLoggedIn) {
                dashboardSection.style.display = 'block';
                authSection.style.display = 'none';
            } else {
                dashboardSection.style.display = 'none';
                authSection.style.display = 'block';
            }
        }
    }

    navBoosterBtn?.addEventListener('click', () => switchSection('booster'));
    navAdminBtn?.addEventListener('click', () => switchSection('admin'));
    adminQuickBtn?.addEventListener('click', () => switchSection('admin'));

    // ============================================================
    // KEY VERIFICATION
    // ============================================================
    async function checkKeyStatus() {
        try {
            const res = await fetch('/api/key/status');
            const data = await res.json();
            state.hasAccess = data.has_access;
            state.accessType = data.access_type;
            state.isAdmin = data.is_admin;

            if (state.isAdmin) {
                if (sectionNav) sectionNav.style.display = 'flex';
                if (adminQuickBtn) adminQuickBtn.style.display = 'flex';
            }

            if (!state.hasAccess) {
                keyGateModal.classList.add('active');
            } else {
                keyGateModal.classList.remove('active');
                licenseBadge.textContent = `STATUS: ${state.accessType?.toUpperCase() || 'ACTIVE'}`;
                checkProfileStatus();
            }
        } catch (err) {
            console.error('Key status check error:', err);
        }
    }

    const keySubmitBtn = document.getElementById('key-submit-btn');
    const licenseKeyInput = document.getElementById('license-key-input');
    if (keySubmitBtn && licenseKeyInput) {
        keySubmitBtn.addEventListener('click', async () => {
            const key = licenseKeyInput.value.trim();
            if (!key) {
                showToast('⚠️ Please enter a license key or master key.', 'error');
                window.CyberAudio.playError();
                return;
            }
            keySubmitBtn.disabled = true;
            keySubmitBtn.textContent = 'AUTHENTICATING...';
            window.CyberAudio.playClick();

            try {
                const res = await fetch('/api/key/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    window.CyberAudio.playSuccess();
                    state.hasAccess = true;
                    state.accessType = data.access_type;
                    state.isAdmin = data.is_admin;
                    keyGateModal.classList.remove('active');
                    licenseBadge.textContent = `STATUS: ${state.accessType?.toUpperCase() || 'ACTIVE'}`;
                    if (state.isAdmin) {
                        if (sectionNav) sectionNav.style.display = 'flex';
                        if (adminQuickBtn) adminQuickBtn.style.display = 'flex';
                    }
                    checkProfileStatus();
                } else {
                    showToast(data.message || 'Invalid key.', 'error');
                    window.CyberAudio.playError();
                }
            } catch (err) {
                showToast('Network error verifying key.', 'error');
                window.CyberAudio.playError();
            } finally {
                keySubmitBtn.disabled = false;
                keySubmitBtn.textContent = 'ACTIVATE ACCESS';
            }
        });
    }

    // ============================================================
    // AUTH TABS & LOGIN / REGISTER
    // ============================================================
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            window.CyberAudio.playClick();
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.style.display = 'block';
            formRegister.style.display = 'none';
        });

        tabRegister.addEventListener('click', () => {
            window.CyberAudio.playClick();
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.style.display = 'block';
            formLogin.style.display = 'none';
        });
    }

    // Login Action
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            if (!email || !password) {
                showToast('⚠️ Please provide your email and password.', 'error');
                window.CyberAudio.playError();
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'CONNECTING TO SATELLITE...';
            window.CyberAudio.playClick();

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    window.CyberAudio.playSuccess();
                    checkProfileStatus();
                } else {
                    showToast(data.detail || 'Login failed.', 'error');
                    window.CyberAudio.playError();
                }
            } catch (e) {
                showToast('Connection error.', 'error');
                window.CyberAudio.playError();
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'INITIALIZE LOGIN';
            }
        });
    }

    // Register Action (Blueprint Mode)
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value.trim();
            if (!email || !password) {
                showToast('⚠️ Please enter an email and password.', 'error');
                window.CyberAudio.playError();
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = 'FABRICATING BLUEPRINT...';
            window.CyberAudio.playClick();

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    window.CyberAudio.playSuccess();
                    checkProfileStatus();
                } else {
                    showToast(data.detail || 'Registration failed.', 'error');
                    window.CyberAudio.playError();
                }
            } catch (e) {
                showToast('Connection error creating account.', 'error');
                window.CyberAudio.playError();
            } finally {
                registerBtn.disabled = false;
                registerBtn.textContent = 'CREATE ACCOUNT & INJECT BLUEPRINT';
            }
        });
    }

    // Logout Action
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            window.CyberAudio.playClick();
            await fetch('/api/auth/logout', { method: 'POST' });
            showToast('Disconnected from CarX Street.', 'info');
            checkProfileStatus();
        });
    }

    // ============================================================
    // PROFILE STATS SYNC & DISPLAY
    // ============================================================
    async function checkProfileStatus() {
        try {
            const res = await fetch('/api/profile');
            const data = await res.json();

            if (data.logged_in) {
                state.isLoggedIn = true;
                state.email = data.email;
                state.carxId = data.carx_id;
                if (state.activeSection === 'booster') {
                    authSection.style.display = 'none';
                    dashboardSection.style.display = 'block';
                }
                updateDashboardUI(data);
            } else {
                state.isLoggedIn = false;
                if (state.activeSection === 'booster') {
                    authSection.style.display = 'block';
                    dashboardSection.style.display = 'none';
                }
            }
        } catch (e) {
            console.error('Failed to fetch profile stats:', e);
        }
    }

    function updateDashboardUI(data) {
        document.getElementById('hud-user-email').textContent = data.email || 'CONNECTED';
        document.getElementById('hud-user-carxid').textContent = data.carx_id || 'UNKNOWN';

        animateNumber('val-silver', data.silver || 0);
        animateNumber('val-gold', data.gold || 0);
        animateNumber('val-xp', data.xp || 0);
        document.getElementById('val-maps').textContent = `${data.maps_unlocked || 0} / 6`;
        document.getElementById('val-cars').textContent = `${data.cars_count || 0}`;

        const spEl = document.getElementById('badge-streetpass');
        if (data.streetpass) {
            spEl.className = 'badge-pill green';
            spEl.textContent = 'STREET PASS: ACTIVE';
        } else {
            spEl.className = 'badge-pill red';
            spEl.textContent = 'STREET PASS: LOCKED';
        }

        const premEl = document.getElementById('badge-premium');
        if (data.premium) {
            premEl.className = 'badge-pill green';
            premEl.textContent = 'PREMIUM: UNLOCKED';
        } else {
            premEl.className = 'badge-pill red';
            premEl.textContent = 'PREMIUM: NONE';
        }
    }

    function animateNumber(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const current = parseInt(el.dataset.val || '0', 10);
        el.dataset.val = targetValue;
        const diff = targetValue - current;
        if (Math.abs(diff) < 50) {
            el.textContent = targetValue.toLocaleString();
            return;
        }
        let step = 0;
        const totalSteps = 20;
        const interval = setInterval(() => {
            step++;
            const val = Math.round(current + (diff * (step / totalSteps)));
            el.textContent = val.toLocaleString();
            if (step >= totalSteps) {
                clearInterval(interval);
                el.textContent = targetValue.toLocaleString();
            }
        }, 15);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-profile-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            window.CyberAudio.playClick();
            refreshBtn.disabled = true;
            try {
                const res = await fetch('/api/profile/refresh', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    window.CyberAudio.playSuccess();
                    checkProfileStatus();
                } else {
                    showToast(data.detail || 'Refresh failed.', 'error');
                }
            } catch (e) {
                showToast('Refresh error.', 'error');
            } finally {
                refreshBtn.disabled = false;
            }
        });
    }

    // ============================================================
    // BOOSTING TRIGGERS
    // ============================================================
    // Currency: Max
    document.getElementById('boost-curr-max')?.addEventListener('click', async () => {
        window.CyberAudio.playBoost();
        await applyCurrencyBoost('max');
    });

    // Currency: Medium
    document.getElementById('boost-curr-med')?.addEventListener('click', async () => {
        window.CyberAudio.playBoost();
        await applyCurrencyBoost('med');
    });

    // Currency: Custom
    document.getElementById('boost-curr-custom-btn')?.addEventListener('click', async () => {
        window.CyberAudio.playBoost();
        const silver = parseInt(document.getElementById('custom-silver').value || '0', 10);
        const gold = parseInt(document.getElementById('custom-gold').value || '0', 10);
        const xp = parseInt(document.getElementById('custom-xp').value || '0', 10);
        await applyCurrencyBoost('custom', silver, gold, xp);
    });

    async function applyCurrencyBoost(tier, silver = 50000000, gold = 9999, xp = 999999) {
        try {
            const res = await fetch('/api/boost/currency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier, silver, gold, xp })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                checkProfileStatus();
            } else {
                showToast(data.detail || 'Currency boost failed.', 'error');
                window.CyberAudio.playError();
            }
        } catch (e) {
            showToast('Boost network error.', 'error');
            window.CyberAudio.playError();
        }
    }

    // Map Unlock
    document.getElementById('boost-maps-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('boost-maps-btn');
        btn.disabled = true;
        window.CyberAudio.playBoost();
        showToast('⏳ Overriding world map sector barriers...', 'info');

        try {
            const res = await fetch('/api/boost/maps', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                checkProfileStatus();
            } else {
                showToast(data.detail || 'Map unlock failed.', 'error');
                window.CyberAudio.playError();
            }
        } catch (e) {
            showToast('Map unlock network error.', 'error');
            window.CyberAudio.playError();
        } finally {
            btn.disabled = false;
        }
    });

    // Car Injections
    document.getElementById('boost-cars-all')?.addEventListener('click', () => injectCars('all'));
    document.getElementById('boost-cars-random')?.addEventListener('click', () => injectCars('random'));
    document.getElementById('boost-cars-50')?.addEventListener('click', () => injectCars('first_50'));
    document.getElementById('boost-cars-custom-btn')?.addEventListener('click', () => {
        const count = parseInt(document.getElementById('custom-cars-count').value || '15', 10);
        injectCars('custom', count);
    });

    async function injectCars(option, count = 10) {
        window.CyberAudio.playBoost();
        showToast('⏳ Splicing vehicle blueprints into garage...', 'info');

        try {
            const res = await fetch('/api/boost/cars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ option, count })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                checkProfileStatus();
            } else {
                showToast(data.detail || 'Car injection failed.', 'error');
                window.CyberAudio.playError();
            }
        } catch (e) {
            showToast('Car injection network error.', 'error');
            window.CyberAudio.playError();
        }
    }

    // Street Pass
    document.getElementById('boost-sp-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('boost-sp-btn');
        btn.disabled = true;
        window.CyberAudio.playBoost();
        showToast('⏳ Bypassing server receipt verification for Battle Pass...', 'info');

        try {
            const res = await fetch('/api/boost/streetpass', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                checkProfileStatus();
            } else {
                showToast(data.detail || 'Street pass unlock failed.', 'error');
                window.CyberAudio.playError();
            }
        } catch (e) {
            showToast('Street pass network error.', 'error');
            window.CyberAudio.playError();
        } finally {
            btn.disabled = false;
        }
    });

    // ============================================================
    // GOD MODE (ALL-IN-ONE) WITH HYPERDRIVE WARP EFFECT
    // ============================================================
    const godModeBtn = document.getElementById('god-mode-btn');
    if (godModeBtn) {
        godModeBtn.addEventListener('click', async () => {
            godModeBtn.disabled = true;
            window.CyberAudio.playWarp();
            document.body.classList.add('warp-effect');
            showToast('⚡ HYPERDRIVE CHARGED: ENGAGING ALL BOOSTERS SIMULTANEOUSLY!', 'info');

            setTimeout(async () => {
                document.body.classList.remove('warp-effect');
                try {
                    const res = await fetch('/api/boost/all', { method: 'POST' });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(data.message, 'success');
                        window.CyberAudio.playSuccess();
                        checkProfileStatus();
                    } else {
                        showToast(data.detail || 'God mode failed.', 'error');
                        window.CyberAudio.playError();
                    }
                } catch (e) {
                    showToast('God mode network error.', 'error');
                    window.CyberAudio.playError();
                } finally {
                    godModeBtn.disabled = false;
                }
            }, 600);
        });
    }

    // ============================================================
    // NEW DEDICATED ADMIN COMMAND CENTER LOGIC
    // ============================================================
    async function loadAdminCommandCenter() {
        await Promise.all([loadAdminStats(), loadAdminKeys()]);
    }

    async function loadAdminStats() {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (res.ok && data.stats) {
                document.getElementById('admin-stat-total').textContent = data.stats.total_keys;
                document.getElementById('admin-stat-avail').textContent = data.stats.available_keys;
                document.getElementById('admin-stat-claimed').textContent = data.stats.claimed_keys;
                document.getElementById('admin-stat-admins').textContent = data.stats.total_admins;
            }
        } catch (err) {
            console.error('Error fetching admin stats:', err);
        }
    }

    async function loadAdminKeys() {
        const tbody = document.getElementById('admin-keys-tbody');
        if (!tbody) return;
        try {
            const res = await fetch('/api/admin/keys');
            const data = await res.json();
            if (res.ok && data.keys) {
                cachedAdminKeys = data.keys;
                renderAdminKeysTable();
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--neon-magenta);">Failed to load keys from database.</td></tr>`;
        }
    }

    function renderAdminKeysTable() {
        const tbody = document.getElementById('admin-keys-tbody');
        if (!tbody) return;

        let entries = Object.entries(cachedAdminKeys);

        // Apply Status Filter
        if (state.adminFilter === 'available') {
            entries = entries.filter(([_, info]) => !info.used);
        } else if (state.adminFilter === 'claimed') {
            entries = entries.filter(([_, info]) => info.used);
        }

        // Apply Search Filter
        if (state.adminSearchQuery) {
            const q = state.adminSearchQuery.toLowerCase();
            entries = entries.filter(([k, info]) => {
                const user = (info.used_by || '').toString().toLowerCase();
                return k.toLowerCase().includes(q) || user.includes(q);
            });
        }

        if (entries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching keys found in database.</td></tr>`;
            return;
        }

        let html = '';
        entries.forEach(([k, info]) => {
            const dur = info.duration || 'lifetime';
            const isUsed = Boolean(info.used);
            const statusBadge = isUsed
                ? `<span class="badge-pill red">CLAIMED</span>`
                : `<span class="badge-pill green">AVAILABLE</span>`;

            let expiryDisplay = 'None / Never';
            if (info.expires_at) {
                const expDate = new Date(info.expires_at * 1000);
                expiryDisplay = expDate.toLocaleString();
            } else if (dur === '1time') {
                expiryDisplay = '1-Time Use';
            } else if (dur === 'lifetime') {
                expiryDisplay = 'Permanent';
            }

            const claimedUser = isUsed ? (info.used_by || 'Unknown') : '—';

            html += `
                <tr>
                    <td>
                        <span class="table-key-badge">${k}</span>
                    </td>
                    <td>
                        <span class="sector-tag" style="padding: 3px 8px; font-size: 11px;">${dur.toUpperCase()}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td><span style="color: var(--neon-cyan); font-size: 13px;">${claimedUser}</span></td>
                    <td style="color: var(--text-muted); font-size: 13px;">${expiryDisplay}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn-sm btn-copy" data-key="${k}" title="Copy Key">📋 Copy</button>
                            <button class="action-btn-sm btn-edit" data-key="${k}" title="Edit On The Spot">✏️ Edit</button>
                            <button class="action-btn-sm btn-reset" data-key="${k}" title="Reset Status to Available">🔄 Reset</button>
                            <button class="action-btn-sm btn-delete" data-key="${k}" title="Revoke Key">❌ Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Attach Row Event Listeners
        tbody.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const k = e.currentTarget.dataset.key;
                navigator.clipboard.writeText(k);
                window.CyberAudio.playClick();
                showToast(`📋 Copied <b>${k}</b> to clipboard!`, 'info');
            });
        });

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const k = e.currentTarget.dataset.key;
                openEditKeyModal(k);
            });
        });

        tbody.querySelectorAll('.btn-reset').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const k = e.currentTarget.dataset.key;
                window.CyberAudio.playClick();
                try {
                    const res = await fetch('/api/admin/keys/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ old_key: k, used: false })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(`🔄 Key <b>${k}</b> reset to available!`, 'success');
                        window.CyberAudio.playSuccess();
                        loadAdminCommandCenter();
                    } else {
                        showToast(data.detail || 'Reset failed.', 'error');
                    }
                } catch (err) {
                    showToast('Network error resetting key.', 'error');
                }
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const k = e.currentTarget.dataset.key;
                if (!confirm(`Are you sure you want to revoke and delete key ${k}?`)) return;
                window.CyberAudio.playClick();
                try {
                    const res = await fetch('/api/admin/keys/revoke', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: k })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(data.message, 'success');
                        window.CyberAudio.playSuccess();
                        loadAdminCommandCenter();
                    } else {
                        showToast(data.detail || 'Revoke failed.', 'error');
                    }
                } catch (err) {
                    showToast('Network error deleting key.', 'error');
                }
            });
        });
    }

    // Custom Key Duration Switcher
    const customKeyDuration = document.getElementById('custom-key-duration');
    const customDaysGroup = document.getElementById('custom-days-group');
    if (customKeyDuration && customDaysGroup) {
        customKeyDuration.addEventListener('change', () => {
            if (customKeyDuration.value === 'custom_days') {
                customDaysGroup.style.display = 'block';
            } else {
                customDaysGroup.style.display = 'none';
            }
        });
    }

    // Randomize Key Name Button
    document.getElementById('btn-randomize-key')?.addEventListener('click', () => {
        window.CyberAudio.playClick();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'VIP-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('custom-key-input').value = code;
    });

    // Create Custom Key Button
    document.getElementById('btn-create-custom-key')?.addEventListener('click', async () => {
        const keyName = document.getElementById('custom-key-input').value.trim();
        const durationType = customKeyDuration.value;
        const customDays = parseInt(document.getElementById('custom-days-input')?.value || '7', 10);

        if (!keyName) {
            showToast('⚠️ Please provide a custom key code name.', 'error');
            window.CyberAudio.playError();
            return;
        }

        window.CyberAudio.playClick();
        const payload = {
            key_name: keyName,
            duration: durationType === 'custom_days' ? `${customDays}d` : durationType,
            custom_days: durationType === 'custom_days' ? customDays : null
        };

        try {
            const res = await fetch('/api/admin/keys/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                document.getElementById('custom-key-input').value = '';
                loadAdminCommandCenter();
            } else {
                showToast(data.detail || 'Failed to create key.', 'error');
                window.CyberAudio.playError();
            }
        } catch (err) {
            showToast('Network error creating custom key.', 'error');
        }
    });

    // Quick 1-Click Generator
    document.querySelectorAll('.quick-gen-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const duration = e.currentTarget.dataset.duration;
            window.CyberAudio.playClick();
            try {
                const res = await fetch('/api/admin/keys/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duration })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(`🔑 Created: <b>${data.key}</b> (${data.duration})`, 'success');
                    window.CyberAudio.playSuccess();
                    loadAdminCommandCenter();
                }
            } catch (err) {
                showToast('Failed to generate key.', 'error');
            }
        });
    });

    // Quick Revoke by Input
    document.getElementById('admin-quick-revoke-btn')?.addEventListener('click', async () => {
        const key = document.getElementById('admin-quick-revoke-input').value.trim();
        if (!key) return;
        window.CyberAudio.playClick();
        try {
            const res = await fetch('/api/admin/keys/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                document.getElementById('admin-quick-revoke-input').value = '';
                loadAdminCommandCenter();
            } else {
                showToast(data.detail || 'Key not found.', 'error');
            }
        } catch (err) {
            showToast('Revoke error.', 'error');
        }
    });

    // Search & Filter
    document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
        state.adminSearchQuery = e.target.value.trim();
        renderAdminKeysTable();
    });

    document.getElementById('filter-all')?.addEventListener('click', (e) => {
        setFilter('all', e.target);
    });
    document.getElementById('filter-available')?.addEventListener('click', (e) => {
        setFilter('available', e.target);
    });
    document.getElementById('filter-claimed')?.addEventListener('click', (e) => {
        setFilter('claimed', e.target);
    });

    function setFilter(filterVal, targetBtn) {
        window.CyberAudio.playClick();
        state.adminFilter = filterVal;
        document.querySelectorAll('#admin-section .tab-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        renderAdminKeysTable();
    }

    // Refresh Table Button
    document.getElementById('admin-refresh-table-btn')?.addEventListener('click', () => {
        window.CyberAudio.playClick();
        loadAdminCommandCenter();
        showToast('🔄 License inventory refreshed from database.', 'info');
    });

    // Clear Claimed Keys Button
    document.getElementById('admin-clear-claimed-full-btn')?.addEventListener('click', async () => {
        if (!confirm('Clear all claimed/used keys from the database?')) return;
        window.CyberAudio.playClick();
        try {
            const res = await fetch('/api/admin/keys/clear_claimed', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                loadAdminCommandCenter();
            }
        } catch (err) {
            showToast('Failed to clear keys.', 'error');
        }
    });

    // ============================================================
    // ON-THE-SPOT KEY EDITOR MODAL
    // ============================================================
    function openEditKeyModal(keyCode) {
        const info = cachedAdminKeys[keyCode];
        if (!info) return;

        window.CyberAudio.playClick();
        document.getElementById('edit-original-key').value = keyCode;
        document.getElementById('edit-key-code').value = keyCode;
        document.getElementById('edit-key-duration').value = info.duration || '1time';

        // Format expiry for datetime-local
        const expiryInput = document.getElementById('edit-key-expiry');
        if (info.expires_at) {
            const d = new Date(info.expires_at * 1000);
            const tzOffset = d.getTimezoneOffset() * 60000;
            const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
            expiryInput.value = localISOTime;
        } else {
            expiryInput.value = '';
        }

        // Status
        const statusSelect = document.getElementById('edit-key-status');
        const claimedInfo = document.getElementById('edit-claimed-by-info');
        if (info.used) {
            statusSelect.value = 'claimed';
            claimedInfo.textContent = `Claimed by: ${info.used_by || 'Active User'}`;
        } else {
            statusSelect.value = 'unclaimed';
            claimedInfo.textContent = '✨ Key is currently available';
        }

        editKeyModal.classList.add('active');
    }

    document.getElementById('edit-key-modal-close')?.addEventListener('click', () => {
        editKeyModal.classList.remove('active');
    });

    // Save Changes on the spot
    document.getElementById('btn-save-key-edit')?.addEventListener('click', async () => {
        const oldKey = document.getElementById('edit-original-key').value;
        const newKey = document.getElementById('edit-key-code').value.trim();
        const duration = document.getElementById('edit-key-duration').value;
        const expiryVal = document.getElementById('edit-key-expiry').value;
        const isClaimed = document.getElementById('edit-key-status').value === 'claimed';

        let expiresAt = null;
        if (expiryVal) {
            expiresAt = new Date(expiryVal).getTime() / 1000;
        }

        window.CyberAudio.playClick();
        const payload = {
            old_key: oldKey,
            new_key: newKey,
            duration: duration,
            expires_at: expiresAt,
            used: isClaimed
        };

        try {
            const res = await fetch('/api/admin/keys/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                editKeyModal.classList.remove('active');
                loadAdminCommandCenter();
            } else {
                showToast(data.detail || 'Failed to update key.', 'error');
                window.CyberAudio.playError();
            }
        } catch (err) {
            showToast('Network error saving key.', 'error');
        }
    });

    // Delete Key from modal
    document.getElementById('btn-delete-key-modal')?.addEventListener('click', async () => {
        const oldKey = document.getElementById('edit-original-key').value;
        if (!confirm(`Revoke and delete key ${oldKey}?`)) return;
        window.CyberAudio.playClick();
        try {
            const res = await fetch('/api/admin/keys/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: oldKey })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                window.CyberAudio.playSuccess();
                editKeyModal.classList.remove('active');
                loadAdminCommandCenter();
            } else {
                showToast(data.detail || 'Failed to delete key.', 'error');
            }
        } catch (err) {
            showToast('Network error deleting key.', 'error');
        }
    });

    // Initialize Key Check
    checkKeyStatus();
});
