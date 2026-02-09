/**
 * 公告管理模块 (Admin)
 * 基于 Supabase 的公告 CRUD
 */
const AdminAnnouncements = {
    items: [],
    currentId: null,
    _initialized: false,

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        this.bindEvents();
        await this.loadList();
    },

    bindEvents() {
        document.getElementById('add-announcement-btn').addEventListener('click', () => this.createNew());
        document.getElementById('refresh-announcements-btn').addEventListener('click', () => this.loadList());
        document.getElementById('save-announcement-btn').addEventListener('click', () => this.save());
        document.getElementById('cancel-announcement-btn').addEventListener('click', () => this.hideEditor());
        document.getElementById('delete-announcement-btn').addEventListener('click', () => this.deleteCurrent());

        // 实时预览
        const contentInput = document.getElementById('ann-content-input');
        const titleInput = document.getElementById('ann-title-input');
        contentInput.addEventListener('input', () => this.updatePreview());
        titleInput.addEventListener('input', () => this.updatePreview());
    },

    async loadList() {
        AnnouncementManager._initSupabase();
        this.items = await AnnouncementManager.getAll();
        this.renderList();
    },

    renderList() {
        const container = document.getElementById('admin-announcement-list');

        if (this.items.length === 0) {
            container.innerHTML = '<div class="ann-empty">暂无公告，点击「新增公告」创建</div>';
            return;
        }

        container.innerHTML = this.items.map(item => `
            <div class="ann-list-item ${item.id === this.currentId ? 'active' : ''} ${!item.is_active ? 'inactive' : ''}" data-id="${item.id}">
                <div class="ann-list-item-status ${item.is_active ? '' : 'off'}"></div>
                <div class="ann-list-item-body">
                    <div class="ann-list-item-title">${this._escape(item.title)}</div>
                    <div class="ann-list-item-meta">排序: ${item.sort_order} · ${this._formatDate(item.created_at)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.ann-list-item').forEach(el => {
            el.addEventListener('click', () => this.selectItem(el.dataset.id));
        });
    },

    selectItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        this.currentId = id;
        this.renderList();

        document.getElementById('announcement-editor').style.display = 'block';
        document.getElementById('announcement-editor-title').textContent = '编辑公告';
        document.getElementById('ann-title-input').value = item.title;
        document.getElementById('ann-content-input').value = item.content;
        document.getElementById('ann-sort-input').value = item.sort_order ?? 0;
        document.getElementById('ann-active-input').checked = item.is_active;
        document.getElementById('delete-announcement-btn').style.display = 'inline-block';
        this.updatePreview();
    },

    createNew() {
        this.currentId = null;
        this.renderList();

        document.getElementById('announcement-editor').style.display = 'block';
        document.getElementById('announcement-editor-title').textContent = '新增公告';
        document.getElementById('ann-title-input').value = '';
        document.getElementById('ann-content-input').value = '';
        document.getElementById('ann-sort-input').value = 0;
        document.getElementById('ann-active-input').checked = true;
        document.getElementById('delete-announcement-btn').style.display = 'none';
        document.getElementById('ann-preview-content').innerHTML = '';
        document.getElementById('ann-title-input').focus();
    },

    async save() {
        const title = document.getElementById('ann-title-input').value.trim();
        const content = document.getElementById('ann-content-input').value.trim();
        const sort_order = parseInt(document.getElementById('ann-sort-input').value) || 0;
        const is_active = document.getElementById('ann-active-input').checked;

        if (!title) {
            AdminUI.showToast('请输入公告标题', true);
            return;
        }

        const payload = { title, content, sort_order, is_active };

        if (this.currentId) {
            const result = await AnnouncementManager.update(this.currentId, payload);
            if (result) {
                AdminUI.showToast('公告已更新');
            } else {
                AdminUI.showToast('保存失败，请检查 Supabase 连接', true);
                return;
            }
        } else {
            const result = await AnnouncementManager.create(payload);
            if (result) {
                this.currentId = result.id;
                AdminUI.showToast('公告已创建');
            } else {
                AdminUI.showToast('创建失败，请检查 Supabase 连接', true);
                return;
            }
        }

        await this.loadList();
    },

    async deleteCurrent() {
        if (!this.currentId) return;
        if (!confirm('确定要删除这条公告吗？')) return;

        const ok = await AnnouncementManager.remove(this.currentId);
        if (ok) {
            this.currentId = null;
            this.hideEditor();
            await this.loadList();
            AdminUI.showToast('公告已删除');
        } else {
            AdminUI.showToast('删除失败', true);
        }
    },

    hideEditor() {
        document.getElementById('announcement-editor').style.display = 'none';
    },

    updatePreview() {
        const title = document.getElementById('ann-title-input').value;
        const content = document.getElementById('ann-content-input').value;
        const previewEl = document.getElementById('ann-preview-content');
        previewEl.innerHTML = `
            <div class="announcement-item-title">${AnnouncementManager._escapeHtml(title)}</div>
            <div class="announcement-item-content">${AnnouncementManager._parseContent(content)}</div>
        `;
    },

    _escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
};
