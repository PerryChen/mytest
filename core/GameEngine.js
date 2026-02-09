/**
 * GameEngine - 游戏核心引擎（精简版）
 * 负责游戏状态管理、存档、知识卡解锁
 * NOTE: v2.1 架构 - 移除冗余方法，仅保留被 game.js 调用的核心功能
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
        gameStartTime: null,
        completionTime: null
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
            gameStartTime: null,
            completionTime: null
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
     * @returns {boolean} 是否成功加载
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
