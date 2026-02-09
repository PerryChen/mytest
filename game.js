/**
 * Ebike新产品开发 - 入口文件
 * 核心逻辑已迁移到 core/ 模块
 * 本文件负责：
 * 1. TypeWriter 打字机效果
 * 2. GameState 状态代理
 * 3. Game 游戏控制器
 * 4. 初始化引导
 */

// ==========================================
// 版本号（修改此处即可更新首页显示）
// ==========================================
const APP_VERSION = 'v3.5.0';

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

  /**
   * 评估条件表达式
   * @param {Object} condition - { type, value, cardId, chapterId }
   * @returns {boolean}
   */
  evaluateCondition(condition) {
    if (!condition || !condition.type) return true;
    switch (condition.type) {
      case 'score_gte':
        return GameEngine.state.score >= condition.value;
      case 'score_lt':
        return GameEngine.state.score < condition.value;
      case 'card_unlocked':
        return GameEngine.state.unlockedCards.includes(condition.cardId);
      case 'choice_was_correct': {
        const entries = Object.entries(GameEngine.state.choiceHistory);
        const match = entries.find(([key]) => key.startsWith(`${condition.chapterId}_`));
        return match ? match[1].isCorrect : false;
      }
      default:
        console.warn('[Game] Unknown condition type:', condition.type);
        return true;
    }
  },

  playDialogue(nodeId) {
    const node = this.currentScript?.[nodeId];
    if (!node) {
      console.error('[Game] Node not found:', nodeId);
      UI.showChapterComplete(GameState.currentChapterId);
      return;
    }

    // 条件节点：如果条件不满足，跳转到 fallbackNext
    if (node.condition && !this.evaluateCondition(node.condition)) {
      if (node.fallbackNext) {
        this.playDialogue(node.fallbackNext);
        return;
      }
      // 无 fallback 则继续显示当前节点
    }

    // 处理章节完成
    if (node.event === 'chapter_complete') {
      const chapterId = GameState.currentChapterId;
      // 记录已完成章节
      if (!GameEngine.state.completedChapters.includes(chapterId)) {
        GameEngine.state.completedChapters.push(chapterId);
        if (!this.currentDLC) GameEngine.saveGame();
      }
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('chapter_complete', { chapter_id: chapterId });
      }
      if (this.currentDLC) {
        UI.showDLCChapterComplete(this.currentDLC, this.dlcChapterIndex);
      } else {
        UI.showChapterComplete(chapterId);
      }
      return;
    }
    if (node.event === 'game_complete') {
      // 记录最后一章完成
      const chapterId = GameState.currentChapterId;
      if (!GameEngine.state.completedChapters.includes(chapterId)) {
        GameEngine.state.completedChapters.push(chapterId);
      }
      if (typeof AnalyticsManager !== 'undefined') {
        AnalyticsManager.trackEvent('game_complete', {
          score: GameState.score,
          completion_time: Date.now() - GameEngine.state.gameStartTime
        });
      }
      if (this.currentDLC) {
        const dlcManifest = this.currentDLC;
        const dlcScore = GameState.score;
        // Persist DLC play record (reads chapterScores for achievements)
        this._saveDLCRecord(dlcManifest, dlcScore);
        // Restore main game state (keep unlockedCards merged, remove DLC chapter entries)
        GameEngine.state.score = this._preDLCScore || 0;
        GameEngine.state.choiceHistory = this._preDLCChoiceHistory || {};
        GameEngine.state.completedChapters = GameEngine.state.completedChapters.filter(id => typeof id === 'number');
        // Show ending BEFORE cleaning up chapterScores (achievements need them)
        this.currentDLC = null;
        UI.showDLCEnding(dlcManifest, dlcScore);
        // Clean up DLC chapter scores from main save AFTER rendering
        const dlcPrefix = `dlc_${dlcManifest.id}_`;
        Object.keys(GameEngine.state.chapterScores || {}).forEach(key => {
          if (key.startsWith(dlcPrefix)) delete GameEngine.state.chapterScores[key];
        });
        GameEngine.saveGame();
      } else {
        // 通关后显示章节选择按钮
        document.getElementById('chapter-select-btn').style.display = 'flex';
        UI.showEnding();
      }
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
    if (this.isWaitingChoice || this._choicePending) return;
    if (TypeWriter.isTyping) {
      TypeWriter.skip();
      return;
    }
    const currentNode = this.currentScript[GameEngine.state.currentDialogueId];
    if (currentNode?.next) {
      this.playDialogue(currentNode.next);
    }
  },

  _choicePending: false,

  makeChoice(choice, clickedBtn = null) {
    if (this._choicePending) return;
    this._choicePending = true;
    this.isWaitingChoice = false;
    const choicesContainer = document.getElementById('choices-container');
    const allButtons = choicesContainer.querySelectorAll('.choice-btn');

    // 立即禁用所有选项按钮，防止重复点击
    allButtons.forEach(btn => { btn.style.pointerEvents = 'none'; });

    if (choice.isCorrect !== undefined) {
      if (choice.isCorrect) {
        AudioManager.playCorrect();
        if (clickedBtn) clickedBtn.classList.add('correct-choice');
        UI.showConfetti();
      } else {
        AudioManager.playWrong();
        if (clickedBtn) clickedBtn.classList.add('wrong-choice');
        UI.showScreenShake();
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
      // 每章分数跟踪
      const chId = GameState.currentChapterId;
      GameEngine.state.chapterScores[chId] = (GameEngine.state.chapterScores[chId] || 0) + choice.score;
    }

    // 选择历史记录
    const historyKey = `${GameState.currentChapterId}_${GameEngine.state.currentDialogueId}`;
    const currentNode = this.currentScript[GameEngine.state.currentDialogueId];
    const choiceIndex = currentNode?.choices?.indexOf(choice) ?? -1;
    GameEngine.state.choiceHistory[historyKey] = {
      index: choiceIndex,
      isCorrect: !!choice.isCorrect,
      score: choice.score || 0
    };

    const delay = choice.isCorrect !== undefined ? 1200 : 300;
    setTimeout(() => {
      this._choicePending = false;
      this.playDialogue(choice.next);
    }, delay);
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
      // Save main game state and reset for DLC
      this._preDLCScore = GameEngine.state.score;
      this._preDLCChoiceHistory = { ...GameEngine.state.choiceHistory };
      GameEngine.state.score = 0;
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

    // Set chapterId for score tracking (DLC uses string IDs like "dlc_hr_onboarding_1")
    const dlcChapterId = `dlc_${this.currentDLC.id}_${chapter.id}`;
    GameEngine.state.currentChapterId = dlcChapterId;
    GameEngine.state.currentDialogueId = 'start';

    console.log(`[Game] Playing DLC chapter: ${chapter.title} (id: ${dlcChapterId})`);

    const script = await DLCLoader.loadScript(this.currentDLC.id, chapter.scriptFile);
    this.currentScript = script;
    GameEngine.currentScript = script;

    UI.showTransition(chapter, () => {
      UI.switchScreen('game');
      this.playDialogue('start');
      UI.updateScene(chapter);
    });
  },

  _saveDLCRecord(dlcManifest, dlcScore) {
    // Fix bug: set DLC completion flag (was read but never written)
    localStorage.setItem(`velotric_dlc_${dlcManifest.id}_complete`, 'true');

    const dlcCardIds = dlcManifest.knowledgeCards ? Object.keys(dlcManifest.knowledgeCards) : [];
    const unlockedDLCCards = dlcCardIds.filter(id => GameState.unlockedCards.includes(id));

    let history = {};
    try { history = JSON.parse(localStorage.getItem('velotric_dlc_history') || '{}'); } catch(e) {}

    // Extract DLC chapter scores
    const prefix = `dlc_${dlcManifest.id}_`;
    const dlcChapterScores = {};
    Object.entries(GameEngine.state.chapterScores || {}).forEach(([key, val]) => {
      if (key.startsWith(prefix)) dlcChapterScores[key] = val;
    });

    // Compute achievements (reuse UIManager logic)
    const achievements = (typeof UI !== 'undefined' && UI._computeDLCAchievements)
      ? UI._computeDLCAchievements(dlcManifest, unlockedDLCCards.length, dlcCardIds.length, dlcScore).map(a => a.name)
      : [];

    history[dlcManifest.id] = {
      dlcId: dlcManifest.id,
      dlcName: dlcManifest.name,
      dlcIcon: dlcManifest.icon || '📦',
      completedAt: Date.now(),
      score: dlcScore,
      chaptersCompleted: dlcManifest.chapters.length,
      chaptersTotal: dlcManifest.chapters.length,
      unlockedCards: unlockedDLCCards,
      totalCards: dlcCardIds.length,
      chapterScores: dlcChapterScores,
      achievements: achievements
    };

    localStorage.setItem('velotric_dlc_history', JSON.stringify(history));
    console.log('[Game] DLC record saved:', dlcManifest.id, 'score:', dlcScore);
  }
};

// 暴露给全局以便 UIManager 调用
window.Game = Game;

// ==========================================
// 🚀 初始化
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log(`[Game] ${APP_VERSION} Initializing...`);

  // 首页版本号
  const versionTag = document.getElementById('version-tag');
  if (versionTag) versionTag.textContent = APP_VERSION;

  // 初始化核心模块
  await StoryLoader.preloadAll();
  GameEngine._ui = UI;
  GameEngine._initialized = true;

  // 初始化音频和 UI
  AudioManager.init();
  UI.init();

  // 初始化首页公告
  AnnouncementManager.init();

  console.log(`[Game] ${APP_VERSION} Ready`);
});
