# Notion Schema Map

| Domain field | Production property | Staging property | Notion type | Semantics |
|---|---|---|---|---|
| date | 日期 / Date | 日期 / Date | date | Training execution date |
| trainingDay | 训练日 / Day | 训练日 / Day | rich_text or select | A / B / C |
| exerciseId | Exercise ID / 动作ID | Exercise ID / 动作ID | rich_text | Immutable business ID |
| exerciseName | Name / 动作名称 | Name / 动作名称 | title or rich_text | Current/legacy name snapshot |
| targetMuscle | Target Muscle / 目标肌群 | Target Muscle / 目标肌群 | rich_text | Current/legacy muscle snapshot |
| order | 顺序 / Order | 顺序 / Order | number | Exercise ordering |
| planSets | 计划组数 / Plan Sets | 计划组数 / Plan Sets | number | Planned set count |
| durationMinutes | 训练时长分钟 | 训练时长分钟 | number | Additive, session-level |
| set weight | 第N组重量kg | 第N组重量kg | number | Completed set only |
| set reps | 第N组次数 | 第N组次数 | number | Completed set only |
| rir | 末组RIR / RIR | 末组RIR / RIR | number | Last-set RIR |
| balanceDirection | 左右差异方向 | 左右差异方向 | select | none / left_weaker / right_weaker |
| asymmetrySeverity | 左右差异 | 左右差异 | select or number | 0-3 severity |
| discomfort | 不适0-10 / 不适 | 不适0-10 / 不适 | number | 0-10 discomfort |
| note | 动作反馈备注 | 动作反馈备注 | rich_text | Exercise feedback note |
| completed | 完成 / Completed | 完成 / Completed | checkbox | Exercise completion |
| submissionId | Submission ID | Submission ID | rich_text | Submission idempotency key |
| bodyFeedback.date | 日期 / Date | 日期 / Date | date | Pending dedicated source |
| bodyFeedback.exerciseId | Exercise ID / 动作ID | Exercise ID / 动作ID | rich_text | Empty means whole-body |
| bodyFeedback.bodyPart | 部位 / Body Part | 部位 / Body Part | select or rich_text | Pending dedicated source |
| bodyFeedback.score | 评分 / Score | 评分 / Score | number | Pending dedicated source |
| bodyFeedback.description | 描述 / Description | 描述 / Description | rich_text | Pending dedicated source |
| bodyWeight.title | Name / 名称 / 记录 | Name / 名称 / 记录 | title | Generated as `YYYY-MM-DD condition` |
| bodyWeight.date | 日期 / Date | 日期 / Date | date | Dedicated source required |
| bodyWeight.weightKg | 体重kg / Weight kg | 体重kg / Weight kg | number | Dedicated source required |
| bodyWeight.condition | 称重状态 / Condition / 状态 | 称重状态 / Condition / 状态 | select, status, or rich_text | 晨起空腹 / 练后即刻 / 晚间称重 |

Body Weight uses one measurement per calendar date. Saving again on the same date updates that page, including the measurement condition, rather than creating a duplicate chart point.

Phase 2C Staging uses `Body Weight - Staging` (`46add619-39fe-464b-8793-a57b9b5ece96`). It is isolated from the existing Production `体重与饮食数据库` and is shared with the `Keep Fit App` Notion integration. API writes also require that integration's `Insert content` capability.

## Legacy Compatibility
- Existing `左右差异` remains Select in Production and must not be renamed or retyped.
- Severity values support both Production Select labels (`0 无明显差异`, `1 轻微`, `2 明显`, `3 已影响动作`) and legacy numbers.
- Legacy rows missing snapshot fields are preserved and returned with available values only.
