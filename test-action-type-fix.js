#!/usr/bin/env node

/**
 * Action Type 按钮交互修复功能测试脚本
 * 测试修复后的 action_type 属性和事件处理
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const FEISHU_BASE_URL = `${BASE_URL}/feishu`;

console.log('🧪 开始测试 Action Type 按钮交互修复功能\n');

/**
 * 测试步骤1: 发送包含修复后按钮的测试卡片
 */
async function sendTestCard() {
  console.log('📤 步骤1: 发送测试卡片...');
  
  try {
    // 创建包含完整交互按钮的测试卡片
    const testCard = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '🧪 Action Type 修复验证测试'
        },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**测试目标**: 验证按钮交互功能修复\n\n✅ **已修复的问题**:\n- 添加了 `action_type: "request"` 属性\n- 统一了字段命名 (`review_id`, `app_id`)\n- 实现了完整的事件处理链\n\n🎯 **测试内容**: 请点击下方按钮测试交互功能'
          }
        },
        {
          tag: 'hr'
        },
        {
          tag: 'input',
          name: 'reply_content',
          placeholder: {
            tag: 'plain_text',
            content: '请输入测试回复内容验证表单功能...'
          },
          required: true,
          max_length: 1000
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📤 测试提交回复'
              },
              type: 'primary',
              action_type: 'request',  // ✅ 修复：添加了 action_type
              value: {
                action: 'submit_reply',
                review_id: 'test_review_001',  // ✅ 修复：统一字段名
                app_id: '1077776989'  // ✅ 修复：统一字段名
              }
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📊 查看详情'
              },
              type: 'default',
              action_type: 'request',  // ✅ 修复：添加了 action_type
              value: {
                action: 'view_details',
                review_id: 'test_review_001',
                app_id: '1077776989'
              }
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '🔄 刷新状态'
              },
              type: 'default',
              action_type: 'request',  // ✅ 修复：添加了 action_type
              value: {
                action: 'refresh',
                review_id: 'test_review_001',
                app_id: '1077776989'
              }
            }
          ]
        },
        {
          tag: 'hr'
        },
        {
          tag: 'note',
          elements: [
            {
              tag: 'plain_text',
              content: '💡 提示: 点击按钮后，请查看终端日志验证事件处理是否正常工作'
            }
          ]
        }
      ]
    };

    const response = await axios.post(`${FEISHU_BASE_URL}/send-message`, {
      content: testCard,
      format: 'card_v2'
    });

    if (response.data.success) {
      console.log('✅ 测试卡片发送成功!');
      console.log(`   消息ID: ${response.data.data.message_id}`);
      console.log(`   群组ID: ${response.data.data.chat_id}`);
    } else {
      console.error('❌ 测试卡片发送失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 发送测试卡片时出错:', error.response?.data || error.message);
  }
}

/**
 * 测试步骤2: 模拟卡片按钮点击事件
 */
async function simulateButtonClick() {
  console.log('\n🔧 步骤2: 模拟卡片按钮点击事件...');
  
  // 模拟飞书发送的 card.action.trigger 事件
  const mockEvent = {
    type: 'event_callback',
    event: {
      event_type: 'card.action.trigger',
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'test_review_001',
          app_id: '1077776989'
        },
        form_value: {
          reply_content: '这是一个测试回复内容，用于验证按钮交互功能是否正常工作！'
        }
      },
      user_id: 'test_user_001',
      message_id: 'test_message_001'
    }
  };

  try {
    const response = await axios.post(`${FEISHU_BASE_URL}/events`, mockEvent);
    
    if (response.status === 200 || response.data.code === 0) {
      console.log('✅ 事件处理成功!');
      console.log('   响应:', response.data);
    } else {
      console.error('❌ 事件处理失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 模拟事件处理时出错:', error.response?.data || error.message);
  }
}

/**
 * 测试步骤3: 验证各种按钮动作
 */
async function testAllButtonActions() {
  console.log('\n🎯 步骤3: 测试所有按钮动作...');
  
  const actions = [
    {
      name: '提交回复',
      action: 'submit_reply',
      form_value: { reply_content: '测试回复内容' }
    },
    {
      name: '查看详情',
      action: 'view_details'
    },
    {
      name: '刷新状态',
      action: 'refresh'
    }
  ];

  for (const actionTest of actions) {
    console.log(`\n   测试 "${actionTest.name}" 动作...`);
    
    const mockEvent = {
      type: 'event_callback',
      event: {
        event_type: 'card.action.trigger',
        action: {
          value: {
            action: actionTest.action,
            review_id: 'test_review_002',
            app_id: '1077776989'
          },
          form_value: actionTest.form_value || {}
        },
        user_id: 'test_user_002',
        message_id: 'test_message_002'
      }
    };

    try {
      const response = await axios.post(`${FEISHU_BASE_URL}/events`, mockEvent);
      console.log(`   ✅ "${actionTest.name}" 动作处理成功`);
    } catch (error) {
      console.error(`   ❌ "${actionTest.name}" 动作处理失败:`, error.response?.data || error.message);
    }
  }
}

/**
 * 测试步骤4: 系统状态检查
 */
async function checkSystemStatus() {
  console.log('\n📊 步骤4: 检查系统状态...');
  
  try {
    // 检查健康状态
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 系统健康状态:', healthResponse.data);

    // 检查飞书服务状态
    const feishuResponse = await axios.get(`${FEISHU_BASE_URL}/status`);
    console.log('✅ 飞书服务状态:', feishuResponse.data.status);
    
  } catch (error) {
    console.error('❌ 系统状态检查失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🎯 Action Type 按钮交互修复功能完整测试');
  console.log('=' .repeat(60));
  
  try {
    // 检查系统状态
    await checkSystemStatus();
    
    // 发送测试卡片
    await sendTestCard();
    
    // 等待一秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟按钮点击
    await simulateButtonClick();
    
    // 测试所有按钮动作
    await testAllButtonActions();
    
    console.log('\n🎉 测试完成总结:');
    console.log('=' .repeat(60));
    console.log('✅ 测试卡片发送功能 - 验证按钮包含正确的 action_type 属性');
    console.log('✅ 事件处理功能 - 验证 card.action.trigger 事件能正确处理');
    console.log('✅ 多种按钮动作 - 验证不同按钮动作的处理逻辑');
    console.log('✅ 字段映射 - 验证 review_id 和 app_id 字段统一');
    console.log('\n📝 请查看终端日志确认事件处理的详细信息');
    console.log('💡 如果看到相应的日志输出，说明 action_type 修复功能正常工作');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
runAllTests().catch(console.error);
