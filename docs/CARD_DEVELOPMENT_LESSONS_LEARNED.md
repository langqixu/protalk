# 飞书卡片开发踩坑记录

> 记录在 Protalk 项目中遇到的具体问题、错误和解决过程，为后续开发避坑

## 🚨 重大问题记录

### 1. Mock数据重启丢失问题

#### 问题现象
```
[error]: Review with ID test_xxx not found in database.
[warn]: MockDataManager: 评论未找到
```

#### 发生频率
**极高** - 每次推送代码部署后都会出现

#### 根本原因
- MockDataManager使用纯内存存储 (`Map<string, ReviewDTO>`)
- Zeabur服务每次代码推送都会重启容器
- 重启后内存数据全部丢失，只剩下初始化的3个示例数据

#### 解决过程
1. **临时方案**: 每次重启后手动重发测试数据
   ```bash
   curl -X POST .../feishu/test/review-card -d '{...}'
   ```

2. **中期方案**: 增加数据恢复API
   ```bash
   curl -s .../feishu/debug/mock-data | jq .  # 检查数据状态
   ```

3. **最终方案**: 预加载机制
   ```typescript
   // MockDataManager.ts
   private loadCommonTestData() {
     const commonTestReviews = [
       { id: 'test_optimized_design_012', ... },
       { id: 'test_form_working_008', ... },
       { id: 'test_final_perfection_014', ... },
     ];
     // 服务启动时自动加载
   }
   ```

#### 经验教训
- **预见性规划**: 开发初期就应该考虑数据持久化
- **测试数据管理**: 重要测试用例应该固化到代码中
- **监控机制**: 需要便捷的数据状态检查方法

---

### 2. 表单按钮behaviors配置错误

#### 问题现象
点击按钮后卡片不更新，控制台无明显错误

#### 错误配置
```typescript
// ❌ 错误的配置方式
{
  tag: 'button',
  value: {  // 直接使用value字段
    action: CardState.REPLYING,
    review_id: review.id,
  }
}
```

#### 正确配置
```typescript
// ✅ 正确的配置方式
{
  tag: 'button',
  behaviors: [  // 使用behaviors数组
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

#### 调试过程
1. 检查飞书官方文档 - JSON 2.0 button交互规范
2. 对比工作示例 - 发现behaviors字段缺失
3. 修正后立即生效

#### 经验教训
- **文档对照**: 每个组件都要严格对照官方文档
- **版本一致性**: 确保使用的JSON版本规范统一

---

### 3. 表单内组件嵌套限制

#### 问题现象
表单JSON发送失败，卡片无法显示

#### 错误尝试
```typescript
// ❌ 表单内使用action组件
{
  tag: 'form',
  elements: [
    { tag: 'input', ... },
    {
      tag: 'action',  // 表单内不支持action
      actions: [...]
    }
  ]
}
```

#### 正确方案
```typescript
// ✅ 表单内使用column_set
{
  tag: 'form',
  elements: [
    { tag: 'input', ... },
    {
      tag: 'column_set',  // 使用column_set包装按钮
      columns: [
        {
          tag: 'column',
          elements: [{ tag: 'button', ... }]
        }
      ]
    }
  ]
}
```

#### 经验教训
- **组件嵌套规则**: 不同容器对子组件有限制
- **错误排查**: 通过逐步简化定位问题组件

---

### 4. 头部图标配置兼容性

#### 问题现象
卡片发送失败，JSON结构错误

#### 错误尝试历程
```typescript
// 尝试1: JSON 2.0 语法在JSON 1.0中
icon: {
  tag: 'standard_icon',
  token: 'warning_filled',
  color: 'red'  // JSON 1.0不支持
}

// 尝试2: 修正语法但仍复杂
ud_icon: {
  token: 'warning_filled',
  style: { color: 'red' }  // 语法仍可能有问题
}
```

#### 最终方案
```typescript
// ✅ 简单可靠的emoji方案
header: {
  title: { 
    tag: 'plain_text', 
    content: `${getEmojiIcon(rating)} ${appName} - 新评论通知` 
  },
  template: rating <= 2 ? 'red' : rating === 3 ? 'yellow' : 'green',
}

function getEmojiIcon(rating: number): string {
  if (rating <= 2) return '❌';
  if (rating === 3) return '⚠️'; 
  return '✅';
}
```

#### 经验教训
- **简单优于复杂**: emoji比配置图标更可靠
- **兼容性优先**: 选择稳定的实现方案

---

### 5. 回调响应格式错误

#### 问题现象
后端处理成功但前端卡片不更新

#### 错误响应
```typescript
// ❌ 只返回成功标识
return { success: true };

// ❌ 直接返回卡片JSON
return cardJson;
```

#### 正确响应
```typescript
// ✅ 飞书期望的响应格式
return {
  toast: {
    type: 'success',
    content: '进入回复模式'
  },
  card: updatedCardJson
};
```

#### 调试过程
1. 后端日志显示处理成功，但前端无响应
2. 查阅飞书文档找到正确的响应格式
3. 修正后卡片更新正常

#### 经验教训
- **接口规范**: API响应格式要严格遵循文档
- **端到端测试**: 不仅要测后端逻辑，还要验证前端效果

---

## 🔧 开发技巧总结

### 1. 快速调试流程

```bash
# 1. 检查服务状态
curl -s https://protalk.zeabur.app/health

# 2. 检查数据状态  
curl -s https://protalk.zeabur.app/feishu/debug/mock-data | jq .

# 3. 如果数据丢失，重发测试数据
curl -X POST https://protalk.zeabur.app/feishu/test/review-card \
  -H "Content-Type: application/json" \
  -d '{...}' | jq .

# 4. 部署新版本
npm run build && git add . && git commit -m "..." && git push

# 5. 等待部署 (Zeabur通常需要30-40秒)
sleep 35

# 6. 验证修复效果
```

### 2. JSON结构验证技巧

1. **渐进式开发**
   - 先搭建最简单的结构
   - 逐步添加复杂组件
   - 每次添加后立即测试

2. **组件隔离测试**
   - 出错时注释掉部分组件
   - 定位到具体出问题的组件
   - 单独修复后再集成

3. **文档对照检查**
   - 每个属性都要在官方文档中找到依据
   - 注意JSON版本差异
   - 优先使用简单、稳定的组件

### 3. 样式调试策略

1. **颜色生效检查**
   ```typescript
   // 使用HTML标签确保颜色生效
   content: `<font color="grey">文本</font>`
   ```

2. **布局问题排查**
   ```typescript
   // 使用is_short控制字段布局
   { is_short: true, ... }   // 两列显示
   { is_short: false, ... }  // 单列显示
   ```

3. **间距控制**
   ```typescript
   // 使用空行增加间距
   { is_short: false, text: { content: `\n` } }
   ```

---

## 📊 问题统计

| 问题类型 | 发生次数 | 解决难度 | 影响范围 |
|---------|---------|---------|---------|
| 数据丢失 | 10+ | 中等 | 功能阻断 |
| JSON语法错误 | 8+ | 简单 | 功能阻断 |
| 样式不生效 | 6+ | 简单 | 体验影响 |
| 响应格式错误 | 3+ | 中等 | 功能异常 |
| 组件嵌套错误 | 2+ | 困难 | 功能阻断 |

## 🎯 预防措施

### 1. 开发前置检查
- [ ] 确认飞书JSON版本 (1.0 vs 2.0)
- [ ] 阅读相关组件官方文档  
- [ ] 准备测试数据和验证方案
- [ ] 设置数据持久化机制

### 2. 编码规范
- [ ] 每个组件都要有文档依据
- [ ] 复杂配置优先考虑简单替代方案
- [ ] 重要测试数据要固化到代码中
- [ ] API响应格式严格遵循规范

### 3. 测试验证
- [ ] 本地编译检查
- [ ] 功能完整性测试
- [ ] 不同场景覆盖测试
- [ ] 服务重启后回归测试

---

**教训精华**: 飞书卡片开发最大的挑战不是技术复杂度，而是各种细节的规范要求和兼容性问题。通过建立系统的开发流程、测试机制和问题预防措施，可以大大降低踩坑概率，提高开发效率。

最重要的是：**遇到问题时，先定位、再解决、后总结，建立知识积累，避免重复踩坑**。
