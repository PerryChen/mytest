/**
 * 剧情编辑器 (Visual Story Editor)
 */
const StoryEditor = {
    currentScript: {},
    currentChapterId: 1,
    currentNodeId: null,

    // 缓存节点及其连接关系 (Visual Graph Data)
    nodes: [],

    init() {
        this.bindEvents();
        this.loadChaptersList();
        this.loadChapter(this.currentChapterId);
    },

    bindEvents() {
        // 章节选择
        document.getElementById('story-chapter-select').addEventListener('change', (e) => {
            this.loadChapter(parseInt(e.target.value));
        });

        // 节点操作
        document.getElementById('add-node-btn').addEventListener('click', () => this.addNode());
        document.getElementById('delete-node-btn').addEventListener('click', () => this.deleteNode());

        // 保存导出
        document.getElementById('save-story-btn').addEventListener('click', () => this.saveScript());
        document.getElementById('export-story-btn').addEventListener('click', () => this.exportJSON());

        // 表单自动保存到内存对象
        const inputs = ['node-speaker', 'node-avatar', 'node-text', 'node-next', 'node-event', 'node-unlock-card'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateCurrentNodeFromForm());
        });

        // 增加选项
        document.getElementById('add-choice-btn').addEventListener('click', () => this.addChoice());

        // 章节属性设置
        document.getElementById('chapter-settings-btn').addEventListener('click', () => this.openChapterSettings());
        document.getElementById('close-chapter-settings-btn').addEventListener('click', () => this.closeChapterSettings());
        document.getElementById('cancel-chapter-settings-btn').addEventListener('click', () => this.closeChapterSettings());
        document.getElementById('save-chapter-settings-btn').addEventListener('click', () => this.saveChapterSettings());
    },

    async loadChaptersList() {
        // 复用 ChaptersData (admin.js)
        if (typeof ChaptersData !== 'undefined') {
            const chapters = ChaptersData.get();
            const select = document.getElementById('story-chapter-select');
            select.innerHTML = chapters.map(ch =>
                `<option value="${ch.id}">第${ch.id}章 - ${ch.title}</option>`
            ).join('');
            select.value = this.currentChapterId;
        }
    },

    async loadChapter(chapterId) {
        this.currentChapterId = chapterId;

        // 尝试从 localStorage 加载
        const saved = localStorage.getItem(`velotric_script_${chapterId}`);
        if (saved) {
            this.currentScript = JSON.parse(saved);
            this.renderNodeList();
            this.clearEditor();
            return;
        }

        // 默认加载 (fetch)
        try {
            const response = await fetch(`data/scripts/chapter_${chapterId}.json`);
            if (response.ok) {
                this.currentScript = await response.json();
                this.renderNodeList();
                this.clearEditor();
            } else {
                this.currentScript = {};
                this.renderNodeList();
            }
        } catch (e) {
            console.error(e);
            this.currentScript = {};
        }
    },

    renderNodeList() {
        const list = document.getElementById('node-list');
        list.innerHTML = '';

        Object.keys(this.currentScript).forEach(nodeId => {
            const node = this.currentScript[nodeId];
            const el = document.createElement('div');
            el.className = 'node-list-item';
            el.dataset.id = nodeId;
            el.innerHTML = `
                <div>
                    <strong>${nodeId}</strong>
                    <br><span style="font-size:12px;opacity:0.7">${node.speaker || 'Event'}</span>
                </div>
                <div>${node.avatar || '📄'}</div>
            `;
            el.addEventListener('click', () => this.selectNode(nodeId));
            list.appendChild(el);
        });
    },

    selectNode(nodeId) {
        this.currentNodeId = nodeId;
        const node = this.currentScript[nodeId];

        // 高亮列表
        document.querySelectorAll('.node-list-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.node-list-item[data-id="${nodeId}"]`)?.classList.add('active');

        // 显示预览
        this.renderPreview(node);

        // 填充表单
        document.getElementById('node-properties').style.display = 'flex'; // Changed to flex for the column layout
        document.getElementById('node-id').value = nodeId;
        document.getElementById('node-speaker').value = node.speaker || '';
        document.getElementById('node-avatar').value = node.avatar || '';
        document.getElementById('node-text').value = node.text || '';
        document.getElementById('node-event').value = node.event || '';

        // 更新下拉框 (Next & Unlock)
        this.updateNextOptions(node.next);
        this.updateUnlockOptions(node.unlockCard);

        // 渲染选项
        this.renderChoicesEditor(node.choices || []);
    },

    renderPreview(node) {
        const canvas = document.getElementById('story-canvas');
        canvas.innerHTML = `
            <div class="preview-node-card">
                <div class="preview-avatar">${node.avatar || '👤'}</div>
                <div style="font-weight:bold;margin-bottom:5px;">${node.speaker || 'System'}</div>
                <div class="preview-text">${node.text || '(无对白内容，可能是事件节点)'}</div>
                ${node.choices ?
                node.choices.map(c => `<div class="preview-choice-item">➢ ${c.text}</div>`).join('')
                : `<div class="preview-next-info">→ 跳转至: ${node.next || '(结束)'}</div>`
            }
            </div>
        `;
    },

    updateNextOptions(currentNext) {
        const select = document.getElementById('node-next');
        const options = ['<option value="">(无 / 结束)</option>'];

        Object.keys(this.currentScript).forEach(id => {
            options.push(`<option value="${id}">${id}</option>`);
        });

        select.innerHTML = options.join('');
        select.value = currentNext || '';
    },

    updateUnlockOptions(currentCard) {
        const select = document.getElementById('node-unlock-card');
        // 获取所有知识卡
        let cards = {};
        if (typeof KnowledgeBase !== 'undefined' && KnowledgeBase.data) {
            cards = KnowledgeBase.data;
        }

        let html = '<option value="">(无)</option>';
        Object.entries(cards).forEach(([id, card]) => {
            html += `<option value="${id}">${card.title} (${id})</option>`;
        });

        select.innerHTML = html;
        select.value = currentCard || '';
    },

    renderChoicesEditor(choices) {
        const container = document.getElementById('node-choices-list');
        container.innerHTML = '';

        choices.forEach((choice, index) => {
            const div = document.createElement('div');
            div.className = 'choice-editor-item';
            div.innerHTML = `
                <div class="choice-header">
                    <span>选项 #${index + 1}</span>
                    <button class="btn-remove-choice">删除</button>
                </div>
                <div class="form-group" style="margin-bottom:5px">
                    <input type="text" placeholder="选项文字" value="${choice.text}" class="choice-text">
                </div>
                <div class="form-group" style="margin-bottom:5px">
                    <select class="choice-next">
                         ${this.getNextOptionsHtml(choice.next)}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:5px; display:flex; gap:10px;">
                    <label style="display:inline-flex;align-items:center;">
                        <input type="checkbox" class="choice-correct" ${choice.isCorrect ? 'checked' : ''}> 正确
                    </label>
                    <input type="number" placeholder="分数" value="${choice.score || 0}" class="choice-score" style="width:60px">
                </div>
                <input type="text" placeholder="反馈语" value="${choice.feedback || ''}" class="choice-feedback">
            `;

            // 绑定事件
            div.querySelector('.btn-remove-choice').addEventListener('click', () => {
                choices.splice(index, 1);
                this.updateCurrentNodeFromForm(); // 保存
                this.selectNode(this.currentNodeId); // 刷新
            });

            div.querySelectorAll('input, select').forEach(el => {
                el.addEventListener('change', () => this.updateChoicesFromForm());
            });

            container.appendChild(div);
        });
    },

    getNextOptionsHtml(selected) {
        let html = '<option value="">跳转到...</option>';
        Object.keys(this.currentScript).forEach(id => {
            html += `<option value="${id}" ${id === selected ? 'selected' : ''}>${id}</option>`;
        });
        return html;
    },

    updateChoicesFromForm() {
        if (!this.currentNodeId) return;
        const choices = [];
        document.querySelectorAll('.choice-editor-item').forEach(item => {
            choices.push({
                text: item.querySelector('.choice-text').value,
                next: item.querySelector('.choice-next').value,
                isCorrect: item.querySelector('.choice-correct').checked,
                score: parseInt(item.querySelector('.choice-score').value) || 0,
                feedback: item.querySelector('.choice-feedback').value
            });
        });
        this.currentScript[this.currentNodeId].choices = choices;
        this.renderPreview(this.currentScript[this.currentNodeId]);
    },

    updateCurrentNodeFromForm() {
        if (!this.currentNodeId) return;
        const node = this.currentScript[this.currentNodeId];

        node.speaker = document.getElementById('node-speaker').value;
        node.avatar = document.getElementById('node-avatar').value;
        node.text = document.getElementById('node-text').value;
        node.next = document.getElementById('node-next').value;
        node.event = document.getElementById('node-event').value;
        const unlock = document.getElementById('node-unlock-card').value;
        if (unlock) node.unlockCard = unlock;
        else delete node.unlockCard;

        if (!node.event) delete node.event;
        if (!node.next) delete node.next;

        this.renderPreview(node);
        this.renderNodeList(); // 更新列表上的标题
    },

    addNode() {
        const id = prompt("请输入新节点 ID (例如: scene_2):");
        if (!id) return;
        if (this.currentScript[id]) {
            alert("ID 已存在");
            return;
        }

        this.currentScript[id] = {
            speaker: "Perry",
            avatar: "👨‍💻",
            text: "新节点内容...",
            next: ""
        };

        this.renderNodeList();
        this.selectNode(id);
    },

    addChoice() {
        if (!this.currentNodeId) return;
        const node = this.currentScript[this.currentNodeId];
        if (!node.choices) node.choices = [];
        node.choices.push({ text: "新选项", next: "" });
        this.selectNode(this.currentNodeId); // 刷新
    },

    deleteNode() {
        if (!this.currentNodeId) return;
        if (confirm(`删除节点 ${this.currentNodeId}?`)) {
            delete this.currentScript[this.currentNodeId];
            this.currentNodeId = null;
            this.clearEditor();
            this.renderNodeList();
        }
    },

    clearEditor() {
        document.getElementById('story-canvas').innerHTML = '<div class="canvas-placeholder">请选择一个节点进行编辑</div>';
        document.getElementById('node-properties').style.display = 'none';
    },

    saveScript() {
        localStorage.setItem(`velotric_script_${this.currentChapterId}`, JSON.stringify(this.currentScript));
        if (typeof AdminUI !== 'undefined') {
            AdminUI.showToast(`第 ${this.currentChapterId} 章脚本已保存！`);
        }
    },

    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.currentScript, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `chapter_${this.currentChapterId}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    openChapterSettings() {
        const chapters = ChaptersData.get();
        const chapter = chapters.find(c => c.id === this.currentChapterId);

        if (!chapter) {
            alert("找不到当前章节配置");
            return;
        }

        document.getElementById('chapter-title-input').value = chapter.title;
        document.getElementById('chapter-desc-input').value = chapter.desc;
        document.getElementById('chapter-unlock-input').value = chapter.unlockCondition || '';
        document.getElementById('chapter-cover-input').value = chapter.cover;

        document.getElementById('chapter-settings-modal').style.display = 'flex';
    },

    closeChapterSettings() {
        document.getElementById('chapter-settings-modal').style.display = 'none';
    },

    saveChapterSettings() {
        const title = document.getElementById('chapter-title-input').value;
        const desc = document.getElementById('chapter-desc-input').value;
        const unlock = parseInt(document.getElementById('chapter-unlock-input').value) || null;
        const cover = document.getElementById('chapter-cover-input').value;

        const chapters = ChaptersData.get();
        const index = chapters.findIndex(c => c.id === this.currentChapterId);

        if (index !== -1) {
            chapters[index].title = title;
            chapters[index].desc = desc;
            chapters[index].unlockCondition = unlock;
            chapters[index].cover = cover;

            ChaptersData.save(chapters);

            // 刷新界面
            this.loadChaptersList();
            this.closeChapterSettings();

            if (typeof AdminUI !== 'undefined') {
                AdminUI.showToast(`章节 ${this.currentChapterId} 配置已更新！`);
            }
        }
    }
};

window.StoryEditor = StoryEditor;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'story') {
                StoryEditor.init();
            }
        });
    });
});
