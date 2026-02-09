/**
 * StoryLoader - 剧情数据加载器
 * 负责从 JSON 文件加载章节配置和剧情脚本
 */
const StoryLoader = {
    // 缓存已加载的数据
    cache: {
        chapters: null,
        knowledgeCards: null,
        scripts: {}
    },

    /**
     * 加载章节列表配置
     * @returns {Promise<Object>} 章节配置对象
     */
    async loadChapters() {
        if (this.cache.chapters) {
            return this.cache.chapters;
        }

        try {
            const response = await fetch('data/chapters.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('Failed to load chapters.json');
            const data = await response.json();
            this.cache.chapters = data;
            console.log('[StoryLoader] Chapters loaded:', data.chapters.length);
            return data;
        } catch (error) {
            console.error('[StoryLoader] Error loading chapters:', error);
            throw error;
        }
    },

    /**
     * 加载知识卡片数据
     * @returns {Promise<Object>} 知识卡片配置对象
     */
    async loadKnowledgeCards() {
        if (this.cache.knowledgeCards) {
            return this.cache.knowledgeCards;
        }

        try {
            const response = await fetch('data/knowledgeCards.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('Failed to load knowledgeCards.json');
            const data = await response.json();
            this.cache.knowledgeCards = data;
            console.log('[StoryLoader] Knowledge cards loaded:', Object.keys(data).length);
            return data;
        } catch (error) {
            console.error('[StoryLoader] Error loading knowledge cards:', error);
            throw error;
        }
    },

    /**
     * 加载指定章节的剧情脚本
     * @param {number} chapterId - 章节 ID
     * @returns {Promise<Object>} 剧情脚本对象
     */
    async loadChapterScript(chapterId) {
        if (this.cache.scripts[chapterId]) {
            return this.cache.scripts[chapterId];
        }

        try {
            const response = await fetch(`data/scripts/chapter_${chapterId}.json`, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`Failed to load chapter_${chapterId}.json`);
            const data = await response.json();
            this.cache.scripts[chapterId] = data;
            console.log(`[StoryLoader] Chapter ${chapterId} script loaded`);
            return data;
        } catch (error) {
            console.error(`[StoryLoader] Error loading chapter ${chapterId}:`, error);
            throw error;
        }
    },

    /**
     * 预加载所有核心数据（用于游戏启动时）
     * @returns {Promise<void>}
     */
    async preloadAll() {
        console.log('[StoryLoader] Preloading all data...');
        await Promise.all([
            this.loadChapters(),
            this.loadKnowledgeCards()
        ]);
        console.log('[StoryLoader] Core data preloaded');
    },

    /**
     * 获取章节信息（同步方法，需先调用 loadChapters）
     * @param {number} chapterId - 章节 ID
     * @returns {Object|null} 章节信息
     */
    getChapter(chapterId) {
        if (!this.cache.chapters) {
            console.warn('[StoryLoader] Chapters not loaded yet');
            return null;
        }
        return this.cache.chapters.chapters.find(c => c.id === chapterId);
    },

    /**
     * 获取知识卡片信息（同步方法）
     * @param {string} cardId - 卡片 ID
     * @returns {Object|null} 卡片信息
     */
    getKnowledgeCard(cardId) {
        // Search main cards first
        if (this.cache.knowledgeCards && this.cache.knowledgeCards[cardId]) {
            return this.cache.knowledgeCards[cardId];
        }
        // Then search loaded DLC cards
        if (typeof DLCLoader !== 'undefined') {
            for (const dlc of Object.values(DLCLoader.loadedDLCs)) {
                if (dlc.knowledgeCards && dlc.knowledgeCards[cardId]) {
                    return dlc.knowledgeCards[cardId];
                }
            }
        }
        return null;
    },

    /**
     * Get all cards merged (main + loaded DLCs)
     * @returns {Object} { cardId: cardData }
     */
    getAllCards() {
        const allCards = { ...(this.cache.knowledgeCards || {}) };
        if (typeof DLCLoader !== 'undefined') {
            for (const dlc of Object.values(DLCLoader.loadedDLCs)) {
                if (dlc.knowledgeCards) {
                    Object.assign(allCards, dlc.knowledgeCards);
                }
            }
        }
        return allCards;
    },

    /**
     * 按分类获取知识卡片
     * @param {string} category - 分类名
     * @returns {Object} { cardId: cardData }
     */
    getCardsByCategory(category) {
        const allCards = this.getAllCards();
        const result = {};
        Object.entries(allCards).forEach(([id, card]) => {
            if (card.category === category) result[id] = card;
        });
        return result;
    },

    /**
     * 按层级获取知识卡片
     * @param {string} tier - basic/advanced/expert
     * @returns {Object} { cardId: cardData }
     */
    getCardsByTier(tier) {
        const allCards = this.getAllCards();
        const result = {};
        Object.entries(allCards).forEach(([id, card]) => {
            if (card.tier === tier) result[id] = card;
        });
        return result;
    },

    /**
     * 获取所有卡片分类及其计数
     * @returns {Object} { category: count }
     */
    getCardCategories() {
        const allCards = this.getAllCards();
        const counts = {};
        Object.values(allCards).forEach(card => {
            const cat = card.category || 'other';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    },

    /**
     * 清除缓存（用于调试或重新加载）
     */
    clearCache() {
        this.cache = {
            chapters: null,
            knowledgeCards: null,
            scripts: {}
        };
        console.log('[StoryLoader] Cache cleared');
    }
};

// 导出（兼容 ES Module 和普通脚本）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoryLoader;
}
