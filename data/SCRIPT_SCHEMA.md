# 章节脚本节点格式文档

## 基础节点

```json
{
  "node_id": {
    "speaker": "角色名",
    "avatar": "👨",
    "text": "对话内容",
    "next": "下一个节点 ID"
  }
}
```

## 选择节点

```json
{
  "node_id": {
    "speaker": "角色名",
    "avatar": "👨",
    "text": "提问内容",
    "choices": [
      {
        "text": "选项文字",
        "next": "目标节点 ID",
        "score": 100,
        "isCorrect": true,
        "feedback": "反馈文字"
      }
    ]
  }
}
```

## 知识卡解锁节点

```json
{
  "node_id": {
    "speaker": "角色名",
    "avatar": "👨",
    "text": "对话内容",
    "unlockCard": "CARD_ID",
    "next": "下一个节点 ID"
  }
}
```

## 条件节点（v3.0 新增）

根据玩家状态动态选择路径。条件不满足时跳转到 `fallbackNext`。

```json
{
  "node_id": {
    "speaker": "角色名",
    "avatar": "👨",
    "text": "条件满足时显示的文字",
    "condition": { "type": "score_gte", "value": 200 },
    "fallbackNext": "条件不满足时跳转的节点",
    "next": "条件满足时的下一个节点"
  }
}
```

### 支持的条件类型

| type | 参数 | 说明 |
|------|------|------|
| `score_gte` | `value` (number) | 总分 >= value |
| `score_lt` | `value` (number) | 总分 < value |
| `card_unlocked` | `cardId` (string) | 指定知识卡已解锁 |
| `choice_was_correct` | `chapterId` (number) | 指定章节的选择是否正确 |

## 事件节点

```json
{
  "end_chapter": {
    "event": "chapter_complete"
  }
}
```

支持的事件：
- `chapter_complete` — 章节结束
- `game_complete` — 游戏通关
