# Protalk App Store 评论服务 PRD

*版本 v2.2 （最后更新：2025-08-31）*

> 基于完整代码库与文档分析的产品需求倒推文档

---

## 1. 项目背景与业务价值

### 1.1 业务痛点
| 痛点 | 现状 | 影响 |
|------|------|------|
| 评论响应滞后 | App Store Connect 需手动查看，延迟 24h+ | 用户体验差，评分下降 |
| 团队协作低效 | 评论无法推送到团队 IM 工具 | 信息孤岛，处理延迟 |
| 回复流程复杂 | 需登录多个后台逐一回复 | 人力成本高，遗漏风险 |
| 缺乏监控告警 | 无法及时发现同步异常 | 问题发现滞后，影响业务 |

### 1.2 解决方案价值
- **实时性**: 评论同步延迟从 24h 降至 10 分钟内
- **协作性**: 飞书卡片推送，团队可直接查看和回复
- **自动化**: 定时同步 + 智能推送，减少 80% 人工操作
- **可观测性**: 完整监控体系，问题检测时间 < 5 分钟

---

## 2. 用户角色与使用场景

### 2.1 核心用户
| 角色 | 职责 | 核心需求 | 成功指标 |
|------|------|----------|----------|
| 产品经理 | 监控用户反馈，制定产品策略 | 快速查看所有新评论，识别关键反馈 | 新评论响应时间 < 30min |
| 客服团队 | 处理用户投诉，维护用户关系 | 及时回复负面评论，跟踪处理状态 | 负面评论回复率 > 95% |
| 开发团队 | 监控技术问题，修复 Bug | 识别技术相关评论，监控服务状态 | 技术问题响应时间 < 2h |
| 运维团队 | 保证系统稳定运行 | 监控服务健康度，处理异常告警 | 系统可用性 > 99.5% |

### 2.2 典型用户故事
```
作为产品经理，我希望每天早晨能在飞书群收到昨日新评论汇总，
以便快速了解用户反馈趋势，制定当日工作重点。

作为客服，我希望收到 1-2 星差评时能立即获得告警推送，
并能直接在飞书卡片中回复，避免用户等待时间过长。

作为开发，我希望能监控评论同步服务的运行状态，
当出现异常时能快速定位问题并恢复服务。
```

---

## 3. 功能需求

### 3.0 术语与版本澄清（重要）
- 本项目在发送消息时使用飞书 IM 接口路径 `im/v1/messages`（接口版本号为 v1）。
- 互动卡片的内容结构使用的是「飞书卡片 JSON v2 规范」。
- 对应代码位置：
  - 卡片构建：`src/utils/feishu-card-v2-builder.ts`
  - 发送/更新卡片：`src/modules/feishu/FeishuBotV1.ts` 的 `sendCardMessage()` / `updateCardMessage()`（底层走 `/im/v1/messages`）。
- 结论：接口路径版本（v1）≠ 卡片 JSON 版本（v2），当前实现为「IM v1 + Card JSON v2」。

### 3.1 评论数据管理

#### 3.1.1 评论抓取
**需求描述**: 从 App Store Connect API 自动抓取评论数据

**功能要点**:
- 支持多应用配置（通过 config.json 管理）
- 增量同步（基于 last_sync_time 避免重复抓取）
- 并发控制（p-limit=5 避免 API 限流）
- 重试机制（指数退避，最多 3 次重试）

**验收标准**:
- [ ] 单次可抓取 1000+ 条评论且耗时 < 30 秒
- [ ] 增量同步无遗漏，重复率 < 0.1%
- [ ] API 调用成功率 > 99%

#### 3.1.2 数据存储
**需求描述**: 可靠存储评论数据，支持查询和统计

**技术实现**: 
- 数据库：Supabase (PostgreSQL)
- 核心表：`app_reviews`（主键：review_id）
- 辅助表：`sync_log`（记录同步状态）

**数据模型**:
```typescript
interface AppReview {
  reviewId: string;          // 评论唯一ID
  appId: string;            // 应用ID
  rating: number;           // 评分 1-5
  title?: string;           // 评论标题
  body?: string;            // 评论内容
  reviewerNickname: string; // 评论者昵称
  createdDate: Date;        // 评论创建时间
  responseBody?: string;    // 开发者回复
  responseDate?: Date;      // 回复时间
  isEdited: boolean;        // 是否编辑过
  isPushed: boolean;        // 是否已推送
  // ... 其他字段
}
```

**验收标准**:
- [ ] 数据完整性：字段映射准确，无数据丢失
- [ ] 查询性能：万级数据查询 < 100ms
- [ ] 并发安全：支持多实例同时写入

### 3.2 智能推送系统

#### 3.2.1 飞书卡片推送（Card JSON v2）
**需求描述**: 将新评论以 Feishu Card JSON v2 规范构建的交互卡片推送到飞书群。

**卡片构建**：
- 单一可信来源：`src/utils/feishu-card-v2-builder.ts`
- 关键能力：
  - 评分情绪 Emoji（<=2 ❌ / 3 ⚠️ / >=4 ✅）
  - 动态动作区：根据 `CardState` 渲染“回复/忽略/编辑回复”等按钮
  - 统一字段映射（`ReviewDTO` → `FeishuCardV2`）

**发送与更新**：
- 发送：`FeishuBotV1.sendCardMessage(chatId, cardData)`
- 更新：`FeishuBotV1.updateCardMessage(messageId, cardData)`（编辑已发送卡片状态）
- 幂等：发送成功后，持久化 `feishu_message_id`（详见 3.7）

**推送策略**：
- 即时：1-2 星差评/关键字命中（可扩展）
- 批量：按批次或定时窗口合并
- 去重：同 `review_id` 不二次推送

**验收标准**：
- [ ] 卡片渲染正确，状态切换（未回复/回复中/已回复）一致
- [ ] 推送延迟 < 10 分钟；批量窗口内不超过 1 个周期
- [ ] 去重有效：重复推送率 < 0.01%

#### 3.2.2 交互式回复
**需求描述**: 支持直接在飞书卡片中回复评论

**交互流程**:
1. 点击"回复"按钮触发飞书侧边栏表单
2. 输入回复内容（支持 Markdown 格式）
3. 提交后调用 App Store Connect API 发送回复
4. 更新数据库回复状态
5. 刷新卡片显示"已回复"状态

**输入验证**:
- 内容长度：1-1000 字符
- 格式检查：过滤敏感词汇
- 重复检查：同一评论不可重复回复

**验收标准**:
- [ ] 回复成功率 > 98%
- [ ] 回复延迟 < 30 秒
- [ ] 表单验证准确，错误提示友好

### 3.3 监控告警体系

#### 3.3.1 系统监控
**需求描述**: 实时监控服务运行状态和性能指标

**核心指标**:
- 业务指标：同步成功率、推送成功率、回复成功率
- 性能指标：API 响应时间、数据库查询时间、内存使用
- 错误指标：异常次数、错误类型分布、恢复时间

**监控实现**:
- 日志收集：Winston 结构化日志
- 指标采集：自定义 metrics 埋点
- 数据存储：logs/ 目录 + 可选 Prometheus

**验收标准**:
- [ ] 关键指标覆盖率 100%
- [ ] 监控数据延迟 < 1 分钟
- [ ] 历史数据保留 30 天

#### 3.3.2 异常告警
**需求描述**: 及时发现和通报系统异常

**告警规则**:
- 同步失败：连续 3 次失败触发告警
- 响应超时：P95 响应时间 > 5 秒
- 错误率过高：1 小时内错误率 > 10%
- 资源异常：内存使用 > 80%

**告警渠道**:
- 飞书群消息（高优先级）
- 邮件通知（中优先级）
- 钉钉机器人（备用渠道）

**验收标准**:
- [ ] 告警响应时间 < 5 分钟
- [ ] 误报率 < 5%
- [ ] 告警恢复通知及时

### 3.4 连接模式（Feishu）
- 支持模式：`eventsource`（长连接）与 `webhook`（回调）
- 当前默认：`eventsource`（配置字段见 `feishu.mode`）
- 客户端：`src/modules/feishu/client/EventSourceClient.ts`
- 要求：异常断开具备自动重连；错误回调安全可观测

### 3.5 安全与签名
- 飞书回调签名校验开关：`enableSignatureVerification`
- 签名实现：`src/utils/feishu-signature.ts`（由 `FeishuSignature` 提供）
- 要求：生产环境默认开启；错误日志脱敏

### 3.6 幂等与去重
- 目标：避免重复推送/重复处理
- 机制：
  - 入库前基于 `review_id` 去重（`getExistingReviewIds`）
  - 推送后持久化 `feishu_message_id`（`SupabaseManager.mapMessageToReview()`）
  - 更新卡片走 `updateCardMessage` 而非重复发送
- 验收：重复操作不产生额外消息；卡片状态可回放

### 3.7 数据模型扩展（DB真实字段对齐）
- 除 PRD 3.1.2 的基础字段外，实际表结构还包含：
  - `push_type`: 'new' | 'historical' | 'updated' | null
  - `territory_code`, `app_version`, `review_state`
  - `first_sync_at`, `created_at`, `updated_at`
- 要求：
  - `review_id` 为唯一主键（冲突即 UPSERT）
  - `first_sync_at` 初次入库时写入；后续仅 `updated_at` 递增

---

## 4. 非功能需求

### 4.1 性能要求
| 场景 | 指标要求 | 测试方法 |
|------|----------|----------|
| 评论同步 | 1000 条 < 30 秒 | 性能测试 |
| 数据库查询 | P95 < 100ms | 压力测试 |
| 推送延迟 | P99 < 10 分钟 | 端到端测试 |
| 系统响应 | API P95 < 2 秒 | 负载测试 |

### 4.2 可用性要求
- **服务可用性**: 99.5% (月度)
- **数据可靠性**: 99.99% (零丢失)
- **灾难恢复**: RTO < 30 分钟, RPO < 5 分钟

### 4.3 安全要求
- **身份认证**: API Key + JWT 双重认证
- **数据加密**: 传输加密 (HTTPS) + 静态加密
- **访问控制**: 基于角色的权限管理
- **审计日志**: 完整的操作审计链路

### 4.4 扩展性要求
- **多商店支持**: 模块化设计支持 Google Play 等
- **多渠道推送**: 接口抽象支持 Slack/微信等
- **水平扩展**: 支持多实例部署
- **配置热更新**: 无需重启即可更新配置

---

## 5. 技术架构

### 5.1 整体架构（校准标注）
```mermaid
graph TB
    A[App Store Connect API] --> B[AppStoreReviewFetcher]
    B --> C[DataProcessor]
    C --> D[SupabaseManager]
    C --> E[FeishuBotV1 (IM v1)]
    E --> E2[Card JSON v2 Builder]
    D --> F[PostgreSQL]
    E --> G[Feishu Platform]
    
    subgraph "监控组件"
        H[OperationLogger]
        I[ErrorHandler]
        J[Metrics]
    end
    
    C --> H
    D --> H
    E --> H
```

### 5.2 核心模块
| 模块 | 职责 | 关键接口 |
|------|------|----------|
| ReviewSyncService | 业务编排 | syncReviews(), syncAllApps() |
| DataProcessor | 数据处理 | processReviewBatch(), filterValidReviews() |
| SupabaseManager | 数据持久化 | upsertAppReviews(), getExistingReviewIds() |
| FeishuServiceV1 | 消息推送 | pushBatchUpdates(), handleFeishuEvent() |
| OperationLogger | 统一日志 | createOperationLogger(), logError() |
- 追加：`src/utils/feishu-card-v2-builder.ts`（卡片单一真源）
- 追加：`src/modules/feishu/client/EventSourceClient.ts`（长连接客户端）

### 5.3 数据流向
```
1. 定时任务触发 (node-cron)
2. ReviewSyncService.syncAllApps()
3. AppStoreReviewFetcher.syncReviews()
4. DataProcessor.processReviewBatch()
5. SupabaseManager.upsertAppReviews()
6. FeishuServiceV1.pushBatchUpdates()
7. OperationLogger 记录全流程日志
```

---

## 6. 项目里程碑

### 6.1 已完成 (v2.2)
- [x] 核心功能开发完成
- [x] 飞书 IM v1 接口 + 卡片 JSON v2 规范
- [x] 完整测试体系 (84 个测试用例)
- [x] 统一错误处理与日志
- [x] 性能与监控测试
- [x] 文档体系完善

### 6.2 规划中 (v2.3)
- [ ] Google Play 商店支持
- [ ] 飞书 V2 卡片升级
- [ ] 增加 Slack 推送渠道
- [ ] Prometheus 指标导出
- [ ] 自动化部署流水线
- [ ] 性能优化与缓存

### 6.3 远期规划 (v3.0)
- [ ] 更多应用商店（如华为应用商店）支持
- [ ] SaaS 多租户架构
- [ ] 用户权限管理系统
- [ ] 智能评论分析与分类
- [ ] 自动回复模板引擎

---

## 7. 风险与对策

### 7.1 技术风险
| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| Apple API 限流 | 同步延迟/失败 | 中 | 限速控制 + 重试机制 |
| 飞书 API 变更 | 推送功能异常 | 低 | 版本兼容 + 降级方案 |
| 数据库性能瓶颈 | 查询延迟增加 | 中 | 索引优化 + 读写分离 |
| 内存泄漏 | 服务崩溃 | 低 | 内存监控 + 自动重启 |

### 7.2 业务风险
| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| 评论数据丢失 | 业务中断 | 极低 | 数据备份 + 多重验证 |
| 推送延迟过大 | 用户体验差 | 中 | 性能优化 + 告警机制 |
| 恶意评论攻击 | 服务过载 | 低 | 限流防护 + 异常检测 |

---

## 8. 验收标准

### 8.1 功能验收
- [ ] 新评论端到端同步延迟 < 10 分钟
- [ ] 飞书卡片显示正确，交互功能正常
- [ ] 评论回复成功率 > 98%
- [ ] 数据完整性验证通过
- [ ] 长连接异常断开可在 30s 内自动恢复；`/feishu/status` 可见状态为 connected=true。

### 8.2 性能验收
- [ ] 1000 条评论同步耗时 < 30 秒
- [ ] API 响应 P95 < 2 秒
- [ ] 系统可用性 > 99.5%
- [ ] 内存使用稳定，无泄漏

### 8.3 质量验收
- [ ] 测试覆盖率：行覆盖 > 80%，分支覆盖 > 70%
- [ ] 代码质量：ESLint 检查通过，无高危漏洞
- [ ] 文档完整：README + API 文档 + 部署指南齐全
- [ ] 监控完备：关键指标覆盖率 100%

---

## 9. 附录

### 9.1 API 接口清单（校准）
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 健康检查 | GET | `/health` | 服务状态检查 |
| 手动同步 | POST | `/api/sync` | 触发评论同步 |
| 同步状态 | GET | `/api/sync/status` | 查看同步状态 |
| 飞书事件 | POST | `/feishu/events` | 飞书回调处理（webhook 模式）|
| 飞书状态 | GET | `/feishu/status` | 查看长连接/EventSource 状态 |

### 9.2 关键配置项
```json
{
  "apps": [
    {
      "appId": "your-app-id",
      "name": "Your App Name",
      "enabled": true
    }
  ],
  "sync": {
    "cronExpression": "*/10 * * * *",
    "batchSize": 100,
    "retryAttempts": 3
  },
  "feishu": {
    "mode": "eventsource",
    "batchSize": 10,
    "retryAttempts": 3
  }
}
```

### 9.3 测试策略
- **单元测试**: 覆盖核心业务逻辑
- **集成测试**: 验证模块间协作
- **性能测试**: 验证响应时间和吞吐量
- **监控测试**: 验证告警和指标采集

### 9.4 模块索引与映射
- 推送发送：`src/modules/feishu/FeishuBotV1.ts` → `/im/v1/messages`
- 卡片构建：`src/utils/feishu-card-v2-builder.ts` → Card JSON v2
- 互动流转：`src/services/FeishuServiceV1.ts` / `src/api/feishu-routes.ts`
- 长连接：`src/modules/feishu/client/EventSourceClient.ts`
- 幂等映射：`SupabaseManager.mapMessageToReview()`

---

*本 PRD 基于项目 v2.2 代码库完整分析生成，后续将随功能演进持续更新。*
