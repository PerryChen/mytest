/**
 * ScriptDiff - 剧本对比引擎 (v3.9.0)
 * 节点级 diff：新增(绿)、修改(黄)、删除(红)、不变(灰)
 */
const ScriptDiff = {

    /**
     * 比较草稿与已发布版本
     * @param {Object} draft - 草稿剧本 (node map)
     * @param {Object} published - 已发布剧本 (node map)
     * @returns {Object} { added: [], modified: [], removed: [], unchanged: [], stats }
     */
    compare(draft, published) {
        const result = { added: [], modified: [], removed: [], unchanged: [] };
        if (!draft) draft = {};
        if (!published) published = {};

        const draftIds = new Set(Object.keys(draft));
        const pubIds = new Set(Object.keys(published));

        // 新增：在草稿中但不在已发布中
        for (const id of draftIds) {
            if (!pubIds.has(id)) {
                result.added.push({ id, node: draft[id] });
            }
        }

        // 删除：在已发布中但不在草稿中
        for (const id of pubIds) {
            if (!draftIds.has(id)) {
                result.removed.push({ id, node: published[id] });
            }
        }

        // 修改或不变：两边都存在
        for (const id of draftIds) {
            if (!pubIds.has(id)) continue;
            const dNode = draft[id];
            const pNode = published[id];

            if (JSON.stringify(dNode) === JSON.stringify(pNode)) {
                result.unchanged.push({ id });
            } else {
                result.modified.push({
                    id,
                    changes: this._diffNode(dNode, pNode)
                });
            }
        }

        result.stats = {
            total: draftIds.size,
            added: result.added.length,
            modified: result.modified.length,
            removed: result.removed.length,
            unchanged: result.unchanged.length
        };

        return result;
    },

    /**
     * 节点内字段级 diff
     * @returns {Array<{field, from, to}>}
     */
    _diffNode(draft, published) {
        const changes = [];
        const allKeys = new Set([...Object.keys(draft), ...Object.keys(published)]);

        for (const key of allKeys) {
            const dVal = JSON.stringify(draft[key] ?? null);
            const pVal = JSON.stringify(published[key] ?? null);
            if (dVal !== pVal) {
                changes.push({
                    field: key,
                    from: published[key],
                    to: draft[key]
                });
            }
        }
        return changes;
    },

    /**
     * 渲染 diff 结果为 HTML
     * @param {Object} diffResult - compare() 返回值
     * @returns {string} HTML
     */
    render(diffResult) {
        const { added, modified, removed, unchanged, stats } = diffResult;
        let html = '';

        // 统计摘要
        html += `<div class="diff-summary">`;
        html += `<span class="diff-stat diff-stat-total">共 ${stats.total} 个节点</span>`;
        if (stats.added > 0) html += `<span class="diff-stat diff-stat-added">+${stats.added} 新增</span>`;
        if (stats.modified > 0) html += `<span class="diff-stat diff-stat-modified">~${stats.modified} 修改</span>`;
        if (stats.removed > 0) html += `<span class="diff-stat diff-stat-removed">-${stats.removed} 删除</span>`;
        if (stats.unchanged > 0) html += `<span class="diff-stat diff-stat-unchanged">${stats.unchanged} 不变</span>`;
        html += `</div>`;

        if (stats.added === 0 && stats.modified === 0 && stats.removed === 0) {
            html += `<div class="diff-empty">草稿与线上版本完全一致，无需发布。</div>`;
            return html;
        }

        // 新增节点
        for (const item of added) {
            html += `<div class="diff-node diff-added">`;
            html += `<div class="diff-node-header"><span class="diff-badge added">新增</span> <strong>${this._esc(item.id)}</strong></div>`;
            html += `<div class="diff-node-body">`;
            html += this._renderNodePreview(item.node);
            html += `</div></div>`;
        }

        // 修改节点
        for (const item of modified) {
            html += `<div class="diff-node diff-modified">`;
            html += `<div class="diff-node-header"><span class="diff-badge modified">修改</span> <strong>${this._esc(item.id)}</strong></div>`;
            html += `<div class="diff-node-body">`;
            for (const change of item.changes) {
                html += `<div class="diff-field">`;
                html += `<span class="diff-field-name">${this._esc(change.field)}</span>`;
                if (change.from !== undefined && change.from !== null) {
                    html += `<div class="diff-value diff-value-old">${this._formatValue(change.from)}</div>`;
                }
                if (change.to !== undefined && change.to !== null) {
                    html += `<div class="diff-value diff-value-new">${this._formatValue(change.to)}</div>`;
                } else {
                    html += `<div class="diff-value diff-value-old">(已删除)</div>`;
                }
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        // 删除节点
        for (const item of removed) {
            html += `<div class="diff-node diff-removed">`;
            html += `<div class="diff-node-header"><span class="diff-badge removed">删除</span> <strong>${this._esc(item.id)}</strong></div>`;
            html += `<div class="diff-node-body">`;
            html += this._renderNodePreview(item.node);
            html += `</div></div>`;
        }

        return html;
    },

    /**
     * 渲染发布前检查清单
     * @param {Object} script - 当前剧本
     * @param {Object} diffResult - compare() 返回值
     * @returns {{ html: string, passed: boolean, errors: number, warnings: number }}
     */
    renderChecklist(script, diffResult) {
        const items = [];
        let errors = 0, warnings = 0;

        // 1. 脚本校验（无 error 级问题）
        const validation = this._quickValidate(script);
        if (validation.errors === 0) {
            items.push({ status: 'pass', text: `脚本校验通过（${validation.nodeCount} 个节点）` });
        } else {
            items.push({ status: 'fail', text: `脚本校验有 ${validation.errors} 个错误` });
            errors++;
        }

        // 2. 答案分布均衡
        if (validation.quizCount > 0) {
            const balance = Math.abs(validation.aCorrect - validation.bCorrect);
            if (balance <= 1) {
                items.push({ status: 'pass', text: `答案分布均衡 (A:${validation.aCorrect} / B:${validation.bCorrect})` });
            } else {
                items.push({ status: 'warn', text: `答案分布不均 (A:${validation.aCorrect} / B:${validation.bCorrect})` });
                warnings++;
            }
        }

        // 3. 反馈语完整性
        if (validation.missingFeedback === 0) {
            items.push({ status: 'pass', text: '所有选项均有反馈语' });
        } else {
            items.push({ status: 'warn', text: `${validation.missingFeedback} 个选项缺少反馈语` });
            warnings++;
        }

        // 4. 有实际改动
        if (diffResult.stats.added > 0 || diffResult.stats.modified > 0 || diffResult.stats.removed > 0) {
            items.push({ status: 'pass', text: `有 ${diffResult.stats.added + diffResult.stats.modified + diffResult.stats.removed} 处改动待发布` });
        } else {
            items.push({ status: 'info', text: '无改动（与线上版本一致）' });
        }

        const iconMap = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
        let html = '<div class="diff-checklist">';
        html += '<h4>发布前检查</h4>';
        for (const item of items) {
            html += `<div class="checklist-item checklist-${item.status}">${iconMap[item.status]} ${this._esc(item.text)}</div>`;
        }
        html += '</div>';

        return { html, passed: errors === 0, errors, warnings };
    },

    /**
     * 快速校验（不弹窗，仅返回统计）
     */
    _quickValidate(script) {
        const nodeIds = Object.keys(script);
        let validationErrors = 0;
        let quizCount = 0, aCorrect = 0, bCorrect = 0, missingFeedback = 0;

        nodeIds.forEach(id => {
            const node = script[id];
            // next 引用检查
            if (node.next && !script[node.next]) validationErrors++;
            if (node.fallbackNext && !script[node.fallbackNext]) validationErrors++;

            if (node.choices) {
                node.choices.forEach((c, i) => {
                    if (c.next && !script[c.next]) validationErrors++;
                });

                const hasCorrect = node.choices.some(c => c.isCorrect);
                if (hasCorrect) {
                    quizCount++;
                    if (node.choices[0]?.isCorrect) aCorrect++;
                    else if (node.choices[1]?.isCorrect) bCorrect++;
                    node.choices.forEach(c => {
                        if (!c.feedback) missingFeedback++;
                    });
                }
            }
        });

        return {
            nodeCount: nodeIds.length,
            errors: validationErrors,
            quizCount, aCorrect, bCorrect, missingFeedback
        };
    },

    _renderNodePreview(node) {
        let html = '';
        if (node.speaker) html += `<div class="diff-preview-line"><b>${this._esc(node.speaker)}</b></div>`;
        if (node.text) html += `<div class="diff-preview-line">${this._esc(node.text).substring(0, 80)}${node.text.length > 80 ? '...' : ''}</div>`;
        if (node.choices) html += `<div class="diff-preview-line">[${node.choices.length} 个选项]</div>`;
        return html;
    },

    _formatValue(val) {
        if (typeof val === 'string') return this._esc(val.length > 100 ? val.substring(0, 100) + '...' : val);
        if (Array.isArray(val)) return `[${val.length} 项]`;
        if (typeof val === 'object' && val !== null) return this._esc(JSON.stringify(val).substring(0, 100));
        return this._esc(String(val));
    },

    _esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptDiff;
}
