# Protalk App Review Service

一个完整的App Store评论抓取、存储、飞书推送及回复服务。

## 🚀 功能特性

### ✅ 已实现功能
- **App Store评论抓取**: 通过App Store Connect API自动抓取应用评论
- **数据库存储**: 使用Supabase PostgreSQL存储评论数据
- **飞书集成**: 支持飞书机器人推送新评论通知
- **评论回复**: 支持通过API回复App Store评论
- **定时同步**: 自动定时同步最新评论
- **健康检查**: 完整的服务健康状态监控
- **API认证**: 基于API Key的安全认证

### 🔧 技术栈
- **后端**: Node.js + TypeScript + Express.js
- **数据库**: Supabase (PostgreSQL)
- **消息推送**: 飞书机器人API
- **部署**: Vercel
- **认证**: App Store Connect API (JWT)

## 📋 环境要求

- Node.js >= 18.0.0
- TypeScript
- Supabase账户
- 飞书开发者账户
- App Store Connect API密钥

## 🛠️ 安装和配置

### 1. 克隆项目
```bash
git clone <repository-url>
cd Protalk
npm install
```

### 2. 环境变量配置
复制 `env.example` 到 `.env.local` 并配置以下变量：

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

### 3. 数据库初始化
```bash
# 运行数据库初始化脚本
npm run setup:db
```

### 4. 本地开发
```bash
npm run dev
```

## 🚀 部署

### Vercel部署
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署到Vercel
vercel --prod
```

### 环境变量配置
在Vercel中配置以下环境变量：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_STORE_ISSUER_ID`
- `APP_STORE_KEY_ID`
- `APP_STORE_PRIVATE_KEY`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_VERIFICATION_TOKEN`
- `FEISHU_WEBHOOK_URL`
- `API_KEY`

## 📡 API接口

### 健康检查
```bash
GET /api/health
```

### 服务状态
```bash
GET /api/status
```

### 同步评论
```bash
GET /api/sync-reviews?appId=YOUR_APP_ID
Headers: X-API-Key: your_api_key
```

### 获取同步状态
```bash
GET /api/sync-status/:appId
Headers: X-API-Key: your_api_key
```

### 回复评论
```bash
POST /api/reply-review
Headers: X-API-Key: your_api_key
Body: {
  "review_id": "review_id",
  "response_body": "回复内容"
}
```

### 飞书事件处理
```bash
POST /feishu/events
```

## 🔧 开发脚本

### 测试脚本
```bash
# 完整集成测试
node scripts/test-full-integration.js

# 数据库测试
node scripts/test-database.js

# 最终测试
node scripts/test-final.js
```

### 设置脚本
```bash
# 数据库设置
./scripts/setup-database.sh

# 完整设置
./scripts/setup.sh
```

## 📚 文档

- **[完整文档](docs/README.md)** - 项目完整文档体系
- [项目总结](PROJECT_SUMMARY.md)
- [部署总结](DEPLOYMENT_SUMMARY.md)
- [里程碑版本](MILESTONE_v1.0.0.md)

## 🏗️ 项目结构

```
src/
├── api/                 # API路由
│   ├── routes.ts       # 主要API路由
│   └── feishu-routes.ts # 飞书相关路由
├── config/             # 配置管理
├── modules/            # 核心模块
│   ├── fetcher/        # 数据抓取
│   ├── processor/      # 数据处理
│   ├── storage/        # 数据存储
│   └── pusher/         # 消息推送
├── services/           # 服务层
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
└── index.ts            # 应用入口
```

## 🔍 监控和日志

- 健康检查端点: `/api/health`
- 服务状态端点: `/api/status`
- 详细日志记录
- 错误监控和报告

## 🤝 贡献

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 🆘 支持

如有问题，请查看：
- [JWT问题修复指南](scripts/fix-jwt-issue.md)
- [部署总结](DEPLOYMENT_SUMMARY.md)
- [项目总结](PROJECT_SUMMARY.md)
