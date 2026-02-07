/**
 * 知识库管理 (CMS)
 */
const KnowledgeBase = {
    data: {},
    currentCardId: null,

    init() {
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

    loadData() {
        // 先尝试从 LocalStorage 加载
        const saved = localStorage.getItem('velotric_knowledge_config');
        if (saved) {
            this.data = JSON.parse(saved);
            this.renderList();
        } else {
            // 否则加载默认数据
            // 注意：这里需要 StoryLoader 已加载 (在 admin.html 中引入了)
            // 如果 StoryLoader 还没 ready，可能需要 fetch
            if (typeof StoryLoader !== 'undefined') {
                StoryLoader.loadKnowledgeCards().then(data => {
                    this.data = JSON.parse(JSON.stringify(data)); // Deep copy
                    this.renderList();
                });
            }
        }
    },

    renderList() {
        const listContainer = document.getElementById('knowledge-list');
        listContainer.innerHTML = '';

        Object.entries(this.data).forEach(([id, card]) => {
            const item = document.createElement('div');
            item.className = 'knowledge-card-item';
            item.dataset.id = id;
            if (id === this.currentCardId) item.classList.add('active');

            item.innerHTML = `
                <div style="font-weight:bold;">${card.title || '未命名卡片'}</div>
                <div style="font-size:12px; opacity:0.7;">ID: ${id}</div>
            `;

            item.addEventListener('click', () => this.selectCard(id));
            listContainer.appendChild(item);
        });
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
        document.getElementById('card-id-input').readOnly = true; // ID 不可修改
        document.getElementById('card-title-input').value = card.title;
        document.getElementById('card-content-input').value = card.content;
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
            content: "在这里输入卡片内容..."
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
    // 监听 AdminUI 的 Tab 切换事件 (如果是 Knowledge Tab)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'knowledge') {
                KnowledgeBase.init();
            }
        });
    });
});
