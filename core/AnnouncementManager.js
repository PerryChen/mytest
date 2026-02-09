/**
 * AnnouncementManager - 首页公告管理器
 * 优先从 Supabase 加载公告，fallback 到 data/announcements.json
 * 支持后台 CRUD 管理
 */
const AnnouncementManager = {
    _supabase: null,
    _scrollInterval: null,
    _resumeTimeout: null,
    _isHovered: false,
    _panelEl: null,
    _scrollEl: null,

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
            console.warn('[Announcement] Supabase init failed:', e);
            return false;
        }
    },

    /**
     * 首页初始化：加载公告并渲染
     */
    async init() {
        this._panelEl = document.getElementById('announcement-panel');
        this._scrollEl = document.getElementById('announcement-scroll');
        if (!this._panelEl || !this._scrollEl) return;

        try {
            const items = await this._fetchActive();
            if (!items || items.length === 0) return;

            this._render(items);
            this._panelEl.style.display = '';

            requestAnimationFrame(() => {
                if (this._scrollEl.scrollHeight > this._scrollEl.clientHeight) {
                    this._startAutoScroll();
                }
            });
        } catch (e) {
            console.warn('[Announcement] 加载公告失败:', e);
        }
    },

    /**
     * 获取活跃公告（Supabase 优先，fallback JSON 文件）
     */
    async _fetchActive() {
        this._initSupabase();

        // 优先 Supabase
        if (this._supabase) {
            try {
                const { data, error } = await this._supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });
                if (!error && data && data.length > 0) return data;
            } catch (e) {
                console.warn('[Announcement] Supabase fetch failed, falling back to JSON');
            }
        }

        // Fallback: 本地 JSON 文件
        try {
            const res = await fetch('data/announcements.json');
            if (!res.ok) return [];
            const all = await res.json();
            return all.filter(a => a.active || a.is_active);
        } catch (e) {
            return [];
        }
    },

    // ===== CRUD（供 Admin 使用）=====

    async getAll() {
        this._initSupabase();
        if (!this._supabase) return [];
        const { data, error } = await this._supabase
            .from('announcements')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });
        if (error) { console.error('[Announcement] getAll error:', error); return []; }
        return data || [];
    },

    async create(item) {
        if (!this._supabase) return null;
        const { data, error } = await this._supabase
            .from('announcements')
            .insert([{ title: item.title, content: item.content, is_active: item.is_active ?? true, sort_order: item.sort_order ?? 0 }])
            .select();
        if (error) { console.error('[Announcement] create error:', error); return null; }
        return data?.[0];
    },

    async update(id, item) {
        if (!this._supabase) return null;
        const { data, error } = await this._supabase
            .from('announcements')
            .update({ title: item.title, content: item.content, is_active: item.is_active, sort_order: item.sort_order, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();
        if (error) { console.error('[Announcement] update error:', error); return null; }
        return data?.[0];
    },

    async remove(id) {
        if (!this._supabase) return false;
        const { error } = await this._supabase
            .from('announcements')
            .delete()
            .eq('id', id);
        if (error) { console.error('[Announcement] delete error:', error); return false; }
        return true;
    },

    // ===== 渲染 =====

    _render(items) {
        this._scrollEl.innerHTML = items.map(item => `
            <div class="announcement-item">
                <div class="announcement-item-title">${this._escapeHtml(item.title)}</div>
                <div class="announcement-item-content">${this._parseContent(item.content)}</div>
            </div>
        `).join('');
    },

    // ===== 自动滚动 =====

    _startAutoScroll() {
        const el = this._scrollEl;
        el.addEventListener('mouseenter', () => this._pause());
        el.addEventListener('mouseleave', () => this._scheduleResume());
        el.addEventListener('touchstart', () => this._pause(), { passive: true });
        el.addEventListener('touchend', () => this._scheduleResume());

        this._scrollInterval = setInterval(() => {
            if (this._isHovered) return;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
                this._pause();
                this._resumeTimeout = setTimeout(() => {
                    el.scrollTop = 0;
                    this._isHovered = false;
                }, 2000);
            } else {
                el.scrollTop += 1;
            }
        }, 50);
    },

    _pause() {
        this._isHovered = true;
        if (this._resumeTimeout) { clearTimeout(this._resumeTimeout); this._resumeTimeout = null; }
    },

    _scheduleResume() {
        if (this._resumeTimeout) clearTimeout(this._resumeTimeout);
        this._resumeTimeout = setTimeout(() => { this._isHovered = false; }, 2000);
    },

    stopAutoScroll() {
        if (this._scrollInterval) { clearInterval(this._scrollInterval); this._scrollInterval = null; }
        if (this._resumeTimeout) { clearTimeout(this._resumeTimeout); this._resumeTimeout = null; }
    },

    // ===== Markdown 解析 =====

    _parseContent(text) {
        if (!text) return '';
        const escaped = this._escapeHtml(text);
        const lines = escaped.split('\n');
        let html = '';
        let inList = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                if (inList) { html += '</ul>'; inList = false; }
                html += '<br>';
                continue;
            }
            if (trimmed.startsWith('## ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h3>${this._inlineFormat(trimmed.slice(3))}</h3>`;
                continue;
            }
            if (trimmed.startsWith('- ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${this._inlineFormat(trimmed.slice(2))}</li>`;
                continue;
            }
            if (inList) { html += '</ul>'; inList = false; }
            html += `<p>${this._inlineFormat(trimmed)}</p>`;
        }
        if (inList) html += '</ul>';
        return html;
    },

    _inlineFormat(text) {
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return text;
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
