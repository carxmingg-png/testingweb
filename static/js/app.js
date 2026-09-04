/* ============================================================
   CARX STREET - CYBER HUD APPLICATION CONTROLLER
   State Management | REST API Hooks | Interactive Boosters
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        hasAccess: false,
        accessType: null,
        isAdmin: false,
        isLoggedIn: false,
        email: '',
        carxId: '',
        profile: null
    };

    // UI Elements
    const keyGateModal = document.getElementById('key-gate-modal');
    const adminModal = document.getElementById('admin-modal');
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const adminBtn = document.getElementById('admin-btn');
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
                adminBtn.style.display = 'flex';
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
                    if (state.isAdmin) adminBtn.style.display = 'flex';
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
                authSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                updateDashboardUI(data);
            } else {
                state.isLoggedIn = false;
                authSection.style.display = 'block';
                dashboardSection.style.display = 'none';
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
    // ADMIN PORTAL MODAL
    // ============================================================
    if (adminBtn && adminModal) {
        adminBtn.addEventListener('click', () => {
            window.CyberAudio.playClick();
            adminModal.classList.add('active');
            fetchAdminKeys();
        });

        document.getElementById('admin-modal-close')?.addEventListener('click', () => {
            adminModal.classList.remove('active');
        });

        // Generate Key buttons
        document.querySelectorAll('.admin-gen-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const duration = e.target.dataset.duration;
                window.CyberAudio.playClick();
                try {
                    const res = await fetch('/api/admin/keys/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ duration })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(`🔑 Created: ${data.key} (${data.duration})`, 'success');
                        window.CyberAudio.playSuccess();
                        fetchAdminKeys();
                    }
                } catch (err) {
                    showToast('Failed to generate key.', 'error');
                }
            });
        });

        // Revoke Key
        document.getElementById('admin-revoke-btn')?.addEventListener('click', async () => {
            const key = document.getElementById('admin-revoke-key').value.trim();
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
                    fetchAdminKeys();
                } else {
                    showToast(data.detail || 'Key not found.', 'error');
                }
            } catch (err) {
                showToast('Revoke error.', 'error');
            }
        });

        // Clear Claimed Keys
        document.getElementById('admin-clear-claimed-btn')?.addEventListener('click', async () => {
            window.CyberAudio.playClick();
            try {
                const res = await fetch('/api/admin/keys/clear_claimed', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    window.CyberAudio.playSuccess();
                    fetchAdminKeys();
                }
            } catch (err) {
                showToast('Failed to clear keys.', 'error');
            }
        });
    }

    async function fetchAdminKeys() {
        const listEl = document.getElementById('admin-keys-list');
        if (!listEl) return;
        listEl.innerHTML = '<div style="color: var(--text-muted);">Fetching keys from database...</div>';
        try {
            const res = await fetch('/api/admin/keys');
            const data = await res.json();
            if (res.ok && data.keys) {
                let html = '';
                const keys = Object.entries(data.keys);
                if (keys.length === 0) {
                    html = '<div style="color: var(--text-muted);">No keys generated yet.</div>';
                } else {
                    keys.forEach(([k, info]) => {
                        const used = info.used ? `<span style="color: var(--neon-magenta);">CLAIMED (${info.used_by})</span>` : `<span style="color: var(--neon-green);">AVAILABLE</span>`;
                        html += `
                            <div style="background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-family: var(--font-mono); font-size: 13px; display: flex; justify-content: space-between; border-left: 3px solid var(--neon-cyan);">
                                <span><b>${k}</b> [${info.duration}]</span>
                                <span>${used}</span>
                            </div>
                        `;
                    });
                }
                listEl.innerHTML = html;
            }
        } catch (err) {
            listEl.innerHTML = '<div style="color: var(--neon-magenta);">Failed to load keys.</div>';
        }
    }

    // Initialize Key Check
    checkKeyStatus();
});
