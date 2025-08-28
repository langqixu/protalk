# API 文档

## 概述

Protalk App Review Service 提供完整的 RESTful API 接口，用于管理 App Store 评论同步、回复和状态查询。

**生产环境URL**: `https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app`

**认证**: 通过 `X-API-Key` 头部进行认证

## 接口列表

### 1. 健康检查

检查服务运行状态。

```http
GET /api/health
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-27T18:43:57.541Z",
    "service": "app-review-service"
  }
}
```

### 2. 服务状态

获取详细的服务状态信息。

```http
GET /api/status
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "service": "App Review Service",
    "version": "1.0.0",
    "timestamp": "2025-08-27T18:38:51.105Z",
    "uptime": 250.276424801,
    "memory": {
      "rss": 492244992,
      "heapTotal": 217960448,
      "heapUsed": 104088856,
      "external": 13908928,
      "arrayBuffers": 10454202
    },
    "environment": "production"
  }
}
```

### 3. 同步评论

#### 3.1 同步单个应用评论

```http
GET /api/sync-reviews?appId=1077776989
X-API-Key: your_api_key
```

**参数**:
- `appId` (必需): 应用ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 14922,
    "new": 1,
    "updated": 999,
    "errors": []
  }
}
```

#### 3.2 批量同步多个应用评论

```http
POST /api/sync-reviews
Content-Type: application/json
X-API-Key: your_api_key

{
  "appIds": ["1077776989", "1234567890"]
}
```

**请求体**:
```json
{
  "appIds": ["应用ID1", "应用ID2"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalApps": 2,
    "successApps": 2,
    "failedApps": [],
    "totalReviews": 300,
    "totalNew": 10,
    "totalUpdated": 4
  }
}
```

### 4. 获取同步状态

获取指定应用的同步状态信息。

```http
GET /api/sync-status/1077776989
X-API-Key: your_api_key
```

**参数**:
- `appId` (路径参数): 应用ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "lastSyncTime": "2025-08-27T18:38:38.324Z",
    "totalReviews": 1000,
    "hasRecentActivity": true
  }
}
```

### 5. 回复评论

回复指定的评论。

```http
POST /api/reply-review
Content-Type: application/json
X-API-Key: your_api_key

{
  "review_id": "review_id_here",
  "response_body": "感谢您的反馈，我们会继续改进！"
}
```

**请求体**:
```json
{
  "review_id": "评论ID",
  "response_body": "回复内容（1-1000字符）"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "review_id": "review_id_here",
    "response_date": "2025-08-27T18:38:38.324Z",
    "message": "回复成功"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "该评论已有回复"
}
```

### 6. 飞书事件处理

处理飞书 Webhook 事件。

```http
POST /feishu/events
Content-Type: application/json

{
  "type": "url_verification",
  "challenge": "challenge_string"
}
```

**响应示例**:
```json
{
  "challenge": "challenge_string"
}
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 认证失败
- `404 Not Found`: 接口不存在
- `409 Conflict`: 资源冲突（如评论已有回复）
- `500 Internal Server Error`: 服务器内部错误

### 错误示例

**参数缺失**:
```json
{
  "success": false,
  "error": "缺少appId参数"
}
```

**认证失败**:
```json
{
  "success": false,
  "error": "API密钥无效"
}
```

**业务逻辑错误**:
```json
{
  "success": false,
  "error": "回复内容不能超过1000字符"
}
```

## 认证

### API Key 认证

在请求头中添加 API Key：

```http
X-API-Key: your_api_key_here
```

## 性能指标

### 响应时间
- 健康检查: < 100ms
- 服务状态: < 100ms
- 评论同步: ~2-5秒 (取决于评论数量)
- 同步状态: < 500ms

### 数据统计
- 总评论数: 14,922条
- 数据库记录: 1,000+条
- 同步成功率: 100%

## 示例代码

### cURL 示例

**健康检查**:
```bash
curl -X GET "https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/health"
```

**同步评论**:
```bash
curl -X GET "https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/sync-reviews?appId=1077776989" \
  -H "X-API-Key: your_api_key"
```

**回复评论**:
```bash
curl -X POST "https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/reply-review" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "review_id": "review_id_here",
    "response_body": "感谢您的反馈！"
  }'
```

### JavaScript 示例

```javascript
const BASE_URL = 'https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app';
const API_KEY = 'your_api_key';

// 健康检查
const checkHealth = async () => {
  const response = await fetch(`${BASE_URL}/api/health`);
  return response.json();
};

// 同步评论
const syncReviews = async (appId) => {
  const response = await fetch(`${BASE_URL}/api/sync-reviews?appId=${appId}`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  return response.json();
};

// 回复评论
const replyToReview = async (reviewId, responseBody) => {
  const response = await fetch(`${BASE_URL}/api/reply-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      review_id: reviewId,
      response_body: responseBody
    })
  });
  return response.json();
};
```

### Python 示例

```python
import requests

BASE_URL = 'https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app'
API_KEY = 'your_api_key'

# 健康检查
def check_health():
    response = requests.get(f"{BASE_URL}/api/health")
    return response.json()

# 同步评论
def sync_reviews(app_id):
    url = f"{BASE_URL}/api/sync-reviews?appId={app_id}"
    headers = {"X-API-Key": API_KEY}
    response = requests.get(url, headers=headers)
    return response.json()

# 回复评论
def reply_to_review(review_id, response_body):
    url = f"{BASE_URL}/api/reply-review"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    data = {
        "review_id": review_id,
        "response_body": response_body
    }
    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

## 注意事项

1. 所有时间戳使用 ISO 8601 格式
2. 评论ID 是 App Store 提供的唯一标识符
3. 回复内容长度限制为 1-1000 字符
4. 每个评论只能回复一次
5. 生产环境已启用 API 认证
6. 服务运行在 Vercel 生产环境中
7. 数据库使用 Supabase PostgreSQL

## 环境信息

- **生产环境**: Vercel
- **数据库**: Supabase PostgreSQL
- **消息推送**: 飞书机器人
- **版本**: 1.0.0
- **状态**: 正常运行
