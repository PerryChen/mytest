/**
 * AnalyticsManager - 数据统计管理器
 * 负责收集和上报游戏行为数据
 * Phase 2 目标：接入 Supabase 或其他统计后端
 */
const AnalyticsManager = {
    _initialized: false,
    _config: {
        provider: 'supabase', // 'console' | 'supabase'
        debug: true,
        supabaseUrl: (typeof AppConfig !== 'undefined' && AppConfig.supabase?.url) || '',
        supabaseKey: (typeof AppConfig !== 'undefined' && AppConfig.supabase?.anonKey) || ''
    },

    _supabase: null,

    // 会话信息
    session: {
        id: null,
        startTime: null,
        userId: null
    },

    /**
     * 初始化统计模块
     * @param {Object} config 
     */
    init(config = {}) {
        if (this._initialized) return;

        this._config = { ...this._config, ...config };

        // 初始化 Session
        this.session.id = this._generateUUID();
        this.session.startTime = Date.now();
        this.session.userId = localStorage.getItem('velotric_user_id') || this._generateUUID();
        localStorage.setItem('velotric_user_id', this.session.userId);

        console.log(`[Analytics] Initialized. Session: ${this.session.id}`);

        // 初始化 Supabase
        if (this._config.provider === 'supabase' && typeof supabase !== 'undefined') {
            try {
                this._supabase = supabase.createClient(this._config.supabaseUrl, this._config.supabaseKey);
                console.log('[Analytics] Supabase Client Initialized');
            } catch (e) {
                console.error('[Analytics] Failed to init Supabase:', e);
            }
        }

        this._initialized = true;

        // 自动上报访问
        this.trackEvent('game_launch', {
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`
        });
    },

    /**
     * 追踪事件
     * @param {string} eventName 事件名称
     * @param {Object} properties 事件属性
     */
    trackEvent(eventName, properties = {}) {
        const payload = {
            event_name: eventName, // Supabase 字段推荐 snake_case
            ...properties,
            session_id: this.session.id,
            user_id: this.session.userId,
            client_timestamp: new Date().toISOString()
        };

        if (this._config.debug) {
            console.log(`[Analytics] 📊 ${eventName}`, payload);
        }

        // 保存到本地 (用于 Dashboard)
        this._saveToLocal({ event: eventName, ...payload });

        // 发送到远程
        if (this._supabase) {
            this._sendToSupabase(payload);
        }
    },

    /**
     * 保存数据到 localStorage (Dev Mode)
     * @private
     */
    _saveToLocal(payload) {
        try {
            const key = 'velotric_analytics_local';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push(payload);
            // 限制存储最新的 1000 条
            if (existing.length > 1000) existing.shift();
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (e) {
            console.warn('[Analytics] Local storage fulll', e);
        }
    },

    /**
     * 获取本地数据
     */
    getLocalData() {
        return JSON.parse(localStorage.getItem('velotric_analytics_local') || '[]');
    },

    /**
     * 清除本地数据
     */
    clearLocalData() {
        localStorage.removeItem('velotric_analytics_local');
    },

    /**
     * 发送数据到 Supabase
     * @private
     */
    async _sendToSupabase(payload) {
        try {
            // 剔除 payload 中不符合表结构的字段 (如果有)
            // 假设表结构为: id, event_name, user_id, session_id, properties (JSONB), client_timestamp, created_at

            const dbPayload = {
                event_name: payload.event_name,
                user_id: payload.user_id,
                session_id: payload.session_id,
                client_timestamp: payload.client_timestamp,
                properties: payload // 将所有字段存入 JSONB 字段，保持灵活性
            };

            const { error } = await this._supabase
                .from('game_events')
                .insert(dbPayload);

            if (error) {
                console.warn('[Analytics] Supabase Insert Error:', error.message);
            }
        } catch (e) {
            console.warn('[Analytics] Network Error:', e);
        }
    },

    /**
     * 获取远程数据 (用于 Dashboard)
     * @returns {Promise<Array>}
     */
    async getRemoteData() {
        if (!this._supabase) return [];

        try {
            const { data, error } = await this._supabase
                .from('game_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5000);

            if (error) {
                console.warn('[Analytics] Fetch Error:', error.message);
                return [];
            }

            // 转换格式以匹配本地数据结构
            return data.map(item => ({
                event: item.event_name,
                userId: item.user_id,
                sessionId: item.session_id,
                timestamp: item.client_timestamp || item.created_at,
                // ...properties
                ...item.properties,
                // 保留原始 ID
                _id: item.id
            }));
        } catch (e) {
            console.warn('[Analytics] Fetch Exception:', e);
            return [];
        }
    },

    /**
     * 生成 UUID
     * @private
     */
    _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
}
