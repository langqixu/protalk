# 🎴 飞书交互式卡片功能实现

## 📋 功能概述

重新实现了App Store评论推送功能，使用飞书交互式卡片格式，支持直接在卡片上进行回复操作。

## 🎯 核心功能

### 1. **交互式卡片设计**
- 📱 显示App Store评论信息（评分、标题、内容、用户信息）
- 🎨 不同状态使用不同颜色主题（新评论-蓝色，更新-橙色，回复-绿色）
- 💬 提供"回复评论"和"查看详情"按钮
- 📊 支持开发者回复显示

### 2. **回复功能**
- 🔘 点击"回复评论"按钮触发交互
- 📝 支持输入回复内容
- ✅ 提交回复到App Store（待实现API集成）
- 📨 发送回复确认消息

## 🏗️ 技术实现

### 1. **卡片结构**
```typescript
const cardData = {
  config: { wide_screen_mode: true },
  header: {
    title: { tag: 'plain_text', content: '📱 App Store 评论' },
    template: 'blue' // 根据类型选择颜色
  },
  elements: [
    // 评分和用户信息
    { tag: 'div', text: { tag: 'lark_md', content: '⭐⭐⭐⭐⭐ 5 星' } },
    
    // 评论内容
    { tag: 'div', text: { tag: 'lark_md', content: '评论内容...' } },
    
    // 操作按钮
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '💬 回复评论' },
          type: 'primary',
          value: { reviewId: 'xxx', action: 'reply' }
        }
      ]
    }
  ]
};
```

### 2. **API端点**
- `POST /feishu/test` - 测试评论卡片推送
- `POST /feishu/reply-action` - 处理回复操作

### 3. **类型定义更新**
- 扩展了 `FeishuMessage` 接口，支持 `card` 属性
- 添加了 `handleReplyAction` 方法到 `IFeishuService` 接口

## 🧪 测试验证

### 测试脚本
```bash
node scripts/test-interactive-card.js
```

### 测试覆盖
- ✅ 新评论卡片推送
- ✅ 评论更新卡片推送  
- ✅ 开发者回复卡片推送
- ✅ 回复操作处理

## 📊 卡片类型

### 1. **新评论卡片**
- 主题色：蓝色
- 标题：📱 App Store 评论 - 新评论
- 显示：评分、用户信息、评论内容
- 按钮：回复评论、查看详情

### 2. **评论更新卡片**
- 主题色：橙色
- 标题：📱 App Store 评论 - 评论更新
- 显示：更新后的评论内容
- 按钮：回复评论、查看详情

### 3. **开发者回复卡片**
- 主题色：绿色
- 标题：📱 App Store 评论 - 开发者回复
- 显示：原始评论 + 开发者回复
- 按钮：回复评论、查看详情

## 🔄 工作流程

### 1. **评论推送流程**
```
App Store 新评论 → 构建卡片数据 → 推送到飞书群组 → 显示交互式卡片
```

### 2. **回复操作流程**
```
用户点击回复按钮 → 弹出回复输入框 → 提交回复内容 → 调用App Store API → 发送确认消息
```

## 🚀 下一步计划

### 1. **App Store API集成**
- [ ] 实现App Store Connect API调用
- [ ] 处理评论回复提交
- [ ] 错误处理和重试机制

### 2. **交互优化**
- [ ] 添加回复输入框组件
- [ ] 支持富文本回复
- [ ] 添加回复历史记录

### 3. **功能扩展**
- [ ] 支持批量回复
- [ ] 添加评论分类标签
- [ ] 实现评论统计功能

## 📝 使用示例

### 推送新评论
```javascript
const review = {
  id: 'review_001',
  appId: '1077776989',
  rating: 5,
  title: '非常棒的应用！',
  body: '这个应用真的很棒...',
  nickname: '用户A',
  createdDate: new Date()
};

await feishuService.pushReviewUpdate(review, 'new');
```

### 处理回复操作
```javascript
await feishuService.handleReplyAction(
  'review_001',
  '感谢您的反馈！',
  'user_001'
);
```

## 🔧 配置说明

### 环境变量
```bash
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_WEBHOOK_URL=your_webhook_url
```

### 卡片配置
- `wide_screen_mode: true` - 启用宽屏模式
- `template` - 卡片主题色（blue/orange/green）
- `tag` - 元素类型（div/button/action等）

## 📚 相关文档

- [飞书卡片消息文档](https://open.feishu.cn/document/ukTMukTMukTM/ukTNwUjL5UDM14SO1ATN)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [项目API文档](./docs/api/API.md)

---

**实现状态**: ✅ 完成  
**测试状态**: ✅ 通过  
**部署状态**: 🚧 待部署
