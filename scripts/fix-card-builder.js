#!/usr/bin/env node

/**
 * 快速修复：直接替换 buildReviewCardV2 函数
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/utils/feishu-card-v2-builder.ts');

console.log('🔧 开始修复卡片构建器...');

// 读取当前文件
let content = fs.readFileSync(filePath, 'utf8');

// 找到 buildReviewCardV2 函数的开始和结束
const functionStart = content.indexOf('export function buildReviewCardV2(');
const functionEnd = content.indexOf('\n}\n', functionStart) + 3; // 包含结束的 }

if (functionStart === -1 || functionEnd === -1) {
  console.error('❌ 找不到 buildReviewCardV2 函数');
  process.exit(1);
}

console.log('📍 找到函数位置:', functionStart, 'to', functionEnd);

// 新的函数实现（使用简单的方式，避免类型问题）
const newFunction = `export function buildReviewCardV2(reviewData: {
  id: string;
  rating: number;
  title?: string;
  content: string;
  author: string;
  date: string;
  app_name: string;
  store_type?: string;
  helpful_count?: number;
  developer_response?: any;
  version?: string;        // 🔍 添加版本字段
  country?: string;        // 🔍 添加国家/地区字段
  card_state?: string;     // 🔄 卡片状态
  message_id?: string;     // 📮 消息ID（用于update_card）
}): FeishuCardV2 {
  const stars = '⭐'.repeat(Math.max(0, Math.min(5, reviewData.rating || 0)));
  const emptyStars = '☆'.repeat(5 - Math.max(0, Math.min(5, reviewData.rating || 0)));
  
  // 动态确定卡片状态
  const hasReply = reviewData.developer_response && reviewData.developer_response.body;
  const cardState = hasReply ? 'replied' : 'initial';
  
  logger.debug('构建评论卡片V2（新版本）', { 
    reviewId: reviewData.id,
    cardState,
    hasReply
  });

  // 构建基础卡片结构
  const card: FeishuCardV2 = {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: \`\${reviewData.app_name} - 新评论通知\` },
      template: 'red'
    },
    elements: []
  };

  // 添加评分和用户信息
  card.elements.push({
    tag: 'div',
    text: { tag: 'lark_md', content: \`\${stars}\${emptyStars} (\${reviewData.rating}/5)\` },
    fields: [
      { is_short: false, text: { tag: 'lark_md', content: \`👤 \${reviewData.author}\` } }
    ]
  });

  // 添加评论内容
  card.elements.push({
    tag: 'div',
    text: { tag: 'lark_md', content: \`**\${reviewData.title || '此处为评论标题'}**\\n\${reviewData.content}\` }
  });

  // 添加元信息
  const dateStr = new Date(reviewData.date).toLocaleString('zh-CN');
  const countryDisplay = \`🇺🇸 \${reviewData.country || 'US'}\`;
  
  card.elements.push({
    tag: 'div',
    fields: [
      { is_short: true, text: { tag: 'lark_md', content: \`📅 \${dateStr}\` } },
      { is_short: true, text: { tag: 'lark_md', content: \`📱 \${reviewData.version || '未知版本'}\` } },
      { is_short: true, text: { tag: 'lark_md', content: countryDisplay } }
    ]
  });

  // 添加分隔线
  card.elements.push({ tag: 'hr' });

  // 根据状态添加不同的交互元素
  if (cardState === 'replied') {
    // 已回复状态：显示回复内容 + 编辑按钮
    const replyContent = reviewData.developer_response?.body || '暂无回复内容';
    
    card.elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: \`💬 **开发者回复**\\n\${replyContent}\` }
    });
    
    card.elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '编辑回复' },
          type: 'primary',
          action_type: 'request',
          value: {
            action: 'edit_reply',
            review_id: reviewData.id,
            app_name: reviewData.app_name,
            author: reviewData.author
          }
        }
      ]
    });
    
  } else {
    // 初始状态：显示输入框 + 提交按钮（参考官方示例的表单结构）
    card.elements.push({
      tag: 'form',
      name: 'reply_form',
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: '💬 **开发者回复**' }
        },
        {
          tag: 'input',
          name: 'reply_content',
          placeholder: { tag: 'plain_text', content: '回复用户...' },
          required: true,
          max_length: 1000,
          width: 'fill'
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '提交回复' },
              type: 'primary',
              action_type: 'request',
              form_action_type: 'submit',
              value: {
                action: 'submit_reply',
                review_id: reviewData.id,
                app_name: reviewData.app_name,
                author: reviewData.author
              }
            }
          ]
        }
      ]
    });
  }

  return card;
}`;

// 替换函数
const newContent = content.substring(0, functionStart) + newFunction + content.substring(functionEnd);

// 写回文件
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ 卡片构建器修复完成！');
console.log('📋 修改内容:');
console.log('- 直接在初始状态显示输入框和提交按钮');
console.log('- 使用表单容器包装输入元素');
console.log('- 简化布局，避免复杂的类型问题');
console.log('- 保持与现有接口的兼容性');
