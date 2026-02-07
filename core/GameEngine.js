/**
 * GameEngine - 游戏核心引擎
 * 负责游戏状态管理、剧情驱动、事件处理
 * NOTE: v2.0 架构 - 支持与 legacy UI 对象的混合运行
 */
const GameEngine = {
    // 当前游戏状态
    state: {
        currentChapterId: 1,
        currentDialogueId: 'start',
        score: 0,
        unlockedCards: [],
        completedChapters: [],
        playerName: '',
        gameStartTime: null
    },

    // 当前加载的脚本
    currentScript: null,

    // 等待用户选择标志
    isWaitingChoice: false,

    // 挂起的对话（知识卡关闭后显示）
    pendingDialogueNode: null,

    // 是否已初始化
    _initialized: false,

    // UI 引用（支持 legacy UI 或新 UIManager）
    _ui: null,

    /**
     * 初始化游戏引擎
     * @param {Object} options - 配置选项
     * @param {Object} options.ui - UI 对象引用（可选，默认使用全局 UI）
     * @returns {Promise<void>}
     */
    async init(options = {}) {
        if (this._initialized) return;

        console.log('[GameEngine] Initializing...');

        // 设置 UI 引用（优先使用传入的，其次使用 UIManager，最后使用 legacy UI）
        this._ui = options.ui || (typeof UIManager !== 'undefined' ? UIManager : null) || (typeof UI !== 'undefined' ? UI : null);

        // 预加载核心数据
        await StoryLoader.preloadAll();

        // 恢复存档（如果有）
        this.loadSaveData();

        this._initialized = true;
        console.log('[GameEngine] Ready');
    },

    /**
     * 开始新游戏
     */
    async startNewGame() {
        console.log('[GameEngine] Starting new game...');
        this.resetState();
        this.state.gameStartTime = Date.now();

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('game_start', { mode: 'new_game' });
        }

        await this.startChapter(1);
    },

    /**
     * 继续游戏
     */
    async continueGame() {
        console.log('[GameEngine] Continuing game...');
        this.loadSaveData();
        const chapterId = this.state.currentChapterId || 1;
        await this.startChapter(chapterId);
    },

    /**
     * 开始指定章节
     * @param {number} chapterId - 章节 ID
     */
    async startChapter(chapterId) {
        const chaptersData = StoryLoader.cache.chapters;
        const totalChapters = chaptersData?.chapters?.length || 8;

        if (chapterId > totalChapters) {
            this._showEnding();
            return;
        }

        console.log(`[GameEngine] Starting chapter ${chapterId}...`);



        // 加载章节脚本
        this.currentScript = await StoryLoader.loadChapterScript(chapterId);
        this.state.currentChapterId = chapterId;
        this.state.currentDialogueId = 'start';
        this.saveGame();

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('chapter_start', {
                chapter_id: chapterId,
                session_id: AnalyticsManager.session.id
            });
        }

        // 获取章节信息
        const chapter = StoryLoader.getChapter(chapterId);

        if (chapter && this._ui) {
            // 显示过渡画面
            if (this._ui.showTransition) {
                this._ui.showTransition(chapter, () => {
                    this._ui.switchScreen('game');
                    this.playDialogue('start');
                    this._ui.updateScene(chapter);
                });
            } else {
                console.log(`[GameEngine] Chapter loaded:`, chapter.title);
                this.playDialogue('start');
            }
        } else {
            this.playDialogue('start');
        }
    },

    /**
     * 播放指定对话节点
     * @param {string} nodeId - 对话节点 ID
     */
    playDialogue(nodeId) {
        if (!this.currentScript) {
            console.error('[GameEngine] No script loaded');
            return;
        }

        const node = this.currentScript[nodeId];
        if (!node) {
            console.error(`[GameEngine] Node not found: ${nodeId}`);
            return;
        }

        this.state.currentDialogueId = nodeId;

        // 检查是否有事件
        if (node.event) {
            this.handleEvent(node.event);
            return;
        }

        // 检查是否解锁知识卡
        if (node.unlockCard) {
            const isNew = this.unlockCard(node.unlockCard);
            if (isNew) {
                this.pendingDialogueNode = node;
                if (this._ui && this._ui.showKnowledgeCard) {
                    this._ui.showKnowledgeCard(node.unlockCard);
                }
                console.log(`[GameEngine] Unlocked card: ${node.unlockCard}`);
                return;
            }
        }

        // 渲染对话
        if (this._ui && this._ui.renderDialogue) {
            this._ui.renderDialogue(node);
        } else {
            console.log(`[GameEngine] Dialogue:`, node.speaker, '-', node.text);
        }

        // 设置等待状态
        this.isWaitingChoice = (node.choices && node.choices.length > 0);
    },

    /**
     * 推进对话（用户点击继续）
     */
    advanceDialogue() {
        if (this.isWaitingChoice) {
            console.log('[GameEngine] Waiting for choice, cannot advance');
            return;
        }

        // 如果使用 UIManager，先检查是否正在打字
        if (this._ui && this._ui.skipTyping && this._ui.isTyping) {
            this._ui.skipTyping();
            return;
        }

        // 兼容旧的 TypeWriter
        if (typeof TypeWriter !== 'undefined' && TypeWriter.isTyping) {
            TypeWriter.skip();
            return;
        }

        const currentNode = this.currentScript[this.state.currentDialogueId];
        if (currentNode && currentNode.next) {
            this.playDialogue(currentNode.next);
        }
    },

    /**
     * 处理用户选择
     * @param {Object} choice - 选择对象
     */
    makeChoice(choice) {
        console.log(`[GameEngine] Choice made:`, choice.text);

        // 计分
        if (choice.score) {
            this.state.score += choice.score;
        }

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('dialogue_choice', {
                chapter_id: this.state.currentChapterId,
                node_id: this.state.currentDialogueId,
                choice_text: choice.text,
                score_gain: choice.score || 0
            });
        }

        // 播放下一个对话
        this.isWaitingChoice = false;
        this.playDialogue(choice.next);
    },

    /**
     * 处理事件
     * @param {string} eventType - 事件类型
     */
    handleEvent(eventType) {
        console.log(`[GameEngine] Event:`, eventType);

        switch (eventType) {
            case 'chapter_complete':
                this._completeChapter();
                break;
            case 'game_complete':
                this._showEnding();
                break;
            default:
                console.warn(`[GameEngine] Unknown event: ${eventType}`);
        }
    },

    /**
     * 完成当前章节
     * @private
     */
    _completeChapter() {
        const chapterId = this.state.currentChapterId;
        if (!this.state.completedChapters.includes(chapterId)) {
            this.state.completedChapters.push(chapterId);
        }
        this.saveGame();
        console.log(`[GameEngine] Chapter ${chapterId} completed`);

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('chapter_complete', {
                chapter_id: chapterId,
                score: this.state.score
            });
        }

        // 优先使用 _ui，回退到全局 UI
        const ui = this._ui || (typeof UI !== 'undefined' ? UI : null);
        if (ui && ui.showChapterComplete) {
            ui.showChapterComplete(chapterId);
        }
    },

    /**
     * 显示游戏结束
     * @private
     */
    _showEnding() {
        console.log('[GameEngine] Game completed!');
        this.saveGame();

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('game_complete', {
                score: this.state.score,
                completion_time: Date.now() - this.state.gameStartTime,
                unlocked_cards_count: this.state.unlockedCards.length
            });
        }

        // 优先使用 _ui，回退到全局 UI
        const ui = this._ui || (typeof UI !== 'undefined' ? UI : null);
        if (ui && ui.showEnding) {
            ui.showEnding();
        }
    },

    /**
     * 解锁知识卡
     * @param {string} cardId - 卡片 ID
     * @returns {boolean} 是否是新解锁
     */
    unlockCard(cardId) {
        if (this.state.unlockedCards.includes(cardId)) {
            return false;
        }
        this.state.unlockedCards.push(cardId);
        this.saveGame();

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('card_unlocked', { card_id: cardId });
        }

        return true;
    },

    /**
     * 重置游戏状态
     */
    resetState() {
        this.state = {
            currentChapterId: 1,
            currentDialogueId: 'start',
            score: 0,
            unlockedCards: [],
            completedChapters: [],
            playerName: '',
            gameStartTime: null
        };
    },

    /**
     * 保存游戏
     */
    saveGame() {
        localStorage.setItem('velotric_save_v2', JSON.stringify(this.state));
        console.log('[GameEngine] Game saved');
    },

    /**
     * 加载存档
     */
    loadSaveData() {
        const saved = localStorage.getItem('velotric_save_v2');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state = { ...this.state, ...data };
                console.log('[GameEngine] Save data loaded');
                return true;
            } catch (e) {
                console.warn('[GameEngine] Failed to parse save data');
            }
        }
        return false;
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
}
