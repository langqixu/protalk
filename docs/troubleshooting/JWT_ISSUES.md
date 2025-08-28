# JWT Token 生成问题修复指南

## 问题描述

在部署到 Vercel 后，App Store Connect API 的 JWT token 生成失败，错误信息为：
```
JWT token生成失败
secretOrPrivateKey must be an asymmetric key when using ES256
```

## 问题原因

这个问题通常由以下几个原因引起：

1. **私钥格式错误**: Vercel 环境变量中的私钥格式不正确
2. **转义字符问题**: 私钥中的换行符被转换为 `\\n`
3. **私钥头部错误**: 缺少连字符或格式不正确
4. **特殊字符问题**: 私钥中包含非标准字符

## 解决方案

### 1. 检查私钥格式

确保私钥格式正确：

```bash
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg+...
-----END PRIVATE KEY-----
```

**重要检查点**:
- 确保包含完整的头部和尾部
- 确保头部是 `-----BEGIN PRIVATE KEY-----`（注意最后的连字符）
- 确保尾部是 `-----END PRIVATE KEY-----`

### 2. 处理转义字符

在 Vercel 中，私钥的换行符会自动转换为 `\\n`。代码中已经添加了处理逻辑：

```typescript
private processPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n');
}
```

### 3. 修复特殊字符

如果私钥中包含特殊字符（如 `Ø`），需要替换为正确的字符：

- 将 `Ø` 替换为 `0`
- 检查其他非标准字符

### 4. 验证环境变量

在 Vercel 中检查环境变量：

1. 进入 Vercel 项目仪表板
2. 点击 "Settings" > "Environment Variables"
3. 检查以下变量：
   - `APP_STORE_ISSUER_ID`
   - `APP_STORE_KEY_ID`
   - `APP_STORE_PRIVATE_KEY`

### 5. 使用调试端点

项目提供了调试端点来检查环境变量：

```bash
# 检查环境变量状态
curl https://your-domain.vercel.app/api/debug-jwt

# 测试JWT生成
curl https://your-domain.vercel.app/api/test-jwt
```

## 修复步骤

### 步骤 1: 检查当前状态

```bash
curl https://your-domain.vercel.app/api/debug-jwt
```

### 步骤 2: 修复私钥格式

1. 下载原始的 `.p8` 文件
2. 查看文件内容：
   ```bash
   cat AuthKey_XXXXXXXXXX.p8
   ```
3. 确保格式正确
4. 在 Vercel 中更新 `APP_STORE_PRIVATE_KEY` 环境变量

### 步骤 3: 重新部署

```bash
vercel --prod
```

### 步骤 4: 验证修复

```bash
# 测试JWT生成
curl https://your-domain.vercel.app/api/test-jwt

# 测试评论同步
curl -H "X-API-Key: your_api_key" \
  "https://your-domain.vercel.app/api/sync-reviews?appId=your-app-id"
```

## 常见错误和解决方案

### 错误 1: "secretOrPrivateKey must be an asymmetric key"

**原因**: 私钥格式不正确或算法不匹配
**解决方案**: 
1. 确保使用 ES256 算法
2. 检查私钥是否为 EC 密钥
3. 验证私钥格式

### 错误 2: "Invalid private key"

**原因**: 私钥内容损坏或格式错误
**解决方案**:
1. 重新下载 `.p8` 文件
2. 检查私钥是否完整
3. 确保没有多余的空格或字符

### 错误 3: "JWT token generation failed"

**原因**: 环境变量配置错误
**解决方案**:
1. 检查所有必需的环境变量
2. 验证 Issuer ID 和 Key ID
3. 确保私钥格式正确

## 预防措施

### 1. 环境变量管理

- 使用 Vercel 的环境变量管理功能
- 定期备份环境变量配置
- 使用不同的密钥用于开发和生产环境

### 2. 私钥安全

- 不要在代码中硬编码私钥
- 定期轮换 API 密钥
- 监控 API 使用情况

### 3. 监控和日志

- 启用详细的错误日志
- 监控 JWT 生成失败的情况
- 设置告警机制

## 测试脚本

### 本地测试

创建测试脚本 `test-jwt.js`:

```javascript
const jwt = require('jsonwebtoken');

const issuerId = process.env.APP_STORE_ISSUER_ID;
const keyId = process.env.APP_STORE_KEY_ID;
const privateKey = process.env.APP_STORE_PRIVATE_KEY;

// 处理转义字符
const processedPrivateKey = privateKey.replace(/\\n/g, '\n');

try {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + (20 * 60),
    aud: 'appstoreconnect-v1'
  };

  const token = jwt.sign(payload, processedPrivateKey, {
    algorithm: 'ES256',
    keyid: keyId
  });

  console.log('JWT生成成功:', token.substring(0, 50) + '...');
} catch (error) {
  console.error('JWT生成失败:', error.message);
}
```

运行测试：
```bash
node test-jwt.js
```

## 联系支持

如果问题仍然存在，请：

1. 检查 [项目文档](../../README.md)
2. 查看 [部署总结](../../DEPLOYMENT_SUMMARY.md)
3. 提交 GitHub Issue
4. 联系项目维护者

---

**最后更新**: 2025-08-27  
**版本**: 1.0.0  
**状态**: 已验证修复
