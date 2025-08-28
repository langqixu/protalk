# 故障排除指南

## 概述

本指南提供 Protalk App Review Service 常见问题的解决方案和故障排除方法。

## 🔍 快速诊断

### 1. 健康检查

首先检查服务是否正常运行：

```bash
curl https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/health
```

### 2. 服务状态

检查详细的服务状态：

```bash
curl https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/status
```

### 3. 环境变量检查

使用调试端点检查环境变量：

```bash
curl https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/debug-jwt
```

## 🚨 常见问题

### 1. JWT Token 生成失败

**症状**: `JWT token生成失败` 错误
**解决方案**: 参考 [JWT问题修复指南](JWT_ISSUES.md)

### 2. 数据库连接失败

**症状**: 数据库查询失败
**解决方案**:
1. 检查 Supabase URL 和密钥
2. 验证数据库表结构
3. 检查 RLS 策略设置

### 3. 飞书消息发送失败

**症状**: 飞书机器人无响应
**解决方案**:
1. 检查应用权限配置
2. 验证 Webhook URL 设置
3. 确保应用已发布

### 4. API 认证失败

**症状**: `API密钥无效` 错误
**解决方案**:
1. 检查 API_KEY 环境变量
2. 验证请求头格式
3. 确认密钥值正确

## 🔧 调试工具

### 1. 日志查看

```bash
# Vercel 日志
vercel logs

# 本地日志
tail -f logs/combined.log
```

### 2. 测试脚本

```bash
# 完整集成测试
node scripts/test-full-integration.js

# 数据库测试
node scripts/test-database.js

# 最终测试
node scripts/test-final.js
```

### 3. 调试端点

- `/api/debug-jwt` - JWT 配置调试
- `/api/test-jwt` - JWT 生成测试
- `/api/health` - 健康检查
- `/api/status` - 服务状态

## 📊 性能问题

### 1. 响应时间慢

**可能原因**:
- 数据库查询慢
- 网络延迟
- 资源不足

**解决方案**:
1. 优化数据库查询
2. 添加缓存机制
3. 检查网络连接

### 2. 内存使用高

**可能原因**:
- 内存泄漏
- 大量并发请求
- 缓存未清理

**解决方案**:
1. 检查内存泄漏
2. 优化并发处理
3. 定期清理缓存

### 3. 数据库性能

**可能原因**:
- 缺少索引
- 查询效率低
- 数据量过大

**解决方案**:
1. 添加必要索引
2. 优化查询语句
3. 数据分页处理

## 🔄 恢复策略

### 1. 服务重启

```bash
# 重新部署
vercel --prod

# 验证部署
curl https://your-domain.vercel.app/api/health
```

### 2. 环境变量重置

1. 进入 Vercel 项目设置
2. 重新配置环境变量
3. 重新部署

### 3. 数据库恢复

1. 检查 Supabase 状态
2. 重新执行初始化脚本
3. 验证数据完整性

## 📞 获取帮助

### 1. 文档资源

- [项目文档](../../README.md)
- [API文档](../api/API.md)
- [设置指南](../guides/SETUP_GUIDE.md)
- [部署指南](../deployment/DEPLOYMENT.md)

### 2. 问题报告

如果问题仍然存在，请：

1. **收集信息**:
   - 错误信息
   - 日志文件
   - 环境信息
   - 复现步骤

2. **提交 Issue**:
   - 使用 GitHub Issues
   - 提供详细描述
   - 附上相关日志

3. **联系支持**:
   - 项目维护者
   - 技术支持团队

### 3. 社区支持

- GitHub Discussions
- 项目 Wiki
- 技术博客

## 📋 检查清单

### 部署前检查

- [ ] 环境变量配置正确
- [ ] 数据库初始化完成
- [ ] API 密钥有效
- [ ] 飞书应用配置正确
- [ ] 代码编译无错误

### 部署后检查

- [ ] 健康检查通过
- [ ] 服务状态正常
- [ ] 功能测试通过
- [ ] 日志无错误
- [ ] 性能指标正常

### 运行中检查

- [ ] 定期健康检查
- [ ] 监控错误日志
- [ ] 检查性能指标
- [ ] 验证数据同步
- [ ] 测试消息推送

## 🔮 预防措施

### 1. 监控设置

- 启用健康检查监控
- 设置错误告警
- 监控性能指标
- 定期备份数据

### 2. 安全措施

- 定期轮换密钥
- 监控异常访问
- 更新依赖包
- 安全审计

### 3. 维护计划

- 定期代码审查
- 性能优化
- 文档更新
- 功能测试

---

**最后更新**: 2025-08-27  
**版本**: 1.0.0  
**状态**: 维护中
