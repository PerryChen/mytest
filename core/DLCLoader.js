/**
 * DLCLoader - DLC 内容加载器
 * 负责加载和管理扩展内容包
 */
const DLCLoader = {
    // 已加载的 DLC 列表
    loadedDLCs: {},

    /**
     * 加载 DLC 清单
     * @param {string} dlcId - DLC ID
     * @returns {Promise<Object>} DLC 清单
     */
    async loadManifest(dlcId) {
        try {
            const response = await fetch(`data/dlcs/${dlcId}/manifest.json`);
            if (!response.ok) throw new Error(`Failed to load DLC: ${dlcId}`);
            const manifest = await response.json();
            this.loadedDLCs[dlcId] = manifest;
            console.log(`[DLCLoader] Loaded DLC: ${manifest.name}`);
            return manifest;
        } catch (error) {
            console.error(`[DLCLoader] Error loading DLC ${dlcId}:`, error);
            throw error;
        }
    },

    /**
     * 加载 DLC 章节脚本
     * @param {string} dlcId - DLC ID
     * @param {string} scriptFile - 脚本文件名
     * @returns {Promise<Object>} 脚本内容
     */
    async loadScript(dlcId, scriptFile) {
        try {
            const response = await fetch(`data/dlcs/${dlcId}/${scriptFile}`);
            if (!response.ok) throw new Error(`Failed to load script: ${scriptFile}`);
            return await response.json();
        } catch (error) {
            console.error(`[DLCLoader] Error loading script:`, error);
            throw error;
        }
    },

    /**
     * 获取 DLC 知识卡片
     * @param {string} dlcId - DLC ID
     * @param {string} cardId - 卡片 ID
     * @returns {Object|null} 卡片内容
     */
    getKnowledgeCard(dlcId, cardId) {
        const dlc = this.loadedDLCs[dlcId];
        if (!dlc || !dlc.knowledgeCards) return null;
        return dlc.knowledgeCards[cardId];
    },

    /**
     * 获取可用 DLC 列表
     * @returns {Promise<Array>} DLC 列表
     */
    async getAvailableDLCs() {
        // 简单实现：返回已知的 DLC ID 列表
        // 生产环境可从服务器获取
        return ['gtm_demo'];
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DLCLoader;
}
