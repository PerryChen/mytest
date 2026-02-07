/**
 * 电动出行造车记 v2.0 - 重构版入口文件
 * 核心逻辑已迁移到 core/ 模块
 * 本文件作为入口，负责：
 * 1. 初始化核心模块
 * 2. 绑定 UI 事件
 * 3. 提供向后兼容的包装函数
 */

// ==========================================
// ⌨️ 打字机效果 TypeWriter
// ==========================================

const TypeWriter = {
  isTyping: false,
  currentText: '',
  currentIndex: 0,
  element: null,
  intervalId: null,
  speed: 40,
  onComplete: null,

  start(text, element, onComplete = null) {
    this.stop();
    this.currentText = text;
    this.currentIndex = 0;
    this.element = element;
    this.onComplete = onComplete;
    this.isTyping = true;
    this.element.textContent = '';

    this.intervalId = setInterval(() => {
      if (this.currentIndex < this.currentText.length) {
        this.element.textContent += this.currentText[this.currentIndex];
        this.currentIndex++;
        // 播放打字音效 (每2个字符播放一次，避免过于频繁)
        if (this.currentIndex % 2 === 0) {
          if (typeof AudioManager !== 'undefined' && typeof AudioManager.playTyping === 'function') {
            AudioManager.playTyping();
          } else {
            // Fallback or debug
            // console.warn('AudioManager.playTyping not available');
          }
        }
      } else {
        this.complete();
      }
    }, this.speed);
  },

  skip() {
    if (!this.isTyping) return false;
    this.stop();
    this.element.textContent = this.currentText;
    this.isTyping = false;
    if (this.onComplete) this.onComplete();
    return true;
  },

  complete() {
    this.stop();
    this.isTyping = false;
    if (this.onComplete) this.onComplete();
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};

// ==========================================
// 🎮 GameState - 状态管理（委托给 GameEngine）
// ==========================================

const GameState = {
  get currentChapterId() { return GameEngine.state.currentChapterId; },
  set currentChapterId(v) { GameEngine.state.currentChapterId = v; },
  get currentDialogueId() { return GameEngine.state.currentDialogueId; },
  set currentDialogueId(v) { GameEngine.state.currentDialogueId = v; },
  get score() { return GameEngine.state.score; },
  set score(v) { GameEngine.state.score = v; },
  get unlockedCards() { return GameEngine.state.unlockedCards; },
  get completedChapters() { return GameEngine.state.completedChapters; },
  get gameStartTime() { return GameEngine.state.gameStartTime; },
  set gameStartTime(v) { GameEngine.state.gameStartTime = v; },
  get hasCompleted() { return GameEngine.state.completedChapters.length >= 8; },
  set hasCompleted(v) { /* 通过 completedChapters 判断 */ },
  get completionTime() { return GameEngine.state.completionTime; },
  set completionTime(v) { GameEngine.state.completionTime = v; },

  reset() { GameEngine.resetState(); },
  save() { GameEngine.saveGame(); },
  load() { return GameEngine.loadSaveData(); },
  unlockCard(cardId) { return GameEngine.unlockCard(cardId); }
};

// ==========================================
// 🖥️ UI - 视图层（现有实现，逐步迁移到 UIManager）
// ==========================================

const UI = {
  screens: null,
  gameHeader: null,
  scene: null,
  dialog: null,
  popup: null,

  init() {
    // 初始化 Analytics
    if (typeof AnalyticsManager !== 'undefined') {
      AnalyticsManager.init();
    }

    this.screens = {
      intro: document.getElementById('intro-screen'),
      game: document.getElementById('game-screen'),
      transition: document.getElementById('transition-screen'),
      complete: document.getElementById('chapter-complete-screen'),
      ending: document.getElementById('ending-screen'),
      cards: document.getElementById('cards-screen')
    };

    this.gameHeader = {
      badge: document.getElementById('chapter-badge'),
      title: document.getElementById('chapter-title'),
      date: document.getElementById('chapter-date'),
      location: document.getElementById('location-text')
    };

    this.scene = {
      bg: document.getElementById('scene-bg'),
      characterArea: document.getElementById('character-area')
    };

    this.dialog = {
      box: document.getElementById('dialog-container'),
      avatar: document.getElementById('speaker-avatar'),
      name: document.getElementById('speaker-name'),
      text: document.getElementById('dialog-text'),
      indicator: document.getElementById('dialog-indicator'),
      choices: document.getElementById('choices-container')
    };

    this.popup = {
      container: document.getElementById('knowledge-popup'),
      title: document.getElementById('knowledge-title'),
      content: document.getElementById('knowledge-content'),
      closeBtn: document.getElementById('close-knowledge-btn')
    };

    // 事件绑定
    document.getElementById('new-game-btn').addEventListener('click', () => Game.startNewGame());
    document.getElementById('continue-game-btn').addEventListener('click', () => Game.continueGame());
    document.querySelector('.dialog-box').addEventListener('click', () => Game.advanceDialogue());
    document.getElementById('next-chapter-btn').addEventListener('click', () => Game.startChapter(GameState.currentChapterId + 1));
    document.getElementById('review-chapter-btn').addEventListener('click', () => Game.reviewCurrentChapter());

    this.popup.closeBtn.addEventListener('click', () => {
      this.popup.container.style.display = 'none';
      if (Game.pendingDialogueNode) {
        const node = Game.pendingDialogueNode;
        Game.pendingDialogueNode = null;
        this.renderDialogue(node);
        Game.isWaitingChoice = (node.choices && node.choices.length > 0);
      } else {
        Game.advanceDialogue();
      }
    });

    document.getElementById('play-again-btn').addEventListener('click', () => Game.startNewGame());
    document.getElementById('view-cards-btn').addEventListener('click', () => Game.showCardsScreen());
    document.getElementById('cards-back-btn').addEventListener('click', () => Game.goBackToEndingOrMenu());

    if (GameEngine.loadSaveData()) {
      document.getElementById('continue-game-btn').style.display = 'flex';
    }

    document.getElementById('confirm-name-btn').addEventListener('click', () => this.confirmPlayerName());
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.confirmPlayerName();
    });

    const downloadBtn = document.getElementById('download-cert-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadCertificate());
    }

    document.getElementById('chapter-select-btn').addEventListener('click', () => this.showChapterSelector());
    document.getElementById('close-chapter-select-btn').addEventListener('click', () => {
      document.getElementById('chapter-select-modal').style.display = 'none';
    });

    document.getElementById('sound-toggle-btn').addEventListener('click', () => AudioManager.toggleSound());

    // DLC Demo 按钮
    document.getElementById('dlc-demo-btn').addEventListener('click', () => Game.startDLC('gtm_demo'));

    // 地图按钮
    const mapBtn = document.getElementById('map-btn');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => UI.showMap());
    }
    document.getElementById('close-map-btn').addEventListener('click', () => {
      document.getElementById('map-modal').style.display = 'none';
    });

    if (GameState.hasCompleted) {
      document.getElementById('chapter-select-btn').style.display = 'flex';
    }
  },

  confirmPlayerName() {
    const nameInput = document.getElementById('player-name-input');
    const playerName = nameInput.value.trim();
    if (!playerName) {
      nameInput.focus();
      nameInput.style.borderColor = '#ff6b6b';
      setTimeout(() => nameInput.style.borderColor = '', 1000);
      return;
    }
    document.getElementById('name-input-section').style.display = 'none';
    document.getElementById('certificate').style.display = 'block';
    document.getElementById('cert-player-name').textContent = playerName;
    const now = new Date();
    document.getElementById('cert-date').textContent = `通关日期：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    localStorage.setItem('velotric_player_name', playerName);
  },

  switchScreen(screenName) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[screenName].classList.add('active');
  },

  updateScene(chapter) {
    this.gameHeader.badge.textContent = `第${chapter.id}章`;
    this.gameHeader.title.textContent = chapter.title;
    this.gameHeader.location.textContent = chapter.location;

    const oldDate = this.gameHeader.date.textContent;
    if (oldDate !== chapter.date) {
      this.gameHeader.date.textContent = chapter.date;
      this.gameHeader.date.classList.remove('date-change');
      void this.gameHeader.date.offsetWidth;
      this.gameHeader.date.classList.add('date-change');
    }

    const totalChapters = StoryLoader.cache.chapters?.chapters?.length || 8;
    const progress = (chapter.id / totalChapters) * 100;
    document.getElementById('progress-text').textContent = `${chapter.id} / ${totalChapters}`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    this.scene.bg.className = `scene-background ${chapter.sceneClass}`;
  },

  renderDialogue(node) {
    this.dialog.name.textContent = node.speaker;
    this.dialog.avatar.textContent = node.avatar;

    const charArea = this.scene.characterArea;
    charArea.innerHTML = '';
    const charDiv = document.createElement('div');
    charDiv.className = 'character speaking';
    charDiv.innerHTML = `<div class="character-avatar">${node.avatar}</div>`;
    charArea.appendChild(charDiv);

    const choicesContainer = this.dialog.choices;
    choicesContainer.innerHTML = '';
    choicesContainer.style.display = 'none';
    this.dialog.indicator.style.display = 'none';

    TypeWriter.start(node.text, this.dialog.text, () => {
      if (node.choices && node.choices.length > 0) {
        choicesContainer.style.display = 'flex';
        node.choices.forEach((choice, index) => {
          const btn = document.createElement('div');
          btn.className = 'choice-btn choice-slide-in';
          btn.style.pointerEvents = 'none';
          btn.style.animationDelay = `${index * 100}ms`;
          btn.innerHTML = `<div class="choice-letter">${String.fromCharCode(65 + index)}</div>${choice.text}`;
          btn.onclick = (e) => {
            e.stopPropagation();
            Game.makeChoice(choice, btn);
          };
          choicesContainer.appendChild(btn);
        });
        setTimeout(() => {
          choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
            btn.style.pointerEvents = 'auto';
          });
        }, 500);
      } else {
        this.dialog.indicator.style.display = 'block';
      }
    });
  },

  showKnowledgeCard(cardId) {
    const card = StoryLoader.getKnowledgeCard(cardId);
    if (!card) return;
    this.popup.title.textContent = card.title;
    this.popup.content.textContent = card.content;
    this.popup.container.style.display = 'flex';
  },

  showTransition(chapter, callback) {
    this.switchScreen('transition');
    document.getElementById('transition-chapter').textContent = `第${chapter.id}章`;
    document.getElementById('transition-title').textContent = chapter.title;
    document.getElementById('transition-location').textContent = `📍 ${chapter.location}`;
    setTimeout(() => callback(), 2000);
  },

  showChapterComplete(chapterId) {
    this.switchScreen('complete');
    AudioManager.playComplete();
    const chapter = StoryLoader.getChapter(chapterId);
    document.getElementById('complete-chapter-name').textContent = `第${chapter.id}章：${chapter.title}`;
    document.getElementById('chapter-score').textContent = GameState.score;
    document.getElementById('decisions-count').textContent = '1';
    this._renderChapterCards(chapterId);
  },

  async _renderChapterCards(chapterId) {
    const cardsContainer = document.getElementById('cards-earned');
    cardsContainer.innerHTML = '';
    try {
      const script = await StoryLoader.loadChapterScript(chapterId);
      const cardsInChapter = new Set();
      Object.values(script).forEach(node => {
        if (node.unlockCard) cardsInChapter.add(node.unlockCard);
      });
      cardsInChapter.forEach(cardId => {
        const card = StoryLoader.getKnowledgeCard(cardId);
        if (card) {
          const el = document.createElement('div');
          el.className = 'mini-card';
          el.textContent = `💡 ${card.title}`;
          cardsContainer.appendChild(el);
        }
      });
    } catch (e) {
      console.warn('[UI] Failed to render chapter cards:', e);
    }
  },

  showEnding() {
    this.switchScreen('ending');
    AudioManager.playEnding();
    document.getElementById('total-score').textContent = GameState.score;
    document.getElementById('total-cards').textContent = GameState.unlockedCards.length;

    if (GameState.gameStartTime) {
      GameState.completionTime = Date.now() - GameState.gameStartTime;
    }
    GameState.save();

    // 检测成就
    this.checkAndShowAchievements();
  },

  checkAndShowAchievements() {
    const achievements = [];
    if (GameState.score >= 800) achievements.push({ icon: '🏆', name: '完美决策者', desc: '获得800分以上' });
    if (GameState.unlockedCards.length >= 8) achievements.push({ icon: '📚', name: '知识收藏家', desc: '解锁全部知识卡' });
    if (GameState.completionTime && GameState.completionTime < 600000) {
      achievements.push({ icon: '⚡', name: '速通达人', desc: '10分钟内通关' });
    }

    const container = document.getElementById('achievements-container');
    if (container) {
      container.innerHTML = '';
      if (achievements.length > 0) {
        container.style.display = 'block';
        achievements.forEach(ach => {
          const el = document.createElement('div');
          el.className = 'achievement-item';
          el.innerHTML = `<span class="achievement-icon">${ach.icon}</span><div><div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div></div>`;
          container.appendChild(el);
        });
      }
    }
  },

  downloadCertificate() {
    const container = document.getElementById('certificate');
    const btn = document.getElementById('download-cert-btn');
    if (!container || !btn) return;

    const btnContainer = btn.parentNode;
    const originalDisplay = btnContainer.style.display;
    btnContainer.style.display = 'none';

    html2canvas(container, { backgroundColor: null, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Velotric_Certificate_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      btnContainer.style.display = originalDisplay;
    }).catch(err => {
      console.error('证书生成失败:', err);
      btnContainer.style.display = originalDisplay;
    });
  },

  async showChapterSelector() {
    const modal = document.getElementById('chapter-select-modal');
    const list = document.getElementById('chapter-list');
    list.innerHTML = '';

    const chaptersData = StoryLoader.cache.chapters || await StoryLoader.loadChapters();
    chaptersData.chapters.forEach(chapter => {
      const item = document.createElement('div');
      item.className = 'chapter-item';
      item.innerHTML = `
        <div class="chapter-item-number">${chapter.id}</div>
        <div class="chapter-item-info">
          <div class="chapter-item-title">${chapter.title}</div>
          <div class="chapter-item-location">📍 ${chapter.location}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        modal.style.display = 'none';
        Game.startChapter(chapter.id);
      });
      list.appendChild(item);
    });
    modal.style.display = 'flex';
  },

  showCardsScreen() {
    this.switchScreen('cards');
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';

    const allCards = StoryLoader.cache.knowledgeCards || {};
    document.getElementById('cards-count').textContent = `${GameState.unlockedCards.length}/${Object.keys(allCards).length}`;

    Object.entries(allCards).forEach(([id, card]) => {
      const isUnlocked = GameState.unlockedCards.includes(id);
      const cardEl = document.createElement('div');
      cardEl.className = `card-item ${isUnlocked ? '' : 'locked'}`;
      cardEl.innerHTML = `
        <div class="card-item-header">
          <div class="card-item-icon">${isUnlocked ? '💡' : '🔒'}</div>
          <div>
            <div class="card-item-title">${isUnlocked ? card.title : '???'}</div>
          </div>
        </div>
        <div class="card-item-preview">${isUnlocked ? card.content : '探索剧情解锁此知识点'}</div>
      `;
      grid.appendChild(cardEl);
    });
  },

  goBackToEndingOrMenu() {
    this.switchScreen('ending');
  },

  async showMap() {
    const modal = document.getElementById('map-modal');
    const container = document.getElementById('map-visual');
    if (!modal || !container) return;

    container.innerHTML = '';
    const chaptersData = StoryLoader.cache.chapters || await StoryLoader.loadChapters();
    const currentId = GameState.currentChapterId;
    const completedIds = GameState.completedChapters;

    chaptersData.chapters.forEach((chapter, index) => {
      const isUnlocked = chapter.id <= currentId || completedIds.includes(chapter.id);
      const isCompleted = completedIds.includes(chapter.id) || chapter.id < currentId;
      const isCurrent = chapter.id === currentId;

      let statusClass = 'locked';
      if (isCurrent) statusClass = 'current unlocked';
      else if (isCompleted) statusClass = 'completed unlocked';
      else if (isUnlocked) statusClass = 'unlocked';

      const row = document.createElement('div');
      row.className = 'map-row';
      row.innerHTML = `
        <div class="map-node ${statusClass}" data-id="${chapter.id}">
          <div class="map-node-icon">${chapter.icon || '📍'}</div>
          <div class="map-node-info">
            <div class="map-node-title">第${chapter.id}章 ${chapter.title}</div>
            <div class="map-node-desc">${chapter.location}</div>
          </div>
        </div>
      `;

      if (statusClass.includes('unlocked')) {
        row.querySelector('.map-node').addEventListener('click', () => {
          if (isCurrent) {
            modal.style.display = 'none';
            return;
          }
          // 仅允许回放已完成章节，或者跳转到当前章节
          if (isCompleted || isCurrent) {
            if (confirm(`是否跳转到 第${chapter.id}章？\n注意：当前进度可能会丢失`)) {
              modal.style.display = 'none';
              Game.startChapter(chapter.id);
            }
          }
        });
      }

      container.appendChild(row);
    });

    modal.style.display = 'flex';
  }
};

// ==========================================
// 🕹️ Game - 游戏控制器（委托给 GameEngine）
// ==========================================

const Game = {
  get currentScript() { return GameEngine.currentScript; },
  set currentScript(v) { GameEngine.currentScript = v; },
  get isWaitingChoice() { return GameEngine.isWaitingChoice; },
  set isWaitingChoice(v) { GameEngine.isWaitingChoice = v; },
  get pendingDialogueNode() { return GameEngine.pendingDialogueNode; },
  set pendingDialogueNode(v) { GameEngine.pendingDialogueNode = v; },

  async startNewGame() {
    GameEngine.resetState();
    GameEngine.state.gameStartTime = Date.now();
    await this.startChapter(1);
  },

  continueGame() {
    GameEngine.loadSaveData();
    this.startChapter(GameState.currentChapterId);
  },

  async reviewCurrentChapter() {
    const chapterId = GameState.currentChapterId;
    const chapter = StoryLoader.getChapter(chapterId);
    UI.switchScreen('game');
    this.currentScript = await StoryLoader.loadChapterScript(chapterId);
    GameEngine.state.currentDialogueId = 'start';
    this.playDialogue('start');
    UI.updateScene(chapter);
  },

  async startChapter(chapterId) {
    // 委托给 GameEngine，但使用 game.js 的 UI 回调
    const totalChapters = StoryLoader.cache.chapters?.chapters?.length || 8;
    if (chapterId > totalChapters) {
      // 游戏结束逻辑委托给 GameEngine
      GameEngine._ui = UI; // 确保 GameEngine 使用正确的 UI
      GameEngine._showEnding();
      return;
    }

    // 调用 GameEngine 处理状态和埋点
    GameEngine.state.currentChapterId = chapterId;
    GameEngine.state.currentDialogueId = 'start';
    GameEngine.saveGame();

    // 埋点由 GameEngine 统一处理
    if (typeof AnalyticsManager !== 'undefined') {
      AnalyticsManager.trackEvent('chapter_start', { chapter_id: chapterId });
    }

    // UI 过渡效果保留在 game.js
    const chapter = StoryLoader.getChapter(chapterId);
    UI.showTransition(chapter, async () => {
      UI.switchScreen('game');
      this.currentScript = await StoryLoader.loadChapterScript(chapterId);
      GameEngine.currentScript = this.currentScript; // 同步脚本
      this.playDialogue('start');
      UI.updateScene(chapter);
    });
  },

  playDialogue(nodeId) {
    const node = this.currentScript[nodeId];
    if (!node) {
      console.error('Node not found:', nodeId);
      return;
    }

    // 处理 DLC 章节完成
    if (node.event === 'chapter_complete') {
      // Analytics: 记录章节完成
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('chapter_complete', { chapter_id: GameState.currentChapterId });
      }
      if (this.currentDLC) {
        // DLC 模式：播放下一个 DLC 章节
        this.playDLCChapter(this.dlcChapterIndex + 1);
      } else {
        UI.showChapterComplete(GameState.currentChapterId);
      }
      return;
    }
    if (node.event === 'game_complete') {
      // Analytics: 记录游戏通关
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('game_complete', {
          score: GameState.score,
          completion_time: Date.now() - GameEngine.state.gameStartTime
        });
      }
      if (this.currentDLC) {
        // DLC 结束
        alert('🎉 恭喜完成 GTM Demo！');
        this.currentDLC = null;
        UI.switchScreen('intro');
      } else {
        UI.showEnding();
      }
      return;
    }

    GameEngine.state.currentDialogueId = nodeId;

    if (node.unlockCard) {
      if (GameEngine.unlockCard(node.unlockCard)) {
        this.pendingDialogueNode = node;
        // 支持 DLC 知识卡
        if (this.currentDLC) {
          this.showDLCKnowledgeCard(node.unlockCard);
        } else {
          UI.showKnowledgeCard(node.unlockCard);
        }
        return;
      }
    }

    UI.renderDialogue(node);
    this.isWaitingChoice = (node.choices && node.choices.length > 0);
  },

  advanceDialogue() {
    if (this.isWaitingChoice) return;
    if (TypeWriter.isTyping) {
      TypeWriter.skip();
      return;
    }
    const currentNode = this.currentScript[GameEngine.state.currentDialogueId];
    if (currentNode?.next) {
      this.playDialogue(currentNode.next);
    }
  },

  makeChoice(choice, clickedBtn = null) {
    this.isWaitingChoice = false;
    const choicesContainer = document.getElementById('choices-container');
    const allButtons = choicesContainer.querySelectorAll('.choice-btn');

    if (choice.isCorrect !== undefined) {
      if (choice.isCorrect) {
        AudioManager.playCorrect();
        if (clickedBtn) clickedBtn.classList.add('correct');
      } else {
        AudioManager.playWrong();
        if (clickedBtn) clickedBtn.classList.add('wrong');
        allButtons.forEach((btn, index) => {
          const currentNode = this.currentScript[GameEngine.state.currentDialogueId];
          if (currentNode.choices?.[index]?.isCorrect) {
            btn.classList.add('hint-correct');
          }
        });
      }
      if (choice.feedback) {
        this.showFeedbackToast(choice.feedback, choice.isCorrect);
      }
    } else {
      AudioManager.playSelect();
    }

    if (choice.score) {
      GameEngine.state.score += choice.score;
    }

    const delay = choice.isCorrect !== undefined ? 1200 : 300;
    setTimeout(() => this.playDialogue(choice.next), delay);
  },

  showFeedbackToast(message, isCorrect) {
    const existingToast = document.querySelector('.feedback-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `feedback-toast ${isCorrect ? 'toast-correct' : 'toast-wrong'}`;
    toast.innerHTML = `<span class="toast-icon">${isCorrect ? '✓' : '✗'}</span><span class="toast-text">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  },

  showCardsScreen() {
    UI.showCardsScreen();
  },

  goBackToEndingOrMenu() {
    UI.goBackToEndingOrMenu();
  },

  // ===== DLC 功能 =====
  currentDLC: null,
  dlcChapterIndex: 0,

  async startDLC(dlcId) {
    console.log(`[Game] Starting DLC: ${dlcId}`);
    try {
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('dlc_start', { dlc_id: dlcId });
      }

      const manifest = await DLCLoader.loadManifest(dlcId);
      this.currentDLC = manifest;
      this.dlcChapterIndex = 0;
      await this.playDLCChapter(0);
    } catch (error) {
      console.error('[Game] Failed to load DLC:', error);
      alert('DLC 加载失败');
    }
  },

  async playDLCChapter(index) {
    if (!this.currentDLC || index >= this.currentDLC.chapters.length) {
      console.log('[Game] DLC completed!');
      this.currentDLC = null;
      UI.switchScreen('intro');
      return;
    }

    const chapter = this.currentDLC.chapters[index];
    this.dlcChapterIndex = index;

    console.log(`[Game] Playing DLC chapter: ${chapter.title}`);

    // 加载章节脚本
    const script = await DLCLoader.loadScript(this.currentDLC.id, chapter.scriptFile);
    this.currentScript = script;
    GameEngine.currentScript = script;

    // 显示过渡画面
    UI.showTransition(chapter, () => {
      UI.switchScreen('game');
      this.playDialogue('start');
      UI.updateScene(chapter);
    });
  },

  // 重写 showKnowledgeCard 以支持 DLC 卡片
  showDLCKnowledgeCard(cardId) {
    if (!this.currentDLC) return;
    const card = DLCLoader.getKnowledgeCard(this.currentDLC.id, cardId);
    if (!card) return;
    UI.popup.title.textContent = card.title;
    UI.popup.content.textContent = card.content;
    UI.popup.container.style.display = 'flex';
  },

  // 供 UIManager 调用
  showMap: function () {
    // 委托给 UI 对象（兼容旧代码）或者直接调用 UIManager
    if (typeof UI !== 'undefined' && UI.showMap) {
      UI.showMap();
    } else if (typeof UIManager !== 'undefined' && UIManager.showMap) {
      // 暂时没有在 UIManager 实现 showMap，所以这里还是依赖 game.js 里的 UI 对象
      console.warn('UI.showMap not found, trying fallback');
    }
  }
};

// 暴露给全局以便 UIManager 调用
window.Game = Game;

// ==========================================
// 🚀 初始化
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Game] v2.0 Initializing...');

  // 初始化核心模块
  await StoryLoader.preloadAll();
  GameEngine._ui = UI;  // 设置 UI 引用
  GameEngine._initialized = true;

  // 初始化音频和 UI
  AudioManager.init();
  UI.init();

  console.log('[Game] v2.0 Ready');
});
