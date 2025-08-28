# 飞书长连接架构部署指南

## 概述

本文档介绍如何部署和配置飞书长连接架构，该架构解决了原有Webhook模式的3秒超时问题，提供了更稳定的事件接收机制。

## 架构特点

### 🚀 核心优势

1. **解决超时问题** - 使用EventSource长连接替代Webhook，避免3秒超时限制
2. **双模式支持** - 支持Webhook和EventSource两种模式，可运行时切换
3. **异步处理** - 消息队列机制，提高处理效率
4. **自动重连** - 连接断开时自动重连，提高稳定性
5. **向后兼容** - 完全兼容现有功能和接口

### 🏗️ 架构组件

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EventSource   │    │   MessageQueue  │    │   FeishuService │
│     Client      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebhookMode   │    │ EventSourceMode │    │  统一服务接口   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 环境配置

### 必需环境变量

```bash
# 飞书基础配置
FEISHU_WEBHOOK_URL=https://your-webhook-url.com
FEISHU_APP_ID=your_bot_app_id
FEISHU_APP_SECRET=your_bot_app_secret

# 飞书连接模式配置
FEISHU_MODE=webhook  # 可选值: webhook, eventsource
FEISHU_BATCH_SIZE=10  # 批量处理大小
FEISHU_RETRY_ATTEMPTS=3  # 重试次数
FEISHU_PROCESS_INTERVAL=2000  # 处理间隔（毫秒）
```

### 可选环境变量

```bash
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
```

## 部署步骤

### 1. 快速部署

使用自动化部署脚本：

```bash
# 开发环境部署
npm run deploy

# 生产环境部署
npm run deploy:prod
```

### 2. 手动部署

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 启动应用
npm start
```

### 3. 验证部署

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查飞书服务状态
curl http://localhost:3000/feishu/status
```

## 管理命令

### 服务状态管理

```bash
# 查看飞书服务状态
npm run feishu:status

# 切换到Webhook模式
npm run feishu:switch-webhook

# 切换到EventSource模式
npm run feishu:switch-eventsource

# 重新连接
npm run feishu:reconnect
```

### 监控脚本

```bash
# 启动监控（默认30秒间隔）
./scripts/monitor.sh

# 自定义监控参数
./scripts/monitor.sh -p 8080 -i 60 -m 5

# 执行一次检查
./scripts/monitor.sh -o
```

## API接口

### 飞书服务管理API

#### 1. 获取服务状态

```http
GET /feishu/status
```

响应示例：
```json
{
  "success": true,
  "data": {
    "mode": {
      "currentMode": "webhook",
      "availableModes": ["webhook", "eventsource"],
      "lastSwitch": "2025-08-27T19:41:25.607Z",
      "switchCount": 0,
      "isHealthy": true
    },
    "connection": {
      "mode": "webhook",
      "connected": true,
      "lastHeartbeat": "2025-08-27T19:41:37.694Z",
      "errorCount": 0,
      "messageCount": 0
    }
  }
}
```

#### 2. 切换连接模式

```http
POST /feishu/switch-mode
Content-Type: application/json

{
  "mode": "eventsource"
}
```

#### 3. 重新连接

```http
POST /feishu/reconnect
```

#### 4. 测试消息发送

```http
POST /feishu/test
Content-Type: application/json

{
  "chat_id": "your_chat_id"
}
```

## 模式对比

### Webhook模式

**优点：**
- 简单易用
- 配置简单
- 适合低频率事件

**缺点：**
- 3秒超时限制
- 需要公网可访问
- 连接不稳定

### EventSource模式

**优点：**
- 无超时限制
- 连接稳定
- 实时性好
- 自动重连

**缺点：**
- 配置相对复杂
- 需要飞书SDK
- 资源消耗稍高

## 故障排除

### 常见问题

#### 1. 连接失败

**症状：** EventSource模式连接失败

**解决方案：**
```bash
# 检查飞书配置
curl http://localhost:3000/feishu/status

# 重新连接
curl -X POST http://localhost:3000/feishu/reconnect

# 切换到Webhook模式
curl -X POST -H 'Content-Type: application/json' \
  -d '{"mode":"webhook"}' \
  http://localhost:3000/feishu/switch-mode
```

#### 2. 消息推送失败

**症状：** 评论推送失败

**解决方案：**
```bash
# 检查服务状态
npm run feishu:status

# 查看错误日志
tail -f logs/error.log

# 重新连接
npm run feishu:reconnect
```

#### 3. 模式切换失败

**症状：** 模式切换时出错

**解决方案：**
```bash
# 检查当前状态
curl http://localhost:3000/feishu/status

# 重启应用
npm start

# 重新尝试切换
npm run feishu:switch-eventsource
```

### 日志分析

#### 关键日志标识

- `[INFO] 飞书服务初始化成功` - 服务启动成功
- `[INFO] 模式切换成功` - 模式切换成功
- `[ERROR] 连接失败` - 连接出现问题
- `[WARNING] 重连尝试` - 自动重连中

#### 日志文件位置

- 综合日志：`logs/combined.log`
- 错误日志：`logs/error.log`

## 性能优化

### 配置建议

#### 高并发场景

```bash
FEISHU_BATCH_SIZE=20
FEISHU_PROCESS_INTERVAL=1000
FEISHU_RETRY_ATTEMPTS=5
```

#### 低延迟场景

```bash
FEISHU_BATCH_SIZE=5
FEISHU_PROCESS_INTERVAL=500
FEISHU_RETRY_ATTEMPTS=3
```

#### 稳定性优先

```bash
FEISHU_BATCH_SIZE=10
FEISHU_PROCESS_INTERVAL=2000
FEISHU_RETRY_ATTEMPTS=3
```

### 监控指标

- 消息处理延迟
- 连接稳定性
- 错误率
- 队列长度

## 升级指南

### 从旧版本升级

1. **备份配置**
   ```bash
   cp .env .env.backup
   ```

2. **更新代码**
   ```bash
   git pull origin main
   npm install
   ```

3. **更新配置**
   ```bash
   # 添加新的环境变量
   echo "FEISHU_MODE=webhook" >> .env
   echo "FEISHU_BATCH_SIZE=10" >> .env
   ```

4. **重启服务**
   ```bash
   npm run build
   npm start
   ```

## 技术支持

### 获取帮助

1. 查看日志文件
2. 使用监控脚本
3. 检查API状态
4. 联系技术支持

### 相关文档

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [EventSource规范](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [项目README](../README.md)

---

**版本：** v2.0.0  
**更新时间：** 2025-08-28  
**维护者：** Protalk Team
