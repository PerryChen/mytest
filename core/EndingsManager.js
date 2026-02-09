/**
 * EndingsManager - 结局配置管理
 * 根据总分加载对应的结局数据
 */
const EndingsManager = {
    cache: null,

    /**
     * 加载结局配置
     * @returns {Promise<Object>} 结局配置
     */
    async loadEndings() {
        if (this.cache) return this.cache;

        try {
            const response = await fetch('data/endings.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('Failed to load endings.json');
            const data = await response.json();
            this.cache = data;
            console.log('[EndingsManager] Endings loaded:', data.endings.length);
            return data;
        } catch (error) {
            console.error('[EndingsManager] Error loading endings:', error);
            throw error;
        }
    },

    /**
     * 根据总分获取对应结局
     * @param {number} score - 玩家总分
     * @returns {Object} 结局配置
     */
    getEndingForScore(score) {
        if (!this.cache || !this.cache.endings) {
            // fallback: 默认最高结局
            return {
                id: 'perfect', title: '完美通关',
                subtitle: '小唯的成长之旅圆满结束',
                description: '从深圳办公室到旧金山金门大桥，你见证了一辆 Velotric Discover 3 的诞生。',
                animation: ['🎊', '🏆', '🎊'],
                certificateLevel: '卓越'
            };
        }

        for (const ending of this.cache.endings) {
            if (score >= ending.minScore && score <= ending.maxScore) {
                return ending;
            }
        }

        // 找不到匹配时返回最后一个
        return this.cache.endings[this.cache.endings.length - 1];
    },

    /**
     * 根据 ID 获取结局
     * @param {string} id - 结局 ID
     * @returns {Object|null}
     */
    getEndingById(id) {
        if (!this.cache || !this.cache.endings) return null;
        return this.cache.endings.find(e => e.id === id) || null;
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EndingsManager;
}
