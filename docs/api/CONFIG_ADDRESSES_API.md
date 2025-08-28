# 配置地址管理 API

## 概述

配置地址管理功能允许用户管理系统中使用的各种配置地址，包括添加、查询、更新、删除和测试连接等功能。

## 基础信息

- **基础路径**: `/feishu/config-addresses`
- **内容类型**: `application/json`
- **认证**: 无需认证（开发环境）

## 数据模型

### ConfigAddress

```typescript
interface ConfigAddress {
  id: string;           // 唯一标识符
  name: string;         // 配置名称
  url: string;          // 配置URL
  description?: string; // 配置描述（可选）
  isActive: boolean;    // 是否激活
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
}
```

## API 端点

### 1. 获取配置地址列表

**GET** `/feishu/config-addresses`

获取所有配置地址的列表。

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "id": "config_1756347384050_8wczgugsu",
      "name": "测试配置",
      "url": "https://httpbin.org/get",
      "description": "用于测试的配置地址",
      "isActive": true,
      "createdAt": "2025-08-28T02:16:24.050Z",
      "updatedAt": "2025-08-28T02:16:24.050Z"
    }
  ],
  "total": 1
}
```

### 2. 获取单个配置地址

**GET** `/feishu/config-addresses/:id`

根据ID获取特定配置地址的详细信息。

#### 参数

- `id` (string, 路径参数): 配置地址的唯一标识符

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "config_1756347384050_8wczgugsu",
    "name": "测试配置",
    "url": "https://httpbin.org/get",
    "description": "用于测试的配置地址",
    "isActive": true,
    "createdAt": "2025-08-28T02:16:24.050Z",
    "updatedAt": "2025-08-28T02:16:24.050Z"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "配置地址不存在"
}
```

### 3. 添加配置地址

**POST** `/feishu/config-addresses`

创建新的配置地址。

#### 请求体

```json
{
  "name": "测试配置",
  "url": "https://httpbin.org/get",
  "description": "用于测试的配置地址"
}
```

#### 字段说明

- `name` (string, 必填): 配置名称
- `url` (string, 必填): 配置URL，必须是有效的URL格式
- `description` (string, 可选): 配置描述

#### 响应

```json
{
  "success": true,
  "message": "配置地址添加成功",
  "data": {
    "id": "config_1756347384050_8wczgugsu",
    "name": "测试配置",
    "url": "https://httpbin.org/get",
    "description": "用于测试的配置地址",
    "isActive": true,
    "createdAt": "2025-08-28T02:16:24.050Z",
    "updatedAt": "2025-08-28T02:16:24.050Z"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "名称和URL为必填字段"
}
```

```json
{
  "success": false,
  "error": "URL格式无效"
}
```

```json
{
  "success": false,
  "error": "该URL已存在"
}
```

### 4. 更新配置地址

**PUT** `/feishu/config-addresses/:id`

更新现有配置地址的信息。

#### 参数

- `id` (string, 路径参数): 配置地址的唯一标识符

#### 请求体

```json
{
  "name": "更新后的配置名称",
  "url": "https://new-url.com",
  "description": "更新后的描述",
  "isActive": false
}
```

#### 字段说明

所有字段都是可选的，只更新提供的字段：
- `name` (string, 可选): 配置名称
- `url` (string, 可选): 配置URL，必须是有效的URL格式
- `description` (string, 可选): 配置描述
- `isActive` (boolean, 可选): 是否激活

#### 响应

```json
{
  "success": true,
  "message": "配置地址更新成功",
  "data": {
    "id": "config_1756347384050_8wczgugsu",
    "name": "更新后的配置名称",
    "url": "https://new-url.com",
    "description": "更新后的描述",
    "isActive": false,
    "createdAt": "2025-08-28T02:16:24.050Z",
    "updatedAt": "2025-08-28T02:16:33.390Z"
  }
}
```

### 5. 删除配置地址

**DELETE** `/feishu/config-addresses/:id`

删除指定的配置地址。

#### 参数

- `id` (string, 路径参数): 配置地址的唯一标识符

#### 响应

```json
{
  "success": true,
  "message": "配置地址删除成功",
  "data": {
    "id": "config_1756347384050_8wczgugsu",
    "name": "测试配置",
    "url": "https://httpbin.org/get",
    "description": "用于测试的配置地址",
    "isActive": true,
    "createdAt": "2025-08-28T02:16:24.050Z",
    "updatedAt": "2025-08-28T02:16:24.050Z"
  }
}
```

### 6. 测试配置地址连接

**POST** `/feishu/config-addresses/:id/test`

测试配置地址的连接状态。

#### 参数

- `id` (string, 路径参数): 配置地址的唯一标识符

#### 响应

```json
{
  "success": true,
  "message": "连接测试已启动",
  "data": {
    "id": "config_1756347384050_8wczgugsu",
    "name": "测试配置",
    "url": "https://httpbin.org/get",
    "testTime": "2025-08-28T02:16:29.804Z",
    "status": "pending"
  }
}
```

#### 测试状态说明

- `pending`: 测试已启动，正在执行
- `success`: 连接测试成功
- `failed`: 连接测试失败

## 错误处理

所有API端点都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

- `400`: 请求参数错误（如URL格式无效、必填字段缺失等）
- `404`: 资源不存在（如配置地址ID不存在）
- `500`: 服务器内部错误

## 使用示例

### cURL 示例

```bash
# 获取配置地址列表
curl -s http://localhost:3000/feishu/config-addresses

# 添加配置地址
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"测试配置","url":"https://httpbin.org/get","description":"测试描述"}' \
  http://localhost:3000/feishu/config-addresses

# 更新配置地址
curl -X PUT -H "Content-Type: application/json" \
  -d '{"name":"更新后的名称"}' \
  http://localhost:3000/feishu/config-addresses/config_123

# 删除配置地址
curl -X DELETE http://localhost:3000/feishu/config-addresses/config_123

# 测试连接
curl -X POST http://localhost:3000/feishu/config-addresses/config_123/test
```

### JavaScript 示例

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/feishu/config-addresses';

// 获取列表
const list = await axios.get(BASE_URL);

// 添加配置
const newConfig = await axios.post(BASE_URL, {
  name: '测试配置',
  url: 'https://httpbin.org/get',
  description: '测试描述'
});

// 更新配置
await axios.put(`${BASE_URL}/${newConfig.data.data.id}`, {
  name: '更新后的名称'
});

// 测试连接
await axios.post(`${BASE_URL}/${newConfig.data.data.id}/test`);

// 删除配置
await axios.delete(`${BASE_URL}/${newConfig.data.data.id}`);
```

## 注意事项

1. **数据持久化**: 当前实现使用内存存储，服务重启后数据会丢失。生产环境建议使用数据库存储。

2. **URL验证**: 系统会验证URL格式的有效性，确保提供的是有效的URL。

3. **重复检查**: 系统会检查URL是否已存在，避免重复配置。

4. **连接测试**: 连接测试是异步执行的，测试结果会在日志中记录。

5. **错误处理**: 所有操作都有完善的错误处理机制，确保API的稳定性。
