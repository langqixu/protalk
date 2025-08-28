# 飞书配置指南

## 🎯 当前状态

✅ **公网地址已就绪**
- 地址：`https://2f7cfc2a4732.ngrok-free.app`
- 状态：正常运行
- 测试：通过

✅ **本地服务正常运行**
- 地址：`http://localhost:3000`
- 健康检查：通过
- 配置地址管理：可用

✅ **事件订阅已完成**
- `im.message.receive_v1` - 接收消息 ✅
- `im.message.reaction.created_v1` - 消息回应 ✅
- `contact.user.created_v3` - 用户创建 ✅
- `contact.user.updated_v3` - 用户更新 ✅

✅ **功能测试通过**
- URL 验证功能正常
- 消息接收功能正常
- 斜杠指令处理正常
- 消息回应处理正常
- 用户事件处理正常
- 快速响应功能正常
- 配置地址管理正常

## 🔧 飞书开发者后台配置

### 1. 登录飞书开发者后台
访问：https://open.feishu.cn/app

### 2. 选择或创建应用
- 如果是现有应用，直接选择
- 如果是新应用，点击"创建应用"

### 3. 配置事件订阅

#### 3.1 启用事件订阅
- 进入应用管理页面
- 点击"事件订阅"
- 开启"启用事件订阅"

#### 3.2 配置请求地址
```
https://2f7cfc2a4732.ngrok-free.app/feishu/events
```

#### 3.3 配置验证令牌（可选）
- 验证令牌：`your_verification_token`
- 加密密钥：`your_encrypt_key`

#### 3.4 订阅事件 ✅ 已完成
- `im.message.receive_v1` - 接收消息
- `im.message.reaction.created_v1` - 消息回应
- `contact.user.created_v3` - 用户创建
- `contact.user.updated_v3` - 用户更新

### 4. 配置机器人功能

#### 4.1 启用机器人
- 进入"机器人"功能页面
- 开启"启用机器人"

#### 4.2 配置权限
- 获取群组中用户信息
- 获取与发送单聊、群组消息
- 获取用户发给机器人的单聊消息
- 获取群组中@机器人的消息

### 5. 发布应用
- 完成配置后，点击"版本管理与发布"
- 创建版本并提交审核
- 审核通过后发布应用

## 🧪 测试配置

### 1. 测试 URL 验证 ✅ 已通过
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}' \
  https://2f7cfc2a4732.ngrok-free.app/feishu/events
```

预期响应：
```json
{
  "challenge": "test123"
}
```

### 2. 测试健康检查 ✅ 已通过
```bash
curl https://2f7cfc2a4732.ngrok-free.app/api/health
```

### 3. 测试配置地址管理 ✅ 已通过
```bash
# 查看配置地址列表
curl https://2f7cfc2a4732.ngrok-free.app/feishu/config-addresses

# 添加新的配置地址
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"测试配置","url":"https://httpbin.org/get"}' \
  https://2f7cfc2a4732.ngrok-free.app/feishu/config-addresses
```

### 4. 运行完整测试 ✅ 已通过
```bash
node scripts/test-feishu-events.js
```

## 🚀 下一步操作

### 阶段1：应用发布和部署
1. **完成应用发布**
   - 在飞书开发者后台提交应用审核
   - 等待审核通过并发布应用

2. **将机器人添加到群组**
   - 在飞书中搜索你的机器人
   - 将机器人添加到目标群组
   - 确保机器人有发送消息权限

### 阶段2：真实环境测试
3. **测试真实消息交互**
   - 在群组中发送消息测试
   - 测试斜杠指令：`/help`、`/status`、`/reply`
   - 验证消息回应功能

4. **配置评论推送功能**
   - 设置评论推送目标群组
   - 测试评论同步和推送
   - 验证回复功能

### 阶段3：生产环境优化
5. **性能优化**
   - 监控消息处理性能
   - 优化响应时间
   - 配置错误处理和重试机制

6. **安全加固**
   - 配置验证令牌
   - 启用消息加密
   - 设置访问权限控制

## 📋 配置清单

- [x] 飞书开发者账号
- [x] 应用创建/选择
- [x] 事件订阅启用
- [x] 请求地址配置
- [x] 事件类型订阅
- [x] 机器人功能启用
- [x] 权限配置
- [ ] 应用发布
- [x] URL 验证测试
- [ ] 消息接收测试（真实环境）
- [ ] 评论推送配置
- [ ] 生产环境部署

## 🔍 故障排除

### 常见问题

1. **URL 验证失败**
   - 检查公网地址是否正确
   - 确认本地服务是否运行
   - 检查防火墙设置

2. **事件接收失败**
   - 检查事件订阅配置
   - 确认权限设置
   - 查看服务器日志

3. **ngrok 地址变化**
   - 免费版 ngrok 地址会定期变化
   - 需要重新配置飞书 webhook URL
   - 考虑升级到付费版获得固定地址

### 日志查看
```bash
# 查看本地服务日志
tail -f logs/combined.log

# 查看 ngrok 状态
curl http://localhost:4040/api/tunnels

# 运行完整测试
node scripts/test-feishu-events.js
```

## 🎯 当前进度

**已完成** ✅
- 本地服务部署
- 公网地址配置
- 事件订阅配置
- 功能测试验证

**进行中** 🔄
- 应用发布流程

**待完成** ⏳
- 真实环境测试
- 评论推送配置
- 生产环境部署

## 📞 技术支持

如有问题，请检查：
- 本地服务状态：`http://localhost:3000/api/health`
- ngrok 状态：`http://localhost:4040`
- 飞书开发者后台配置
- 服务器日志文件

---

**当前公网地址**: `https://2f7cfc2a4732.ngrok-free.app`
**飞书 Webhook URL**: `https://2f7cfc2a4732.ngrok-free.app/feishu/events`
**测试状态**: ✅ 所有功能测试通过
