/**
 * 配置管理后台 - JavaScript 逻辑
 * 包含密码验证、题目编辑、难度配置功能
 */

// ==========================================
// 🔐 密码验证
// ==========================================

const ADMIN_PASSWORD = (typeof AppConfig !== 'undefined' && AppConfig.admin?.password) || 'velotric';

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
    currentTab: 'story',
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



        // 保存按钮
        // document.getElementById('save-questions-btn').addEventListener('click', () => this.saveQuestions());
        // document.getElementById('reset-questions-btn').addEventListener('click', () => this.resetQuestions());
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
        // this.renderQuestions(); // Removed
        // this.renderQuestions(); // Removed
        this.renderDifficulty();
        this.renderChapters();
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

            this.showToast('章节已删除');
        }
    },

    resetChapters() {
        if (confirm('确定要恢复默认章节配置吗？')) {
            ChaptersData.reset();
            this.renderChapters();

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
