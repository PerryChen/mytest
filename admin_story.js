/**
 * 剧情编辑器 (Visual Story Editor)
 * v3.0 — 节点图谱、对话预览、校验、导入导出
 */
const StoryEditor = {
    currentScript: {},
    currentChapterId: 1,
    currentNodeId: null,

    // 视图模式: 'list' | 'graph'
    viewMode: 'list',

    // 图谱节点位置缓存
    _graphPositions: {},

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

        // 校验
        document.getElementById('validate-btn').addEventListener('click', () => this.validateScript());
        document.getElementById('close-validate-btn').addEventListener('click', () => {
            document.getElementById('validate-modal').style.display = 'none';
        });

        // 对话预览
        document.getElementById('preview-story-btn').addEventListener('click', () => this.openPreview());
        document.getElementById('close-preview-btn').addEventListener('click', () => this.closePreview());
        document.getElementById('preview-next-btn').addEventListener('click', () => this.advancePreview());
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
            this.refreshCanvas();
            this.clearEditor();
            return;
        }

        // 默认加载 (fetch)
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
        document.getElementById('node-properties').style.display = 'flex';
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
                if (!confirm(`即将导入 ${keys.length} 个节点到第 ${this.currentChapterId} 章，是否覆盖当前内容？`)) {
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

    // ===== 对话预览 =====

    _previewNodeId: null,

    openPreview() {
        const nodeIds = Object.keys(this.currentScript);
        if (nodeIds.length === 0) {
            alert('当前章节无节点');
            return;
        }
        this._previewNodeId = nodeIds.includes('start') ? 'start' : nodeIds[0];
        document.getElementById('story-preview-modal').style.display = 'flex';
        this._renderPreviewNode();
    },

    closePreview() {
        document.getElementById('story-preview-modal').style.display = 'none';
        this._previewNodeId = null;
    },

    _renderPreviewNode() {
        const node = this.currentScript[this._previewNodeId];
        if (!node) {
            // 结束
            document.getElementById('preview-avatar').textContent = '🎬';
            document.getElementById('preview-speaker').textContent = '结束';
            document.getElementById('preview-text').textContent = '对话流程已结束';
            document.getElementById('preview-node-indicator').textContent = '(END)';
            document.getElementById('preview-choices').innerHTML = '';
            document.getElementById('preview-next-btn').style.display = 'none';
            return;
        }

        document.getElementById('preview-avatar').textContent = node.avatar || '👤';
        document.getElementById('preview-speaker').textContent = node.speaker || 'System';
        document.getElementById('preview-text').textContent = node.text || '(事件节点)';
        document.getElementById('preview-node-indicator').textContent = `node: ${this._previewNodeId}`;

        const choicesArea = document.getElementById('preview-choices');
        choicesArea.innerHTML = '';

        if (node.choices && node.choices.length > 0) {
            document.getElementById('preview-next-btn').style.display = 'none';
            node.choices.forEach((c, i) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary preview-choice-btn';
                btn.textContent = `${String.fromCharCode(65 + i)}. ${c.text}`;
                btn.addEventListener('click', () => {
                    this._previewNodeId = c.next || null;
                    this._renderPreviewNode();
                });
                choicesArea.appendChild(btn);
            });
        } else {
            document.getElementById('preview-next-btn').style.display = '';
        }
    },

    advancePreview() {
        const node = this.currentScript[this._previewNodeId];
        if (!node) return;
        this._previewNodeId = node.next || null;
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

        if (issues.length === 0) {
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
