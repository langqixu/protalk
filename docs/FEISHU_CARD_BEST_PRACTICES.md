# 飞书卡片开发最佳实践

> 基于 Protalk 项目实际开发经验总结，涵盖样式设计、交互实现和常见问题解决方案

## 📋 目录

- [核心原则](#核心原则)
- [技术架构](#技术架构)
- [样式设计最佳实践](#样式设计最佳实践)
- [交互功能实现](#交互功能实现)
- [常见问题与解决方案](#常见问题与解决方案)
- [开发流程建议](#开发流程建议)
- [测试策略](#测试策略)

## 核心原则

### 1. 分层开发策略
```
Layer 1: Mock数据 + 基础交互 → 验证功能逻辑
Layer 2: 样式优化 + 体验提升 → 完善用户界面  
Layer 3: 真实API集成 → 生产环境部署
```

**核心思想**: 先确保功能正确，再优化体验，最后集成真实数据。避免多个变量同时调试。

### 2. JSON 规范遵循
- **严格遵循飞书卡片JSON 1.0/2.0规范**
- **版本一致性**: 整个项目使用统一的JSON版本
- **向后兼容**: 优先选择稳定、文档完整的组件

## 技术架构

### 核心文件结构
```
src/
├── utils/feishu-card-v2-builder.ts    # 卡片JSON构建器
├── api/controllers/review-card-controller.ts  # 交互处理逻辑
├── modules/storage/MockDataManager.ts # 模拟数据管理
└── types/review.ts                    # 类型定义
```

### 关键组件
1. **`buildReviewCardV2()`** - 卡片构建主函数
2. **`buildActionElements()`** - 状态机驱动的交互元素
3. **`handleCardAction()`** - 回调处理逻辑
4. **MockDataManager** - 开发期数据管理

## 样式设计最佳实践

### 1. 头部设计

#### ✅ 推荐做法
```typescript
// 使用emoji图标替代复杂图标配置
header: {
  title: { tag: 'plain_text', content: `${getEmojiIcon(rating)} ${appName} - 新评论通知` },
  template: rating <= 2 ? 'red' : rating === 3 ? 'yellow' : 'green',
}

function getEmojiIcon(rating: number): string {
  if (rating <= 2) return '❌'; // 差评
  if (rating === 3) return '⚠️'; // 中评  
  return '✅'; // 好评
}
```

#### ❌ 避免的做法
```typescript
// 复杂的图标配置容易出错
icon: {
  tag: 'standard_icon',
  token: 'warning_filled',
  color: 'red'
}
```

**经验总结**: emoji图标比配置的图标更稳定、更兼容，避免了图标语法错误。

### 2. 信息布局

#### ✅ 推荐的层次结构
```typescript
// 清晰的视觉层次
{
  tag: 'div',
  fields: [
    // 主要内容 - 正常颜色
    { content: `${stars} (${rating}/5)` },
    { content: `**${title}**\n\n${body}` },
    
    // 分隔空行
    { content: `\n` },
    
    // 次要信息 - 灰色显示
    { content: `<font color="grey">👤 **用户:** ${author}</font>` },
    { content: `<font color="grey">📱 **版本:** ${version}</font>` },
  ]
}
```

**关键要点**:
- 主要内容突出显示
- Meta信息使用灰色降低视觉权重
- 用空行分隔不同层次的信息
- emoji图标提升信息识别度

### 3. 表单设计

#### ✅ 推荐的表单结构
```typescript
{
  tag: 'form',
  name: 'reply_form',
  elements: [
    // 输入框 - 填满父容器
    {
      tag: 'input',
      name: 'reply_content',
      placeholder: { tag: 'plain_text', content: '输入您对用户的回复内容...' },
      input_type: 'multiline_text',
      rows: 3,
      required: true,
      width: 'fill', // 关键配置
    },
    
    // 按钮组 - 标准布局
    {
      tag: 'column_set',
      horizontal_align: 'left',
      columns: [
        {
          tag: 'column',
          width: 'auto',
          elements: [/* 提交按钮 */],
          vertical_spacing: '8px',
          horizontal_align: 'left',
          vertical_align: 'top',
        },
        // 取消按钮列...
      ]
    }
  ]
}
```

**关键要点**:
- `width: 'fill'` 让输入框充分利用空间
- 使用 `column_set` 实现标准按钮布局
- 统一的间距和对齐配置

## 交互功能实现

### 1. 状态机设计

```typescript
enum CardState {
  NO_REPLY = 'no_reply',
  REPLYING = 'replying', 
  REPLIED = 'replied',
  EDITING_REPLY = 'editing_reply'
}
```

**状态转换流程**:
```
NO_REPLY → [点击回复] → REPLYING → [提交] → REPLIED
REPLIED → [点击编辑] → EDITING_REPLY → [更新] → REPLIED
```

### 2. 按钮交互配置

#### ✅ 正确的回调配置
```typescript
// JSON 1.0 表单提交按钮
{
  tag: 'button',
  text: { tag: 'plain_text', content: '提交' },
  type: 'primary',
  name: 'submit_button',
  action_type: 'form_submit', // 关键配置
  width: 'default',
  value: {
    action: CardState.REPLIED,
    review_id: review.id,
  }
}

// 普通交互按钮  
{
  tag: 'button',
  text: { tag: 'plain_text', content: '回复' },
  type: 'primary',
  behaviors: [
    {
      type: 'callback',
      value: {
        action: CardState.REPLYING,
        review_id: review.id,
      }
    }
  ]
}
```

### 3. 回调响应格式

#### ✅ 正确的响应格式
```typescript
// 控制器返回格式
return {
  toast: {
    type: 'success',
    content: '进入回复模式'
  },
  card: updatedCardJson
};
```

**经验总结**: 飞书需要特定的响应格式来正确更新卡片状态。

## 常见问题与解决方案

### 1. 数据持久化问题

#### 问题描述
服务重启后Mock数据丢失，导致"评论数据未找到"错误。

#### ✅ 解决方案
```typescript
// MockDataManager.ts
private loadCommonTestData() {
  const commonTestReviews: ReviewDTO[] = [
    // 预加载常用测试数据
    { id: 'test_optimized_design_012', /* ... */ },
    { id: 'test_form_working_008', /* ... */ },
    { id: 'test_final_perfection_014', /* ... */ },
  ];
  
  commonTestReviews.forEach(review => {
    this.reviews.set(review.id, review);
  });
}
```

**最佳实践**: 
- 将重要测试数据加入预加载列表
- 每次添加新测试用例时同步更新预加载数据
- 考虑使用文件存储或数据库持久化

### 2. 表单不显示问题

#### 问题分析
1. **JSON结构错误** - 不符合飞书规范
2. **嵌套层级问题** - 表单内不能使用某些组件
3. **属性配置错误** - 缺少必要属性

#### ✅ 解决策略
1. **严格对照官方文档** - 每个组件都要验证规范
2. **渐进式开发** - 先简单结构，再逐步复杂化
3. **错误排查** - 逐步注释代码定位问题组件

### 3. 样式兼容性问题

#### 问题：图标显示异常
```typescript
// ❌ 容易出错的配置
icon: {
  tag: 'standard_icon',
  token: 'warning_filled',
  style: { color: 'red' }
}

// ✅ 稳定的替代方案
title: { content: `❌ ${appName} - 新评论通知` }
```

#### 问题：颜色不生效
```typescript
// ❌ 复杂的颜色配置
text: { tag: 'lark_md', content: `**用户:** ${author}` }

// ✅ 使用HTML标签
text: { tag: 'lark_md', content: `<font color="grey">**用户:** ${author}</font>` }
```

## 开发流程建议

### 1. 开发阶段划分

#### Phase 1: 功能验证
- [ ] 基础JSON结构搭建
- [ ] Mock数据管理实现  
- [ ] 核心交互逻辑验证
- [ ] 状态转换测试

#### Phase 2: 样式优化
- [ ] 视觉层次设计
- [ ] 颜色和图标优化
- [ ] 间距和布局调整
- [ ] 响应式适配

#### Phase 3: 体验完善
- [ ] 提示文本优化
- [ ] 错误处理完善
- [ ] 性能优化
- [ ] 用户反馈集成

### 2. 测试验证流程

```bash
# 1. 本地编译验证
npm run build

# 2. 部署到测试环境
git add . && git commit -m "..." && git push

# 3. 等待部署完成 (通常30-40秒)
sleep 35

# 4. 发送测试卡片
curl -X POST https://domain.com/feishu/test/review-card -H "Content-Type: application/json" -d '{...}'

# 5. 在飞书中验证效果
# 6. 如有问题，重复上述流程
```

### 3. 调试技巧

#### 数据状态检查
```bash
curl -s https://domain.com/feishu/debug/mock-data | jq .
```

#### 健康状态监控
```bash
curl -s https://domain.com/health
```

#### 日志分析
- 关注 `MockDataManager: 评论未找到` 错误
- 检查 `card.action.trigger` 事件处理
- 验证 `Building review card for review` 日志

## 测试策略

### 1. 测试用例设计

创建覆盖不同场景的测试数据:

```typescript
const testCases = [
  { rating: 1, scenario: '差评+红色主题+❌图标' },
  { rating: 3, scenario: '中评+黄色主题+⚠️图标' }, 
  { rating: 5, scenario: '好评+绿色主题+✅图标' },
  { hasReply: true, scenario: '已回复状态' },
  { longContent: true, scenario: '长文本布局测试' }
];
```

### 2. 回归测试清单

每次修改后必须验证:

- [ ] 卡片正常发送和显示
- [ ] 点击回复按钮进入表单界面
- [ ] 输入框显示正确且可输入
- [ ] 提交按钮功能正常
- [ ] 取消按钮返回初始状态
- [ ] 编辑回复功能正常
- [ ] 不同评分的主题颜色正确
- [ ] Meta信息灰色显示
- [ ] 服务重启后数据不丢失

### 3. 性能考量

- **卡片JSON大小控制** - 避免过度复杂的结构
- **状态更新效率** - 最小化不必要的重建
- **内存使用监控** - Mock数据量控制在合理范围
- **网络请求优化** - 合并批量操作

## 总结

通过本次开发实践，我们建立了一套完整的飞书卡片开发最佳实践:

1. **分层开发** - 功能优先，样式其次
2. **规范遵循** - 严格按照官方文档实现
3. **emoji优先** - 用简单可靠的方案替代复杂配置
4. **数据持久化** - 预加载机制避免重复问题
5. **渐进优化** - 小步快跑，快速迭代

这些经验不仅适用于评论卡片，也为后续其他类型卡片的开发提供了可复用的模式和规范。

---

**最后更新**: 2024-01-01  
**适用版本**: 飞书卡片 JSON 1.0  
**项目**: Protalk App Review Service v2.1.0
