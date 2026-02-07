// ==========================================
// 🔊 音效管理器 AudioManager
// ==========================================

const AudioManager = {
    // 音效开关状态
    enabled: true,
    bgmEnabled: true,

    // 音频上下文
    audioContext: null,

    // 背景音乐元素
    bgmElement: null,
    bgmGain: null,

    /**
     * 初始化音频系统
     */
    init() {
        // 从本地存储加载设置
        const saved = localStorage.getItem('velotric_audio_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.enabled = settings.enabled !== false;
            this.bgmEnabled = settings.bgmEnabled !== false;
        }

        // 创建音频上下文（延迟到用户交互后）
        this.setupAudioContext();

        // 更新 UI 状态
        this.updateUI();
    },

    /**
     * 创建音频上下文
     */
    setupAudioContext() {
        // 等待用户交互后再创建
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };

        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);
    },

    /**
     * 保存设置
     */
    saveSettings() {
        localStorage.setItem('velotric_audio_settings', JSON.stringify({
            enabled: this.enabled,
            bgmEnabled: this.bgmEnabled
        }));
    },

    /**
     * 切换音效开关
     */
    toggleSound() {
        this.enabled = !this.enabled;
        this.saveSettings();
        this.updateUI();
    },

    /**
     * 切换背景音乐开关
     */
    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        this.saveSettings();
        this.updateUI();
    },

    /**
     * 更新 UI 显示
     */
    updateUI() {
        const btn = document.getElementById('sound-toggle-btn');
        if (btn) {
            btn.textContent = this.enabled ? '🔊' : '🔇';
            btn.title = this.enabled ? '关闭音效' : '开启音效';
        }
    },

    /**
     * 播放点击音效
     */
    playClick() {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.08);
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放选择音效
     */
    playSelect() {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(700, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(900, this.audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放正确选择音效
     */
    playCorrect() {
        if (!this.enabled || !this.audioContext) return;

        try {
            // 上升的愉悦音阶
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, i) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.08);

                gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime + i * 0.08);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + i * 0.08 + 0.2);

                oscillator.start(this.audioContext.currentTime + i * 0.08);
                oscillator.stop(this.audioContext.currentTime + i * 0.08 + 0.2);
            });
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放错误选择音效
     */
    playWrong() {
        if (!this.enabled || !this.audioContext) return;

        try {
            // 低沉的警告音
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);

            // 第二个低音
            setTimeout(() => {
                if (!this.audioContext) return;
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();

                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);

                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(180, this.audioContext.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(120, this.audioContext.currentTime + 0.2);

                gain2.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);

                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.25);
            }, 150);
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放章节完成音效
     */
    playComplete() {
        if (!this.enabled || !this.audioContext) return;

        try {
            // 播放上升音阶
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.12);

                gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime + i * 0.12);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + i * 0.12 + 0.3);

                oscillator.start(this.audioContext.currentTime + i * 0.12);
                oscillator.stop(this.audioContext.currentTime + i * 0.12 + 0.3);
            });
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放通关音效
     */
    playEnding() {
        if (!this.enabled || !this.audioContext) return;

        try {
            // 播放胜利和弦
            const chords = [
                [523.25, 659.25, 783.99], // C major
                [587.33, 739.99, 880.00], // D major
                [659.25, 783.99, 987.77], // E minor
                [523.25, 659.25, 783.99, 1046.50]  // C major with octave
            ];

            chords.forEach((chord, i) => {
                chord.forEach(freq => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.25);

                    gainNode.gain.setValueAtTime(0.06, this.audioContext.currentTime + i * 0.25);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + i * 0.25 + 0.5);

                    oscillator.start(this.audioContext.currentTime + i * 0.25);
                    oscillator.stop(this.audioContext.currentTime + i * 0.25 + 0.5);
                });
            });
        } catch (e) {
            // 忽略音频错误
        }
    },

    /**
     * 播放打字音效 (柔和通用版)
     */
    playTyping() {
        if (!this.enabled || !this.audioContext) return;

        // 如果被挂起，尝试恢复
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => { });
        }

        try {
            const t = this.audioContext.currentTime;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            // 极简正弦波 (最不刺耳的声音)
            osc.type = 'sine';
            // 固定频率，类似老式打字机或系统提示音的 "滴"
            // 800Hz 是一个比较清晰但不尖锐的频率
            osc.frequency.setValueAtTime(800, t);

            // 极短的包络，避免拖泥带水
            gain.gain.setValueAtTime(0.05, t); // 音量调低
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03); // 30ms 极短促

            osc.start(t);
            osc.stop(t + 0.03);

        } catch (e) {
            // 忽略音频错误
        }
    }
};

// 确保全局暴露
window.AudioManager = AudioManager;
