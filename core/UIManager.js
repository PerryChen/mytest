// ==========================================
// 🖥️ UI 管理器 UIManager
// ==========================================

/**
 * UIManager - 视图层管理器
 * 负责所有 UI 元素的渲染和交互
 * NOTE: 从 game.js 中的 UI 对象迁移而来
 */
const UIManager = {
    // 缓存的 DOM 元素引用
    elements: null,

    /**
     * 初始化 UI 管理器
     */
    init() {
        // 缓存 DOM 元素
        this.elements = {
            screens: {
                cards: document.getElementById('cards-screen')
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

        // 绑定地图按钮事件
        const mapBtn = document.getElementById('map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => {
                console.log('[UIManager] Map button clicked');
                if (typeof Game !== 'undefined' && Game.showMap) {
                    Game.showMap();
                } else {
                    console.error('[UIManager] Game.showMap not found');
                }
            });
        }

        const closeMapBtn = document.getElementById('close-map-btn');
        if (closeMapBtn) {
            closeMapBtn.addEventListener('click', () => {
                document.getElementById('map-modal').style.display = 'none';
            });
        }

        console.log('[UIManager] Ready');
    },

    /**
     * 切换屏幕
     * @param {string} screenName - 屏幕名称
     */
    switchScreen(screenName) {
        Object.values(this.elements.screens).forEach(s => s.classList.remove('active'));
        this.elements.screens[screenName].classList.add('active');
    },

    /**
     * 更新场景信息
     * @param {Object} chapter - 章节对象
     */
    updateScene(chapter) {
        const { header, scene } = this.elements;

        header.badge.textContent = `第${chapter.id}章`;
        header.title.textContent = chapter.title;
        header.location.textContent = chapter.location;

        // 日期更新动画
        const oldDate = header.date.textContent;
        if (oldDate !== chapter.date) {
            header.date.textContent = chapter.date;
            header.date.classList.remove('date-change');
            void header.date.offsetWidth; // 强制重绘
            header.date.classList.add('date-change');
        }

        // 更新进度条
        const totalChapters = StoryLoader.cache.chapters?.chapters?.length || 8;
        const progress = (chapter.id / totalChapters) * 100;
        document.getElementById('progress-text').textContent = `${chapter.id} / ${totalChapters}`;
        document.getElementById('progress-fill').style.width = `${progress}%`;

        // 更新背景
        scene.bg.className = `scene-background ${chapter.sceneClass}`;
    },

    /**
     * 渲染对话节点
     * @param {Object} node - 对话节点
     * @param {Function} onChoiceMade - 选择回调
     */
    renderDialogue(node, onChoiceMade) {
        const { dialog, scene } = this.elements;

        dialog.name.textContent = node.speaker;
        dialog.avatar.textContent = node.avatar;

        // 角色立绘
        scene.characterArea.innerHTML = '';
        const charDiv = document.createElement('div');
        charDiv.className = 'character speaking';
        charDiv.innerHTML = `<div class="character-avatar">${node.avatar}</div>`;
        scene.characterArea.appendChild(charDiv);

        // 清空选项
        dialog.choices.innerHTML = '';
        dialog.choices.style.display = 'none';
        dialog.indicator.style.display = 'none';

        // 打字机效果
        this._typeWriter(node.text, dialog.text, () => {
            dialog.indicator.style.display = 'block';
            if (node.choices && node.choices.length > 0) {
                this._renderChoices(node.choices, onChoiceMade);
            }
        });
    },

    /**
     * 内部打字机实现
     * @private
     */
    _typeWriter(text, element, onComplete) {
        if (this._rafId) cancelAnimationFrame(this._rafId);

        let index = 0;
        let lastCharTime = 0;
        const speed = 30; // ms per character
        element.textContent = '';

        this.isTyping = true;
        this.currentTypeWriter = {
            text,
            element,
            onComplete,
            skip: () => {
                if (this._rafId) cancelAnimationFrame(this._rafId);
                element.textContent = text;
                this.isTyping = false;
                if (onComplete) onComplete();
            }
        };

        let lastSoundTime = 0;

        const tick = (timestamp) => {
            if (!this.isTyping) return;

            if (lastCharTime === 0) lastCharTime = timestamp;

            while (timestamp - lastCharTime >= speed && index < text.length) {
                element.textContent += text[index];
                index++;
                lastCharTime += speed;

                const now = Date.now();
                if (now - lastSoundTime > 80 && typeof AudioManager !== 'undefined') {
                    AudioManager.playTyping();
                    lastSoundTime = now;
                }
            }

            if (index >= text.length) {
                this.isTyping = false;
                if (onComplete) onComplete();
                return;
            }

            this._rafId = requestAnimationFrame(tick);
        };

        this._rafId = requestAnimationFrame(tick);
    },

    /**
     * 跳过打字
     */
    skipTyping() {
        if (this.isTyping && this.currentTypeWriter) {
            this.currentTypeWriter.skip();
            return true;
        }
        return false;
    },

    /**
     * 渲染选项按钮
     * @private
     */
    _renderChoices(choices, onChoiceMade) {
        const container = this.elements.dialog.choices;
        container.style.display = 'flex';

        choices.forEach((choice, index) => {
            const btn = document.createElement('div');
            btn.className = 'choice-btn choice-slide-in';
            btn.style.pointerEvents = 'none';
            btn.style.animationDelay = `${index * 100}ms`;
            btn.innerHTML = `<div class="choice-letter">${String.fromCharCode(65 + index)}</div>${choice.text}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                if (onChoiceMade) onChoiceMade(choice, btn);
            };
            container.appendChild(btn);
        });

        // 延迟启用点击（移动端优化）
        setTimeout(() => {
            container.querySelectorAll('.choice-btn').forEach(btn => {
                btn.style.pointerEvents = 'auto';
            });
        }, 500);
    },

    /**
     * 显示知识卡弹窗
     * @param {string} cardId - 卡片 ID
     */
    showKnowledgeCard(cardId) {
        const card = StoryLoader.getKnowledgeCard(cardId);
        if (!card) {
            console.warn('[UIManager] Card not found:', cardId);
            return;
        }

        const { popup } = this.elements;
        popup.title.textContent = card.title;
        popup.content.textContent = card.content;
        popup.container.style.display = 'flex';
    },

    /**
     * 隐藏知识卡弹窗
     */
    hideKnowledgeCard() {
        this.elements.popup.container.style.display = 'none';
    },

    /**
     * 显示章节过渡画面
     * @param {Object} chapter - 章节对象
     * @param {Function} callback - 完成回调
     */
    showTransition(chapter, callback) {
        this.switchScreen('transition');

        document.getElementById('transition-chapter').textContent = `第${chapter.id}章`;
        document.getElementById('transition-title').textContent = chapter.title;
        document.getElementById('transition-location').textContent = `📍 ${chapter.location}`;

        setTimeout(() => {
            if (callback) callback();
        }, 2000);
    },

    /**
     * 显示章节完成画面
     * @param {number} chapterId - 章节 ID
     * @param {number} score - 当前分数
     */
    showChapterComplete(chapterId, score) {
        this.switchScreen('complete');
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playComplete();
        }

        const chapter = StoryLoader.getChapter(chapterId);
        document.getElementById('complete-chapter-name').textContent = `第${chapter.id}章：${chapter.title}`;
        document.getElementById('chapter-score').textContent = score;
        document.getElementById('decisions-count').textContent = '1';

        // 显示本章获得的知识卡
        this._renderChapterCards(chapterId);
    },

    /**
     * 渲染章节知识卡
     * @private
     */
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

    /**
     * 显示游戏结束画面
     * @param {number} score - 总分
     * @param {number} cardCount - 解锁卡片数
     */
    showEnding(score, cardCount) {
        this.switchScreen('ending');
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playEnding();
        }

        document.getElementById('total-score').textContent = score;
        document.getElementById('total-cards').textContent = cardCount;
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
