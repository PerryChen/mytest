/**
 * 剧情编辑器 (Visual Story Editor)
 * v3.0 — 节点图谱、对话预览、校验、导入导出
 */
const StoryEditor = {
    currentScript: {},
    currentChapterId: 1,
    currentNodeId: null,

    // DLC 章节元数据: { isDLC, dlcId, scriptFile } 或 null
    _chapterMeta: null,

    // 当前章节发布状态缓存
    _publishInfo: null,

    // 视图模式: 'list' | 'graph'
    viewMode: 'list',

    // 图谱节点位置缓存
    _graphPositions: {},

    init() {
        this.bindEvents();
        this.loadChaptersList().then(() => {
            this.loadChapter(this.currentChapterId);
        });
    },

    bindEvents() {
        // 章节选择
        document.getElementById('story-chapter-select').addEventListener('change', (e) => {
            this.loadChapterByKey(e.target.value);
        });

        // 节点操作
        document.getElementById('add-node-btn').addEventListener('click', () => this.addNode());
        document.getElementById('delete-node-btn').addEventListener('click', () => this.deleteNode());

        // 保存导出
        document.getElementById('save-story-btn').addEventListener('click', () => this.saveScript());
        document.getElementById('export-story-btn').addEventListener('click', () => this.exportJSON());

        // 导入
        document.getElementById('import-story-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importJSON(e));

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

        // 图谱视图切换
        document.getElementById('view-toggle-btn').addEventListener('click', () => this.toggleView());

        // 发布到线上
        document.getElementById('publish-story-btn')?.addEventListener('click', () => this.publishScript());

        // 对比改动
        document.getElementById('diff-story-btn')?.addEventListener('click', () => this.showDiff());
        document.getElementById('close-diff-btn')?.addEventListener('click', () => {
            document.getElementById('diff-modal').style.display = 'none';
        });

        // 校验
        document.getElementById('validate-btn').addEventListener('click', () => this.validateScript());
        document.getElementById('close-validate-btn').addEventListener('click', () => {
            document.getElementById('validate-modal').style.display = 'none';
        });

        // 对话预览
        document.getElementById('preview-story-btn').addEventListener('click', () => this.openPreview());
        document.getElementById('close-preview-btn').addEventListener('click', () => this.closePreview());
        document.getElementById('preview-next-btn').addEventListener('click', () => this.advancePreview());
        document.getElementById('restart-preview-btn').addEventListener('click', () => this.openPreview());
    },

    async loadChaptersList() {
        const select = document.getElementById('story-chapter-select');
        let html = '';

        // 主线章节
        if (typeof ChaptersData !== 'undefined') {
            const chapters = ChaptersData.get();
            html += '<optgroup label="主线剧情">';
            html += chapters.map(ch =>
                `<option value="main_${ch.id}">第${ch.id}章 - ${ch.title}</option>`
            ).join('');
            html += '</optgroup>';
        }

        // DLC 章节
        if (typeof DLCLoader !== 'undefined') {
            try {
                const registry = await DLCLoader.loadRegistry();
                for (const dlc of registry) {
                    if (dlc.status === 'coming_soon') continue;
                    try {
                        const manifest = await DLCLoader.loadManifest(dlc.id);
                        html += `<optgroup label="${dlc.icon || '📦'} ${dlc.name || dlc.id}">`;
                        (manifest.chapters || []).forEach(ch => {
                            html += `<option value="dlc_${dlc.id}_${ch.id}">${ch.title}</option>`;
                        });
                        html += '</optgroup>';
                    } catch (e) {
                        console.warn(`[StoryEditor] Failed to load DLC manifest: ${dlc.id}`, e);
                    }
                }
            } catch (e) {
                console.warn('[StoryEditor] Failed to load DLC registry', e);
            }
        }

        select.innerHTML = html;
        select.value = `main_${this.currentChapterId}`;
    },

    /**
     * 根据选择框 value 解析并加载章节
     * @param {string} key - 格式: "main_3" 或 "dlc_hr_onboarding_2"
     */
    loadChapterByKey(key) {
        if (key.startsWith('main_')) {
            const id = parseInt(key.replace('main_', ''));
            this._chapterMeta = null;
            this.loadChapter(id);
        } else if (key.startsWith('dlc_')) {
            // 解析: dlc_{dlcId}_{chapterId} — dlcId 可能包含下划线
            const parts = key.split('_');
            // 最后一段是 chapterId，中间部分是 dlcId
            const chapterId = parseInt(parts[parts.length - 1]);
            const dlcId = parts.slice(1, -1).join('_');
            this._chapterMeta = { isDLC: true, dlcId, chapterId };
            this.loadDLCChapter(dlcId, chapterId);
        }
    },

    async loadChapter(chapterId) {
        this.currentChapterId = chapterId;
        this._chapterMeta = null;

        // 1. 优先从 Supabase 草稿加载
        if (typeof ScriptStorage !== 'undefined') {
            try {
                const record = await ScriptStorage.getDraft(`main_${chapterId}`);
                if (record && record.content) {
                    this.currentScript = record.content;
                    this.renderNodeList();
                    this.refreshCanvas();
                    this.clearEditor();
                    this._updatePublishStatus();
                    return;
                }
            } catch (e) {
                console.warn('[StoryEditor] Supabase draft load failed, trying localStorage');
            }
        }

        // 2. 降级：localStorage
        const saved = localStorage.getItem(`velotric_script_${chapterId}`);
        if (saved) {
            this.currentScript = JSON.parse(saved);
            this.renderNodeList();
            this.refreshCanvas();
            this.clearEditor();
            this._updatePublishStatus();
            return;
        }

        // 3. 降级：静态 JSON
        try {
            const response = await fetch(`data/scripts/chapter_${chapterId}.json`, { cache: 'no-cache' });
            if (response.ok) {
                this.currentScript = await response.json();
                this.renderNodeList();
                this.refreshCanvas();
                this.clearEditor();
            } else {
                this.currentScript = {};
                this.renderNodeList();
                this.refreshCanvas();
            }
        } catch (e) {
            console.error(e);
            this.currentScript = {};
        }
        this._updatePublishStatus();
    },

    async loadDLCChapter(dlcId, chapterId) {
        const storageKey = `velotric_script_dlc_${dlcId}_${chapterId}`;
        this.currentChapterId = `dlc_${dlcId}_${chapterId}`;

        // 获取 manifest（后续需要 scriptFile）
        let manifest;
        try {
            manifest = DLCLoader.loadedDLCs[dlcId] || await DLCLoader.loadManifest(dlcId);
            const chapterInfo = (manifest.chapters || []).find(c => c.id === chapterId);
            if (chapterInfo) {
                this._chapterMeta = { isDLC: true, dlcId, chapterId, scriptFile: chapterInfo.scriptFile };
            }
        } catch (e) {
            console.warn('[StoryEditor] Manifest load failed:', e);
        }

        // 1. 优先从 Supabase 草稿加载
        const chapterKey = `dlc_${dlcId}_${chapterId}`;
        if (typeof ScriptStorage !== 'undefined') {
            try {
                const record = await ScriptStorage.getDraft(chapterKey);
                if (record && record.content) {
                    this.currentScript = record.content;
                    this.renderNodeList();
                    this.refreshCanvas();
                    this.clearEditor();
                    this._updatePublishStatus();
                    return;
                }
            } catch (e) {
                console.warn('[StoryEditor] Supabase draft load failed for DLC');
            }
        }

        // 2. 降级：localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            this.currentScript = JSON.parse(saved);
            this.renderNodeList();
            this.refreshCanvas();
            this.clearEditor();
            this._updatePublishStatus();
            return;
        }

        // 3. 降级：从 DLCLoader 加载静态 JSON
        try {
            if (!manifest) {
                manifest = await DLCLoader.loadManifest(dlcId);
            }
            const chapterInfo = (manifest.chapters || []).find(c => c.id === chapterId);
            if (!chapterInfo) throw new Error(`Chapter ${chapterId} not found in DLC ${dlcId}`);

            if (!this._chapterMeta) {
                this._chapterMeta = { isDLC: true, dlcId, chapterId, scriptFile: chapterInfo.scriptFile };
            }
            const script = await DLCLoader.loadScript(dlcId, chapterInfo.scriptFile);
            this.currentScript = script;
            this.renderNodeList();
            this.refreshCanvas();
            this.clearEditor();
        } catch (e) {
            console.error('[StoryEditor] Failed to load DLC chapter:', e);
            this.currentScript = {};
            this.renderNodeList();
            this.refreshCanvas();
        }
        this._updatePublishStatus();
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

        // 高亮图谱节点
        document.querySelectorAll('.graph-node').forEach(el => el.classList.remove('selected'));
        document.querySelector(`.graph-node[data-id="${nodeId}"]`)?.classList.add('selected');

        // 显示预览
        if (this.viewMode === 'list') {
            this.renderPreview(node);
        }

        // 填充表单
        document.getElementById('node-properties').style.display = 'block';
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
        let html = '<option value="">(无)</option>';

        // 主线知识卡
        if (typeof KnowledgeBase !== 'undefined' && KnowledgeBase.data) {
            Object.entries(KnowledgeBase.data).forEach(([id, card]) => {
                html += `<option value="${id}">${card.title} (${id})</option>`;
            });
        }

        // DLC 知识卡
        if (this._chapterMeta && typeof DLCLoader !== 'undefined') {
            const dlc = DLCLoader.loadedDLCs[this._chapterMeta.dlcId];
            if (dlc && dlc.knowledgeCards) {
                Object.entries(dlc.knowledgeCards).forEach(([id, card]) => {
                    html += `<option value="${id}">${card.title} (${id})</option>`;
                });
            }
        }

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
        if (this.viewMode === 'list') {
            this.renderPreview(this.currentScript[this.currentNodeId]);
        } else {
            this.renderGraph();
        }
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

        if (this.viewMode === 'list') {
            this.renderPreview(node);
        } else {
            this.renderGraph();
        }
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
        this.refreshCanvas();
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
            this.refreshCanvas();
        }
    },

    clearEditor() {
        if (this.viewMode === 'list') {
            document.getElementById('story-canvas').innerHTML = '<div class="canvas-placeholder">请选择一个节点进行编辑</div>';
        }
        document.getElementById('node-properties').style.display = 'none';
    },

    refreshCanvas() {
        if (this.viewMode === 'graph') {
            this.renderGraph();
        }
    },

    /**
     * 获取当前章节的存储 key
     * @returns {string} e.g. "main_3" 或 "dlc_hr_onboarding_2"
     */
    _getChapterKey() {
        if (this._chapterMeta) {
            return `dlc_${this._chapterMeta.dlcId}_${this._chapterMeta.chapterId}`;
        }
        return `main_${this.currentChapterId}`;
    },

    async saveScript() {
        // 始终保存到 localStorage（离线备份）
        localStorage.setItem(`velotric_script_${this.currentChapterId}`, JSON.stringify(this.currentScript));

        // 同时保存到 Supabase 草稿
        const chapterKey = this._getChapterKey();
        let cloudSaved = false;
        if (typeof ScriptStorage !== 'undefined') {
            cloudSaved = await ScriptStorage.saveDraft(chapterKey, this.currentScript);
        }

        const label = this._chapterMeta ? `DLC 章节 ${this._chapterMeta.chapterId}` : `第 ${this.currentChapterId} 章`;
        const suffix = cloudSaved ? '（已同步云端）' : '（仅本地）';
        if (typeof AdminUI !== 'undefined') {
            AdminUI.showToast(`${label} 脚本已保存！${suffix}`);
        }

        this._updatePublishStatus();
    },

    /**
     * 发布当前章节到线上（将草稿复制到 published_content）
     */
    async publishScript() {
        if (typeof ScriptStorage === 'undefined') {
            alert('Supabase 未连接，无法发布');
            return;
        }

        const chapterKey = this._getChapterKey();
        const label = this._chapterMeta ? `DLC 章节 ${this._chapterMeta.chapterId}` : `第 ${this.currentChapterId} 章`;

        // 发布前检查
        if (typeof ScriptDiff !== 'undefined') {
            const record = await ScriptStorage.getDraft(chapterKey);
            const published = record?.published_content || {};
            const diffResult = ScriptDiff.compare(this.currentScript, published);
            const checkResult = ScriptDiff.renderChecklist(this.currentScript, diffResult);

            if (checkResult.errors > 0) {
                alert(`发布被阻止：有 ${checkResult.errors} 个错误需要修复。\n请先运行"校验"查看详情。`);
                return;
            }

            if (diffResult.stats.added === 0 && diffResult.stats.modified === 0 && diffResult.stats.removed === 0) {
                alert('无改动，草稿与线上版本一致。');
                return;
            }

            const summary = `${diffResult.stats.added} 新增, ${diffResult.stats.modified} 修改, ${diffResult.stats.removed} 删除`;
            if (checkResult.warnings > 0) {
                if (!confirm(`${label} 有 ${checkResult.warnings} 个警告。\n改动: ${summary}\n\n是否仍要发布？`)) return;
            } else {
                if (!confirm(`确认发布 ${label}？\n改动: ${summary}`)) return;
            }
        }

        // 先确保草稿已保存
        const saved = await ScriptStorage.saveDraft(chapterKey, this.currentScript);
        if (!saved) {
            alert('保存草稿失败，无法发布');
            return;
        }

        const note = prompt('发布备注（可选）:', '') || '';
        const ok = await ScriptStorage.publish(chapterKey, note);
        if (ok) {
            if (typeof AdminUI !== 'undefined') {
                AdminUI.showToast(`${label} 已发布到线上！`);
            }
            this._updatePublishStatus();
        } else {
            alert('发布失败，请检查网络或 Supabase 配置');
        }
    },

    /**
     * 更新发布状态指示器
     */
    async _updatePublishStatus() {
        const el = document.getElementById('publish-status');
        if (!el) return;

        if (typeof ScriptStorage === 'undefined') {
            el.textContent = '离线模式';
            el.className = 'publish-status offline';
            return;
        }

        const chapterKey = this._getChapterKey();
        const record = await ScriptStorage.getDraft(chapterKey);
        this._publishInfo = record;

        if (!record) {
            el.textContent = '未保存';
            el.className = 'publish-status unsaved';
        } else if (!record.published_content) {
            el.textContent = '草稿（未发布）';
            el.className = 'publish-status draft';
        } else if (JSON.stringify(record.content) !== JSON.stringify(record.published_content)) {
            el.textContent = `v${record.version} 已发布 · 有新改动`;
            el.className = 'publish-status modified';
        } else {
            el.textContent = `v${record.version} 已发布`;
            el.className = 'publish-status published';
        }
    },

    /**
     * 显示草稿 vs 已发布版本的 diff 对比
     */
    async showDiff() {
        if (typeof ScriptDiff === 'undefined' || typeof ScriptStorage === 'undefined') {
            alert('Diff 模块或 Supabase 未加载');
            return;
        }

        const chapterKey = this._getChapterKey();
        const record = await ScriptStorage.getDraft(chapterKey);
        const published = record?.published_content || {};

        const diffResult = ScriptDiff.compare(this.currentScript, published);
        const diffHtml = ScriptDiff.render(diffResult);
        const checkResult = ScriptDiff.renderChecklist(this.currentScript, diffResult);

        const body = document.getElementById('diff-body');
        body.innerHTML = checkResult.html + diffHtml;

        document.getElementById('diff-modal').style.display = 'flex';
    },

    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.currentScript, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        // DLC 用原始文件名，主线用 chapter_N.json
        let filename;
        if (this._chapterMeta && this._chapterMeta.scriptFile) {
            filename = this._chapterMeta.scriptFile;
        } else if (this._chapterMeta) {
            filename = `hr_chapter_${this._chapterMeta.chapterId}.json`;
        } else {
            filename = `chapter_${this.currentChapterId}.json`;
        }
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    // ===== 导入 JSON =====

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (typeof data !== 'object' || Array.isArray(data)) {
                    alert('无效的脚本格式：需要 JSON 对象');
                    return;
                }
                // 检查节点格式
                const keys = Object.keys(data);
                if (keys.length === 0) {
                    alert('空的脚本文件');
                    return;
                }
                const label = this._chapterMeta ? `DLC 章节` : `第 ${this.currentChapterId} 章`;
                if (!confirm(`即将导入 ${keys.length} 个节点到${label}，是否覆盖当前内容？`)) {
                    return;
                }
                this.currentScript = data;
                this.renderNodeList();
                this.refreshCanvas();
                this.clearEditor();
                if (typeof AdminUI !== 'undefined') {
                    AdminUI.showToast(`已导入 ${keys.length} 个节点`);
                }
            } catch (err) {
                alert('JSON 解析失败：' + err.message);
            }
        };
        reader.readAsText(file);
        // 重置 input 以允许再次选择同一文件
        event.target.value = '';
    },

    // ===== 图谱视图 =====

    toggleView() {
        const btn = document.getElementById('view-toggle-btn');
        if (this.viewMode === 'list') {
            this.viewMode = 'graph';
            btn.textContent = '📋 列表';
            this.renderGraph();
        } else {
            this.viewMode = 'list';
            btn.textContent = '🗺️ 图谱';
            const canvas = document.getElementById('story-canvas');
            canvas.innerHTML = '<div class="canvas-placeholder">请选择一个节点进行编辑</div>';
            canvas.classList.remove('graph-mode');
            if (this.currentNodeId) {
                this.renderPreview(this.currentScript[this.currentNodeId]);
            }
        }
    },

    renderGraph() {
        const canvas = document.getElementById('story-canvas');
        canvas.classList.add('graph-mode');
        canvas.innerHTML = '';

        const nodeIds = Object.keys(this.currentScript);
        if (nodeIds.length === 0) {
            canvas.innerHTML = '<div class="canvas-placeholder">暂无节点</div>';
            return;
        }

        // 计算布局: BFS from 'start'
        const positions = this._computeLayout(nodeIds);

        // 创建 SVG 连线层
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('graph-svg');
        canvas.appendChild(svg);

        // 创建节点容器
        const nodesContainer = document.createElement('div');
        nodesContainer.className = 'graph-nodes-container';
        canvas.appendChild(nodesContainer);

        // 渲染节点
        const NODE_W = 160, NODE_H = 70;
        nodeIds.forEach(id => {
            const node = this.currentScript[id];
            const pos = positions[id];
            const el = document.createElement('div');
            el.className = 'graph-node';
            if (id === this.currentNodeId) el.classList.add('selected');
            if (node.choices && node.choices.length > 0) el.classList.add('has-choices');
            if (node.condition) el.classList.add('has-condition');
            el.dataset.id = id;
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
            el.innerHTML = `
                <div class="graph-node-avatar">${node.avatar || '📄'}</div>
                <div class="graph-node-info">
                    <div class="graph-node-id">${id}</div>
                    <div class="graph-node-speaker">${node.speaker || 'Event'}</div>
                </div>
            `;
            el.addEventListener('click', () => this.selectNode(id));

            // 拖拽
            let dragging = false, startX, startY, origX, origY;
            el.addEventListener('mousedown', (e) => {
                if (e.target.closest('.graph-node-info') || e.target.closest('.graph-node-avatar')) {
                    dragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    origX = pos.x;
                    origY = pos.y;
                    el.style.zIndex = '10';
                    e.preventDefault();
                }
            });
            const onMove = (e) => {
                if (!dragging) return;
                pos.x = origX + (e.clientX - startX);
                pos.y = origY + (e.clientY - startY);
                el.style.left = pos.x + 'px';
                el.style.top = pos.y + 'px';
                this._drawConnections(svg, positions, NODE_W, NODE_H);
            };
            const onUp = () => {
                if (dragging) {
                    dragging = false;
                    el.style.zIndex = '';
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);

            nodesContainer.appendChild(el);
        });

        // 绘制连线
        this._drawConnections(svg, positions, NODE_W, NODE_H);
    },

    _computeLayout(nodeIds) {
        const positions = {};
        const COL_GAP = 220, ROW_GAP = 100;

        // BFS from 'start' node
        const startId = nodeIds.includes('start') ? 'start' : nodeIds[0];
        const visited = new Set();
        const queue = [[startId, 0, 0]]; // [id, col, row]
        const colCounts = {}; // track rows per column

        while (queue.length > 0) {
            const [id, col, _] = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);

            const row = colCounts[col] || 0;
            colCounts[col] = row + 1;
            positions[id] = { x: 40 + col * COL_GAP, y: 40 + row * ROW_GAP };

            const node = this.currentScript[id];
            if (!node) continue;

            // Add children
            if (node.choices && node.choices.length > 0) {
                node.choices.forEach(c => {
                    if (c.next && !visited.has(c.next)) {
                        queue.push([c.next, col + 1, 0]);
                    }
                });
            } else if (node.next && !visited.has(node.next)) {
                queue.push([node.next, col + 1, 0]);
            }
            if (node.fallbackNext && !visited.has(node.fallbackNext)) {
                queue.push([node.fallbackNext, col + 1, 0]);
            }
        }

        // Place any unvisited nodes at the bottom
        let orphanRow = Math.max(...Object.values(colCounts), 0);
        nodeIds.forEach(id => {
            if (!visited.has(id)) {
                positions[id] = { x: 40, y: 40 + orphanRow * ROW_GAP };
                orphanRow++;
            }
        });

        return positions;
    },

    _drawConnections(svg, positions, nodeW, nodeH) {
        svg.innerHTML = '';

        // Calculate SVG size
        let maxX = 0, maxY = 0;
        Object.values(positions).forEach(p => {
            if (p.x + nodeW > maxX) maxX = p.x + nodeW;
            if (p.y + nodeH > maxY) maxY = p.y + nodeH;
        });
        svg.setAttribute('width', maxX + 100);
        svg.setAttribute('height', maxY + 100);

        Object.entries(this.currentScript).forEach(([id, node]) => {
            const from = positions[id];
            if (!from) return;

            const drawLine = (toId, color, dashed) => {
                const to = positions[toId];
                if (!to) return;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', from.x + nodeW);
                line.setAttribute('y1', from.y + nodeH / 2);
                line.setAttribute('x2', to.x);
                line.setAttribute('y2', to.y + nodeH / 2);
                line.setAttribute('stroke', color);
                line.setAttribute('stroke-width', '2');
                if (dashed) line.setAttribute('stroke-dasharray', '6,4');
                // 箭头
                const angle = Math.atan2(to.y + nodeH / 2 - (from.y + nodeH / 2), to.x - (from.x + nodeW));
                const arrowLen = 8;
                const ax = to.x - arrowLen * Math.cos(angle - 0.4);
                const ay = to.y + nodeH / 2 - arrowLen * Math.sin(angle - 0.4);
                const bx = to.x - arrowLen * Math.cos(angle + 0.4);
                const by = to.y + nodeH / 2 - arrowLen * Math.sin(angle + 0.4);
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrow.setAttribute('points', `${to.x},${to.y + nodeH / 2} ${ax},${ay} ${bx},${by}`);
                arrow.setAttribute('fill', color);
                svg.appendChild(line);
                svg.appendChild(arrow);
            };

            if (node.choices && node.choices.length > 0) {
                node.choices.forEach(c => {
                    if (c.next) drawLine(c.next, '#5dade2', false);
                });
            } else if (node.next) {
                drawLine(node.next, '#5dade2', false);
            }
            if (node.fallbackNext) {
                drawLine(node.fallbackNext, '#e67e22', true);
            }
        });
    },

    // ===== 对话预览 (v3.7.0 增强) =====

    _previewNodeId: null,
    _previewScore: 0,
    _previewCorrect: 0,
    _previewTotal: 0,
    _previewCards: [],

    openPreview() {
        const nodeIds = Object.keys(this.currentScript);
        if (nodeIds.length === 0) {
            alert('当前章节无节点');
            return;
        }
        this._previewNodeId = nodeIds.includes('start') ? 'start' : nodeIds[0];
        this._previewScore = 0;
        this._previewCorrect = 0;
        this._previewTotal = 0;
        this._previewCards = [];
        this._updateScoreboard();
        document.getElementById('story-preview-modal').style.display = 'flex';
        this._renderPreviewNode();
    },

    closePreview() {
        document.getElementById('story-preview-modal').style.display = 'none';
        this._previewNodeId = null;
    },

    _updateScoreboard() {
        const el = document.getElementById('preview-scoreboard');
        if (el) el.textContent = `得分: ${this._previewScore} | 正确: ${this._previewCorrect}/${this._previewTotal}`;
    },

    _renderPreviewNode() {
        const cardEl = document.getElementById('preview-card-unlock');
        if (cardEl) cardEl.style.display = 'none';

        const node = this.currentScript[this._previewNodeId];
        if (!node) {
            // 章节结束 — 显示总结
            this._showPreviewSummary();
            return;
        }

        // 检测 event: chapter_complete 或 game_complete
        if (node.event === 'chapter_complete' || node.event === 'game_complete') {
            this._showPreviewSummary();
            return;
        }

        document.getElementById('preview-avatar').textContent = node.avatar || '👤';
        document.getElementById('preview-speaker').textContent = node.speaker || 'System';
        document.getElementById('preview-text').textContent = node.text || '(事件节点)';
        document.getElementById('preview-node-indicator').textContent = `node: ${this._previewNodeId}`;

        // 知识卡解锁提示
        if (node.unlockCard && cardEl) {
            this._previewCards.push(node.unlockCard);
            cardEl.textContent = `🎴 解锁知识卡: ${node.unlockCard}`;
            cardEl.style.display = 'block';
        }

        const choicesArea = document.getElementById('preview-choices');
        choicesArea.innerHTML = '';

        if (node.choices && node.choices.length > 0) {
            document.getElementById('preview-next-btn').style.display = 'none';
            node.choices.forEach((c, i) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary preview-choice-btn';
                btn.textContent = `${String.fromCharCode(65 + i)}. ${c.text}`;
                btn.addEventListener('click', () => {
                    // 分数追踪
                    if (c.isCorrect !== undefined) {
                        this._previewTotal++;
                        this._previewScore += (c.score || 0);
                        if (c.isCorrect) this._previewCorrect++;
                        this._updateScoreboard();
                    }
                    // 对错反馈
                    btn.style.pointerEvents = 'none';
                    choicesArea.querySelectorAll('.preview-choice-btn').forEach(b => b.style.pointerEvents = 'none');
                    btn.style.background = c.isCorrect ? '#2d6a4f' : '#922b21';
                    btn.style.color = '#fff';
                    if (c.feedback) {
                        const fb = document.createElement('div');
                        fb.style.cssText = 'padding:8px;margin-top:8px;font-size:13px;color:#aaa;text-align:center;';
                        fb.textContent = (c.isCorrect ? '✅ ' : '❌ ') + c.feedback;
                        choicesArea.appendChild(fb);
                    }
                    // 延迟跳转
                    setTimeout(() => {
                        this._previewNodeId = c.next || null;
                        this._renderPreviewNode();
                    }, 1200);
                });
                choicesArea.appendChild(btn);
            });
        } else if (node.condition) {
            // 条件分支 — 根据当前分数自动选路
            document.getElementById('preview-next-btn').style.display = '';
            const meetsCondition = node.condition.type === 'score_gte' && this._previewScore >= node.condition.value;
            const indicator = document.getElementById('preview-node-indicator');
            indicator.textContent += ` | 条件: 得分≥${node.condition.value} → ${meetsCondition ? '✅ 满足' : '❌ 不满足'}`;
            // 点继续时根据条件跳转
            this._conditionNext = meetsCondition ? node.next : node.fallbackNext;
        } else {
            document.getElementById('preview-next-btn').style.display = '';
            this._conditionNext = null;
        }
    },

    _showPreviewSummary() {
        // 计算满分
        let maxScore = 0;
        Object.values(this.currentScript).forEach(n => {
            if (n.choices) {
                const max = Math.max(...n.choices.map(c => c.score || 0), 0);
                if (n.choices.some(c => c.isCorrect !== undefined)) maxScore += max;
            }
        });

        document.getElementById('preview-avatar').textContent = '🏁';
        document.getElementById('preview-speaker').textContent = '章节结束';
        const rate = this._previewTotal > 0 ? Math.round(this._previewCorrect / this._previewTotal * 100) : 0;
        document.getElementById('preview-text').innerHTML =
            `<div style="text-align:center;line-height:2;">
                <div><strong>得分：${this._previewScore} / ${maxScore}</strong></div>
                <div>正确率：${this._previewCorrect}/${this._previewTotal} (${rate}%)</div>
                ${this._previewCards.length > 0 ? `<div>🎴 解锁卡片：${this._previewCards.join(', ')}</div>` : ''}
            </div>`;
        document.getElementById('preview-node-indicator').textContent = '(END)';
        document.getElementById('preview-choices').innerHTML = '';
        document.getElementById('preview-next-btn').style.display = 'none';
    },

    advancePreview() {
        const node = this.currentScript[this._previewNodeId];
        if (!node) return;
        // 条件分支用预计算的路径
        this._previewNodeId = this._conditionNext || node.next || null;
        this._conditionNext = null;
        this._renderPreviewNode();
    },

    // ===== 脚本校验 =====

    validateScript() {
        const issues = [];
        const nodeIds = new Set(Object.keys(this.currentScript));

        if (nodeIds.size === 0) {
            issues.push({ type: 'warning', msg: '当前章节没有任何节点' });
            this._showValidateResults(issues);
            return;
        }

        // 检查 start 节点
        if (!nodeIds.has('start')) {
            issues.push({ type: 'error', msg: '缺少 "start" 入口节点' });
        }

        // 遍历每个节点
        const reachable = new Set();
        const traverse = (id) => {
            if (!id || reachable.has(id)) return;
            reachable.add(id);
            const node = this.currentScript[id];
            if (!node) return;
            if (node.choices) {
                node.choices.forEach(c => traverse(c.next));
            } else {
                traverse(node.next);
            }
            traverse(node.fallbackNext);
        };
        if (nodeIds.has('start')) traverse('start');

        nodeIds.forEach(id => {
            const node = this.currentScript[id];

            // 空文本检查
            if (!node.text && !node.event) {
                issues.push({ type: 'warning', msg: `节点 "${id}" 没有对白也没有事件` });
            }

            // next 引用检查
            if (node.next && !nodeIds.has(node.next)) {
                issues.push({ type: 'error', msg: `节点 "${id}" 的 next 指向不存在的 "${node.next}"` });
            }

            // fallbackNext 引用检查
            if (node.fallbackNext && !nodeIds.has(node.fallbackNext)) {
                issues.push({ type: 'error', msg: `节点 "${id}" 的 fallbackNext 指向不存在的 "${node.fallbackNext}"` });
            }

            // choices 检查
            if (node.choices) {
                node.choices.forEach((c, i) => {
                    if (!c.text) {
                        issues.push({ type: 'warning', msg: `节点 "${id}" 选项 #${i + 1} 缺少文字` });
                    }
                    if (c.next && !nodeIds.has(c.next)) {
                        issues.push({ type: 'error', msg: `节点 "${id}" 选项 #${i + 1} 指向不存在的 "${c.next}"` });
                    }
                    if (!c.next) {
                        issues.push({ type: 'warning', msg: `节点 "${id}" 选项 #${i + 1} 没有指定跳转目标` });
                    }
                });
            }

            // 知识卡引用检查
            if (node.unlockCard && typeof KnowledgeBase !== 'undefined' && KnowledgeBase.data) {
                if (!KnowledgeBase.data[node.unlockCard]) {
                    issues.push({ type: 'warning', msg: `节点 "${id}" 引用了不存在的知识卡 "${node.unlockCard}"` });
                }
            }

            // 不可达检查
            if (!reachable.has(id)) {
                issues.push({ type: 'warning', msg: `节点 "${id}" 从 start 不可达` });
            }
        });

        // 死胡同检查（非结束节点但没有 next 也没有 choices）
        nodeIds.forEach(id => {
            const node = this.currentScript[id];
            if (!node.next && (!node.choices || node.choices.length === 0) && !node.event) {
                issues.push({ type: 'info', msg: `节点 "${id}" 是一个结束节点（无 next 也无选项）` });
            }
        });

        // ===== 分数审计与答案平衡 (v3.6.1) =====
        let totalScore = 0;
        let quizCount = 0;
        let aCorrect = 0, bCorrect = 0;

        nodeIds.forEach(id => {
            const node = this.currentScript[id];
            if (node.choices && node.choices.length >= 2) {
                const hasCorrect = node.choices.some(c => c.isCorrect);
                if (hasCorrect) {
                    quizCount++;
                    const maxScore = Math.max(...node.choices.map(c => c.score || 0));
                    totalScore += maxScore;

                    // A/B 分布（第一个选项=A，第二个=B）
                    if (node.choices[0] && node.choices[0].isCorrect) aCorrect++;
                    else if (node.choices[1] && node.choices[1].isCorrect) bCorrect++;

                    // isCorrect 与 score 一致性
                    node.choices.forEach((c, i) => {
                        if (c.isCorrect && (c.score || 0) === 0) {
                            issues.push({ type: 'error', msg: `节点 "${id}" 选项 #${i + 1} 标记为正确但分数为 0` });
                        }
                        if (!c.isCorrect && (c.score || 0) > 0) {
                            issues.push({ type: 'error', msg: `节点 "${id}" 选项 #${i + 1} 标记为错误但分数为 ${c.score}` });
                        }
                        if (!c.feedback) {
                            issues.push({ type: 'warning', msg: `节点 "${id}" 选项 #${i + 1} 缺少反馈语` });
                        }
                    });
                }
            }
        });

        if (quizCount > 0) {
            issues.push({ type: 'info', msg: `📊 题目统计：${quizCount} 道题，满分 ${totalScore} 分` });
            const balance = `A正确: ${aCorrect} | B正确: ${bCorrect}`;
            if (Math.abs(aCorrect - bCorrect) > 1) {
                issues.push({ type: 'warning', msg: `⚖️ 答案分布不均衡：${balance}（建议接近 1:1）` });
            } else {
                issues.push({ type: 'success', msg: `⚖️ 答案分布均衡：${balance}` });
            }
        }

        if (issues.filter(i => i.type === 'error').length === 0 && issues.filter(i => i.type === 'warning').length === 0) {
            issues.push({ type: 'success', msg: `全部 ${nodeIds.size} 个节点校验通过，无问题` });
        }

        this._showValidateResults(issues);
    },

    _showValidateResults(issues) {
        const body = document.getElementById('validate-body');
        const iconMap = { error: '❌', warning: '⚠️', info: 'ℹ️', success: '✅' };
        body.innerHTML = issues.map(i =>
            `<div class="validate-item validate-${i.type}">
                <span class="validate-icon">${iconMap[i.type] || ''}</span>
                <span>${i.msg}</span>
            </div>`
        ).join('');
        document.getElementById('validate-modal').style.display = 'flex';
    },

    // ===== 章节属性设置 =====

    openChapterSettings() {
        if (this._chapterMeta) {
            alert("DLC 章节属性请在 manifest.json 中配置");
            return;
        }
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
