/**
 * AssessmentEngine - 知识测评引擎
 * 独立于剧情模式的问答测评系统
 */
const AssessmentEngine = {
    questions: [],
    currentIndex: 0,
    answers: [],
    startTime: null,
    timeLimit: null,
    _timerId: null,
    _cache: null,

    /**
     * 加载题库
     * @returns {Promise<Array>}
     */
    async loadQuestions() {
        if (this._cache) return this._cache;
        try {
            const response = await fetch('data/assessments.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('Failed to load assessments.json');
            const data = await response.json();
            this._cache = data.questions || [];
            console.log('[AssessmentEngine] Questions loaded:', this._cache.length);
            return this._cache;
        } catch (error) {
            console.error('[AssessmentEngine] Error loading questions:', error);
            throw error;
        }
    },

    /**
     * 开始测评
     * @param {Object} options - { timed: false, timeLimit: 600, source: 'all' }
     */
    async startAssessment(options = {}) {
        const allQuestions = await this.loadQuestions();

        // 按来源过滤
        let filtered = allQuestions;
        if (options.source && options.source !== 'all') {
            filtered = allQuestions.filter(q => q.cardId && q.cardId.toLowerCase().includes(options.source.toLowerCase()));
        }

        // 打乱顺序
        this.questions = [...filtered].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.answers = [];
        this.startTime = Date.now();
        this.timeLimit = options.timed ? (options.timeLimit || 600) * 1000 : null;

        if (this.timeLimit) {
            this._startTimer();
        }

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('assessment_start', {
                question_count: this.questions.length,
                timed: !!options.timed
            });
        }

        return this.questions.length;
    },

    _startTimer() {
        if (this._timerId) clearInterval(this._timerId);
        this._timerId = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            if (elapsed >= this.timeLimit) {
                clearInterval(this._timerId);
                this._timerId = null;
                // 触发超时事件
                if (this._onTimeout) this._onTimeout();
            }
        }, 1000);
    },

    /**
     * 获取当前题目
     * @returns {Object|null}
     */
    getCurrentQuestion() {
        if (this.currentIndex >= this.questions.length) return null;
        return this.questions[this.currentIndex];
    },

    /**
     * 回答当前题目
     * @param {number} answerIndex - 选择的选项索引
     * @returns {Object} { correct, correctIndex, explanation }
     */
    answerQuestion(answerIndex) {
        const question = this.questions[this.currentIndex];
        if (!question) return null;

        const isCorrect = answerIndex === question.correctIndex;
        this.answers.push({
            questionId: question.id,
            givenIndex: answerIndex,
            correctIndex: question.correctIndex,
            isCorrect
        });

        this.currentIndex++;

        return {
            correct: isCorrect,
            correctIndex: question.correctIndex,
            explanation: question.explanation || ''
        };
    },

    /**
     * 获取测评结果
     * @returns {Object}
     */
    getResults() {
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = null;
        }

        const correct = this.answers.filter(a => a.isCorrect).length;
        const total = this.questions.length;
        const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        const results = {
            score: correct,
            total,
            percentage,
            timeSpent,
            answers: this.answers,
            wrongAnswers: this.answers.filter(a => !a.isCorrect).map(a => {
                const q = this.questions.find(q2 => q2.id === a.questionId);
                return {
                    question: q?.question,
                    correctAnswer: q?.options[a.correctIndex],
                    givenAnswer: q?.options[a.givenIndex]
                };
            })
        };

        if (typeof AnalyticsManager !== 'undefined') {
            AnalyticsManager.trackEvent('assessment_complete', {
                score: correct,
                total,
                percentage,
                time_spent: timeSpent
            });
        }

        return results;
    },

    /**
     * 获取剩余时间（秒）
     * @returns {number|null}
     */
    getRemainingTime() {
        if (!this.timeLimit) return null;
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, Math.round((this.timeLimit - elapsed) / 1000));
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssessmentEngine;
}
