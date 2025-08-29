#!/usr/bin/env node

/**
 * 测试 Zeabur 部署的按钮功能
 */

const https = require('https');

// 创建传统格式按钮测试卡片
function createZeaburTestCard() {
  return {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: '🚀 Zeabur 按钮测试' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: '**测试目标**：验证 Zeabur 部署的按钮功能' }
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: 'Zeabur 按钮测试' },
            type: 'primary',
            action_type: 'request',
            value: {
              action: 'test_traditional',
              test_id: 'zeabur_test_001',
              timestamp: Date.now()
            }
          }
        ]
      }
    ]
  };
}

// 创建评论表单测试卡片
function createZeaburFormCard() {
  return {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: '🚀 Zeabur 表单测试' },
      template: 'red'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: '**测试目标**：验证 Zeabur 部署的表单提交功能' }
      },
      { tag: 'hr' },
      {
        tag: 'form',
        name: 'zeabur_test_form',
        elements: [
          {
            tag: 'column_set',
            horizontal_spacing: '8px',
            horizontal_align: 'left',
            columns: [
              {
                tag: 'column',
                width: 'weighted',
                weight: 5,
                vertical_align: 'top',
                elements: [
                  {
                    tag: 'input',
                    placeholder: { tag: 'plain_text', content: 'Zeabur 测试输入...' },
                    default_value: '',
                    width: 'fill',
                    name: 'reply_content',
                    margin: '0px 0px 0px 0px'
                  }
                ]
              },
              {
                tag: 'column',
                width: 'weighted',
                weight: 1,
                vertical_align: 'top',
                elements: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: '提交' },
                    type: 'primary',
                    width: 'fill',
                    size: 'medium',
                    action_type: 'request',
                    form_action_type: 'submit',
                    value: {
                      action: 'submit_reply',
                      review_id: 'zeabur_test_001',
                      app_name: '潮汐 for iOS',
                      author: 'Zeabur测试用户'
                    },
                    name: 'submit_button'
                  }
                ]
              }
            ],
            margin: '0px 0px 0px 0px'
          }
        ],
        direction: 'vertical',
        padding: '4px 0px 4px 0px',
        margin: '0px 0px 0px 0px'
      }
    ]
  };
}

function sendToZeabur(cardData, testName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ cardData });

    console.log(`\n📤 发送 ${testName} 到 Zeabur:`);

    const options = {
      hostname: 'protalk.zeabur.app',
      port: 443,
      path: '/feishu/test/custom-card',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   ✅ ${testName} 发送成功 (${res.statusCode})`);
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error(`   ❌ ${testName} 发送失败:`, e.message);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runZeaburTests() {
  console.log('🚀 开始测试 Zeabur 部署的按钮功能...\n');
  
  try {
    // 测试1: 独立按钮
    await sendToZeabur(createZeaburTestCard(), '独立按钮测试');
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试2: 表单按钮
    await sendToZeabur(createZeaburFormCard(), '表单按钮测试');
    
    console.log('\n🎉 Zeabur 测试卡片发送完成！');
    console.log('📋 测试步骤：');
    console.log('   1. 点击"Zeabur 按钮测试" - 应该更新为成功状态');
    console.log('   2. 在表单中输入文本，点击"提交" - 应该显示成功反馈');
    console.log('');
    console.log('🔍 如果按钮有反应，说明事件订阅配置正确');
    console.log('📱 事件会到达 https://protalk.zeabur.app/feishu/events');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

runZeaburTests().catch(console.error);
