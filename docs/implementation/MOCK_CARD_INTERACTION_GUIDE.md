# 🎴 飞书卡片交互模拟测试指南

## 📋 概述

我们已经成功实现了第一层：**模拟数据 + 卡片交互**。这个实现允许我们完全脱离真实数据库，专注于验证飞书卡片交互逻辑的正确性。

## 🏗️ 架构设计

### 核心组件

1. **MockDataManager** (`src/modules/storage/MockDataManager.ts`)
   - 内存模拟数据管理器
   - 提供与 SupabaseManager 相同的接口
   - 包含预置的示例评论数据
   - 支持消息ID与评论ID的映射

2. **统一数据管理器接口** (`src/api/controllers/review-card-controller.ts`)
   - `IDataManager` 接口统一模拟和真实数据管理器
   - 支持依赖注入切换数据源
   - 完善的卡片交互处理逻辑

3. **模式切换支持** (`src/api/feishu-routes.ts`)
   - 通过环境变量控制模拟/真实模式
   - 自动初始化对应的数据管理器
   - 提供调试端点查看模拟数据状态

## 🎯 支持的卡片状态流转

```
NO_REPLY ──点击"回复"──> REPLYING ──提交回复──> REPLIED
    ↑                        ↓                    ↓
    └────────点击"取消"────────┘        点击"编辑回复"
                                            ↓
                                      EDITING_REPLY
                                            ↓
                                    ──更新回复──> REPLIED
```

## 🚀 使用方法

### 1. 启动服务（模拟模式）

```bash
# 设置环境变量启用模拟模式
export MOCK_MODE=true
# 或者
export NODE_ENV=test

# 启动服务
npm start
```

### 2. 测试卡片发送

```bash
# 发送测试卡片
curl -X POST http://localhost:3000/feishu/test/review-card \
  -H "Content-Type: application/json" \
  -d '{
    "reviewData": {
      "id": "test_review_001",
      "appId": "com.test.app",
      "appName": "测试应用",
      "rating": 5,
      "title": "很棒的应用",
      "body": "这个应用真的很好用！",
      "author": "测试用户",
      "createdAt": "2024-01-01T00:00:00Z",
      "version": "1.0.0",
      "countryCode": "CN"
    }
  }'
```

### 3. 查看模拟数据状态

```bash
# 获取模拟数据统计
curl http://localhost:3000/feishu/debug/mock-data
```

### 4. 运行自动化测试

```bash
# 运行完整的卡片交互测试
node scripts/test-mock-card-interaction.js
```

## 📊 预置测试数据

MockDataManager 包含3条预置评论：

1. **5星好评** - 无回复状态
2. **2星差评** - 无回复状态  
3. **4星中评** - 已有开发者回复

## 🔧 调试功能

### 调试端点

- `GET /feishu/debug/mock-data` - 查看模拟数据统计和所有评论
- `POST /feishu/test/review-card` - 发送测试卡片

### 日志输出

所有交互都会产生详细的日志输出，包括：
- 卡片状态切换
- 数据保存和更新
- 消息映射建立
- 错误处理

## 🎯 测试覆盖

自动化测试脚本覆盖以下场景：

1. ✅ 服务状态检查
2. ✅ 发送初始卡片
3. ✅ 卡片状态切换模拟
4. ✅ 回复提交模拟
5. ✅ 编辑回复模拟
6. ✅ 数据持久化验证

## 🔄 下一步计划

完成第一层验证后，我们将进入：

**第二层：真实数据库集成**
- 修复 SupabaseManager 的数据库字段映射
- 集成真实的 Supabase 存储
- 验证数据持久化

**第三层：App Store API 集成**
- 接入真实的回复 API
- 完整的端到端测试

## 🐛 故障排除

### 常见问题

1. **服务启动失败**
   - 检查环境变量设置
   - 确认端口3000未被占用

2. **卡片发送失败**
   - 检查飞书服务是否正确初始化
   - 确认有可用的聊天ID

3. **数据不一致**
   - 使用调试端点检查模拟数据状态
   - 重启服务重置模拟数据

### 日志级别

设置 `LOG_LEVEL=debug` 获取更详细的调试信息。

## 📝 总结

第一层实现成功提供了：
- ✅ 完整的模拟数据管理
- ✅ 卡片交互逻辑验证
- ✅ 状态流转测试
- ✅ 数据持久化模拟
- ✅ 自动化测试覆盖

这为后续的真实数据库和API集成奠定了坚实的基础。
