/* ============================================================
   CYBERPUNK VISUAL & AUDIO FX ENGINE
   Canvas Speed Particles & Web Audio Sound Synthesizer
   ============================================================ */

(function () {
    // Canvas Cyber Background
    const canvas = document.getElementById('cyber-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const particles = [];
        const numParticles = Math.min(65, Math.floor(width / 22));

        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                size: Math.random() * 2 + 1,
                color: Math.random() > 0.4 ? '#00f0ff' : '#ff0055'
            });
        }

        let mouseX = width / 2;
        let mouseY = height / 2;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Grid lines
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
            ctx.lineWidth = 1;
            const gridSize = 60;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Draw and connect particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.fillStyle = p.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 130) {
                        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 130)})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ============================================================
    // WEB AUDIO SCI-FI SOUND SYNTHESIZER
    // ============================================================
    let audioCtx = null;
    let soundEnabled = localStorage.getItem('carx_sound') !== 'false';

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    window.CyberAudio = {
        toggleSound: function () {
            soundEnabled = !soundEnabled;
            localStorage.setItem('carx_sound', soundEnabled);
            const btn = document.getElementById('sound-toggle-btn');
            if (btn) {
                btn.innerHTML = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            }
            if (soundEnabled) {
                initAudio();
                this.playClick();
            }
            return soundEnabled;
        },
        isSoundEnabled: function () {
            return soundEnabled;
        },
        playClick: function () {
            if (!soundEnabled) return;
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        },
        playSuccess: function () {
            if (!soundEnabled) return;
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(660, now + 0.08);
            osc.frequency.setValueAtTime(880, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(now + 0.35);
        },
        playBoost: function () {
            if (!soundEnabled) return;
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(now + 0.3);
        },
        playWarp: function () {
            if (!soundEnabled) return;
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.8);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(now + 0.8);
        },
        playError: function () {
            if (!soundEnabled) return;
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(120, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(now + 0.25);
        }
    };

    // Update sound toggle button label on load
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('sound-toggle-btn');
        if (btn) {
            btn.innerHTML = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        }
    });
})();
