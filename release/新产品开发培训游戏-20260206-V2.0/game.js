/**
 * 电动出行造车记 2.0 - 剧情模式核心逻辑
 * 包含剧情数据、状态管理和游戏引擎
 */

// ==========================================
// ⚙️ 配置加载器 ConfigLoader
// ==========================================

const ConfigLoader = {
  // 从localStorage读取章节配置
  loadChapters() {
    const saved = localStorage.getItem('velotric_chapters_config');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  },

  // 从localStorage读取题目配置
  loadQuestions() {
    const saved = localStorage.getItem('velotric_questions_config');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  },

  // 应用章节配置到GAME_DATA
  applyChaptersConfig(chapters) {
    if (!chapters) return;

    // 更新现有章节的标题、地点、日期
    chapters.forEach(config => {
      const chapter = GAME_DATA.chapters.find(ch => ch.id === config.id);
      if (chapter) {
        chapter.title = config.title;
        chapter.location = config.location;
        chapter.date = config.date;
      }
    });
  },

  // 应用题目配置到对话脚本
  applyQuestionsConfig(questions) {
    if (!questions) return;

    // 题目ID对应的脚本节点映射
    const questionNodeMap = {
      1: { chapter: 1, node: "boss_ask" },
      2: { chapter: 2, node: "eng_response" },
      3: { chapter: 3, node: "dvt_report" },
      4: { chapter: 4, node: "problem_arise" },
      5: { chapter: 5, node: "shipping_check" },
      6: { chapter: 6, node: "allocation_question" },
      7: { chapter: 7, node: "training_choice" },
      8: { chapter: 8, node: "ride_choice" }
    };

    Object.keys(questions).forEach(chapterId => {
      const config = questions[chapterId];
      const mapping = questionNodeMap[chapterId];

      if (mapping && GAME_DATA.scripts[mapping.chapter]) {
        const node = GAME_DATA.scripts[mapping.chapter][mapping.node];
        if (node && node.choices) {
          // 更新问题文本
          if (config.context) {
            node.text = config.context;
          }
          // 更新选项
          if (config.options) {
            config.options.forEach((opt, i) => {
              if (node.choices[i]) {
                node.choices[i].text = opt.text;
                node.choices[i].isCorrect = opt.isCorrect;
                node.choices[i].feedback = opt.feedback;
              }
            });
          }
        }
      }
    });
  },

  // 初始化加载所有配置
  init() {
    const chapters = this.loadChapters();
    const questions = this.loadQuestions();

    this.applyChaptersConfig(chapters);
    this.applyQuestionsConfig(questions);

    console.log('[ConfigLoader] 配置加载完成');
  }
};

// ==========================================
// 📚 剧情数据 Story Data
// ==========================================

const GAME_DATA = {
  chapters: [
    {
      id: 1,
      title: "入职第一天",
      location: "深圳·办公室",
      sceneClass: "scene-office",
      description: "理解产品开发的起点：MRD与PRD",
      date: "2025年2月",
      initialDialogue: "start",
      items: [] // 场景可点击物品
    },
    {
      id: 2,
      title: "实验室风云",
      location: "昆山·EVT样车间",
      sceneClass: "scene-lab",
      description: "工程验证阶段：发现问题是功劳",
      date: "2025年4月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 3,
      title: "开模倒计时",
      location: "昆山·模具工厂",
      sceneClass: "scene-factory",
      description: "设计验证阶段：最后的设计确认",
      date: "2025年7月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 4,
      title: "流水线挑战",
      location: "常州·总装工厂",
      sceneClass: "scene-assembly",
      description: "生产验证阶段：稳定压倒一切",
      date: "2025年9月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 5,
      title: "启航时刻",
      location: "天津港",
      sceneClass: "scene-port",
      description: "量产发货：从工厂到海洋",
      date: "2025年11月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 6,
      title: "跨洋登陆",
      location: "美国·洛杉矶仓库",
      sceneClass: "scene-warehouse",
      description: "海外物流：清关与入库",
      date: "2026年1月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 7,
      title: "门店上架",
      location: "加州·经销商门店",
      sceneClass: "scene-store",
      description: "渠道销售：让用户看见产品",
      date: "2026年2月",
      initialDialogue: "start",
      items: []
    },
    {
      id: 8,
      title: "骑行时刻",
      location: "旧金山·金门大桥",
      sceneClass: "scene-outdoor",
      description: "用户体验：交付价值",
      date: "2026年2月",
      initialDialogue: "start",
      items: []
    }
  ],

  // 知识卡片数据
  knowledgeCards: {
    "MRD_PRD": {
      title: "MRD vs PRD",
      content: "MRD (市场需求文档) 解决'为什么卖得出去'，讲商业故事；PRD (产品需求文档) 解决'做成什么样'，讲功能规格。需求阶段是成本最低的'后悔药'。"
    },
    "EVT_GOAL": {
      title: "EVT 核心目标",
      content: "EVT (工程验证测试) 的核心不是看外观，而是看核心技术风险是否解除。发现 Bug 是功劳，千万不要报喜不报忧。"
    },
    "DVT_TOOLING": {
      title: "DVT 开模定型",
      content: "DVT (设计验证测试) 标志着模具的启动。这是最后一次无需昂贵代价修改设计的机会窗口。"
    },
    "PVT_RULES": {
      title: "PVT 三大铁律",
      content: "PVT (生产验证测试) 必须在真实流水线进行。核心关注：良率、节拍、一致性。严禁随意变更设计。"
    },
    "MP_START": {
      title: "MP 是新的开始",
      content: "MP (量产) 不是结束，而是产品正式交棒给市场、销售、供应链、服务团队的开始。此时重点转向交付与售后。"
    },
    "LOGISTICS": {
      title: "跨境物流链",
      content: "工厂出货 → 拖车到港 → 报关 → 海运 (25-45天) → 目的港清关 → 提柜送至海外仓。每个环节都需要精准的时间管理。"
    },
    "DEALER_SUPPORT": {
      title: "经销商支持",
      content: "不仅要给经销商供货，还要提供培训、展示物料和售后支持，帮助他们更好地向用户推销产品。"
    },
    "USER_VALUE": {
      title: "用户价值交付",
      content: "产品的最终归宿是用户的使用体验。开箱的便利性、组装的引导、第一次骑行的感受，决定了口碑和品牌忠诚度。"
    }
  },

  // 剧情脚本
  scripts: {
    // === 第一章：入职 ===
    1: {
      "start": {
        speaker: "HR V姐",
        avatar: "👩‍💼",
        text: "欢迎加入 Velotric！小唯，你的工位在产品部那边。Perry已经在等你了。",
        next: "meet_boss"
      },
      "meet_boss": {
        speaker: "项目 Perry",
        avatar: "👨‍💻",
        text: "小唯，欢迎入队！你来得正是时候。我们代号为'Discover 3'的新款城市通勤车项目刚刚启动。",
        next: "boss_ask"
      },
      "boss_ask": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "作为产品经理，你觉得我们现在第一步该做什么？直接画图纸，还是先搞清楚为什么要做这款车？",
        choices: [
          { text: "直接画图纸，效率第一！", next: "wrong_start", score: 0, isCorrect: false, feedback: "别急！先想清楚再动手" },
          { text: "先搞清楚市场需求和商业逻辑", next: "correct_start", score: 100, isCorrect: true, feedback: "没错！谋定而后动" }
        ]
      },
      "wrong_start": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "哎，先别太急。如果没有想清楚'为什么卖得出去'就开干，后面改模具的几十万成本可是大损失",
        next: "explain_doc"
      },
      "correct_start": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "没错！'谋定而后动'。需求阶段修改会很快，等开了模具改一处就是几十万。",
        next: "explain_doc"
      },
      "explain_doc": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "这里有两份核心文档：MRD（市场需求文档）和 PRD（产品需求文档）。拿着，这是你的武器。",
        unlockCard: "MRD_PRD",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第二章：EVT ===
    2: {
      "start": {
        speaker: "小唯",
        avatar: "🧑",
        text: "（三个月后，EVT 实验室）样车终于出来了！看起来...呃，怎么线束都露在外面？",
        next: "meet_eng"
      },
      "meet_eng": {
        speaker: "工程师老金",
        avatar: "👨‍🔧",
        text: "别嫌弃，EVT 阶段的样车本来就是'功能机'。只要能动、核心技术验证没问题就行。",
        next: "find_bug"
      },
      "find_bug": {
        speaker: "小唯",
        avatar: "🧑",
        text: "等等，我发现这电池仓盖好像有点干涉，很难扣上。老金，这要紧吗？",
        next: "eng_response"
      },
      "eng_response": {
        speaker: "工程师",
        avatar: "👨🔧",
        text: "这...如果现在报上去，评审会可能过不了。要不我们先不说，私下先解决？",
        choices: [
          { text: "听工程师的，先过评审要紧", next: "hide_bug", score: 0, isCorrect: false, feedback: "危险！EVT严禁报喜不报忧" },
          { text: "不行，EVT 就是要暴露问题的", next: "report_bug", score: 100, isCorrect: true, feedback: "正确！发现问题是功劳" }
        ]
      },
      "hide_bug": {
        speaker: "小唯",
        avatar: "🧑",
        text: "好吧，那我们悄悄改...",
        next: "fail_later"
      },
      "fail_later": {
        speaker: "旁白",
        avatar: "📢",
        text: "（结果：因为这个问题没及时解决，DVT 开模后发现结构无法修改，导致模具报废，损失惨重。）",
        next: "retry_bug"
      },
      "retry_bug": {
        speaker: "系统",
        avatar: "⚠️",
        text: "必须重新选择！EVT 阶段严禁报喜不报忧。",
        next: "eng_response"
      },
      "report_bug": {
        speaker: "小唯",
        avatar: "🧑",
        text: "老金，现在发现是好事。如果在 DVT 开模后才发现，那才是大灾难。我们如实上报吧。",
        next: "boss_praise"
      },
      "boss_praise": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "做得好小唯！在 EVT 阶段拦截 BUG 是大功一件。记住，EVT 的核心就是验证技术风险。",
        unlockCard: "EVT_GOAL",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第三章：DVT ===
    3: {
      "start": {
        speaker: "模具厂长",
        avatar: "👷",
        text: "小唯经理，模具已经备好了。这一刀下去，就没有回头路了哦。",
        next: "check_design"
      },
      "check_design": {
        speaker: "小唯",
        avatar: "🧑",
        text: "这就是 DVT 阶段的严肃性啊。让我再确认一遍所有的测试报告。",
        next: "test_result"
      },
      "test_result": {
        speaker: "测试员",
        avatar: "📝",
        text: "报告！相关的功能指标和模拟分析都通过了，但是...这个贴纸的颜色稍微有一点点色差。",
        choices: [
          { text: "色差是小事，忽略", next: "color_issue", score: 50, isCorrect: false, feedback: "小心！小问题会变大客诉" },
          { text: "所有规格必记录并整改", next: "strict_pass", score: 100, isCorrect: true, feedback: "严谨！DVT是最后确认机会" }
        ]
      },
      "color_issue": {
        speaker: "小唯",
        avatar: "🧑",
        text: "差不多就行了，外观而已。",
        next: "strict_pass_force"
      },
      "strict_pass_force": {
        speaker: "Perry",
        avatar: "👨‍💻",
        text: "小唯，DVT 是最后的设计确认。现在放过的小问题，量产时会变成大客诉。我们还是严格一点。",
        next: "strict_pass"
      },
      "strict_pass": {
        speaker: "小唯",
        avatar: "🧑",
        text: "好的，记录在由于清单里，量产前必须解决。现在，启动模具！",
        next: "certification"
      },
      "certification": {
        speaker: "认证专员",
        avatar: "📜",
        text: "UL 2849 认证的样车也准备好了。",
        unlockCard: "DVT_TOOLING",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第四章：PVT ===
    4: {
      "start": {
        speaker: "产线主管",
        avatar: "🧢",
        text: "欢迎来到常州工厂！今天我们要进行 Discover 3 的小批量试产（PVT）。",
        next: "line_issue"
      },
      "line_issue": {
        speaker: "装配工",
        avatar: "🔧",
        text: "主管，这个螺丝不太好拧，影响节拍。要不换个短一点的？",
        next: "decision_time"
      },
      "decision_time": {
        speaker: "小唯",
        avatar: "🧑",
        text: "PVT 阶段遇到装配不顺畅...",
        choices: [
          { text: "现场直接换螺丝，保证速度", next: "stop_change", score: 0, isCorrect: false, feedback: "停！PVT严禁随意变更" },
          { text: "寻找临时解决方案，同时按流程提ECN变更，评估影响", next: "correct_process", score: 100, isCorrect: true, feedback: "稳定压倒一切！" }
        ]
      },
      "stop_change": {
        speaker: "产线主管",
        avatar: "🧢",
        text: "停！小唯，PVT 阶段严禁随意变更。你换了螺丝，扭力标准变没变？震动测试会不会松？这不仅仅是速度问题。",
        next: "correct_process"
      },
      "correct_process": {
        speaker: "小唯",
        avatar: "🧑",
        text: "明白了。稳定压倒一切。任何变更都可能打乱供应链节奏。我们需要正式记录以及评估。",
        next: "metrics"
      },
      "metrics": {
        speaker: "产线主管",
        avatar: "🧢",
        text: "没错。PVT 我们只看三个指标：良率、节拍、一致性。这一百台车必须是一模一样的好车。",
        unlockCard: "PVT_RULES",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第五章：MP & 海运 ===
    5: {
      "start": {
        speaker: "小唯",
        avatar: "🧑",
        text: "终于 MP（量产）了！第一批 500 台 Discover 3 已经装箱。我们现在去港口。",
        next: "logistics"
      },
      "logistics": {
        speaker: "物流 Jason",
        avatar: "🚢",
        text: "柜子已经订好了。船期是下周三。小唯，这批货是急着赶美国黑五促销的吗？",
        choices: [
          { text: "不急，慢船省钱", next: "miss_date", score: 50, isCorrect: false, feedback: "糟糕！会错过黑五促销" },
          { text: "很急，必须保证时效", next: "fast_ship", score: 100, isCorrect: true, feedback: "正确！交付时效很重要" }
        ]
      },
      "miss_date": {
        speaker: "销售代表",
        avatar: "😠",
        text: "什么？慢船要40天！那样我们就完美错过黑五了！",
        next: "fast_ship"
      },
      "fast_ship": {
        speaker: "小唯",
        avatar: "🧑",
        text: "这批货关系到新品上市，必须用快船。MP 不是结束，把货按时交到销售手里才是关键。",
        unlockCard: "MP_START",
        next: "shipping"
      },
      "shipping": {
        speaker: "物流 Jason",
        avatar: "🚢",
        text: "好的，安排美森快船。预计20天抵达长滩港。MP 阶段，供应链和物流的配合至关重要。",
        unlockCard: "LOGISTICS",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第六章：美国仓库 ===
    6: {
      "start": {
        speaker: "仓储 Jason",
        avatar: "👷♂️",
        text: "Hi V! 这里是洛杉矶仓库。你的 Discover 3 刚刚清关到达，正在卸货。",
        next: "check_stock"
      },
      "check_stock": {
        speaker: "小唯",
        avatar: "🧑",
        text: "太棒了。这批货怎么分配？官网订单和经销商订单都在催。",
        choices: [
          { text: "谁催得急给谁", next: "bad_alloc", score: 0, isCorrect: false, feedback: "不行！乱分配会导致渠道打架" },
          { text: "按预定的上市计划分配", next: "good_alloc", score: 100, isCorrect: true, feedback: "严格执行计划！" }
        ]
      },
      "bad_alloc": {
        speaker: "销售运营",
        avatar: "📉",
        text: "乱分配会导致渠道打架的。我们有既定的 Lock 仓计划。",
        next: "good_alloc"
      },
      "good_alloc": {
        speaker: "小唯",
        avatar: "🧑",
        text: "严格执行上市计划。70% 给线下经销商铺货，30% 留给官网首发。",
        next: "scan_in"
      },
      "scan_in": {
        speaker: "仓储经理",
        avatar: "👷‍♂️",
        text: "收到。所有车辆SKU已扫描入库。系统库存已更新，官网可以开启'有货'状态了！",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第七章：经销商 ===
    7: {
      "start": {
        speaker: "经销商 Mike",
        avatar: "🧔",
        text: "Hey V! Discover 3 到店了。这车真漂亮！但是...我的店员还不知道怎么卖它。",
        next: "training"
      },
      "training": {
        speaker: "小唯",
        avatar: "🧑",
        text: "Mike，别担心。我准备了...",
        choices: [
          { text: "详细的产品参数表", next: "boring", score: 50, isCorrect: false, feedback: "参数太枯燥，客户不爱听" },
          { text: "卖点培训资料和试骑指南", next: "engaging", score: 100, isCorrect: true, feedback: "讲场景，让客户心动！" }
        ]
      },
      "boring": {
        speaker: "经销商 Mike",
        avatar: "🧔",
        text: "参数太枯燥了，客户不爱听这些。他们想知道这车骑起来爽不爽。",
        next: "engaging"
      },
      "engaging": {
        speaker: "小唯",
        avatar: "🧑",
        text: "我们要讲场景：'它能带你去更远的地方，而且毫无负担'。还有，这是展示用的海报，摆在车旁边。",
        unlockCard: "DEALER_SUPPORT",
        next: "display"
      },
      "display": {
        speaker: "经销商 Mike",
        avatar: "🧔",
        text: "这就对了！有了这些支持，我有信心这个周末卖出10台！",
        next: "end_chapter"
      },
      "end_chapter": {
        event: "chapter_complete"
      }
    },

    // === 第八章：骑行 ===
    8: {
      "start": {
        speaker: "用户 Sarah",
        avatar: "👩",
        text: "我家门口有个巨大的 Velotric 盒子！这就是我订的 Discover 3 吗？",
        next: "unboxing"
      },
      "unboxing": {
        speaker: "小唯",
        avatar: "🧑",
        text: "（旁白）Sarah 正在开箱。我们之前的包装设计不仅是为了保护，也是为了开箱体验。",
        next: "assembly"
      },
      "assembly": {
        speaker: "用户 Sarah",
        avatar: "👩",
        text: "哇，工具包都在最上面，说明书也很清楚。只需装上前轮、把手、脚踏、仪表...搞定！",
        next: "first_ride"
      },
      "first_ride": {
        speaker: "用户 Sarah",
        avatar: "👩",
        text: "现在，去金门大桥试骑一下！",
        choices: [
          { text: "祝你骑行愉快！", next: "happy_scan", score: 100, isCorrect: true, feedback: "" }
        ]
      },
      "happy_scan": {
        speaker: "用户 Sarah",
        avatar: "👩",
        text: "这感觉太棒了！上坡完全不费力，风吹在脸上的感觉...谢谢你们造出这么好的车！",
        unlockCard: "USER_VALUE",
        next: "final_speech"
      },
      "final_speech": {
        speaker: "小唯",
        avatar: "🧑",
        text: "看，这就是我们所有努力的意义。从昆山的一张图纸，到旧金山的一次微笑。这就是产品经理的旅程。",
        next: "game_complete"
      },
      "game_complete": {
        event: "game_complete"
      }
    }
  }
};

// ==========================================
// 🏆 成就系统 Achievements
// ==========================================

const ACHIEVEMENTS = {
  'graduate': {
    id: 'graduate',
    icon: '🎓',
    title: '学成出师',
    description: '完成全部 8 章学习',
    check: () => GameState.hasCompleted
  },
  'perfect': {
    id: 'perfect',
    icon: '💯',
    title: '满分学员',
    description: '获得 800 分（满分）',
    check: () => GameState.score >= 800
  },
  'collector': {
    id: 'collector',
    icon: '📚',
    title: '知识收集者',
    description: '收集全部 8 张知识卡',
    check: () => GameState.unlockedCards.length >= 8
  },
  'speedrun': {
    id: 'speedrun',
    icon: '⚡',
    title: '速战速决',
    description: '5 分钟内完成全部章节',
    check: () => GameState.completionTime && GameState.completionTime <= 300000
  },
  'replay': {
    id: 'replay',
    icon: '🔄',
    title: '温故知新',
    description: '重玩游戏 1 次',
    check: () => GameState.playCount >= 2
  }
};

// ==========================================
// 🎮 游戏引擎 Game Engine
// ==========================================

const GameState = {
  currentScreen: 'intro-screen',
  currentChapterId: 1,
  currentDialogueId: 'start',
  score: 0,
  chapterScores: {},
  unlockedCards: [],
  history: [],
  hasCompleted: false,
  // 成就相关
  playCount: 0,
  gameStartTime: null,
  completionTime: null,
  unlockedAchievements: [],

  init() {
    this.load();
  },

  reset() {
    this.currentChapterId = 1;
    this.currentDialogueId = 'start';
    this.score = 0;
    this.chapterScores = {};
    this.unlockedCards = [];
    this.history = [];
    this.gameStartTime = Date.now(); // 记录开始时间
    this.playCount = (this.playCount || 0) + 1; // 增加游戏次数
    this.save();
  },

  save() {
    const data = {
      currentChapterId: this.currentChapterId,
      score: this.score,
      chapterScores: this.chapterScores,
      unlockedCards: this.unlockedCards,
      hasCompleted: this.hasCompleted,
      playCount: this.playCount,
      completionTime: this.completionTime,
      unlockedAchievements: this.unlockedAchievements
    };
    localStorage.setItem('velotric_story_save', JSON.stringify(data));
  },

  load() {
    const saved = localStorage.getItem('velotric_story_save');
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(this, data);
      return true;
    }
    return false;
  },

  unlockCard(cardId) {
    if (!this.unlockedCards.includes(cardId)) {
      this.unlockedCards.push(cardId);
      this.save();
      return true; // 新解锁
    }
    return false;
  }
};

// ==========================================
// ⌨️ 打字机效果 TypeWriter
// ==========================================

const TypeWriter = {
  isTyping: false,
  currentText: '',
  currentIndex: 0,
  element: null,
  intervalId: null,
  speed: 40, // 每个字符的间隔（毫秒）
  onComplete: null,

  /**
   * 开始打字效果
   * @param {string} text - 要显示的文字
   * @param {HTMLElement} element - 目标元素
   * @param {Function} onComplete - 完成回调
   */
  start(text, element, onComplete = null) {
    // 清除之前的打字效果
    this.stop();

    this.currentText = text;
    this.currentIndex = 0;
    this.element = element;
    this.onComplete = onComplete;
    this.isTyping = true;

    // 清空元素
    this.element.textContent = '';

    // 开始逐字显示
    this.intervalId = setInterval(() => {
      if (this.currentIndex < this.currentText.length) {
        this.element.textContent += this.currentText[this.currentIndex];
        this.currentIndex++;
      } else {
        this.complete();
      }
    }, this.speed);
  },

  /**
   * 跳过打字效果，立即显示全部文字
   */
  skip() {
    if (!this.isTyping) return false;

    this.stop();
    this.element.textContent = this.currentText;
    this.isTyping = false;

    if (this.onComplete) {
      this.onComplete();
    }
    return true;
  },

  /**
   * 完成打字
   */
  complete() {
    this.stop();
    this.isTyping = false;

    if (this.onComplete) {
      this.onComplete();
    }
  },

  /**
   * 停止打字定时器
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};

const UI = {
  init() {
    // 屏幕元素
    this.screens = {
      intro: document.getElementById('intro-screen'),
      game: document.getElementById('game-screen'),
      transition: document.getElementById('transition-screen'),
      complete: document.getElementById('chapter-complete-screen'),
      ending: document.getElementById('ending-screen'),
      cards: document.getElementById('cards-screen')
    };

    // 游戏界面元素
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

    // 按钮绑定
    document.getElementById('new-game-btn').addEventListener('click', () => Game.startNewGame());
    document.getElementById('continue-game-btn').addEventListener('click', () => Game.continueGame());

    // 对话点击推进 (点击对话框本身)
    document.querySelector('.dialog-box').addEventListener('click', () => Game.advanceDialogue());

    // 下一章按钮
    document.getElementById('next-chapter-btn').addEventListener('click', () => Game.startChapter(GameState.currentChapterId + 1));

    // 知识卡弹窗关闭
    this.popup.closeBtn.addEventListener('click', () => {
      this.popup.container.style.display = 'none';
      Game.advanceDialogue(); // 关闭弹窗后继续剧情
    });

    // 重新开始
    document.getElementById('play-again-btn').addEventListener('click', () => {
      Game.startNewGame();
    });

    // 查看图鉴
    document.getElementById('view-cards-btn').addEventListener('click', () => Game.showCardsScreen());
    document.getElementById('cards-back-btn').addEventListener('click', () => Game.goBackToEndingOrMenu());

    // 检查是否有存档以显示"继续游戏"
    if (GameState.load()) {
      document.getElementById('continue-game-btn').style.display = 'flex';
    }

    // 名称确认按钮
    document.getElementById('confirm-name-btn').addEventListener('click', () => this.confirmPlayerName());
    // 回车键确认
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.confirmPlayerName();
      }
    });

    // 证书下载按钮
    const downloadBtn = document.getElementById('download-cert-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadCertificate());
    }

    // 章节选择相关
    document.getElementById('chapter-select-btn').addEventListener('click', () => this.showChapterSelector());
    document.getElementById('close-chapter-select-btn').addEventListener('click', () => {
      document.getElementById('chapter-select-modal').style.display = 'none';
    });

    // 音效开关按钮
    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
      AudioManager.toggleSound();
    });

    // 如果已通关，显示章节选择按钮
    if (GameState.hasCompleted) {
      document.getElementById('chapter-select-btn').style.display = 'flex';
    }
  },

  // 确认玩家名称并显示证书
  confirmPlayerName() {
    const nameInput = document.getElementById('player-name-input');
    const playerName = nameInput.value.trim();

    if (!playerName) {
      nameInput.focus();
      nameInput.style.borderColor = '#ff6b6b';
      setTimeout(() => nameInput.style.borderColor = '', 1000);
      return;
    }

    // 隐藏输入区域，显示证书
    document.getElementById('name-input-section').style.display = 'none';
    document.getElementById('certificate').style.display = 'block';

    // 设置证书内容
    document.getElementById('cert-player-name').textContent = playerName;

    // 设置日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    document.getElementById('cert-date').textContent = `通关日期：${dateStr}`;

    // 保存到 localStorage
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

    // 更新日期显示并触发动画
    const oldDate = this.gameHeader.date.textContent;
    const newDate = chapter.date;
    if (oldDate !== newDate) {
      this.gameHeader.date.textContent = newDate;
      // 触发高亮动画
      this.gameHeader.date.classList.remove('date-change');
      // 强制重绘以重新触发动画
      void this.gameHeader.date.offsetWidth;
      this.gameHeader.date.classList.add('date-change');
    }

    // 更新进度条
    const totalChapters = GAME_DATA.chapters.length;
    const progress = (chapter.id / totalChapters) * 100;
    document.getElementById('progress-text').textContent = `${chapter.id} / ${totalChapters}`;
    document.getElementById('progress-fill').style.width = `${progress}%`;

    // 更新背景
    this.scene.bg.className = `scene-background ${chapter.sceneClass}`;
  },

  renderDialogue(node) {
    this.dialog.name.textContent = node.speaker;
    this.dialog.avatar.textContent = node.avatar;

    // 处理角色立绘 (简化版：只显示当前说话人)
    const charArea = this.scene.characterArea;
    charArea.innerHTML = '';
    const charDiv = document.createElement('div');
    charDiv.className = 'character speaking';
    charDiv.innerHTML = `<div class="character-avatar">${node.avatar}</div>`;
    charArea.appendChild(charDiv);

    // 选项处理（先清空）
    const choicesContainer = this.dialog.choices;
    choicesContainer.innerHTML = '';
    choicesContainer.style.display = 'none';

    // 打字时隐藏继续箭头
    this.dialog.indicator.style.display = 'none';

    // 使用打字机效果显示对话
    TypeWriter.start(node.text, this.dialog.text, () => {
      // 打字完成后的回调
      if (node.choices && node.choices.length > 0) {
        // 显示选项
        choicesContainer.style.display = 'flex';
        node.choices.forEach((choice, index) => {
          const btn = document.createElement('div');
          btn.className = 'choice-btn';
          btn.innerHTML = `<div class="choice-letter">${String.fromCharCode(65 + index)}</div>${choice.text}`;
          btn.onclick = (e) => {
            e.stopPropagation();
            Game.makeChoice(choice, btn);
          };
          choicesContainer.appendChild(btn);
        });
      } else {
        // 显示继续箭头
        this.dialog.indicator.style.display = 'block';
      }
    });
  },

  showKnowledgeCard(cardId) {
    const card = GAME_DATA.knowledgeCards[cardId];
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

    // 模拟加载
    setTimeout(() => {
      callback();
    }, 2000);
  },

  showChapterComplete(chapterId) {
    this.switchScreen('complete');
    AudioManager.playComplete(); // 播放章节完成音效

    const chapter = GAME_DATA.chapters.find(c => c.id === chapterId);
    document.getElementById('complete-chapter-name').textContent = `第${chapter.id}章：${chapter.title}`;

    // 计算本章得分（简单逻辑：如果有选择且此时才加分，这里显示累积的。更复杂的可以分章记录）
    // 这里简化：显示当前总分
    document.getElementById('chapter-score').textContent = GameState.score;
    // 关键决策数（这里随机模拟一下，或者写死）
    document.getElementById('decisions-count').textContent = "1";

    // 显示本章获得的知识卡
    const cardsContainer = document.getElementById('cards-earned');
    cardsContainer.innerHTML = '';
    // 这里简化逻辑：每章解锁的卡片固定显示
    // 实际应根据剧情解锁情况。为简化，这里显示“本章相关知识点”
    // 遍历脚本找 unlockCard
    const script = GAME_DATA.scripts[chapterId];
    const cardsInChapter = new Set();
    Object.values(script).forEach(node => {
      if (node.unlockCard) cardsInChapter.add(node.unlockCard);
    });

    cardsInChapter.forEach(cardId => {
      const card = GAME_DATA.knowledgeCards[cardId];
      const el = document.createElement('div');
      el.className = 'mini-card';
      el.textContent = `💡 ${card.title}`;
      cardsContainer.appendChild(el);
    });
  },

  showEnding() {
    this.switchScreen('ending');
    AudioManager.playEnding(); // 播放通关音效
    document.getElementById('total-score').textContent = GameState.score;
    document.getElementById('total-cards').textContent = GameState.unlockedCards.length;

    // 计算完成时间
    if (GameState.gameStartTime) {
      GameState.completionTime = Date.now() - GameState.gameStartTime;
    }

    // 标记已通关
    GameState.hasCompleted = true;
    GameState.save();

    // 检测并显示成就
    this.checkAndShowAchievements();

    // 重置界面状态：显示输入区域，隐藏证书
    document.getElementById('name-input-section').style.display = 'block';
    document.getElementById('certificate').style.display = 'none';
    document.getElementById('player-name-input').value = '';

    // 检查是否已有保存的名称
    const savedName = localStorage.getItem('velotric_player_name');
    if (savedName) {
      document.getElementById('player-name-input').value = savedName;
    }
  },

  // 检测并显示成就
  checkAndShowAchievements() {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';

    // 确保 unlockedAchievements 是数组
    if (!Array.isArray(GameState.unlockedAchievements)) {
      GameState.unlockedAchievements = [];
    }

    Object.values(ACHIEVEMENTS).forEach(achievement => {
      // 检查是否已解锁
      if (!GameState.unlockedAchievements.includes(achievement.id)) {
        if (achievement.check()) {
          GameState.unlockedAchievements.push(achievement.id);
        }
      }

      const isUnlocked = GameState.unlockedAchievements.includes(achievement.id);

      const badge = document.createElement('div');
      badge.className = `achievement-badge ${isUnlocked ? '' : 'locked'}`;
      badge.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">${achievement.title}</div>
          <div class="achievement-desc">${achievement.description}</div>
        </div>
      `;
      list.appendChild(badge);
    });

    GameState.save();
  },

  // 下载证书
  downloadCertificate() {
    const btn = document.getElementById('download-cert-btn');
    const container = document.getElementById('certificate');

    if (!container || !btn) return;

    const btnContainer = btn.parentNode;
    const originalDisplay = btnContainer.style.display;

    // 临时隐藏按钮容器
    btnContainer.style.display = 'none';

    // 显示加载提示（可选，这里简单处理不显示了因为速度通常很快）

    html2canvas(container, {
      backgroundColor: null,
      scale: 2
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Velotric_Certificate_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 恢复按钮显示
      btnContainer.style.display = originalDisplay;
    }).catch(err => {
      console.error('证书生成失败:', err);
      alert('证书生成失败，请稍后重试');
      btnContainer.style.display = originalDisplay;
    });
  },

  // 显示章节选择器
  showChapterSelector() {
    const modal = document.getElementById('chapter-select-modal');
    const list = document.getElementById('chapter-list');
    list.innerHTML = '';

    // 生成所有章节列表
    GAME_DATA.chapters.forEach(chapter => {
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

    document.getElementById('cards-count').textContent = `${GameState.unlockedCards.length}/${Object.keys(GAME_DATA.knowledgeCards).length}`;

    Object.entries(GAME_DATA.knowledgeCards).forEach(([id, card]) => {
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
    // 简单处理：如果游戏结束了回结束页，否则回菜单（这里简化为回 ending）
    this.switchScreen('ending');
  }
};

const Game = {
  currentScript: null,
  isWaitingChoice: false,

  startNewGame() {
    GameState.reset();
    this.startChapter(1);
  },

  continueGame() {
    GameState.load();
    this.startChapter(GameState.currentChapterId);
  },

  startChapter(chapterId) {
    if (chapterId > GAME_DATA.chapters.length) {
      UI.showEnding();
      return;
    }

    GameState.currentChapterId = chapterId;
    GameState.currentDialogueId = 'start'; // 每章重置到 start
    GameState.save();

    const chapter = GAME_DATA.chapters.find(c => c.id === chapterId);

    UI.showTransition(chapter, () => {
      UI.switchScreen('game');
      this.currentScript = GAME_DATA.scripts[chapterId];
      this.playDialogue('start');
      UI.updateScene(chapter);
    });
  },

  playDialogue(nodeId) {
    const node = this.currentScript[nodeId];
    if (!node) {
      console.error("Node not found:", nodeId);
      return;
    }

    // 处理特殊事件：章节结束、游戏结束
    if (node.event === "chapter_complete") {
      UI.showChapterComplete(GameState.currentChapterId);
      return;
    }
    if (node.event === "game_complete") {
      UI.showEnding();
      return;
    }

    GameState.currentDialogueId = nodeId;
    // 渲染对话
    UI.renderDialogue(node);

    // 设置状态（必须在知识卡弹窗检查之前设置，否则弹窗关闭后对话无法推进）
    this.isWaitingChoice = (node.choices && node.choices.length > 0);

    // 检查是否解锁知识卡
    if (node.unlockCard) {
      if (GameState.unlockCard(node.unlockCard)) {
        // 如果是新解锁，显示弹窗
        UI.showKnowledgeCard(node.unlockCard);
        return; // 等待用户关闭弹窗后再继续
      }
    }
  },

  advanceDialogue() {
    if (this.isWaitingChoice) return; // 等待选择时点击无效

    // 如果正在打字，先跳过打字效果
    if (TypeWriter.isTyping) {
      TypeWriter.skip();
      return;
    }

    const currentNode = this.currentScript[GameState.currentDialogueId];
    if (currentNode.next) {
      this.playDialogue(currentNode.next);
    } else {
      console.warn("No next node defined for:", GameState.currentDialogueId);
    }
  },

  makeChoice(choice, clickedBtn = null) {
    // 选择后重置等待状态，允许对话推进
    this.isWaitingChoice = false;

    // 获取所有选项按钮
    const choicesContainer = document.getElementById('choices-container');
    const allButtons = choicesContainer.querySelectorAll('.choice-btn');

    // 禁用所有按钮，防止重复点击
    allButtons.forEach(btn => {
      btn.style.pointerEvents = 'none';
    });

    // 找到被点击的按钮（如果没有传入，从事件中获取）
    const selectedBtn = clickedBtn || document.querySelector('.choice-btn:focus');

    // 应用正确/错误样式
    if (choice.isCorrect !== undefined) {
      if (choice.isCorrect) {
        // 正确选择
        if (selectedBtn) {
          selectedBtn.classList.add('correct-choice');
        }
        AudioManager.playCorrect(); // 正确音效
        // 显示得分飘出
        if (choice.score > 0) {
          this.showScorePopup(selectedBtn, `+${choice.score}`);
        }
      } else {
        // 错误选择
        if (selectedBtn) {
          selectedBtn.classList.add('wrong-choice');
        }
        AudioManager.playWrong(); // 错误音效

        // 高亮正确答案
        allButtons.forEach((btn, index) => {
          const currentNode = this.currentScript[GameState.currentDialogueId];
          if (currentNode.choices && currentNode.choices[index] && currentNode.choices[index].isCorrect) {
            btn.classList.add('hint-correct');
          }
        });
      }

      // 显示即时反馈
      if (choice.feedback) {
        this.showFeedbackToast(choice.feedback, choice.isCorrect);
      }
    } else {
      // 没有isCorrect标记时，使用默认音效
      AudioManager.playSelect();
    }

    // 更新分数
    if (choice.score) {
      GameState.score += choice.score;
    }

    // 延迟后继续对话，让玩家看到反馈
    const delay = choice.isCorrect !== undefined ? 1200 : 300;
    setTimeout(() => {
      this.playDialogue(choice.next);
    }, delay);
  },

  // 显示分数飘出动画
  showScorePopup(element, text) {
    if (!element) return;
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    element.appendChild(popup);
    // 动画结束后移除
    setTimeout(() => popup.remove(), 1000);
  },

  // 显示反馈提示
  showFeedbackToast(message, isCorrect) {
    // 移除已有的toast
    const existingToast = document.querySelector('.feedback-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `feedback-toast ${isCorrect ? 'toast-correct' : 'toast-wrong'}`;
    toast.innerHTML = `<span class="toast-icon">${isCorrect ? '✓' : '✗'}</span><span class="toast-text">${message}</span>`;
    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => toast.remove(), 1500);
  },

  showCardsScreen() {
    UI.showCardsScreen();
  },

  goBackToEndingOrMenu() {
    UI.goBackToEndingOrMenu();
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  ConfigLoader.init(); // 先加载后台配置
  AudioManager.init();
  UI.init();
});
