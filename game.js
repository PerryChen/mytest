/**
 * 电动出行造车记 v2.1 - 入口文件
 * 核心逻辑已迁移到 core/ 模块
 * 本文件负责：
 * 1. TypeWriter 打字机效果
 * 2. GameState 状态代理
 * 3. Game 游戏控制器
 * 4. 初始化引导
 */

// ==========================================
// ⌨️ 打字机效果 TypeWriter
// ==========================================

const TypeWriter = {
  isTyping: false,
  currentText: '',
  currentIndex: 0,
  element: null,
  rafId: null,
  speed: 40, // ms per character
  onComplete: null,
  _lastCharTime: 0,

  start(text, element, onComplete = null) {
    this.stop();
    this.currentText = text;
    this.currentIndex = 0;
    this.element = element;
    this.onComplete = onComplete;
    this.isTyping = true;
    this.element.textContent = '';
    this._lastCharTime = 0;

    const tick = (timestamp) => {
      if (!this.isTyping) return;

      if (this._lastCharTime === 0) {
        this._lastCharTime = timestamp;
      }

      // Advance as many characters as elapsed time allows
      while (timestamp - this._lastCharTime >= this.speed && this.currentIndex < this.currentText.length) {
        this.element.textContent += this.currentText[this.currentIndex];
        this.currentIndex++;
        this._lastCharTime += this.speed;

        // 播放打字音效 (每2个字符播放一次，避免过于频繁)
        if (this.currentIndex % 2 === 0) {
          if (typeof AudioManager !== 'undefined' && typeof AudioManager.playTyping === 'function') {
            AudioManager.playTyping();
          }
        }
      }

      if (this.currentIndex >= this.currentText.length) {
        this.complete();
        return;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
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
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
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
// 🖥️ UI - 委托给 UIManager（统一 UI 层）
// ==========================================

const UI = UIManager;

// ==========================================
// 🕹️ Game - 游戏控制器
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
      GameEngine._ui = UI;
      GameEngine._showEnding();
      return;
    }

    GameEngine.state.currentChapterId = chapterId;
    GameEngine.state.currentDialogueId = 'start';
    GameEngine.saveGame();

    if (typeof AnalyticsManager !== 'undefined') {
      AnalyticsManager.trackEvent('chapter_start', { chapter_id: chapterId });
    }

    const chapter = StoryLoader.getChapter(chapterId);
    UI.showTransition(chapter, async () => {
      try {
        UI.switchScreen('game');
        this.currentScript = await StoryLoader.loadChapterScript(chapterId);
        GameEngine.currentScript = this.currentScript;
        this.playDialogue('start');
        UI.updateScene(chapter);
      } catch (error) {
        console.error('[Game] Failed to load chapter script:', error);
        this._showErrorState(
          '章节数据加载失败，请检查网络后重试',
          () => this.startChapter(chapterId),
          () => UI.switchScreen('intro')
        );
      }
    });
  },

  playDialogue(nodeId) {
    const node = this.currentScript?.[nodeId];
    if (!node) {
      console.error('[Game] Node not found:', nodeId);
      UI.showChapterComplete(GameState.currentChapterId);
      return;
    }

    // 处理 DLC 章节完成
    if (node.event === 'chapter_complete') {
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('chapter_complete', { chapter_id: GameState.currentChapterId });
      }
      if (this.currentDLC) {
        this.playDLCChapter(this.dlcChapterIndex + 1);
      } else {
        UI.showChapterComplete(GameState.currentChapterId);
      }
      return;
    }
    if (node.event === 'game_complete') {
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('game_complete', {
          score: GameState.score,
          completion_time: Date.now() - GameEngine.state.gameStartTime
        });
      }
      if (this.currentDLC) {
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

  // ===== 错误恢复 =====

  _showErrorState(userMessage, retryFn, backFn) {
    const dialogText = document.getElementById('dialog-text');
    const choicesContainer = document.getElementById('choices-container');
    if (dialogText) dialogText.textContent = userMessage;
    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      choicesContainer.style.display = 'flex';

      const retryBtn = document.createElement('div');
      retryBtn.className = 'choice-btn';
      retryBtn.innerHTML = '<div class="choice-letter">R</div>重试';
      retryBtn.onclick = () => retryFn();
      choicesContainer.appendChild(retryBtn);

      const backBtn = document.createElement('div');
      backBtn.className = 'choice-btn';
      backBtn.innerHTML = '<div class="choice-letter">B</div>返回主菜单';
      backBtn.onclick = () => backFn();
      choicesContainer.appendChild(backBtn);
    }
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
      this._showErrorState(
        'DLC 内容加载失败，请确认网络正常后重试。',
        () => this.startDLC(dlcId),
        () => UI.switchScreen('intro')
      );
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

    const script = await DLCLoader.loadScript(this.currentDLC.id, chapter.scriptFile);
    this.currentScript = script;
    GameEngine.currentScript = script;

    UI.showTransition(chapter, () => {
      UI.switchScreen('game');
      this.playDialogue('start');
      UI.updateScene(chapter);
    });
  },

  showDLCKnowledgeCard(cardId) {
    if (!this.currentDLC) return;
    const card = DLCLoader.getKnowledgeCard(this.currentDLC.id, cardId);
    if (!card) return;
    UI.popup.title.textContent = card.title;
    UI.popup.content.textContent = card.content;
    UI.popup.container.style.display = 'flex';
  }
};

// 暴露给全局以便 UIManager 调用
window.Game = Game;

// ==========================================
// 🚀 初始化
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Game] v2.1 Initializing...');

  // 初始化核心模块
  await StoryLoader.preloadAll();
  GameEngine._ui = UI;
  GameEngine._initialized = true;

  // 初始化音频和 UI
  AudioManager.init();
  UI.init();

  console.log('[Game] v2.1 Ready');
});
