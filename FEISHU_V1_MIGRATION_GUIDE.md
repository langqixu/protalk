# 飞书v1 API迁移指南

## 📋 概述

本指南详细说明了如何从当前稳定的v4 API版本迁移到最新的飞书v1 API版本。新版本提供了更强大的功能、更好的安全性和更完整的API支持。

## 🎯 v1 API的优势

### ✅ **功能增强**
- **完整的消息类型支持**: 文本、富文本、图片、互动卡片
- **高级互动功能**: 回复消息、线程管理
- **批量操作**: 获取所有群组、分页查询
- **统一的错误处理**: 标准化的响应格式

### 🔐 **安全增强**
- **签名验证**: 支持请求签名校验
- **令牌管理**: 自动管理访问令牌生命周期
- **参数验证**: 严格的输入参数校验

### 📊 **开发体验**
- **类型安全**: 完整的TypeScript类型定义
- **错误提示**: 详细的错误信息和调试建议
- **文档完善**: 符合最新官方API文档

## 🗂️ 新增文件结构

```
src/
├── modules/feishu/
│   ├── FeishuBot.ts           # 原v4实现（保留）
│   ├── FeishuBotV1.ts        # 新v1实现 ⭐
│   └── FeishuBotV2.ts        # 混合实现（可选）
├── services/
│   ├── ReviewSyncService.ts   # 原服务（兼容）
│   └── FeishuServiceV1.ts    # 新v1服务 ⭐
├── api/
│   ├── feishu-routes-v2.ts   # 原API路由（保留）
│   └── feishu-routes-v1.ts   # 新v1路由 ⭐
├── utils/
│   └── feishu-signature.ts   # 签名工具 ⭐
└── index-v1.ts               # v1应用入口 ⭐
```

## 🔧 配置更新

### 环境变量新增

在你的`.env`文件中添加：

```bash
# 飞书API配置
FEISHU_API_VERSION=v1                        # 新增：API版本选择
FEISHU_ENABLE_SIGNATURE_VERIFICATION=false  # 新增：签名验证开关

# 现有配置保持不变
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_VERIFICATION_TOKEN=your_token
FEISHU_ENCRYPT_KEY=your_encrypt_key         # 签名验证需要
FEISHU_MODE=eventsource
```

### 配置类型更新

`src/types/index.ts`中的接口已更新：

```typescript
feishu: {
  mode?: 'webhook' | 'eventsource';
  apiVersion?: 'v1' | 'v4';              // 新增
  enableSignatureVerification?: boolean; // 新增
  appId?: string;
  appSecret?: string;
  verificationToken?: string;
  encryptKey?: string;
  // ... 其他配置
}
```

## 🚀 部署选项

### 选项1: 渐进式迁移（推荐）

保持当前v4版本运行，同时部署v1版本进行测试：

```bash
# 测试v1功能
npm run test:v1-api

# 启动v1版本（不同端口）
PORT=3001 FEISHU_API_VERSION=v1 npm run start:v1
```

### 选项2: 完全切换

直接切换到v1 API：

```bash
# 更新环境变量
echo "FEISHU_API_VERSION=v1" >> .env

# 重新编译
npm run build

# 重启服务
npm restart
```

### 选项3: 混合模式

使用FeishuBotV2进行混合部署，自动fallback：

```bash
# 使用混合版本
FEISHU_BOT_VERSION=v2 npm start
```

## 📝 代码迁移示例

### 基础服务替换

**原v4实现**:
```typescript
import { FeishuService } from './services/FeishuService';

const feishuService = new FeishuService({
  appId: config.appId,
  appSecret: config.appSecret,
  // ...
});
```

**新v1实现**:
```typescript
import { FeishuServiceV1 } from './services/FeishuServiceV1';

const feishuService = new FeishuServiceV1({
  appId: config.appId,
  appSecret: config.appSecret,
  enableSignatureVerification: true, // 新功能
  // ...
});
```

### API调用对比

**v4 API**:
```typescript
// 有限的消息类型支持
await feishuBot.sendMessage(chatId, content);
await feishuBot.sendCardMessage(chatId, cardData);
```

**v1 API**:
```typescript
// 完整的消息类型支持
await feishuBot.sendMessage(chatId, content, 'chat_id');
await feishuBot.sendRichTextMessage(chatId, postContent);
await feishuBot.sendCardMessage(chatId, cardData);
await feishuBot.sendImageMessage(chatId, imageKey);
await feishuBot.replyMessage(messageId, content, 'text');
```

## 🧪 测试验证

### 1. 功能测试

```bash
# 运行v1 API完整测试
node scripts/test-feishu-v1-api.js
```

预期输出：
```
✅ 认证功能正常
✅ 群组获取正常  
✅ 文本消息发送正常
✅ 互动卡片发送正常
✅ App Store评论卡片正常
```

### 2. 集成测试

```bash
# 测试生产环境兼容性
npm run test:integration:v1
```

### 3. 性能测试

```bash
# 对比v4和v1性能
npm run benchmark:api-versions
```

## ⚠️ 注意事项

### 兼容性

1. **向后兼容**: v1实现完全兼容现有IPusher接口
2. **数据格式**: 卡片和消息格式与v4保持一致
3. **错误处理**: 更详细的错误信息，但错误类型兼容

### 潜在问题

1. **富文本格式**: v1 API对富文本格式要求更严格
2. **签名验证**: 启用后需要正确配置ENCRYPT_KEY
3. **API限制**: v1 API可能有不同的频率限制

### 回滚方案

如果需要回滚到v4：

```bash
# 1. 更新环境变量
sed -i 's/FEISHU_API_VERSION=v1/FEISHU_API_VERSION=v4/' .env

# 2. 重启服务
npm restart

# 3. 验证功能
curl localhost:3000/feishu/test
```

## 📊 性能对比

| 功能 | v4 API | v1 API | 改进 |
|------|--------|--------|------|
| 文本消息 | ✅ | ✅ | 更严格的参数验证 |
| 互动卡片 | ✅ | ✅ | 更丰富的卡片元素 |
| 富文本消息 | ❌ | ✅ | 新增功能 |
| 图片消息 | ❌ | ✅ | 新增功能 |
| 消息回复 | ❌ | ✅ | 新增功能 |
| 签名验证 | ❌ | ✅ | 安全增强 |
| 错误处理 | 基础 | 详细 | 调试体验提升 |

## 🎯 迁移时间表

### 阶段1: 准备工作（1天）
- [ ] 更新环境变量
- [ ] 运行v1测试脚本
- [ ] 检查日志输出

### 阶段2: 测试部署（2-3天）
- [ ] 部署到测试环境
- [ ] 功能验证测试
- [ ] 性能压力测试

### 阶段3: 生产切换（1天）
- [ ] 生产环境部署
- [ ] 监控和验证
- [ ] 备用方案准备

### 阶段4: 清理优化（1天）
- [ ] 移除旧代码（可选）
- [ ] 优化配置
- [ ] 文档更新

## 🔗 相关资源

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [v1 API消息接口](https://open.feishu.cn/document/server-docs/im-v1/message/intro)
- [互动卡片开发指南](https://open.feishu.cn/document/develop-a-card-interactive-bot/introduction)
- [签名验证说明](https://open.feishu.cn/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN)

## 💡 最佳实践

1. **逐步迁移**: 建议先在测试环境验证所有功能
2. **监控日志**: 密切关注迁移后的错误日志
3. **备份配置**: 保留v4配置作为备用方案
4. **性能监控**: 监控API响应时间和成功率
5. **用户反馈**: 收集实际使用中的问题反馈

## 🆘 故障排除

### 常见问题

**Q: v1 API返回400错误？**
A: 检查receive_id_type参数是否正确设置

**Q: 富文本消息发送失败？**  
A: 验证content格式是否符合飞书文档规范

**Q: 签名验证失败？**
A: 确认ENCRYPT_KEY配置正确且与飞书后台一致

### 调试步骤

1. 检查环境变量配置
2. 运行测试脚本验证基础功能
3. 查看详细错误日志
4. 对照官方文档验证参数格式
5. 联系飞书技术支持（如需要）

---

🎉 **恭喜！** 完成迁移后，你将拥有一个基于最新飞书v1 API的强大、安全、功能完整的消息推送系统！
