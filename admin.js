/**
 * 配置管理后台 - JavaScript 逻辑
 * 包含密码验证、题目编辑、难度配置功能
 */

// ==========================================
// 🔐 密码验证
// ==========================================

const ADMIN_PASSWORD = 'velotric';

const Auth = {
    isAuthenticated: false,

    check() {
        // 检查会话存储
        const session = sessionStorage.getItem('velotric_admin_auth');
        if (session === 'authenticated') {
            this.isAuthenticated = true;
            return true;
        }
        return false;
    },

    login(password) {
        if (password === ADMIN_PASSWORD) {
            this.isAuthenticated = true;
            sessionStorage.setItem('velotric_admin_auth', 'authenticated');
            return true;
        }
        return false;
    },

    logout() {
        this.isAuthenticated = false;
        sessionStorage.removeItem('velotric_admin_auth');
    }
};

// ==========================================
// 📝 题目数据管理
// ==========================================

const QuestionsData = {
    // 默认题目数据（从 game.js 同步）
    defaultQuestions: {
        1: {
            context: "作为产品经理，你觉得我们现在第一步该做什么？直接画图纸，还是先搞清楚为什么要做这款车？",
            options: [
                { text: "直接画图纸，效率第一！", isCorrect: false, feedback: "别急！先想清楚再动手" },
                { text: "先搞清楚市场需求和商业逻辑", isCorrect: true, feedback: "没错！谋定而后动" }
            ]
        },
        2: {
            context: "这...如果现在报上去，评审会可能过不了。要不我们先不说，私下先解决？",
            options: [
                { text: "听工程师的，先过评审要紧", isCorrect: false, feedback: "危险！EVT严禁报喜不报忧" },
                { text: "不行，EVT 就是要暴露问题的", isCorrect: true, feedback: "正确！发现问题是功劳" }
            ]
        },
        3: {
            context: "报告！相关的功能指标和模拟分析都通过了，但是...这个贴纸的颜色稍微有一点点色差。",
            options: [
                { text: "色差是小事，忽略", isCorrect: false, feedback: "小心！小问题会变大客诉" },
                { text: "所有规格必记录并整改", isCorrect: true, feedback: "严谨！DVT是最后确认机会" }
            ]
        },
        4: {
            context: "PVT 阶段遇到装配不顺畅...",
            options: [
                { text: "现场直接换螺丝，保证速度", isCorrect: false, feedback: "停！PVT严禁随意变更" },
                { text: "寻找临时解决方案，同时按流程提ECN变更，评估影响", isCorrect: true, feedback: "稳定压倒一切！" }
            ]
        },
        5: {
            context: "柜子已经订好了。船期是下周三。小唯，这批货是急着赶美国黑五促销的吗？",
            options: [
                { text: "不急，慢船省钱", isCorrect: false, feedback: "糟糕！会错过黑五促销" },
                { text: "很急，必须保证时效", isCorrect: true, feedback: "正确！交付时效很重要" }
            ]
        },
        6: {
            context: "太棒了。这批货怎么分配？官网订单和经销商订单都在催。",
            options: [
                { text: "谁催得急给谁", isCorrect: false, feedback: "不行！乱分配会导致渠道打架" },
                { text: "按预定的上市计划分配", isCorrect: true, feedback: "严格执行计划！" }
            ]
        },
        7: {
            context: "Mike，别担心。我准备了...",
            options: [
                { text: "详细的产品参数表", isCorrect: false, feedback: "参数太枯燥，客户不爱听" },
                { text: "卖点培训资料和试骑指南", isCorrect: true, feedback: "讲场景，让客户心动！" }
            ]
        },
        8: {
            context: "现在，去金门大桥试骑一下！",
            options: [
                { text: "祝你骑行愉快！", isCorrect: true, feedback: "" }
            ]
        }
    },

    // 获取题目数据
    get() {
        const saved = localStorage.getItem('velotric_questions_config');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.defaultQuestions;
    },

    // 保存题目数据
    save(data) {
        localStorage.setItem('velotric_questions_config', JSON.stringify(data));
    },

    // 重置为默认
    reset() {
        localStorage.removeItem('velotric_questions_config');
        return this.defaultQuestions;
    }
};

// ==========================================
// ⚙️ 难度配置管理
// ==========================================

const DifficultyData = {
    defaultConfig: {
        easy: {
            name: "新人模式",
            allowRetry: true,
            showHint: true,
            hasTimer: false,
            timeLimit: null,
            multiplier: 1
        },
        normal: {
            name: "标准模式",
            allowRetry: false,
            showHint: false,
            hasTimer: false,
            timeLimit: null,
            multiplier: 1
        },
        hard: {
            name: "挑战模式",
            allowRetry: false,
            showHint: false,
            hasTimer: true,
            timeLimit: 15,
            multiplier: 1.5
        }
    },

    get() {
        const saved = localStorage.getItem('velotric_difficulty_config');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.defaultConfig;
    },

    save(data) {
        localStorage.setItem('velotric_difficulty_config', JSON.stringify(data));
    },

    reset() {
        localStorage.removeItem('velotric_difficulty_config');
        return this.defaultConfig;
    }
};

// ==========================================
// 📖 章节配置管理
// ==========================================

const ChaptersData = {
    defaultChapters: [
        { id: 1, title: "入职第一天", location: "深圳·办公室", date: "2月" },
        { id: 2, title: "实验室风云", location: "昆山·EVT样车间", date: "4月" },
        { id: 3, title: "开模倒计时", location: "昆山·模具工厂", date: "7月" },
        { id: 4, title: "流水线挑战", location: "常州·总装工厂", date: "9月" },
        { id: 5, title: "启航时刻", location: "天津港", date: "11月" },
        { id: 6, title: "跨洋登陆", location: "美国·洛杉矶仓库", date: "次年1月" },
        { id: 7, title: "门店上架", location: "加州·经销商门店", date: "次年2月" },
        { id: 8, title: "骑行时刻", location: "旧金山·金门大桥", date: "次年2月" }
    ],

    get() {
        const saved = localStorage.getItem('velotric_chapters_config');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.defaultChapters;
    },

    save(data) {
        localStorage.setItem('velotric_chapters_config', JSON.stringify(data));
    },

    reset() {
        localStorage.removeItem('velotric_chapters_config');
        return this.defaultChapters;
    }
};

// ==========================================
// 🖥️ 界面管理
// ==========================================

const AdminUI = {
    currentTab: 'questions',
    currentChapter: 1,

    init() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents() {
        // 登录事件
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('password-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // 登出事件
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // 预览游戏
        document.getElementById('preview-btn').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // 章节选择
        document.getElementById('chapter-select').addEventListener('change', (e) => {
            this.currentChapter = parseInt(e.target.value);
            this.renderQuestions();
        });

        // 保存按钮
        document.getElementById('save-questions-btn').addEventListener('click', () => this.saveQuestions());
        document.getElementById('reset-questions-btn').addEventListener('click', () => this.resetQuestions());
        document.getElementById('save-difficulty-btn').addEventListener('click', () => this.saveDifficulty());
        document.getElementById('reset-difficulty-btn').addEventListener('click', () => this.resetDifficulty());
        document.getElementById('save-chapters-btn').addEventListener('click', () => this.saveChapters());
        document.getElementById('add-chapter-btn').addEventListener('click', () => this.addChapter());
        document.getElementById('reset-chapters-btn').addEventListener('click', () => this.resetChapters());
    },

    checkAuth() {
        if (Auth.check()) {
            this.showAdminScreen();
        }
    },

    handleLogin() {
        const password = document.getElementById('password-input').value;
        const errorEl = document.getElementById('login-error');

        if (Auth.login(password)) {
            errorEl.style.display = 'none';
            this.showAdminScreen();
        } else {
            errorEl.style.display = 'block';
            document.getElementById('password-input').value = '';
            document.getElementById('password-input').focus();
        }
    },

    handleLogout() {
        Auth.logout();
        document.getElementById('admin-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('password-input').value = '';
    },

    showAdminScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.add('active');
        this.renderChapterSelector();
        this.renderQuestions();
        this.renderDifficulty();
        this.renderChapters();
    },

    // 动态渲染章节选择器
    renderChapterSelector() {
        const chapters = ChaptersData.get();
        const select = document.getElementById('chapter-select');
        const currentValue = this.currentChapter;

        select.innerHTML = chapters.map(ch =>
            `<option value="${ch.id}" ${ch.id === currentValue ? 'selected' : ''}>第${ch.id}章 - ${ch.title}</option>`
        ).join('');

        // 如果当前章节不存在，重置为第一章
        if (!chapters.find(ch => ch.id === currentValue) && chapters.length > 0) {
            this.currentChapter = chapters[0].id;
            select.value = this.currentChapter;
        }
    },

    switchTab(tabName) {
        this.currentTab = tabName;

        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新面板显示
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
    },

    // ===== 题目渲染 =====
    renderQuestions() {
        const questions = QuestionsData.get();
        const question = questions[this.currentChapter];
        const container = document.getElementById('questions-list');

        if (!question) {
            container.innerHTML = '<p class="no-data">该章节暂无题目</p>';
            return;
        }

        container.innerHTML = `
      <div class="question-card" data-chapter="${this.currentChapter}">
        <div class="question-header">
          <div class="question-number">
            <span>📝</span>
            <span>第 ${this.currentChapter} 章题目</span>
          </div>
        </div>
        
        <div class="question-context">
          <label>场景问题：</label>
          <textarea id="question-context" placeholder="输入问题描述...">${question.context}</textarea>
        </div>

        <div class="options-list">
          ${question.options.map((opt, i) => `
            <div class="option-item ${opt.isCorrect ? 'correct' : ''}" data-index="${i}">
              <div class="option-letter">${String.fromCharCode(65 + i)}</div>
              <input type="text" class="option-text" value="${opt.text}" data-field="text">
              <button class="option-correct-toggle ${opt.isCorrect ? 'active' : ''}" data-index="${i}">
                ${opt.isCorrect ? '✓ 正确' : '设为正确'}
              </button>
            </div>
            <div class="feedback-input">
              <label>反馈语：</label>
              <input type="text" value="${opt.feedback}" data-index="${i}" data-field="feedback">
            </div>
          `).join('')}
        </div>
      </div>
    `;

        // 绑定正确答案切换事件
        container.querySelectorAll('.option-correct-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.toggleCorrectOption(index);
            });
        });
    },

    toggleCorrectOption(selectedIndex) {
        const questions = QuestionsData.get();
        const question = questions[this.currentChapter];

        question.options.forEach((opt, i) => {
            opt.isCorrect = (i === selectedIndex);
        });

        QuestionsData.save(questions);
        this.renderQuestions();
    },

    saveQuestions() {
        const questions = QuestionsData.get();
        const question = questions[this.currentChapter];

        // 获取编辑后的值
        question.context = document.getElementById('question-context').value;

        document.querySelectorAll('.option-item').forEach((item, i) => {
            const textInput = item.querySelector('.option-text');
            question.options[i].text = textInput.value;
        });

        document.querySelectorAll('.feedback-input input').forEach((input) => {
            const index = parseInt(input.dataset.index);
            question.options[index].feedback = input.value;
        });

        QuestionsData.save(questions);
        this.showToast('题目保存成功！');
    },

    resetQuestions() {
        if (confirm('确定要恢复默认题目吗？所有修改将丢失。')) {
            QuestionsData.reset();
            this.renderQuestions();
            this.showToast('已恢复默认题目');
        }
    },

    // ===== 难度渲染 =====
    renderDifficulty() {
        const config = DifficultyData.get();

        // 新人模式
        document.getElementById('easy-retry').checked = config.easy.allowRetry;
        document.getElementById('easy-hint').checked = config.easy.showHint;
        document.getElementById('easy-multiplier').value = config.easy.multiplier;

        // 标准模式
        document.getElementById('normal-retry').checked = config.normal.allowRetry;
        document.getElementById('normal-hint').checked = config.normal.showHint;
        document.getElementById('normal-timer').checked = config.normal.hasTimer;
        document.getElementById('normal-multiplier').value = config.normal.multiplier;

        // 挑战模式
        document.getElementById('hard-retry').checked = config.hard.allowRetry;
        document.getElementById('hard-hint').checked = config.hard.showHint;
        document.getElementById('hard-timer').checked = config.hard.hasTimer;
        document.getElementById('hard-time-limit').value = config.hard.timeLimit || 15;
        document.getElementById('hard-multiplier').value = config.hard.multiplier;
    },

    saveDifficulty() {
        const config = {
            easy: {
                name: "新人模式",
                allowRetry: document.getElementById('easy-retry').checked,
                showHint: document.getElementById('easy-hint').checked,
                hasTimer: false,
                timeLimit: null,
                multiplier: parseFloat(document.getElementById('easy-multiplier').value)
            },
            normal: {
                name: "标准模式",
                allowRetry: document.getElementById('normal-retry').checked,
                showHint: document.getElementById('normal-hint').checked,
                hasTimer: document.getElementById('normal-timer').checked,
                timeLimit: null,
                multiplier: parseFloat(document.getElementById('normal-multiplier').value)
            },
            hard: {
                name: "挑战模式",
                allowRetry: document.getElementById('hard-retry').checked,
                showHint: document.getElementById('hard-hint').checked,
                hasTimer: document.getElementById('hard-timer').checked,
                timeLimit: parseInt(document.getElementById('hard-time-limit').value),
                multiplier: parseFloat(document.getElementById('hard-multiplier').value)
            }
        };

        DifficultyData.save(config);
        this.showToast('难度设置已保存！');
    },

    resetDifficulty() {
        if (confirm('确定要恢复默认难度设置吗？')) {
            DifficultyData.reset();
            this.renderDifficulty();
            this.showToast('已恢复默认设置');
        }
    },

    // ===== 章节渲染 =====
    renderChapters() {
        const chapters = ChaptersData.get();
        const container = document.getElementById('chapters-list');

        container.innerHTML = chapters.map((ch, index) => `
      <div class="chapter-item" data-id="${ch.id}" data-index="${index}">
        <div class="chapter-number">${ch.id}</div>
        <div class="chapter-info">
          <input type="text" class="chapter-title-input" value="${ch.title}" data-field="title" placeholder="章节标题">
          <input type="text" value="${ch.location}" data-field="location" placeholder="地点">
          <input type="text" value="${ch.date}" data-field="date" placeholder="时间">
        </div>
        <button class="btn-delete-chapter" data-index="${index}" title="删除此章节">🗑️</button>
      </div>
    `).join('');

        // 绑定删除按钮事件
        container.querySelectorAll('.btn-delete-chapter').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.deleteChapter(index);
            });
        });
    },

    addChapter() {
        const chapters = ChaptersData.get();
        const newId = chapters.length + 1;
        chapters.push({
            id: newId,
            title: `新章节 ${newId}`,
            location: "待填写地点",
            date: "待填写时间"
        });
        ChaptersData.save(chapters);
        this.renderChapters();
        this.showToast(`已添加第 ${newId} 章`);

        // 滚动到底部
        const container = document.getElementById('chapters-list');
        container.scrollTop = container.scrollHeight;

        // 同步更新章节选择器
        this.renderChapterSelector();
    },

    deleteChapter(index) {
        const chapters = ChaptersData.get();
        if (chapters.length <= 1) {
            this.showToast('至少保留一个章节', true);
            return;
        }

        const chapter = chapters[index];
        if (confirm(`确定要删除「${chapter.title}」吗？`)) {
            chapters.splice(index, 1);
            // 重新编号
            chapters.forEach((ch, i) => {
                ch.id = i + 1;
            });
            ChaptersData.save(chapters);
            this.renderChapters();
            this.renderChapterSelector();
            this.showToast('章节已删除');
        }
    },

    resetChapters() {
        if (confirm('确定要恢复默认章节配置吗？')) {
            ChaptersData.reset();
            this.renderChapters();
            this.renderChapterSelector();
            this.showToast('已恢复默认章节');
        }
    },

    saveChapters() {
        const chapters = [];
        document.querySelectorAll('.chapter-item').forEach((item, index) => {
            chapters.push({
                id: index + 1,
                title: item.querySelector('[data-field="title"]').value,
                location: item.querySelector('[data-field="location"]').value,
                date: item.querySelector('[data-field="date"]').value
            });
        });

        ChaptersData.save(chapters);
        this.renderChapterSelector();
        this.showToast('章节配置已保存！');
    },

    // ===== Toast 提示 =====
    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toast-message');

        messageEl.textContent = message;
        toast.classList.toggle('error', isError);
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    AdminUI.init();
});
