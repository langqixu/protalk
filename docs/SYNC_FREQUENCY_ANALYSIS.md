# 📊 Protalk 评论抓取和同步频率分析

## 📋 当前同步配置

### 1. **定时同步频率**

#### 代码实现 (src/index.ts)
```typescript
const cronExpression = '*/10 * * * *'; // 每10分钟同步一次（稍微放宽间隔）
```

#### 配置文件 (config.json)
```json
{
  "sync": {
    "interval": "0 * * * *",    // 配置文件中是每小时，但代码中硬编码为10分钟
    "batchSize": 100,
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

**⚠️ 注意**: 存在配置不一致的问题！

### 2. **实际运行频率**

| 配置来源 | Cron表达式 | 频率 | 生效状态 |
|----------|------------|------|----------|
| **src/index.ts** | `*/10 * * * *` | **每10分钟** | ✅ **实际生效** |
| **config.json** | `0 * * * *` | 每1小时 | ❌ 未使用 |

## 🔍 同步流程分析

### 同步触发方式

#### 1. **自动定时同步**
```typescript
// 每10分钟执行一次
cron.schedule('*/10 * * * *', async () => {
  for (const store of appConfig.stores) {
    if (store.enabled) {
      const result = await reviewSyncService.syncReviews(store.appId);
    }
  }
});
```

#### 2. **手动API触发**
```bash
# 单个应用同步
GET /api/sync-reviews?appId=1077776989

# 批量应用同步  
POST /api/sync-reviews
{
  "appIds": ["1077776989", "另一个应用ID"]
}

# 通过飞书服务触发
POST /api/sync
```

### 同步执行详情

#### 单次同步流程
```typescript
1. 获取已存在的评论ID (数据库查询)
2. 调用App Store Connect API获取最新评论
3. 数据处理和去重 (DataProcessor.processReviewBatch)
4. 更新数据库 (upsertReviews)
5. 推送新评论到飞书 (pushBatchUpdates)
6. 推送更新评论到飞书 (pushBatchUpdates)
7. 更新同步时间 (updateSyncTime)
```

#### 批量处理配置
- **batchSize**: 100条评论/批次
- **maxRetries**: 失败重试3次
- **retryDelay**: 重试间隔1秒
- **API timeout**: 30秒

## 📈 同步频率对比分析

### 当前配置: 每10分钟

#### ✅ 优点
- **实时性好**: 新评论能在10分钟内被发现
- **响应及时**: 用户体验较好
- **数据新鲜**: 评论数据保持较新状态

#### ⚠️ 潜在问题
- **API调用频繁**: 每天144次调用
- **资源消耗**: 较高的计算和网络资源使用
- **可能触发限流**: App Store API有速率限制

### 常见同步频率建议

| 频率 | Cron表达式 | 适用场景 | API调用次数/天 |
|------|------------|----------|----------------|
| **每5分钟** | `*/5 * * * *` | 高实时性要求 | 288次 |
| **每10分钟** | `*/10 * * * *` | **当前配置** | **144次** |
| **每15分钟** | `*/15 * * * *` | 平衡性能和实时性 | 96次 |
| **每30分钟** | `*/30 * * * *` | 中等实时性要求 | 48次 |
| **每1小时** | `0 * * * *` | 低实时性要求 | 24次 |

## 🎯 优化建议

### 1. **配置统一化**

#### 问题
- 代码硬编码与配置文件不一致
- 无法动态调整同步频率

#### 解决方案
```typescript
// 使用配置文件中的interval
const cronExpression = appConfig.sync.interval || '*/10 * * * *';
cron.schedule(cronExpression, async () => {
  // 同步逻辑
});
```

### 2. **智能调频策略**

#### 动态调频
```typescript
// 根据评论活跃度动态调整
if (newReviewsCount > 10) {
  // 高活跃期：5分钟同步
  cronExpression = '*/5 * * * *';
} else if (newReviewsCount > 0) {
  // 中等活跃期：10分钟同步
  cronExpression = '*/10 * * * *';
} else {
  // 低活跃期：30分钟同步
  cronExpression = '*/30 * * * *';
}
```

#### 时段优化
```typescript
// 工作时间频繁同步，非工作时间降频
const hour = new Date().getHours();
if (hour >= 9 && hour <= 21) {
  cronExpression = '*/10 * * * *';  // 工作时间10分钟
} else {
  cronExpression = '*/30 * * * *';  // 非工作时间30分钟
}
```

### 3. **增量同步优化**

#### 当前实现
```typescript
// 每次都获取全量评论，然后去重
const apiReviews = await this.fetcher.syncReviews(appId);
const processed = DataProcessor.processReviewBatch(apiReviews, existingReviewIds);
```

#### 优化建议
```typescript
// 基于时间戳的增量同步
const lastSyncTime = await this.db.getLastSyncTime(appId);
const newReviews = await this.fetcher.syncReviewsSince(appId, lastSyncTime);
```

### 4. **资源优化**

#### API调用优化
- **缓存策略**: 对于未变化的评论使用缓存
- **批量处理**: 优化数据库批量操作
- **连接池**: 复用HTTP连接

#### 错误处理
- **指数退避**: 失败后逐渐增加重试间隔
- **熔断机制**: API持续失败时暂停同步
- **降级策略**: API不可用时的备用方案

## 📊 当前性能指标

### 同步效率
```bash
# 查看最近同步日志
tail -f logs/combined.log | grep "定时同步"

# 同步性能统计
curl http://localhost:3000/api/sync-status/1077776989
```

### 关键指标
- **同步延迟**: 评论发布到系统发现的时间间隔
- **API成功率**: App Store Connect API调用成功率
- **数据完整性**: 是否遗漏评论
- **推送及时性**: 新评论推送到飞书的时间

## 🔧 配置修改建议

### 立即优化

#### 1. 修复配置不一致
```typescript
// src/index.ts 修改
const cronExpression = appConfig.sync.interval || '*/10 * * * *';
```

#### 2. 添加环境变量控制
```bash
# 支持环境变量覆盖
SYNC_INTERVAL="*/15 * * * *"  # 15分钟同步
SYNC_BATCH_SIZE=50           # 批次大小
SYNC_MAX_RETRIES=5           # 重试次数
```

### 长期优化

#### 1. 智能同步
- 基于应用活跃度动态调整
- 工作时间和非工作时间区别对待
- 根据API限制自动调节

#### 2. 监控告警
- 同步失败率监控
- API调用频率监控
- 延迟时间监控

## 📋 总结

### 当前状态
- ✅ **同步频率**: 每10分钟，实时性较好
- ⚠️ **配置问题**: 代码与配置文件不一致
- ✅ **功能完整**: 支持手动和自动同步
- ⚠️ **优化空间**: 可以更智能化

### 建议行动
1. **立即**: 修复配置不一致问题
2. **短期**: 添加环境变量控制
3. **中期**: 实现智能调频策略
4. **长期**: 建立完整监控体系

---

**文档版本**: 1.0.0  
**最后更新**: 2025年8月28日  
**当前同步频率**: 每10分钟 (`*/10 * * * *`)  
**配置文件**: config.json (未生效)  
**实际配置**: src/index.ts (硬编码)
