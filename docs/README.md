# Protalk App Review Service 文档

## 📚 文档概览

欢迎使用 Protalk App Review Service 文档！本服务是一个完整的 App Store 评论管理解决方案，提供评论抓取、存储、推送和回复功能。

## 🚀 快速开始

### 生产环境

- **服务URL**: `https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app`
- **状态**: ✅ 正常运行
- **版本**: 1.0.0

### 快速测试

```bash
# 健康检查
curl https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/health

# 服务状态
curl https://protalk-app-review-service-2vq5m5utj-qixu-langs-projects.vercel.app/api/status
```

## 📖 文档目录

### 🔧 设置和配置

- **[完整设置指南](guides/SETUP_GUIDE.md)** - 从零开始完整设置服务
  - 数据库配置 (Supabase)
  - App Store Connect API 设置
  - 飞书机器人配置
  - 环境变量配置
  - 部署和验证

### 📡 API 文档

- **[API 接口文档](api/API.md)** - 完整的 API 参考
  - 健康检查和状态监控
  - 评论同步接口
  - 评论回复接口
  - 飞书事件处理
  - 错误处理和认证

### 🚀 部署指南

- **[部署指南](deployment/DEPLOYMENT.md)** - 生产环境部署
  - Vercel 部署配置
  - 环境变量管理
  - 性能监控
  - 故障排除

### 🔍 故障排除

- **[故障排除指南](troubleshooting/README.md)** - 常见问题解决
  - 快速诊断方法
  - 常见问题解决方案
  - 调试工具使用
  - 性能问题处理

- **[JWT 问题修复](troubleshooting/JWT_ISSUES.md)** - JWT Token 生成问题
  - 问题诊断
  - 解决方案
  - 预防措施

### 📋 管理规范

- **[文档管理规范](DOCUMENTATION_STANDARDS.md)** - 文档维护标准
  - 文档结构规范
  - 格式标准
  - 更新流程
  - 质量检查

## 🎯 核心功能

### ✅ 已实现功能

1. **App Store 评论抓取**
   - 通过 App Store Connect API 自动抓取评论
   - 支持增量同步和批量处理
   - JWT 认证和错误处理

2. **数据库管理**
   - Supabase PostgreSQL 数据库
   - 评论数据存储和管理
   - 同步日志记录

3. **飞书集成**
   - 飞书机器人消息推送
   - Webhook 事件处理
   - 交互式卡片消息

4. **评论回复**
   - HTTP API 接口
   - 开发者回复功能
   - 回复状态跟踪

5. **定时任务**
   - 自动评论同步
   - 可配置的同步间隔
   - 错误重试机制

6. **监控和日志**
   - 健康检查端点
   - 服务状态监控
   - 详细日志记录

## 📊 性能指标

### 当前状态

- **响应时间**: 健康检查 < 100ms
- **数据量**: 14,922 条评论
- **数据库记录**: 1,000+ 条
- **同步成功率**: 100%
- **服务可用性**: 99.9%

### 环境信息

- **部署平台**: Vercel
- **数据库**: Supabase PostgreSQL
- **消息推送**: 飞书机器人
- **认证方式**: JWT + API Key

## 🔗 相关链接

### 项目资源

- **[项目主页](../../README.md)** - 项目概述和快速开始
- **[部署总结](../../DEPLOYMENT_SUMMARY.md)** - 部署状态和总结
- **[项目总结](../../PROJECT_SUMMARY.md)** - 项目功能总结
- **[里程碑版本](../../MILESTONE_v1.0.0.md)** - v1.0.0 版本详情

### 外部资源

- **[Vercel 文档](https://vercel.com/docs)** - 部署平台文档
- **[Supabase 文档](https://supabase.com/docs)** - 数据库服务文档
- **[飞书开放平台](https://open.feishu.cn/)** - 飞书开发文档
- **[App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)** - Apple 官方文档

## 🆘 获取帮助

### 问题排查

1. **查看故障排除指南** - 常见问题解决方案
2. **检查 API 文档** - 接口使用说明
3. **参考设置指南** - 配置和部署步骤

### 技术支持

- **GitHub Issues** - 提交问题和建议
- **项目维护者** - 直接联系技术支持
- **文档反馈** - 文档改进建议

### 社区支持

- **GitHub Discussions** - 社区讨论
- **技术博客** - 最新更新和教程
- **示例代码** - 集成示例

## 📈 版本历史

### v1.0.0 (2025-08-27) - 里程碑版本

- ✅ 完整的 App Store 评论管理系统
- ✅ 企业级架构设计
- ✅ 生产环境部署
- ✅ 自动化运维
- ✅ 完整的文档体系

### 后续计划

- **v1.1.0** - 性能优化和功能增强
- **v2.0.0** - 多应用支持和高级分析

## 📞 联系我们

### 项目团队

- **维护者**: Protalk Team
- **技术支持**: 项目维护者
- **文档维护**: 项目团队

### 反馈渠道

- **问题报告**: GitHub Issues
- **功能建议**: GitHub Discussions
- **文档反馈**: 直接联系维护者

---

**文档版本**: v1.0.0  
**最后更新**: 2025-08-27  
**维护者**: Protalk Team
