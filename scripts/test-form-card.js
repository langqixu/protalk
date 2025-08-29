#!/usr/bin/env node

/**
 * 测试带有输入框的交互卡片
 * 使用新的 /feishu/test/custom-card 端点
 */

const http = require('http');

// 创建带有输入框的测试卡片
function createFormCard() {
  const card = {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: '🧪 输入框交互测试' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: '**测试目标**：验证输入框和按钮交互功能' }
      },
      { tag: 'hr' },
      {
        tag: 'form',
        name: 'test_form',
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
                    placeholder: { tag: 'plain_text', content: '请输入测试内容...' },
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
                    behaviors: [
                      {
                        type: 'callback',
                        value: {
                          action: 'test_submit',
                          test_id: 'form_test_001'
                        }
                      }
                    ],
                    form_action_type: 'submit',
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

  return card;
}

function sendFormCard() {
  return new Promise((resolve, reject) => {
    const cardData = createFormCard();
    const data = JSON.stringify({ cardData });

    console.log('🧪 发送带有输入框的卡片数据:');
    console.log(JSON.stringify(cardData, null, 2));
    console.log('\n📤 发送到新端点: /feishu/test/custom-card');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/feishu/test/custom-card',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ 发送成功 (${res.statusCode}):`, responseData);
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error('❌ 发送失败:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

sendFormCard().then(() => {
  console.log('\n🎉 输入框测试卡片发送完成');
  console.log('📋 请检查飞书群组中是否收到了带有输入框的卡片');
  console.log('🔍 预期结果：');
  console.log('   1. 应该显示一个输入框');
  console.log('   2. 应该有"提交测试"和"取消"两个按钮');
  console.log('   3. 点击按钮应该有日志输出');
}).catch(error => {
  console.error('❌ 测试失败:', error);
});
