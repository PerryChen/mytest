/**
 * ScriptStorage - 剧本云端存储 (v3.8.0)
 * Supabase 优先存储，支持草稿/发布双版本
 * 游戏运行时读取 published_content，编辑器读取 content（草稿）
 *
 * ===== Supabase 建表 SQL（需在 Supabase Dashboard 执行）=====
 *
 * CREATE TABLE story_scripts (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     chapter_key TEXT UNIQUE NOT NULL,
 *     content JSONB,
 *     published_content JSONB,
 *     version INTEGER DEFAULT 0,
 *     publish_note TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW(),
 *     published_at TIMESTAMPTZ
 * );
 *
 * -- 允许匿名读写（当前系统无用户认证）
 * ALTER TABLE story_scripts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "allow_all" ON story_scripts FOR ALL USING (true) WITH CHECK (true);
 *
 * ==========================================================
 */
const ScriptStorage = {
    _supabase: null,

    /**
     * 初始化 Supabase client（复用 AppConfig）
     */
    _initSupabase() {
        if (this._supabase) return true;
        if (typeof supabase === 'undefined' || typeof AppConfig === 'undefined') return false;
        const url = AppConfig.supabase?.url;
        const key = AppConfig.supabase?.anonKey;
        if (!url || !key) return false;
        try {
            this._supabase = supabase.createClient(url, key);
            return true;
        } catch (e) {
            console.warn('[ScriptStorage] Supabase init failed:', e);
            return false;
        }
    },

    /**
     * 获取已发布剧本（游戏运行时调用）
     * @param {string} chapterKey - e.g. "main_3" 或 "dlc_hr_onboarding_2"
     * @returns {Promise<Object|null>} 剧本 JSON 或 null
     */
    async getPublished(chapterKey) {
        if (!this._initSupabase()) return null;
        try {
            const { data, error } = await this._supabase
                .from('story_scripts')
                .select('published_content')
                .eq('chapter_key', chapterKey)
                .single();
            if (error || !data || !data.published_content) return null;
            console.log(`[ScriptStorage] Loaded published: ${chapterKey}`);
            return data.published_content;
        } catch (e) {
            console.warn(`[ScriptStorage] getPublished failed for ${chapterKey}`);
            return null;
        }
    },

    /**
     * 获取草稿记录（编辑器调用）
     * @param {string} chapterKey
     * @returns {Promise<Object|null>} 完整行 { content, published_content, version, ... } 或 null
     */
    async getDraft(chapterKey) {
        if (!this._initSupabase()) return null;
        try {
            const { data, error } = await this._supabase
                .from('story_scripts')
                .select('*')
                .eq('chapter_key', chapterKey)
                .single();
            if (error || !data) return null;
            return data;
        } catch (e) {
            return null;
        }
    },

    /**
     * 保存草稿（编辑器保存按钮调用）
     * @param {string} chapterKey
     * @param {Object} content - 剧本 JSON
     * @returns {Promise<boolean>}
     */
    async saveDraft(chapterKey, content) {
        if (!this._initSupabase()) return false;
        try {
            const { error } = await this._supabase
                .from('story_scripts')
                .upsert({
                    chapter_key: chapterKey,
                    content: content,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'chapter_key' });
            if (error) {
                console.error('[ScriptStorage] saveDraft error:', error);
                return false;
            }
            console.log(`[ScriptStorage] Draft saved: ${chapterKey}`);
            return true;
        } catch (e) {
            console.error('[ScriptStorage] saveDraft failed:', e);
            return false;
        }
    },

    /**
     * 发布（将草稿复制到 published_content，版本号 +1）
     * @param {string} chapterKey
     * @param {string} [note] - 发布备注
     * @returns {Promise<boolean>}
     */
    async publish(chapterKey, note) {
        if (!this._initSupabase()) return false;
        try {
            // 先获取当前草稿
            const { data: current, error: fetchError } = await this._supabase
                .from('story_scripts')
                .select('content, version')
                .eq('chapter_key', chapterKey)
                .single();
            if (fetchError || !current || !current.content) {
                console.error('[ScriptStorage] No draft to publish:', chapterKey);
                return false;
            }

            const newVersion = (current.version || 0) + 1;
            const { error } = await this._supabase
                .from('story_scripts')
                .update({
                    published_content: current.content,
                    version: newVersion,
                    publish_note: note || '',
                    published_at: new Date().toISOString()
                })
                .eq('chapter_key', chapterKey);
            if (error) {
                console.error('[ScriptStorage] publish error:', error);
                return false;
            }
            console.log(`[ScriptStorage] Published: ${chapterKey} v${newVersion}`);
            return true;
        } catch (e) {
            console.error('[ScriptStorage] publish failed:', e);
            return false;
        }
    },

    /**
     * 取消发布（清除 published_content）
     * @param {string} chapterKey
     * @returns {Promise<boolean>}
     */
    async unpublish(chapterKey) {
        if (!this._initSupabase()) return false;
        try {
            const { error } = await this._supabase
                .from('story_scripts')
                .update({ published_content: null, published_at: null })
                .eq('chapter_key', chapterKey);
            return !error;
        } catch (e) {
            return false;
        }
    },

    /**
     * 获取所有剧本状态（管理后台总览）
     * @returns {Promise<Array>}
     */
    async getAll() {
        if (!this._initSupabase()) return [];
        try {
            const { data, error } = await this._supabase
                .from('story_scripts')
                .select('chapter_key, version, updated_at, published_at, publish_note')
                .order('chapter_key');
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptStorage;
}
