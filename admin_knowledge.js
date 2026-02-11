/**
 * 知识库管理 (CMS) - 支持主线 + DLC 知识卡
 */
const KnowledgeBase = {
    data: {},
    currentCardId: null,
    _initialized: false,

    // 分类名称映射
    _categoryLabels: {
        product: '产品开发',
        engineering: '工程验证',
        manufacturing: '生产制造',
        logistics: '物流供应链',
        sales: '渠道销售',
        marketing: '品牌营销',
        hr: 'HR 培训',
        other: '其他'
    },

    init() {
        if (this._initialized) return;
        this._initialized = true;
        this.bindEvents();
        this.loadData();
    },

    bindEvents() {
        // 保存按钮
        document.getElementById('save-cards-btn').addEventListener('click', () => this.saveData());

        // 新增按钮
        document.getElementById('add-card-btn').addEventListener('click', () => this.addNewCard());

        // 删除按钮
        document.getElementById('delete-card-btn').addEventListener('click', () => this.deleteCard());

        // 输入监听 (实时更新列表标题)
        document.getElementById('card-title-input').addEventListener('input', (e) => {
            if (this.currentCardId) {
                this.data[this.currentCardId].title = e.target.value;
                this.updateListItem(this.currentCardId);
            }
        });
    },

    async loadData() {
        // 先尝试从 LocalStorage 加载
        const saved = localStorage.getItem('velotric_knowledge_config');
        if (saved) {
            this.data = JSON.parse(saved);
            this.renderList();
            return;
        }

        // 加载主线知识卡
        if (typeof StoryLoader !== 'undefined') {
            try {
                const mainCards = await StoryLoader.loadKnowledgeCards();
                this.data = JSON.parse(JSON.stringify(mainCards));
            } catch (e) {
                console.warn('[KnowledgeBase] Failed to load main cards:', e);
            }
        }

        // 加载 DLC 知识卡
        if (typeof DLCLoader !== 'undefined') {
            try {
                const registry = await DLCLoader.loadRegistry();
                for (const dlc of registry) {
                    if (dlc.status === 'coming_soon') continue;
                    try {
                        const manifest = await DLCLoader.loadManifest(dlc.id);
                        if (manifest.knowledgeCards) {
                            Object.assign(this.data, JSON.parse(JSON.stringify(manifest.knowledgeCards)));
                        }
                    } catch (e) {
                        console.warn(`[KnowledgeBase] Failed to load DLC cards: ${dlc.id}`, e);
                    }
                }
            } catch (e) {
                console.warn('[KnowledgeBase] Failed to load DLC registry:', e);
            }
        }

        this.renderList();
    },

    renderList() {
        const listContainer = document.getElementById('knowledge-list');
        listContainer.innerHTML = '';

        // 按 category 分组
        const groups = {};
        Object.entries(this.data).forEach(([id, card]) => {
            const cat = card.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ id, card });
        });

        // 按预定义顺序排列分类
        const order = ['product', 'engineering', 'manufacturing', 'logistics', 'sales', 'marketing', 'hr', 'other'];
        const sortedCats = Object.keys(groups).sort((a, b) => {
            const ia = order.indexOf(a), ib = order.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        for (const cat of sortedCats) {
            const label = this._categoryLabels[cat] || cat;

            // 分组标题
            const header = document.createElement('div');
            header.className = 'knowledge-group-header';
            header.textContent = `${label} (${groups[cat].length})`;
            listContainer.appendChild(header);

            // 卡片列表
            for (const { id, card } of groups[cat]) {
                const item = document.createElement('div');
                item.className = 'knowledge-card-item';
                item.dataset.id = id;
                if (id === this.currentCardId) item.classList.add('active');

                const tierBadge = card.tier === 'advanced' ? ' <span class="tier-badge advanced">进阶</span>'
                    : card.tier === 'expert' ? ' <span class="tier-badge expert">专家</span>' : '';

                item.innerHTML = `
                    <div style="font-weight:bold;">${card.title || '未命名卡片'}${tierBadge}</div>
                    <div style="font-size:12px; opacity:0.7;">ID: ${id}</div>
                `;

                item.addEventListener('click', () => this.selectCard(id));
                listContainer.appendChild(item);
            }
        }
    },

    updateListItem(id) {
        const item = document.querySelector(`.knowledge-card-item[data-id="${id}"]`);
        if (item && this.data[id]) {
            item.querySelector('div:first-child').textContent = this.data[id].title || '未命名卡片';
        }
    },

    selectCard(id) {
        this.currentCardId = id;

        // 更新高亮
        document.querySelectorAll('.knowledge-card-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.knowledge-card-item[data-id="${id}"]`);
        if (activeItem) activeItem.classList.add('active');

        // 填充表单
        const card = this.data[id];
        document.getElementById('card-editor').style.display = 'block';
        document.getElementById('card-id-input').value = id;
        document.getElementById('card-id-input').readOnly = true;
        document.getElementById('card-title-input').value = card.title || '';
        document.getElementById('card-content-input').value = card.content || '';
        document.getElementById('card-category-input').value = card.category || 'other';
        document.getElementById('card-tier-input').value = card.tier || 'basic';
    },

    addNewCard() {
        const newId = prompt("请输入新卡片的唯一 ID (例如: MARKETING_FAQ):");
        if (!newId) return;

        if (this.data[newId]) {
            alert("该 ID 已存在！");
            return;
        }

        this.data[newId] = {
            title: "新知识卡片",
            content: "在这里输入卡片内容...",
            category: "other",
            tier: "basic"
        };

        this.renderList();
        this.selectCard(newId);
    },

    deleteCard() {
        if (!this.currentCardId) return;

        if (confirm(`确定要删除卡片 "${this.currentCardId}" 吗？`)) {
            delete this.data[this.currentCardId];
            this.currentCardId = null;
            document.getElementById('card-editor').style.display = 'none';
            this.renderList();
        }
    },

    saveCurrentEdit() {
        if (!this.currentCardId) return;
        this.data[this.currentCardId].title = document.getElementById('card-title-input').value;
        this.data[this.currentCardId].content = document.getElementById('card-content-input').value;
        this.data[this.currentCardId].category = document.getElementById('card-category-input').value;
        this.data[this.currentCardId].tier = document.getElementById('card-tier-input').value;
    },

    saveData() {
        this.saveCurrentEdit();
        localStorage.setItem('velotric_knowledge_config', JSON.stringify(this.data));
        if (typeof AdminUI !== 'undefined') {
            AdminUI.showToast('知识库已保存！');
        } else {
            alert('保存成功');
        }
    }
};

// 暴露给全局
window.KnowledgeBase = KnowledgeBase;

// 监听 Tab 切换
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'knowledge') {
                KnowledgeBase.init();
            }
        });
    });
});
