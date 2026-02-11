/**
 * DLCLoader - DLC 内容加载器
 * 负责加载和管理扩展内容包
 */
const DLCLoader = {
    // 已加载的 DLC 列表
    loadedDLCs: {},
    // DLC 注册表缓存
    _registry: null,

    /**
     * 加载 DLC 清单
     * @param {string} dlcId - DLC ID
     * @returns {Promise<Object>} DLC 清单
     */
    async loadManifest(dlcId) {
        try {
            const response = await fetch(`data/dlcs/${dlcId}/manifest.json`, { cache: 'no-cache' });
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
        // 优先从 Supabase 读取已发布版本
        if (typeof ScriptStorage !== 'undefined') {
            try {
                const match = scriptFile.match(/_(\d+)\.json$/);
                if (match) {
                    const chapterKey = `dlc_${dlcId}_${match[1]}`;
                    const published = await ScriptStorage.getPublished(chapterKey);
                    if (published) {
                        console.log(`[DLCLoader] Script loaded from Supabase: ${chapterKey}`);
                        return published;
                    }
                }
            } catch (e) {
                console.warn('[DLCLoader] Supabase fallback for script:', scriptFile);
            }
        }

        // 降级：静态 JSON 文件
        try {
            const response = await fetch(`data/dlcs/${dlcId}/${scriptFile}`, { cache: 'no-cache' });
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
     * 加载 DLC 注册表
     * @returns {Promise<Array>} DLC 列表详情
     */
    async loadRegistry() {
        if (this._registry) return this._registry;
        try {
            const response = await fetch('data/dlcs/registry.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('Failed to load DLC registry');
            const data = await response.json();
            this._registry = data.dlcs || [];
            console.log('[DLCLoader] Registry loaded:', this._registry.length, 'DLCs');
            return this._registry;
        } catch (error) {
            console.warn('[DLCLoader] Registry load failed, using fallback');
            this._registry = [{ id: 'gtm_demo', name: 'GTM 上市流程', icon: '🚀', chapters: 2, cards: 2 }];
            return this._registry;
        }
    },

    /**
     * 获取可用 DLC 列表（兼容旧接口）
     * @returns {Promise<Array>} DLC ID 列表
     */
    async getAvailableDLCs() {
        const registry = await this.loadRegistry();
        return registry.map(d => d.id);
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DLCLoader;
}
