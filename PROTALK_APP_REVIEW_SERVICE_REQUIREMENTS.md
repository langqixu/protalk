# Protalk App Review Service 完整需求文档

## 📋 项目概述

### 项目名称
Protalk App Review Service - App Store评论抓取、存储、飞书推送及回复服务

### 项目目标
构建一个完整的App Store评论管理平台，实现评论的自动抓取、存储、推送和回复功能，通过飞书机器人提供交互式卡片界面，支持开发者直接在飞书中回复App Store评论。

### 核心价值
- **自动化评论管理**：减少手动处理评论的工作量
- **实时通知**：及时获取新评论和更新
- **便捷回复**：在飞书中直接回复评论，无需切换平台
- **数据存储**：完整的评论历史记录和分析

## 🎯 功能需求

### 1. 核心功能模块

#### 1.1 App Store评论抓取模块
**功能描述**：通过App Store Connect API自动抓取应用评论数据

**详细需求**：
- ✅ 支持App Store Connect API认证（JWT Token）
- ✅ 分页抓取评论数据（每页100条）
- ✅ 增量更新机制，避免重复抓取
- ✅ 支持评论回复数据的抓取
- ✅ 错误处理和重试机制
- ✅ API限流控制，避免触发频率限制

**技术实现**：
- 使用JWT Manager管理App Store Connect API认证
- 实现分页逻辑，支持大量评论数据抓取
- 增量更新：记录最后同步时间，只抓取新评论
- 错误重试：401错误自动刷新Token，其他错误重试3次

#### 1.2 数据存储模块
**功能描述**：使用Supabase PostgreSQL数据库存储评论数据

**详细需求**：
- ✅ 评论数据表设计（app_reviews）
- ✅ 同步日志表设计（sync_log）
- ✅ 批量插入和更新操作
- ✅ 数据去重和冲突处理
- ✅ 评论回复数据存储
- ✅ 数据库连接池管理

**数据库表结构**：
```sql
-- 评论数据表
CREATE TABLE app_reviews (
  id SERIAL PRIMARY KEY,
  review_id VARCHAR(255) UNIQUE NOT NULL,
  app_id VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  review_date TIMESTAMP NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  response_body TEXT,
  response_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 同步日志表
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  app_id VARCHAR(255) NOT NULL,
  sync_time TIMESTAMP NOT NULL,
  new_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL
);
```

#### 1.3 飞书集成模块
**功能描述**：通过飞书机器人推送评论通知，支持交互式卡片回复

**详细需求**：
- ✅ 飞书机器人API集成
- ✅ 交互式卡片消息推送
- ✅ 自动获取群组列表
- ✅ 支持Webhook和EventSource两种模式
- ✅ 卡片内回复当前评论功能
- ✅ 多主题颜色支持（新评论-蓝色，更新-橙色，回复-绿色）

**交互式卡片功能**：
- 📱 显示评论信息（评分、标题、内容、用户信息）
- 💬 输入框：支持直接在卡片中输入回复内容
- 📤 提交按钮：一键提交回复到App Store
- 📊 查看详情和刷新功能
- 🎨 智能显示逻辑：根据评论状态动态调整内容

#### 1.4 评论回复模块
**功能描述**：通过App Store Connect API回复评论

**详细需求**：
- ✅ 集成App Store Connect API回复功能
- ✅ 支持通过飞书卡片直接回复
- ✅ 回复状态跟踪和确认
- ✅ 错误处理和用户反馈
- ✅ 回复历史记录

#### 1.5 定时同步模块
**功能描述**：自动定时同步最新评论数据

**详细需求**：
- ✅ 基于node-cron的定时任务
- ✅ 可配置的同步间隔
- ✅ 多应用并行同步
- ✅ 同步状态监控
- ✅ 失败重试机制

### 2. API接口需求

#### 2.1 健康检查接口
```
GET /api/health
响应：服务健康状态
```

#### 2.2 服务状态接口
```
GET /api/status
响应：详细的服务状态信息
```

#### 2.3 评论同步接口
```
GET /api/sync-reviews?appId=YOUR_APP_ID
POST /api/sync-reviews
功能：手动触发评论同步
认证：X-API-Key头部认证
```

#### 2.4 评论回复接口
```
POST /api/reply-review
Body: {
  "review_id": "review_id",
  "response_body": "回复内容"
}
功能：回复App Store评论
认证：X-API-Key头部认证
```

#### 2.5 同步状态接口
```
GET /api/sync-status/:appId
功能：获取应用同步状态
认证：X-API-Key头部认证
```

#### 2.6 飞书事件接口
```
POST /feishu/events
功能：处理飞书Webhook事件
```

#### 2.7 飞书测试接口
```
POST /feishu/test
功能：测试飞书消息推送
```

#### 2.8 飞书回复操作接口
```
POST /feishu/reply-action
功能：处理飞书卡片回复操作
```

### 3. 配置管理需求

#### 3.1 环境变量配置
```bash
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# App Store Connect API配置
APP_STORE_ISSUER_ID=your_issuer_id
APP_STORE_KEY_ID=your_key_id
APP_STORE_PRIVATE_KEY=your_private_key

# 飞书配置
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_WEBHOOK_URL=your_webhook_url

# API认证
API_KEY=your_api_key
```

#### 3.2 应用配置文件
```json
{
  "stores": [
    {
      "type": "appstore",
      "appId": "1077776989",
      "enabled": true,
      "name": "Protalk"
    }
  ],
  "sync": {
    "interval": "*/5 * * * *",
    "batchSize": 100,
    "maxRetries": 3,
    "retryDelay": 1000
  },
  "api": {
    "rateLimit": 100,
    "timeout": 30000
  }
}
```

## 🏗️ 技术架构需求

### 1. 技术栈要求
- **后端框架**：Node.js + TypeScript + Express.js
- **数据库**：Supabase (PostgreSQL)
- **消息推送**：飞书机器人API
- **认证**：App Store Connect API (JWT)
- **部署**：支持Vercel、Docker、PM2等多种部署方式

### 2. 架构设计原则
- **模块化设计**：通过接口定义模块契约，松耦合
- **可扩展性**：支持多商店、多推送渠道扩展
- **高可用性**：完善的错误处理和重试机制
- **可维护性**：完整的日志记录和监控

### 3. 核心模块架构
```
src/
├── api/                 # HTTP API 路由
│   ├── routes.ts       # 主要API路由
│   └── feishu-routes-v2.ts # 飞书相关路由
├── config/             # 配置管理
├── modules/            # 核心模块
│   ├── fetcher/        # 数据抓取
│   │   └── AppStoreReviewFetcher.ts
│   ├── storage/        # 数据存储
│   │   └── SupabaseManager.ts
│   ├── feishu/         # 飞书集成
│   │   ├── FeishuService.ts
│   │   ├── FeishuBot.ts
│   │   └── modes/      # 连接模式
│   └── processor/      # 数据处理
├── services/           # 业务服务
│   └── ReviewSyncService.ts
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
└── index.ts            # 应用入口
```

## 📊 性能需求

### 1. 响应时间要求
- **推送延迟**：< 5 秒
- **抓取时间**：< 30 秒 (1000条评论)
- **数据库操作**：< 10 秒
- **API响应时间**：< 3 秒

### 2. 可用性要求
- **服务可用性**：> 99.9%
- **API重试成功率**：> 95%
- **数据一致性**：100%

### 3. 并发处理能力
- **支持多应用并行同步**
- **API限流控制**
- **连接池管理**

## 🔒 安全需求

### 1. 认证和授权
- **API Key认证**：支持X-API-Key头部认证
- **Bearer Token认证**：支持Authorization头部认证
- **可配置的认证开关**

### 2. 数据安全
- **环境变量管理**：敏感信息通过环境变量配置
- **数据库连接安全**：使用SSL连接
- **API密钥管理**：安全的密钥存储和轮换

### 3. 网络安全
- **HTTPS支持**：生产环境强制使用HTTPS
- **CORS配置**：适当的跨域资源共享配置
- **请求验证**：输入数据验证和清理

## 📈 监控和日志需求

### 1. 日志系统
- **结构化日志**：使用Winston日志系统
- **日志级别**：debug, info, warn, error
- **日志格式**：JSON格式，包含时间戳、级别、消息、元数据
- **日志存储**：文件存储和错误日志分离

### 2. 监控指标
- **服务健康状态**：/api/health端点
- **详细服务状态**：/api/status端点
- **同步状态监控**：同步成功/失败统计
- **性能指标**：响应时间、吞吐量监控

### 3. 错误处理
- **异常捕获**：完善的try-catch错误处理
- **错误分类**：网络错误、API错误、数据库错误等
- **错误恢复**：自动重试和降级处理
- **错误报告**：详细的错误日志和堆栈信息

## 🚀 部署需求

### 1. 部署方式
- **Vercel部署**：支持Serverless部署
- **Docker部署**：容器化部署支持
- **PM2部署**：传统Node.js应用部署
- **Docker Compose**：多服务编排部署

### 2. 环境配置
- **开发环境**：本地开发配置
- **测试环境**：测试环境配置
- **生产环境**：生产环境配置

### 3. 部署脚本
- **自动化部署脚本**
- **数据库初始化脚本**
- **环境变量配置脚本**

## 🧪 测试需求

### 1. 测试覆盖
- **单元测试**：核心模块单元测试
- **集成测试**：模块间集成测试
- **API测试**：HTTP接口测试
- **端到端测试**：完整流程测试

### 2. 测试脚本
- **功能测试脚本**：验证核心功能
- **性能测试脚本**：性能基准测试
- **错误测试脚本**：错误场景测试

### 3. 测试环境
- **测试数据库**：独立的测试数据库
- **Mock服务**：外部API的Mock实现
- **测试配置**：测试专用的配置文件

## 📚 文档需求

### 1. 技术文档
- **API文档**：完整的API接口文档
- **架构文档**：系统架构设计文档
- **部署文档**：部署和运维文档

### 2. 用户文档
- **使用指南**：功能使用说明
- **配置指南**：环境配置说明
- **故障排除**：常见问题解决方案

### 3. 开发文档
- **开发指南**：开发环境搭建
- **代码规范**：编码规范和最佳实践
- **贡献指南**：项目贡献流程

## 🔄 扩展性需求

### 1. 多商店支持
- **Google Play支持**：Google Play Console API集成
- **华为应用市场支持**：华为开发者联盟API集成
- **其他应用商店**：可扩展的商店接口设计

### 2. 多推送渠道
- **Slack集成**：Slack Webhook支持
- **Discord集成**：Discord Bot支持
- **企业微信集成**：企业微信机器人支持
- **钉钉集成**：钉钉机器人支持

### 3. 功能扩展
- **评论分析**：评论情感分析和关键词提取
- **自动化回复**：基于规则的自动回复
- **评论统计**：评论数据统计和报表
- **用户管理**：多用户权限管理

## 📋 验收标准

### 1. 功能验收
- ✅ App Store评论抓取功能正常
- ✅ 数据库存储功能正常
- ✅ 飞书推送功能正常
- ✅ 评论回复功能正常
- ✅ 定时同步功能正常

### 2. 性能验收
- ✅ 响应时间满足要求
- ✅ 并发处理能力满足要求
- ✅ 错误处理机制完善
- ✅ 日志记录完整

### 3. 安全验收
- ✅ 认证机制正常工作
- ✅ 数据安全措施到位
- ✅ 网络安全配置正确

### 4. 部署验收
- ✅ 支持多种部署方式
- ✅ 环境配置正确
- ✅ 监控和日志正常

## 🎯 项目里程碑

### 第一阶段：基础功能实现
- [x] App Store API集成
- [x] 数据库设计和实现
- [x] 基础API接口开发
- [x] 飞书机器人集成

### 第二阶段：高级功能实现
- [x] 交互式卡片功能
- [x] 评论回复功能
- [x] 定时同步功能
- [x] 错误处理和重试

### 第三阶段：优化和扩展
- [x] 性能优化
- [x] 监控和日志完善
- [x] 文档完善
- [x] 测试覆盖

### 第四阶段：生产部署
- [x] 生产环境部署
- [x] 监控告警配置
- [x] 运维文档
- [x] 用户培训

---

**文档版本**：1.0.0  
**最后更新**：2025年8月28日  
**项目状态**：✅ 已完成  
**维护团队**：Protalk Team
