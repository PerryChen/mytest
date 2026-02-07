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
    const totalChapters = StoryLoader.cache.chapters?.chapters?.length || 8;
    if (chapterId > totalChapters) {
      UI.showEnding();
      return;
    }

    GameEngine.state.currentChapterId = chapterId;
    GameEngine.state.currentDialogueId = 'start';
    GameEngine.saveGame();

    const chapter = StoryLoader.getChapter(chapterId);
    UI.showTransition(chapter, async () => {
      UI.switchScreen('game');
      this.currentScript = await StoryLoader.loadChapterScript(chapterId);
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

    if (node.event === 'chapter_complete') {
      UI.showChapterComplete(GameState.currentChapterId);
      return;
    }
    if (node.event === 'game_complete') {
      UI.showEnding();
      return;
    }

    GameEngine.state.currentDialogueId = nodeId;

    if (node.unlockCard) {
      if (GameEngine.unlockCard(node.unlockCard)) {
        this.pendingDialogueNode = node;
        UI.showKnowledgeCard(node.unlockCard);
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
  }
};

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
