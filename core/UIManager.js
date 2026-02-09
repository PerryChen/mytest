// ==========================================
// 🖥️ UI 管理器 UIManager
// ==========================================

/**
 * UIManager - 视图层管理器（统一版）
 * 负责所有 UI 元素的渲染和交互
 * v2.1: 合并 game.js 中的 UI 对象，作为唯一 UI 层
 */
const UIManager = {
    // 缓存的 DOM 元素引用
    elements: null,

    // 顶层快捷引用（兼容 game.js 中 UI.screens / UI.dialog / UI.popup 等写法）
    screens: null,
    gameHeader: null,
    scene: null,
    dialog: null,
    popup: null,

    /**
     * 初始化 UI 管理器
     */
    init() {
        // 缓存 DOM 元素
        this.elements = {
            screens: {
                intro: document.getElementById('intro-screen'),
                game: document.getElementById('game-screen'),
                transition: document.getElementById('transition-screen'),
                complete: document.getElementById('chapter-complete-screen'),
                ending: document.getElementById('ending-screen'),
                cards: document.getElementById('cards-screen'),
                assessment: document.getElementById('assessment-screen')
            },
            header: {
                badge: document.getElementById('chapter-badge'),
                title: document.getElementById('chapter-title'),
                date: document.getElementById('chapter-date'),
                location: document.getElementById('location-text')
            },
            scene: {
                bg: document.getElementById('scene-bg'),
                characterArea: document.getElementById('character-area')
            },
            dialog: {
                box: document.getElementById('dialog-container'),
                avatar: document.getElementById('speaker-avatar'),
                name: document.getElementById('speaker-name'),
                text: document.getElementById('dialog-text'),
                indicator: document.getElementById('dialog-indicator'),
                choices: document.getElementById('choices-container')
            },
            popup: {
                container: document.getElementById('knowledge-popup'),
                title: document.getElementById('knowledge-title'),
                content: document.getElementById('knowledge-content'),
                closeBtn: document.getElementById('close-knowledge-btn')
            }
        };

        // 兼容顶层引用
        this.screens = this.elements.screens;
        this.gameHeader = this.elements.header;
        this.scene = this.elements.scene;
        this.dialog = this.elements.dialog;
        this.popup = this.elements.popup;

        // 初始化 Analytics
        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.init();
        }

        // 尝试自动解锁 AudioContext
        const unlockAudio = () => {
            if (typeof AudioManager !== 'undefined' && AudioManager.audioContext) {
                if (AudioManager.audioContext.state === 'suspended') {
                    AudioManager.audioContext.resume();
                }
            }
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        // ===== 事件绑定 =====
        document.getElementById('new-game-btn').addEventListener('click', () => Game.startNewGame());
        document.getElementById('continue-game-btn').addEventListener('click', () => Game.continueGame());
        document.querySelector('.dialog-box').addEventListener('click', () => Game.advanceDialogue());
        document.getElementById('next-chapter-btn').addEventListener('click', () => Game.startChapter(GameState.currentChapterId + 1));
        document.getElementById('review-chapter-btn').addEventListener('click', () => Game.reviewCurrentChapter());

        this.popup.closeBtn.addEventListener('click', () => {
            this.popup.container.style.display = 'none';
            if (Game.pendingDialogueNode) {
                const node = Game.pendingDialogueNode;
                Game.pendingDialogueNode = null;
                this.renderDialogue(node);
                Game.isWaitingChoice = (node.choices && node.choices.length > 0);
            } else {
                Game.advanceDialogue();
            }
        });

        document.getElementById('play-again-btn').addEventListener('click', () => Game.startNewGame());
        document.getElementById('view-cards-btn').addEventListener('click', () => Game.showCardsScreen());
        document.getElementById('cards-back-btn').addEventListener('click', () => Game.goBackToEndingOrMenu());

        if (GameEngine.loadSaveData()) {
            document.getElementById('continue-game-btn').style.display = 'flex';
        }

        document.getElementById('confirm-name-btn').addEventListener('click', () => this.confirmPlayerName());
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmPlayerName();
        });

        const downloadBtn = document.getElementById('download-cert-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadCertificate());
        }

        document.getElementById('chapter-select-btn').addEventListener('click', () => this.showChapterSelector());
        document.getElementById('close-chapter-select-btn').addEventListener('click', () => {
            document.getElementById('chapter-select-modal').style.display = 'none';
        });

        document.getElementById('sound-toggle-btn').addEventListener('click', () => AudioManager.toggleSound());

        // DLC 按钮 → 打开选择器
        document.getElementById('dlc-demo-btn').addEventListener('click', () => this.showDLCSelector());

        // 测评按钮
        document.getElementById('assessment-btn').addEventListener('click', () => this.showAssessmentSetup());
        document.getElementById('assessment-back-btn').addEventListener('click', () => this.switchScreen('intro'));
        document.getElementById('start-assessment-btn').addEventListener('click', () => this.startAssessment());
        document.getElementById('next-question-btn').addEventListener('click', () => this.renderAssessmentQuestion());
        document.getElementById('retry-assessment-btn').addEventListener('click', () => this.showAssessmentSetup());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.switchScreen('intro'));

        // 地图按钮
        const mapBtn = document.getElementById('map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => this.showMap());
        }
        const closeMapBtn = document.getElementById('close-map-btn');
        if (closeMapBtn) {
            closeMapBtn.addEventListener('click', () => {
                document.getElementById('map-modal').style.display = 'none';
            });
        }

        // 海报生成按钮
        const generatePosterBtn = document.getElementById('generate-poster-btn');
        if (generatePosterBtn) {
            generatePosterBtn.addEventListener('click', () => this.showPosterModal());
        }
        const closePosterBtn = document.getElementById('close-poster-btn');
        if (closePosterBtn) {
            closePosterBtn.addEventListener('click', () => {
                document.getElementById('poster-modal').style.display = 'none';
            });
        }
        const downloadPosterBtn = document.getElementById('download-poster-btn');
        if (downloadPosterBtn) {
            downloadPosterBtn.addEventListener('click', () => this.downloadPoster());
        }
        const copyPosterBtn = document.getElementById('copy-poster-btn');
        if (copyPosterBtn) {
            copyPosterBtn.addEventListener('click', () => this.copyPosterToClipboard());
        }

        if (GameState.hasCompleted) {
            document.getElementById('chapter-select-btn').style.display = 'flex';
        }

        console.log('[UIManager] Ready');
    },

    // ===== 屏幕切换 =====

    switchScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    },

    // ===== 场景更新 =====

    updateScene(chapter) {
        this.gameHeader.badge.textContent = `第${chapter.id}章`;
        this.gameHeader.title.textContent = chapter.title;
        this.gameHeader.location.textContent = chapter.location;

        const oldDate = this.gameHeader.date.textContent;
        if (oldDate !== chapter.date) {
            this.gameHeader.date.textContent = chapter.date;
            this.gameHeader.date.classList.remove('date-change');
            void this.gameHeader.date.offsetWidth;
            this.gameHeader.date.classList.add('date-change');
        }

        const totalChapters = StoryLoader.cache.chapters?.chapters?.length || 8;
        const progress = (chapter.id / totalChapters) * 100;
        document.getElementById('progress-text').textContent = `${chapter.id} / ${totalChapters}`;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        const bg = this.scene.bg;
        const oldScene = bg.className;
        const newScene = `scene-background ${chapter.sceneClass}`;
        if (oldScene !== newScene) {
            bg.classList.add('scene-fade-out');
            setTimeout(() => {
                bg.className = `${newScene} scene-fade-in`;
                setTimeout(() => bg.classList.remove('scene-fade-in'), 400);
            }, 400);
        }
    },

    // ===== 对话渲染 =====

    _dialogStyleClasses: ['dialog-narration', 'dialog-system', 'dialog-emphasis'],

    renderDialogue(node) {
        try {
            this.dialog.name.textContent = node.speaker || '???';
            this.dialog.avatar.textContent = node.avatar || '👤';
        } catch (error) {
            console.error('[UIManager] Render error:', error);
            this.dialog.name.textContent = '???';
            this.dialog.avatar.textContent = '👤';
        }

        // 对话样式变体
        const box = this.dialog.box.querySelector('.dialog-box') || document.querySelector('.dialog-box');
        if (box) {
            this._dialogStyleClasses.forEach(c => box.classList.remove(c));
            if (node.style === 'narration') box.classList.add('dialog-narration');
            else if (node.style === 'system') box.classList.add('dialog-system');
            else if (node.style === 'emphasis') box.classList.add('dialog-emphasis');
        }

        const charArea = this.scene.characterArea;
        charArea.innerHTML = '';
        if (node.style !== 'narration' && node.style !== 'system') {
            const charDiv = document.createElement('div');
            charDiv.className = 'character speaking';
            charDiv.innerHTML = `<div class="character-avatar">${node.avatar || '👤'}</div>`;
            charArea.appendChild(charDiv);
        }

        const choicesContainer = this.dialog.choices;
        choicesContainer.innerHTML = '';
        choicesContainer.style.display = 'none';
        this.dialog.indicator.style.display = 'none';

        TypeWriter.start(node.text || '', this.dialog.text, () => {
            if (node.choices && node.choices.length > 0) {
                choicesContainer.style.display = 'flex';
                node.choices.forEach((choice, index) => {
                    const btn = document.createElement('div');
                    btn.className = 'choice-btn choice-slide-in';
                    btn.style.pointerEvents = 'none';
                    btn.style.animationDelay = `${index * 100}ms`;
                    btn.innerHTML = `<div class="choice-letter">${String.fromCharCode(65 + index)}</div>${choice.text}`;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        Game.makeChoice(choice, btn);
                    };
                    choicesContainer.appendChild(btn);
                });
                setTimeout(() => {
                    choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
                        btn.style.pointerEvents = 'auto';
                    });
                }, 500);
            } else {
                this.dialog.indicator.style.display = 'block';
            }
        });
    },

    // ===== 知识卡片 =====

    showKnowledgeCard(cardId) {
        const card = StoryLoader.getKnowledgeCard(cardId);
        if (!card) {
            console.warn('[UIManager] Card not found:', cardId);
            return;
        }
        this.popup.title.textContent = card.title;
        this.popup.content.textContent = card.content;
        this.popup.container.style.display = 'flex';
    },

    hideKnowledgeCard() {
        this.popup.container.style.display = 'none';
    },

    // ===== 过渡画面 =====

    showTransition(chapter, callback) {
        this.switchScreen('transition');
        document.getElementById('transition-chapter').textContent = `第${chapter.id}章`;
        document.getElementById('transition-title').textContent = chapter.title;
        document.getElementById('transition-location').textContent = `📍 ${chapter.location}`;
        setTimeout(() => callback(), 2000);
    },

    // ===== 章节完成 =====

    showChapterComplete(chapterId) {
        this.switchScreen('complete');
        AudioManager.playComplete();
        const chapter = StoryLoader.getChapter(chapterId);
        document.getElementById('complete-chapter-name').textContent = `第${chapter.id}章：${chapter.title}`;
        document.getElementById('chapter-score').textContent = GameState.score;
        document.getElementById('decisions-count').textContent = '1';
        this._renderChapterCards(chapterId);
    },

    async _renderChapterCards(chapterId) {
        const cardsContainer = document.getElementById('cards-earned');
        cardsContainer.innerHTML = '';
        try {
            const script = await StoryLoader.loadChapterScript(chapterId);
            const cardsInChapter = new Set();
            Object.values(script).forEach(node => {
                if (node.unlockCard) cardsInChapter.add(node.unlockCard);
            });
            cardsInChapter.forEach(cardId => {
                const card = StoryLoader.getKnowledgeCard(cardId);
                if (card) {
                    const el = document.createElement('div');
                    el.className = 'mini-card';
                    el.textContent = `💡 ${card.title}`;
                    cardsContainer.appendChild(el);
                }
            });
        } catch (e) {
            console.warn('[UIManager] Failed to render chapter cards:', e);
        }
    },

    // ===== 结局画面 =====

    async showEnding() {
        this.switchScreen('ending');
        AudioManager.playEnding();
        document.getElementById('total-score').textContent = GameState.score;
        document.getElementById('total-cards').textContent = GameState.unlockedCards.length;

        if (GameState.gameStartTime) {
            GameState.completionTime = Date.now() - GameState.gameStartTime;
        }

        // 动态结局：根据分数加载对应结局
        let ending = null;
        if (typeof EndingsManager !== 'undefined') {
            try {
                await EndingsManager.loadEndings();
                ending = EndingsManager.getEndingForScore(GameState.score);
                GameEngine.state.endingId = ending.id;
            } catch (e) {
                console.warn('[UIManager] Failed to load endings, using default');
            }
        }

        if (ending) {
            // 更新结局标题/描述
            document.querySelector('.ending-title').textContent = ending.title;
            document.querySelector('.ending-subtitle').textContent = ending.subtitle;
            const journeyEl = document.querySelector('.journey-complete');
            if (journeyEl) {
                journeyEl.innerHTML = `<p>${ending.description}</p>`;
            }
            // 更新动画 emoji
            const animEl = document.querySelector('.ending-animation');
            if (animEl && ending.animation) {
                animEl.innerHTML = ending.animation.map(e => `<span>${e}</span>`).join('');
            }
            // 更新证书等级
            const certLabel = document.querySelector('.cert-name-label:last-child');
            if (certLabel) {
                certLabel.textContent = `已完成全部培训（${ending.certificateLevel}）`;
            }
            // 设置结局主题样式
            const endingScreen = document.getElementById('ending-screen');
            endingScreen.classList.remove('ending-basic', 'ending-good', 'ending-perfect');
            endingScreen.classList.add(`ending-${ending.id}`);
        }

        GameState.save();
        this.checkAndShowAchievements();
    },

    checkAndShowAchievements() {
        const achievements = [];
        if (GameState.score >= 800) achievements.push({ icon: '🏆', name: '完美决策者', desc: '获得800分以上' });
        if (GameState.unlockedCards.length >= 8) achievements.push({ icon: '📚', name: '知识收藏家', desc: '解锁全部知识卡' });
        if (GameState.completionTime && GameState.completionTime < 600000) {
            achievements.push({ icon: '⚡', name: '速通达人', desc: '10分钟内通关' });
        }

        const container = document.getElementById('achievements-list');
        if (container) {
            container.innerHTML = '';
            if (achievements.length > 0) {
                container.style.display = 'block';
                achievements.forEach(ach => {
                    const el = document.createElement('div');
                    el.className = 'achievement-item';
                    el.innerHTML = `<span class="achievement-icon">${ach.icon}</span><div><div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div></div>`;
                    container.appendChild(el);
                });
            }
        }
    },

    // ===== 玩家姓名确认 =====

    confirmPlayerName() {
        const nameInput = document.getElementById('player-name-input');
        const playerName = nameInput.value.trim();
        if (!playerName) {
            nameInput.focus();
            nameInput.style.borderColor = '#ff6b6b';
            setTimeout(() => nameInput.style.borderColor = '', 1000);
            return;
        }
        document.getElementById('name-input-section').style.display = 'none';
        document.getElementById('certificate').style.display = 'block';
        document.getElementById('cert-player-name').textContent = playerName;
        const now = new Date();
        document.getElementById('cert-date').textContent = `通关日期：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        localStorage.setItem('velotric_player_name', playerName);
    },

    // ===== 证书下载 =====

    downloadCertificate() {
        const container = document.getElementById('certificate');
        const btn = document.getElementById('download-cert-btn');
        if (!container || !btn) return;

        const btnContainer = btn.parentNode;
        const originalDisplay = btnContainer.style.display;
        btnContainer.style.display = 'none';

        html2canvas(container, { backgroundColor: null, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Velotric_Certificate_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            btnContainer.style.display = originalDisplay;
        }).catch(err => {
            console.error('证书生成失败:', err);
            btnContainer.style.display = originalDisplay;
        });
    },

    // ===== 海报功能 =====

    showPosterModal() {
        const modal = document.getElementById('poster-modal');
        if (!modal) return;

        const playerName = GameEngine.state.playerName || '勇敢的探索者';
        document.getElementById('poster-player-name').textContent = playerName;
        document.getElementById('poster-score').textContent = GameState.score;
        document.getElementById('poster-cards').textContent = GameState.unlockedCards.length;
        document.getElementById('poster-chapters').textContent = GameState.completedChapters.length || 8;
        document.getElementById('poster-date').textContent = new Date().toLocaleDateString('zh-CN');

        modal.style.display = 'flex';
    },

    downloadPoster() {
        const posterCard = document.getElementById('poster-card');
        if (!posterCard) return;

        html2canvas(posterCard, {
            backgroundColor: null,
            scale: 2,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Velotric_Poster_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('海报生成失败:', err);
            alert('海报生成失败，请重试');
        });
    },

    async copyPosterToClipboard() {
        const posterCard = document.getElementById('poster-card');
        if (!posterCard) return;

        try {
            const canvas = await html2canvas(posterCard, {
                backgroundColor: null,
                scale: 2,
                useCORS: true
            });

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('海报已复制到剪贴板！');
                } catch (e) {
                    console.error('复制失败:', e);
                    alert('复制失败，请使用保存图片功能');
                }
            }, 'image/png');
        } catch (err) {
            console.error('海报生成失败:', err);
            alert('海报生成失败，请重试');
        }
    },

    // ===== 章节选择 =====

    async showChapterSelector() {
        const modal = document.getElementById('chapter-select-modal');
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        const chaptersData = StoryLoader.cache.chapters || await StoryLoader.loadChapters();
        chaptersData.chapters.forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.innerHTML = `
                <div class="chapter-item-number">${chapter.id}</div>
                <div class="chapter-item-info">
                    <div class="chapter-item-title">${chapter.title}</div>
                    <div class="chapter-item-location">📍 ${chapter.location}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                modal.style.display = 'none';
                Game.startChapter(chapter.id);
            });
            list.appendChild(item);
        });
        modal.style.display = 'flex';
    },

    // ===== 知识卡图鉴 =====

    _cardFilter: 'all',

    showCardsScreen() {
        this.switchScreen('cards');
        this._cardFilter = 'all';
        this._renderCardsWithFilter();
    },

    _renderCardsWithFilter() {
        const grid = document.getElementById('cards-grid');
        grid.innerHTML = '';

        const allCards = StoryLoader.cache.knowledgeCards || {};
        const categoryNames = {
            all: '全部', product: '产品', engineering: '工程',
            manufacturing: '制造', logistics: '物流', sales: '销售', marketing: '营销'
        };
        const tierLabels = { basic: '基础', advanced: '进阶', expert: '专家' };
        const tierColors = { basic: '#4CAF50', advanced: '#2196F3', expert: '#FF9800' };

        // 分类筛选栏
        let filterBar = document.getElementById('cards-filter-bar');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.id = 'cards-filter-bar';
            filterBar.className = 'cards-filter-bar';
            grid.parentNode.insertBefore(filterBar, grid);
        }
        filterBar.innerHTML = '';
        const categories = ['all', ...Object.keys(StoryLoader.getCardCategories())];
        categories.forEach(cat => {
            const tag = document.createElement('button');
            tag.className = `filter-tag ${this._cardFilter === cat ? 'active' : ''}`;
            tag.textContent = categoryNames[cat] || cat;
            tag.onclick = () => { this._cardFilter = cat; this._renderCardsWithFilter(); };
            filterBar.appendChild(tag);
        });

        // 过滤并渲染卡片
        const filtered = Object.entries(allCards).filter(([, card]) =>
            this._cardFilter === 'all' || card.category === this._cardFilter
        );
        document.getElementById('cards-count').textContent = `${GameState.unlockedCards.length}/${Object.keys(allCards).length}`;

        filtered.forEach(([id, card]) => {
            const isUnlocked = GameState.unlockedCards.includes(id);
            const tier = card.tier || 'basic';
            const cardEl = document.createElement('div');
            cardEl.className = `card-item ${isUnlocked ? '' : 'locked'}`;
            cardEl.innerHTML = `
                <div class="card-item-header">
                    <div class="card-item-icon">${isUnlocked ? '💡' : '🔒'}</div>
                    <div>
                        <div class="card-item-title">${isUnlocked ? card.title : '???'}</div>
                        ${isUnlocked ? `<span class="card-tier-badge" style="background:${tierColors[tier]}">${tierLabels[tier]}</span>` : ''}
                    </div>
                </div>
                <div class="card-item-preview">${isUnlocked ? card.content : '探索剧情解锁此知识点'}</div>
            `;
            if (isUnlocked) {
                cardEl.style.cursor = 'pointer';
                cardEl.onclick = () => this.showCardDetail(id);
            }
            grid.appendChild(cardEl);
        });
    },

    showCardDetail(cardId) {
        const card = StoryLoader.getKnowledgeCard(cardId);
        if (!card) return;

        const tierLabels = { basic: '基础', advanced: '进阶', expert: '专家' };
        const categoryNames = {
            product: '产品', engineering: '工程', manufacturing: '制造',
            logistics: '物流', sales: '销售', marketing: '营销'
        };

        let modal = document.getElementById('card-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'card-detail-modal';
            modal.className = 'card-detail-modal';
            document.body.appendChild(modal);
        }

        const relatedHtml = (card.relatedCards || []).map(rid => {
            const rc = StoryLoader.getKnowledgeCard(rid);
            const unlocked = GameState.unlockedCards.includes(rid);
            return rc ? `<span class="related-card-tag ${unlocked ? '' : 'locked'}">${unlocked ? rc.title : '???'}</span>` : '';
        }).join('');

        modal.innerHTML = `
            <div class="card-detail-content">
                <button class="btn-close card-detail-close">×</button>
                <div class="card-detail-header">
                    <span class="card-detail-icon">💡</span>
                    <h3>${card.title}</h3>
                </div>
                <div class="card-detail-meta">
                    <span class="card-category-badge">${categoryNames[card.category] || card.category}</span>
                    <span class="card-tier-badge card-tier-${card.tier}">${tierLabels[card.tier] || card.tier}</span>
                </div>
                <p class="card-detail-body">${card.content}</p>
                ${relatedHtml ? `<div class="card-detail-related"><h4>相关知识卡</h4><div class="related-cards-list">${relatedHtml}</div></div>` : ''}
            </div>
        `;
        modal.style.display = 'flex';
        modal.querySelector('.card-detail-close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    },

    goBackToEndingOrMenu() {
        this.switchScreen('ending');
    },

    // ===== 知识测评 =====

    showAssessmentSetup() {
        this.switchScreen('assessment');
        document.getElementById('assessment-setup').style.display = 'flex';
        document.getElementById('assessment-body').style.display = 'none';
        document.getElementById('assessment-results').style.display = 'none';
        document.getElementById('assessment-progress').textContent = '';
    },

    async startAssessment() {
        const timed = document.getElementById('assessment-timed').checked;
        const count = await AssessmentEngine.startAssessment({ timed, timeLimit: 600 });

        if (count === 0) {
            alert('暂无可用题目');
            return;
        }

        document.getElementById('assessment-setup').style.display = 'none';
        document.getElementById('assessment-body').style.display = 'flex';
        document.getElementById('assessment-results').style.display = 'none';

        // 定时器显示
        const timerEl = document.getElementById('assessment-timer');
        if (timed) {
            timerEl.style.display = 'flex';
            this._assessmentTimerInterval = setInterval(() => {
                const remaining = AssessmentEngine.getRemainingTime();
                if (remaining === null || remaining <= 0) {
                    clearInterval(this._assessmentTimerInterval);
                    this.showAssessmentResults();
                    return;
                }
                const min = Math.floor(remaining / 60);
                const sec = remaining % 60;
                document.getElementById('timer-value').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
            }, 1000);
            AssessmentEngine._onTimeout = () => this.showAssessmentResults();
        } else {
            timerEl.style.display = 'none';
        }

        this.renderAssessmentQuestion();
    },

    renderAssessmentQuestion() {
        const question = AssessmentEngine.getCurrentQuestion();
        if (!question) {
            this.showAssessmentResults();
            return;
        }

        const idx = AssessmentEngine.currentIndex;
        const total = AssessmentEngine.questions.length;
        document.getElementById('assessment-progress').textContent = `${idx + 1}/${total}`;
        document.getElementById('assessment-progress-fill').style.width = `${((idx) / total) * 100}%`;
        document.getElementById('assessment-question-number').textContent = `第 ${idx + 1} 题`;
        document.getElementById('assessment-question-text').textContent = question.question;

        const answersContainer = document.getElementById('assessment-answers');
        answersContainer.innerHTML = '';
        document.getElementById('assessment-explanation').style.display = 'none';

        question.options.forEach((opt, i) => {
            const btn = document.createElement('div');
            btn.className = 'choice-btn choice-slide-in';
            btn.style.animationDelay = `${i * 80}ms`;
            btn.innerHTML = `<div class="choice-letter">${String.fromCharCode(65 + i)}</div>${opt}`;
            btn.onclick = () => this._handleAssessmentAnswer(i, btn);
            answersContainer.appendChild(btn);
        });
    },

    _handleAssessmentAnswer(answerIndex, btnEl) {
        // 禁止重复点击
        const allBtns = document.querySelectorAll('#assessment-answers .choice-btn');
        allBtns.forEach(b => { b.style.pointerEvents = 'none'; });

        const result = AssessmentEngine.answerQuestion(answerIndex);
        if (!result) return;

        // 标记正确/错误
        if (result.correct) {
            btnEl.classList.add('correct-choice');
        } else {
            btnEl.classList.add('wrong-choice');
            // 标记正确答案
            allBtns[result.correctIndex]?.classList.add('hint-correct');
        }

        // 显示解析
        const explanationEl = document.getElementById('assessment-explanation');
        const contentEl = document.getElementById('explanation-content');
        contentEl.innerHTML = `<span class="explanation-verdict ${result.correct ? 'correct' : 'wrong'}">${result.correct ? '回答正确' : '回答错误'}</span> ${result.explanation}`;
        explanationEl.style.display = 'block';

        // 更新进度条
        const idx = AssessmentEngine.currentIndex;
        const total = AssessmentEngine.questions.length;
        document.getElementById('assessment-progress-fill').style.width = `${(idx / total) * 100}%`;

        // 如果是最后一题，按钮文字改变
        const nextBtn = document.getElementById('next-question-btn');
        nextBtn.textContent = idx >= total ? '查看结果' : '下一题';
    },

    showAssessmentResults() {
        if (this._assessmentTimerInterval) {
            clearInterval(this._assessmentTimerInterval);
            this._assessmentTimerInterval = null;
        }

        const results = AssessmentEngine.getResults();

        document.getElementById('assessment-setup').style.display = 'none';
        document.getElementById('assessment-body').style.display = 'none';
        document.getElementById('assessment-results').style.display = 'flex';

        // 图标和标题
        let icon = '📝', title = '继续加油';
        if (results.percentage >= 90) { icon = '🏆'; title = '太棒了！'; }
        else if (results.percentage >= 70) { icon = '🌟'; title = '表现优秀！'; }
        else if (results.percentage >= 50) { icon = '💪'; title = '还不错！'; }
        document.getElementById('results-icon').textContent = icon;
        document.getElementById('results-title').textContent = title;

        // 分数
        document.getElementById('results-percentage').textContent = `${results.percentage}%`;
        document.getElementById('results-correct').textContent = results.score;
        document.getElementById('results-total').textContent = results.total;

        // 用时
        const min = Math.floor(results.timeSpent / 60);
        const sec = results.timeSpent % 60;
        document.getElementById('results-time').textContent = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;

        // 圆环颜色
        const circle = document.getElementById('results-circle');
        if (results.percentage >= 90) circle.style.borderColor = 'var(--success)';
        else if (results.percentage >= 70) circle.style.borderColor = 'var(--primary)';
        else if (results.percentage >= 50) circle.style.borderColor = 'var(--warning)';
        else circle.style.borderColor = 'hsl(0, 70%, 55%)';

        // 错题列表
        const wrongListEl = document.getElementById('results-wrong-list');
        const wrongItemsEl = document.getElementById('wrong-items');
        if (results.wrongAnswers.length > 0) {
            wrongListEl.style.display = 'block';
            wrongItemsEl.innerHTML = results.wrongAnswers.map(w => `
                <div class="wrong-item">
                    <div class="wrong-question">${w.question}</div>
                    <div class="wrong-detail">
                        <span class="wrong-given">你的答案：${w.givenAnswer}</span>
                        <span class="wrong-correct">正确答案：${w.correctAnswer}</span>
                    </div>
                </div>
            `).join('');
        } else {
            wrongListEl.style.display = 'none';
        }

        document.getElementById('assessment-progress').textContent = '完成';
    },

    // ===== DLC 选择器 =====

    async showDLCSelector() {
        let modal = document.getElementById('dlc-selector-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dlc-selector-modal';
            modal.className = 'card-detail-modal';
            document.body.appendChild(modal);
        }

        const registry = await DLCLoader.loadRegistry();
        const dlcListHtml = registry.map(dlc => {
            const progress = localStorage.getItem(`velotric_dlc_${dlc.id}_complete`) ? 'completed' : 'available';
            return `
                <div class="dlc-item" data-dlc-id="${dlc.id}">
                    <div class="dlc-item-icon">${dlc.icon || '📦'}</div>
                    <div class="dlc-item-info">
                        <div class="dlc-item-name">${dlc.name}</div>
                        <div class="dlc-item-desc">${dlc.description || ''}</div>
                        <div class="dlc-item-meta">${dlc.chapters} 章节 · ${dlc.cards} 知识卡</div>
                    </div>
                    <span class="dlc-status ${progress}">${progress === 'completed' ? '已完成' : '开始'}</span>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="card-detail-content">
                <button class="btn-close card-detail-close">×</button>
                <h3 style="margin-bottom:16px">📦 DLC 扩展剧情</h3>
                <div class="dlc-list">${dlcListHtml || '<p style="color:var(--text-muted)">暂无可用 DLC</p>'}</div>
            </div>
        `;
        modal.style.display = 'flex';
        modal.querySelector('.card-detail-close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

        modal.querySelectorAll('.dlc-item').forEach(item => {
            item.addEventListener('click', () => {
                modal.style.display = 'none';
                Game.startDLC(item.dataset.dlcId);
            });
        });
    },

    // ===== 地图 =====

    async showMap() {
        const modal = document.getElementById('map-modal');
        const container = document.getElementById('map-visual');
        if (!modal || !container) return;

        container.innerHTML = '';
        const chaptersData = StoryLoader.cache.chapters || await StoryLoader.loadChapters();
        const currentId = GameState.currentChapterId;
        const completedIds = GameState.completedChapters;

        chaptersData.chapters.forEach((chapter) => {
            const isUnlocked = chapter.id <= currentId || completedIds.includes(chapter.id);
            const isCompleted = completedIds.includes(chapter.id) || chapter.id < currentId;
            const isCurrent = chapter.id === currentId;

            let statusClass = 'locked';
            if (isCurrent) statusClass = 'current unlocked';
            else if (isCompleted) statusClass = 'completed unlocked';
            else if (isUnlocked) statusClass = 'unlocked';

            const row = document.createElement('div');
            row.className = 'map-row';
            row.innerHTML = `
                <div class="map-node ${statusClass}" data-id="${chapter.id}">
                    <div class="map-node-icon">${chapter.icon || '📍'}</div>
                    <div class="map-node-info">
                        <div class="map-node-title">第${chapter.id}章 ${chapter.title}</div>
                        <div class="map-node-desc">${chapter.location}</div>
                    </div>
                </div>
            `;

            if (statusClass.includes('unlocked')) {
                row.querySelector('.map-node').addEventListener('click', () => {
                    if (isCurrent) {
                        modal.style.display = 'none';
                        return;
                    }
                    if (isCompleted || isCurrent) {
                        if (confirm(`是否跳转到 第${chapter.id}章？\n注意：当前进度可能会丢失`)) {
                            modal.style.display = 'none';
                            Game.startChapter(chapter.id);
                        }
                    }
                });
            }

            container.appendChild(row);
        });

        modal.style.display = 'flex';
    },

    // ===== 选择反馈特效 =====

    showConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        for (let i = 0; i < 16; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.background = colors[i % colors.length];
            const angle = (i / 16) * Math.PI * 2;
            const dist = 60 + Math.random() * 100;
            piece.style.setProperty('--cx', `${Math.cos(angle) * dist}px`);
            piece.style.setProperty('--cy', `${Math.sin(angle) * dist - 40}px`);
            piece.style.setProperty('--cr', `${Math.random() * 720 - 360}deg`);
            piece.style.animationDelay = `${Math.random() * 0.15}s`;
            container.appendChild(piece);
        }
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 1500);
    },

    showScreenShake() {
        const screen = document.getElementById('game-screen');
        screen.classList.add('screen-shake');
        setTimeout(() => screen.classList.remove('screen-shake'), 400);
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
