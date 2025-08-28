# ngrok 设置指南

## 🚀 快速设置 ngrok

### 1. 注册 ngrok 账号
访问：https://dashboard.ngrok.com/signup
- 使用邮箱注册免费账号
- 验证邮箱

### 2. 获取 authtoken
1. 登录 ngrok 控制台
2. 访问：https://dashboard.ngrok.com/get-started/your-authtoken
3. 复制你的 authtoken

### 3. 配置 ngrok
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 4. 启动隧道
```bash
ngrok http 3000
```

### 5. 获取公网地址
启动后，ngrok 会显示类似这样的信息：
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

你的公网地址就是：`https://abc123.ngrok.io`

## 🔧 飞书配置

### 配置 webhook URL
在飞书开发者后台配置：
```
https://abc123.ngrok.io/feishu/events
```

### 测试配置
```bash
# 测试飞书 URL 验证
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}' \
  https://abc123.ngrok.io/feishu/events
```

## 📝 注意事项

1. **免费版限制**：
   - 每次重启 ngrok 地址会变化
   - 建议升级到付费版获得固定地址

2. **安全考虑**：
   - ngrok 地址是公开的
   - 生产环境建议使用固定域名

3. **备用方案**：
   - 如果 ngrok 不可用，可以使用路由器端口转发
   - 公网IP：119.237.242.73

## 🎯 推荐步骤

1. 立即注册 ngrok 账号
2. 配置 authtoken
3. 启动隧道获取公网地址
4. 在飞书后台配置 webhook URL
5. 测试连接

这样你就可以获得一个可用的公网地址来配置飞书了！
