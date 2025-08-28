#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function implementLatestV1API() {
  console.log('📚 按照最新官方文档实现 v1 API\n');

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

    console.log('✅ 访问令牌获取成功\n');

    // 1. 测试文本消息（官方标准格式）
    console.log('1. 测试文本消息（最新官方格式）...');
    try {
      const textResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: "chat_id",
        msg_type: "text",
        content: JSON.stringify({
          text: "📱 v1 API 最新格式测试 - " + new Date().toLocaleString('zh-CN')
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      
      console.log('   ✅ 文本消息发送成功:', textResponse.data);
      console.log('   💡 v1 API 文本消息工作正常！');
    } catch (error) {
      console.log('   ❌ 文本消息失败:', error.response?.data || error.message);
      
      // 详细分析错误
      if (error.response?.data?.error?.field_violations) {
        console.log('   🔍 字段验证错误详情:');
        error.response.data.error.field_violations.forEach(violation => {
          console.log(`      - ${violation.field}: ${violation.description}`);
        });
      }
    }

    // 2. 测试富文本消息
    console.log('\n2. 测试富文本消息...');
    try {
      const richTextResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: "chat_id",
        msg_type: "post",
        content: JSON.stringify({
          post: {
            zh_cn: {
              title: "📱 App Store 评论通知",
              content: [
                [
                  {
                    tag: "text",
                    text: "新评论: "
                  },
                  {
                    tag: "text",
                    text: "⭐⭐⭐⭐⭐ 5星",
                    style: ["bold"]
                  }
                ],
                [
                  {
                    tag: "text",
                    text: "用户: 满意用户"
                  }
                ],
                [
                  {
                    tag: "text",
                    text: "内容: 这个应用非常好用，强烈推荐！"
                  }
                ]
              ]
            }
          }
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      
      console.log('   ✅ 富文本消息发送成功:', richTextResponse.data);
    } catch (error) {
      console.log('   ❌ 富文本消息失败:', error.response?.data?.msg || error.message);
    }

    // 3. 测试互动卡片（最新格式）
    console.log('\n3. 测试互动卡片（最新官方格式）...');
    try {
      const cardData = {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: "plain_text",
            content: "📱 App Store 新评论"
          },
          template: "blue"
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: "**⭐⭐⭐⭐⭐ 5星评论**\n\n👤 **用户**: 满意用户\n📅 **时间**: " + new Date().toLocaleString('zh-CN') + "\n💬 **内容**: 这个应用真的很棒！界面设计很美观，功能也很实用。"
            }
          },
          {
            tag: "action",
            actions: [
              {
                tag: "button",
                text: {
                  tag: "plain_text",
                  content: "📤 回复评论"
                },
                type: "primary",
                value: {
                  action: "reply",
                  review_id: "test_review_123"
                }
              },
              {
                tag: "button", 
                text: {
                  tag: "plain_text",
                  content: "📊 查看详情"
                },
                type: "default",
                value: {
                  action: "view_details",
                  review_id: "test_review_123"
                }
              }
            ]
          }
        ]
      };

      const cardResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: "chat_id",
        msg_type: "interactive",
        content: JSON.stringify(cardData)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      
      console.log('   ✅ 互动卡片发送成功:', cardResponse.data);
      console.log('   💡 v1 API 支持完整的互动卡片功能！');
    } catch (error) {
      console.log('   ❌ 互动卡片失败:', error.response?.data || error.message);
    }

    // 4. 测试图片消息
    console.log('\n4. 测试图片消息...');
    try {
      // 先上传图片获取 image_key（这里用示例）
      const imageResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: "chat_id",
        msg_type: "image",
        content: JSON.stringify({
          image_key: "img_example_key" // 实际使用时需要先上传图片获取 image_key
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      
      console.log('   ✅ 图片消息发送成功:', imageResponse.data);
    } catch (error) {
      console.log('   ❌ 图片消息失败（需要有效的image_key）:', error.response?.data?.msg || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n📋 v1 API 实现要点总结:');
  console.log('');
  console.log('✅ **支持的功能**:');
  console.log('   • 文本消息 (msg_type: "text")');
  console.log('   • 富文本消息 (msg_type: "post")');
  console.log('   • 互动卡片 (msg_type: "interactive")');
  console.log('   • 图片消息 (msg_type: "image")');
  console.log('   • 文件消息 (msg_type: "file")');
  console.log('   • 音频视频消息等');
  console.log('');
  console.log('🔧 **关键参数**:');
  console.log('   • receive_id: 接收者ID（群组ID或用户ID）');
  console.log('   • receive_id_type: 接收者类型（"chat_id", "user_id", "open_id"等）');
  console.log('   • msg_type: 消息类型');
  console.log('   • content: 消息内容（需要JSON.stringify序列化）');
  console.log('');
  console.log('🔒 **安全设置选项**:');
  console.log('   • 自定义关键词验证');
  console.log('   • IP白名单');
  console.log('   • 签名校验（推荐）');
  console.log('');
  console.log('💡 **最佳实践**:');
  console.log('   • 使用最新的 v1 API');
  console.log('   • 正确设置 Content-Type: application/json; charset=utf-8');
  console.log('   • content 字段必须是序列化的JSON字符串');
  console.log('   • 根据需要启用安全校验机制');
}

implementLatestV1API().catch(console.error);
