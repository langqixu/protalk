#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testV4CardSupport() {
  console.log('🃏 测试 v4 API 对互动卡片的支持\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';

    // 1. 测试 v4 API 发送互动卡片
    console.log('1. 测试 v4 API 发送互动卡片...');
    const cardData = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '🧪 v4 API 卡片测试'
        },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '这是使用 v4 API 发送的互动卡片消息'
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '测试按钮'
              },
              type: 'primary',
              value: {
                test: 'v4_card_test'
              }
            }
          ]
        }
      ]
    };

    try {
      const v4CardResponse = await axios.post('https://open.feishu.cn/open-apis/message/v4/send/', {
        chat_id: chatId,
        msg_type: 'interactive',
        content: cardData
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ v4 API 卡片发送成功:', v4CardResponse.data);
      console.log('   💡 v4 API 支持互动卡片！');
    } catch (error) {
      console.log('   ❌ v4 API 卡片发送失败:', error.response?.data || error.message);
      console.log('   💡 v4 API 可能不支持互动卡片');
    }

    // 2. 测试 v1 API 是否能通过其他方式工作
    console.log('\n2. 重新测试 v1 API 的不同格式...');
    
    // 尝试更严格的 v1 API 格式
    const v1Formats = [
      // 格式1: 标准格式
      {
        name: '标准格式',
        data: {
          receive_id: chatId,
          receive_id_type: 'chat_id',
          msg_type: 'text',
          content: JSON.stringify({
            text: '🧪 v1 API 格式测试1'
          })
        }
      },
      // 格式2: 不序列化content
      {
        name: '非序列化格式',
        data: {
          receive_id: chatId,
          receive_id_type: 'chat_id',
          msg_type: 'text',
          content: {
            text: '🧪 v1 API 格式测试2'
          }
        }
      },
      // 格式3: 添加UUID
      {
        name: 'UUID格式',
        data: {
          receive_id: chatId,
          receive_id_type: 'chat_id',
          msg_type: 'text',
          content: JSON.stringify({
            text: '🧪 v1 API 格式测试3'
          }),
          uuid: Date.now().toString()
        }
      }
    ];

    for (const format of v1Formats) {
      try {
        console.log(`   测试 ${format.name}...`);
        const response = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', format.data, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ✅ ${format.name} 成功:`, response.data);
        console.log('   💡 找到了可用的 v1 格式！');
        break;
      } catch (error) {
        console.log(`   ❌ ${format.name} 失败:`, error.response?.data?.msg || error.message);
      }
    }

    // 3. 测试 v1 API 发送卡片
    console.log('\n3. 测试 v1 API 发送互动卡片...');
    try {
      const v1CardResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'interactive',
        content: JSON.stringify(cardData)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ v1 API 卡片发送成功:', v1CardResponse.data);
    } catch (error) {
      console.log('   ❌ v1 API 卡片发送失败:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n📋 结论总结:');
  console.log('   • 如果 v4 支持卡片 → 可以继续使用 v4');
  console.log('   • 如果 v4 不支持卡片 → 需要混合使用（v4文本 + v1卡片）');
  console.log('   • 如果找到 v1 可用格式 → 可以完全切换到 v1');
  console.log('   • 建议查看飞书官方文档确认最佳实践');
}

testV4CardSupport().catch(console.error);
