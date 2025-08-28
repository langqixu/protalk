# 完整设置指南

## 概述

本指南将帮助您完整设置 Protalk App Review Service，包括数据库、App Store API、飞书集成和部署配置。

## 📋 前置要求

- Node.js >= 18.0.0
- Git
- Supabase 账户
- 飞书开发者账户
- App Store Connect API 密钥

## 🗄️ 1. 数据库设置 (Supabase)

### 1.1 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 "New Project" 创建新项目
3. 选择组织并输入项目名称：`protalk-app-review-service`
4. 设置数据库密码（请记住这个密码）
5. 选择地区（建议选择离您最近的地区）
6. 点击 "Create new project" 创建项目

### 1.2 获取连接信息

项目创建完成后，获取以下信息：
- **项目 URL**: 在项目仪表板中找到 "Project URL"
- **匿名密钥**: 在项目仪表板中找到 "anon public" 密钥

### 1.3 执行数据库初始化脚本

在 Supabase SQL Editor 中执行 `database/init.sql` 脚本：

```sql
-- 创建评论表
CREATE TABLE IF NOT EXISTS app_reviews (
    review_id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT NOT NULL,
    nickname TEXT NOT NULL,
    review_date TIMESTAMPTZ NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    response_body TEXT,
    response_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建同步日志表
CREATE TABLE IF NOT EXISTS sync_log (
    app_id TEXT PRIMARY KEY,
    last_sync_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_review_date ON app_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_created_at ON app_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_date ON app_reviews(app_id, review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_rating ON app_reviews(app_id, rating);

-- 创建视图
CREATE OR REPLACE VIEW app_review_stats AS
SELECT 
    app_id,
    COUNT(*) as total_reviews,
    AVG(rating) as avg_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
FROM app_reviews 
GROUP BY app_id;

CREATE OR REPLACE VIEW recent_reviews AS
SELECT * FROM app_reviews 
ORDER BY review_date DESC 
LIMIT 100;

-- 启用RLS并设置策略
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_reviews" ON app_reviews
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on sync_log" ON sync_log
    FOR ALL USING (true);
```

### 1.4 验证数据库设置

执行完脚本后，应该能看到以下表和视图：
- `app_reviews` - 评论数据表
- `sync_log` - 同步日志表
- `app_review_stats` - 评论统计视图
- `recent_reviews` - 最近评论视图

## 🍎 2. App Store Connect API 设置

### 2.1 创建 API 密钥

1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 进入 "Users and Access" > "Keys"
3. 点击 "Generate API Key" 或 "+" 按钮
4. 输入密钥名称：`Protalk Review Service`
5. 选择权限：`App Manager`
6. 点击 "Generate" 生成密钥

### 2.2 下载私钥文件

1. 生成密钥后，点击 "Download API Key" 下载 `.p8` 文件
2. 记录以下信息：
   - **Issuer ID**: 在 "Keys" 页面顶部
   - **Key ID**: 刚创建的密钥ID
   - **私钥文件**: 下载的 `.p8` 文件

### 2.3 处理私钥格式

将 `.p8` 文件内容转换为正确的格式：

```bash
# 查看私钥内容
cat AuthKey_XXXXXXXXXX.p8

# 私钥应该包含以下格式：
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg+...
-----END PRIVATE KEY-----
```

**重要**: 确保私钥格式正确，包含完整的头部和尾部。

## 📱 3. 飞书机器人设置

### 3.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 点击 "创建应用"
3. 选择 "企业自建应用"
4. 填写应用信息：
   - 应用名称：`Protalk Review Bot`
   - 应用描述：`App Store评论管理机器人`
5. 点击 "确定" 创建应用

### 3.2 配置应用权限

在应用管理页面中：

1. **权限管理** > **权限配置**：
   - 添加 `im:message` 权限（发送消息）
   - 添加 `im:message:send_as_bot` 权限（以机器人身份发送消息）

2. **版本管理与发布**：
   - 创建版本
   - 申请发布

### 3.3 获取应用凭证

在应用管理页面中获取：
- **App ID**: 应用ID
- **App Secret**: 应用密钥

### 3.4 配置事件订阅

1. **事件订阅** > **请求网址**：
   - 输入：`https://your-domain.vercel.app/feishu/events`
   - 验证令牌：自定义一个令牌（如：`protalk_verification_token`）

2. **事件订阅** > **订阅事件**：
   - 添加 `im.message.receive_v1` 事件

### 3.5 获取 Webhook URL

在群组中添加机器人：
1. 在目标群组中点击 "设置" > "群组设置"
2. 选择 "群组机器人" > "添加机器人"
3. 搜索并添加您的应用
4. 获取 Webhook URL

## 🔧 4. 环境变量配置

### 4.1 本地开发环境

创建 `.env.local` 文件：

```env
# Supabase配置
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# App Store Connect API配置
APP_STORE_ISSUER_ID=your-issuer-id
APP_STORE_KEY_ID=your-key-id
APP_STORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg+...
-----END PRIVATE KEY-----"

# 飞书配置
FEISHU_APP_ID=your-feishu-app-id
FEISHU_APP_SECRET=your-feishu-app-secret
FEISHU_VERIFICATION_TOKEN=your-verification-token
FEISHU_WEBHOOK_URL=your-webhook-url

# API认证
API_KEY=your-api-key

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 4.2 Vercel 生产环境

在 Vercel 项目设置中配置环境变量：

1. 进入 Vercel 项目仪表板
2. 点击 "Settings" > "Environment Variables"
3. 添加所有必需的环境变量
4. 确保 `APP_STORE_PRIVATE_KEY` 包含完整的私钥内容

**重要**: 在 Vercel 中，私钥的换行符会自动转换为 `\n`，代码会自动处理这种格式。

## 🚀 5. 部署配置

### 5.1 本地测试

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 测试健康检查
curl http://localhost:3000/api/health
```

### 5.2 Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署到 Vercel
vercel --prod
```

### 5.3 验证部署

```bash
# 健康检查
curl https://your-domain.vercel.app/api/health

# 测试评论同步（需要API密钥）
curl -H "X-API-Key: your_api_key" \
  "https://your-domain.vercel.app/api/sync-reviews?appId=your-app-id"
```

## 🧪 6. 功能测试

### 6.1 运行完整测试

```bash
# 完整集成测试
node scripts/test-full-integration.js

# 数据库测试
node scripts/test-database.js

# 最终测试
node scripts/test-final.js
```

### 6.2 手动测试

1. **健康检查**:
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```

2. **评论同步**:
   ```bash
   curl -H "X-API-Key: your_api_key" \
     "https://your-domain.vercel.app/api/sync-reviews?appId=your-app-id"
   ```

3. **飞书消息**:
   - 在群组中发送消息
   - 检查机器人是否正常回复

## 🔍 7. 故障排除

### 7.1 常见问题

**JWT Token 生成失败**:
- 检查私钥格式是否正确
- 确保 Issuer ID 和 Key ID 正确
- 参考 [JWT问题修复指南](../troubleshooting/JWT_ISSUES.md)

**数据库连接失败**:
- 检查 Supabase URL 和密钥
- 确保已执行数据库初始化脚本
- 验证 RLS 策略设置

**飞书消息发送失败**:
- 检查应用权限配置
- 验证 Webhook URL 设置
- 确保应用已发布

### 7.2 日志查看

```bash
# 查看 Vercel 日志
vercel logs

# 查看本地日志
tail -f logs/combined.log
```

## 📞 8. 支持

### 文档资源
- [API文档](../api/API.md)
- [部署指南](../deployment/DEPLOYMENT.md)
- [故障排除](../troubleshooting/README.md)

### 联系方式
- 项目文档: README.md
- 问题反馈: GitHub Issues
- 技术支持: 项目维护者

---

**设置完成时间**: 2025-08-27  
**版本**: 1.0.0  
**状态**: 生产就绪
