import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { FeishuServiceV1 } from '../services/FeishuServiceV1';

const router = Router();

let feishuService: FeishuServiceV1 | null = null;

/**
 * 初始化飞书v1服务
 */
export function initializeFeishuServiceV1(service: FeishuServiceV1) {
  feishuService = service;
  logger.info('飞书v1 API路由初始化成功');
}

/**
 * 验证服务是否已初始化
 */
function ensureServiceInitialized(res: Response): boolean {
  if (!feishuService) {
    res.status(500).json({ 
      success: false,
      error: '飞书服务未初始化',
      code: 'SERVICE_NOT_INITIALIZED'
    });
    return false;
  }
  return true;
}

/**
 * 统一错误处理
 */
function handleError(res: Response, error: unknown, operation: string) {
  const errorMessage = error instanceof Error ? error.message : '未知错误';
  logger.error(`${operation}失败`, { error: errorMessage });
  
  res.status(500).json({ 
    success: false,
    error: `${operation}失败`,
    details: errorMessage,
    timestamp: new Date().toISOString()
  });
}

// ================================
// 服务状态和管理接口
// ================================

/**
 * 获取服务状态
 * GET /feishu/status
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const status = feishuService!.getStatus();
    
    res.json({
      success: true,
      status: {
        ...status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    handleError(res, error, '获取服务状态');
  }
});

/**
 * 健康检查
 * GET /feishu/health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const chatId = await feishuService!.getFirstChatId();
    
    res.json({
      success: true,
      health: 'ok',
      canAccessChats: !!chatId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(res, error, '健康检查');
  }
});

// ================================
// 群组管理接口
// ================================

/**
 * 获取群组列表
 * GET /feishu/chats?page_size=50&page_token=xxx
 */
router.get('/chats', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const pageSize = parseInt(req.query['page_size'] as string) || 50;
    const pageToken = req.query['page_token'] as string;

    const data = await feishuService!.getChatList(pageSize, pageToken);
    
    res.json({
      success: true,
      data: {
        chats: data.items.map((chat: any) => ({
          chat_id: chat.chat_id,
          name: chat.name,
          description: chat.description,
          chat_mode: chat.chat_mode,
          chat_type: chat.chat_type,
          external: chat.external
        })),
        has_more: data.has_more,
        page_token: data.page_token,
        total: data.items.length
      }
    });
  } catch (error) {
    handleError(res, error, '获取群组列表');
  }
});

/**
 * 获取第一个群组ID
 * GET /feishu/first-chat-id
 */
router.get('/first-chat-id', async (_req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const chatId = await feishuService!.getFirstChatId();
    
    if (chatId) {
      res.json({
        success: true,
        chat_id: chatId
      });
    } else {
      res.status(404).json({
        success: false,
        error: '没有找到可用的群组',
        code: 'NO_CHATS_FOUND'
      });
    }
  } catch (error) {
    handleError(res, error, '获取第一个群组ID');
  }
});

/**
 * 获取群组详细信息
 * GET /feishu/chats/:chatId
 */
router.get('/chats/:chatId', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const chatId = req.params['chatId'];
    if (!chatId) {
      res.status(400).json({
        success: false,
        error: '群组ID不能为空',
        code: 'MISSING_CHAT_ID'
      });
      return;
    }

    const chatInfo = await feishuService!.getChatInfo(chatId);
    
    res.json({
      success: true,
      data: chatInfo
    });
  } catch (error) {
    handleError(res, error, '获取群组信息');
  }
});

// ================================
// 消息发送接口
// ================================

/**
 * 发送文本消息
 * POST /feishu/messages/text
 * Body: { content: string, chat_id?: string }
 */
router.post('/messages/text', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { content, chat_id } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: '消息内容不能为空',
        code: 'MISSING_CONTENT'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组',
          code: 'NO_CHATS_AVAILABLE'
        });
        return;
      }
    }

    const result = await feishuService!.sendTextMessage(chatId, content);
    
    res.json({
      success: true,
      data: {
        message_id: result.message_id,
        chat_id: chatId,
        content: content
      }
    });
  } catch (error) {
    handleError(res, error, '发送文本消息');
  }
});

/**
 * 发送富文本消息 (支持传统post格式和新v2卡片格式)
 * POST /feishu/messages/rich-text
 * Body: { 
 *   content: object, 
 *   chat_id?: string,
 *   format?: 'post' | 'card_v2' | 'auto'
 * }
 */
router.post('/messages/rich-text', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { content, chat_id, format = 'auto' } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: '富文本内容不能为空',
        code: 'MISSING_CONTENT'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组',
          code: 'NO_CHATS_AVAILABLE'
        });
        return;
      }
    }

    let result;

    // 根据格式类型选择发送方式
    if (format === 'card_v2' || (format === 'auto' && (content.config || content.header || content.elements))) {
      // 发送v2卡片格式
      result = await feishuService!.sendCardMessage(chatId, content);
    } else {
      // 发送传统富文本格式
      result = await feishuService!.sendRichTextMessage(chatId, content);
    }
    
    res.json({
      success: true,
      data: {
        message_id: result.message_id,
        chat_id: chatId,
        format_used: format === 'auto' ? (content.config || content.header || content.elements ? 'card_v2' : 'post') : format
      }
    });
  } catch (error) {
    handleError(res, error, '发送富文本消息');
  }
});

/**
 * 发送互动卡片消息
 * POST /feishu/messages/card
 * Body: { card: object, chat_id?: string }
 */
router.post('/messages/card', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { card, chat_id } = req.body;

    if (!card) {
      res.status(400).json({
        success: false,
        error: '卡片内容不能为空',
        code: 'MISSING_CARD'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组',
          code: 'NO_CHATS_AVAILABLE'
        });
        return;
      }
    }

    const result = await feishuService!.sendCardMessage(chatId, card);
    
    res.json({
      success: true,
      data: {
        message_id: result.message_id,
        chat_id: chatId
      }
    });
  } catch (error) {
    handleError(res, error, '发送互动卡片消息');
  }
});

/**
 * 推送评论到指定群组
 * POST /feishu/reviews/push
 * Body: { chat_id: string, review: object }
 */
router.post('/reviews/push', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { chat_id, review } = req.body;

    if (!chat_id || !review) {
      res.status(400).json({
        success: false,
        error: '群组ID和评论内容不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    await feishuService!.pushReviewToChat(chat_id, review);
    
    res.json({
      success: true,
      data: {
        chat_id: chat_id,
        review_id: review.id
      }
    });
  } catch (error) {
    handleError(res, error, '推送评论');
  }
});

/**
 * 连接测试
 * GET /feishu/test
 */
router.get('/test', async (_req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const chatId = await feishuService!.getFirstChatId();
    
    if (!chatId) {
      res.json({
        success: false,
        error: '无法获取群组ID',
        details: '可能是机器人未被添加到任何群组',
        code: 'NO_CHATS_AVAILABLE'
      });
      return;
    }

    // 发送测试消息
    const testContent = `🧪 v1 API完整路由测试 - ${new Date().toLocaleString('zh-CN')}`;
    await feishuService!.sendTextMessage(chatId, testContent);
    
    res.json({
      success: true,
      message: '测试消息发送成功',
      chat_id: chatId,
      api_version: 'v1',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(res, error, '连接测试');
  }
});

/**
 * 测试新v2卡片组件
 * POST /feishu/test/card-v2
 */
router.post('/test/card-v2', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { template = 'demo', chat_id } = req.body;

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组',
          code: 'NO_CHATS_AVAILABLE'
        });
        return;
      }
    }

    // 导入富文本工厂
    const { RichTextFactory } = require('../utils/rich-text-factory');

    let cardContent;
    switch (template) {
      case 'system':
        cardContent = RichTextFactory.createSystemNotification({
          type: 'success',
          title: 'v2卡片组件测试',
          message: '🎉 新的飞书卡片v2组件系统已成功部署！\n\n✨ **新特性包括:**\n- 现代化的视觉设计\n- 更丰富的交互组件\n- 更好的用户体验\n- 完整的TypeScript支持',
          action: {
            text: '查看文档',
            callback: 'view_docs'
          }
        });
        break;
      
      case 'status':
        cardContent = RichTextFactory.createServiceStatusMessage({
          service: 'Protalk评论同步服务',
          status: 'running',
          version: '2.0.0',
          uptime: process.uptime(),
          details: {
            lastSync: new Date().toISOString(),
            messageCount: 42
          }
        });
        break;
      
      case 'review':
        // 创建模拟评论数据
        const mockReview = {
          id: 'test_review_' + Date.now(),
          app_name: 'Protalk Demo App',
          app_id: '1234567890',
          title: '这个应用真的很棒！',
          content: '我已经使用这个应用几个月了，它真的改变了我的工作流程。界面设计很直观，功能也很完善。强烈推荐给所有需要类似功能的用户！',
          rating: 5,
          author: '满意用户123',
          store_type: 'ios' as const,
          version: '2.1.0',
          date: new Date().toISOString(),
          country: '中国',
          verified_purchase: true,
          helpful_count: 8
        };
        
        cardContent = RichTextFactory.createReviewMessage(mockReview);
        break;
      
      default:
        // 默认演示卡片
        const { createCardBuilder } = require('../utils/feishu-card-v2-builder');
        cardContent = createCardBuilder()
          .setConfig({ wide_screen_mode: true, enable_forward: true })
          .setHeader({
            title: { tag: 'plain_text', content: '🚀 飞书卡片v2组件演示' },
            subtitle: { tag: 'plain_text', content: '展示各种组件和布局能力' },
            template: 'blue'
          })
          .addDiv('欢迎使用全新的飞书卡片v2组件系统！')
          .addHr()
          .addColumnSet([
            {
              width: 'weighted',
              weight: 1,
              elements: [{
                type: 'div',
                content: '**左栏**\n功能特性展示'
              }]
            },
            {
              width: 'weighted', 
              weight: 1,
              elements: [{
                type: 'div',
                content: '**右栏**\n实时数据显示'
              }]
            }
          ])
          .addNote([
            { type: 'text', content: '💡 这是一个备注组件示例' }
          ])
          .addActionGroup([
            { text: '主要操作', type: 'primary', actionType: 'request', value: { action: 'primary' } },
            { text: '次要操作', type: 'default', actionType: 'request', value: { action: 'secondary' } }
          ])
          .build();
    }

    const result = await feishuService!.sendCardMessage(chatId, cardContent);
    
    res.json({
      success: true,
      data: {
        message_id: result.message_id,
        chat_id: chatId,
        template_used: template,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    handleError(res, error, '发送v2卡片测试');
  }
});

/**
 * 处理卡片交互事件
 * POST /feishu/card-actions
 * Body: { action: object, user_id: string, message_id: string }
 */
router.post('/card-actions', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { action, user_id, message_id } = req.body;
    
    logger.info('收到卡片交互事件', { 
      action, 
      user_id, 
      message_id
    });

    // 立即响应飞书服务器
    res.json({ 
      success: true,
      code: 0,
      message: 'OK'
    });

    // 异步处理卡片交互
    if (action && action.value) {
      // 从输入框中获取用户输入的回复内容
      const replyContent = action.form_value?.reply_content || action.value.reply_content;
      
      // 构建完整的action值，包含用户输入
      const actionValue = {
        ...action.value,
        reply_content: replyContent
      };
      
      await handleCardActionV1(actionValue, user_id, message_id);
    }

    return;
  } catch (error) {
    handleError(res, error, '处理卡片交互');
  }
});

/**
 * 创建评论摘要报告
 * POST /feishu/reports/review-summary
 * Body: { app_name: string, chat_id?: string }
 */
router.post('/reports/review-summary', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { app_name, chat_id } = req.body;

    if (!app_name) {
      res.status(400).json({
        success: false,
        error: '应用名称不能为空',
        code: 'MISSING_APP_NAME'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组',
          code: 'NO_CHATS_AVAILABLE'
        });
        return;
      }
    }

    // 创建模拟摘要数据（实际使用时应该从数据库获取）
    const mockReviews = [
      {
        id: '1',
        app_name,
        app_id: '1234567890',
        title: '很好用的应用',
        content: '界面简洁，功能实用',
        rating: 5,
        author: '用户A',
        store_type: 'ios' as const,
        date: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2',
        app_name,
        app_id: '1234567890',
        title: '还不错',
        content: '总体来说比较满意，但是有些地方可以改进',
        rating: 4,
        author: '用户B',
        store_type: 'ios' as const,
        date: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: '3',
        app_name,
        app_id: '1234567890',
        title: '有待改进',
        content: '功能不够完善，希望后续版本能有所改进',
        rating: 3,
        author: '用户C',
        store_type: 'android' as const,
        date: new Date(Date.now() - 259200000).toISOString()
      }
    ];

    const { RichTextFactory } = require('../utils/rich-text-factory');
    const summaryCard = RichTextFactory.createReviewSummaryMessage(app_name, mockReviews);

    const result = await feishuService!.sendCardMessage(chatId, summaryCard);
    
    res.json({
      success: true,
      data: {
        message_id: result.message_id,
        chat_id: chatId,
        app_name,
        review_count: mockReviews.length
      }
    });
  } catch (error) {
    handleError(res, error, '创建评论摘要报告');
  }
});

// ================================
// 兼容性接口（向后兼容）
// ================================

/**
 * 兼容旧版本的发送消息接口
 * POST /feishu/send-message
 */
router.post('/send-message', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { content, chat_id } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组'
        });
        return;
      }
    }

    const result = await feishuService!.sendTextMessage(chatId, content);
    
    res.json({
      success: true,
      message_id: result.message_id,
      chat_id: chatId
    });
  } catch (error) {
    handleError(res, error, '发送文本消息');
  }
});

/**
 * 兼容旧版本的发送卡片接口  
 * POST /feishu/send-card
 */
router.post('/send-card', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { card, chat_id } = req.body;

    if (!card) {
      res.status(400).json({
        success: false,
        error: '卡片内容不能为空'
      });
      return;
    }

    let chatId = chat_id;
    if (!chatId) {
      chatId = await feishuService!.getFirstChatId();
      if (!chatId) {
        res.status(404).json({
          success: false,
          error: '无法找到可用的群组'
        });
        return;
      }
    }

    const result = await feishuService!.sendCardMessage(chatId, card);
    
    res.json({
      success: true,
      message_id: result.message_id,
      chat_id: chatId
    });
  } catch (error) {
    handleError(res, error, '发送卡片消息');
  }
});

/**
 * 兼容旧版本的推送接口
 * POST /feishu/send-to
 */
router.post('/send-to', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { chat_id, content, review } = req.body;

    if (!chat_id) {
      res.status(400).json({
        success: false,
        error: '群组ID不能为空'
      });
      return;
    }

    if (review) {
      // 发送评论卡片
      await feishuService!.pushReviewToChat(chat_id, review);
    } else if (content) {
      // 发送文本消息
      await feishuService!.sendTextMessage(chat_id, content);
    } else {
      res.status(400).json({
        success: false,
        error: '必须提供content或review参数'
      });
      return;
    }
    
    res.json({
      success: true,
      chat_id: chat_id
    });
  } catch (error) {
    handleError(res, error, '推送消息');
  }
});

// 旧的函数定义已移除，使用下方的完整版本

// ================================
// 事件处理接口
// ================================

/**
 * 飞书事件处理（Webhook回调）
 * POST /feishu/events
 */
router.post('/events', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { challenge, type, event } = req.body;

    // 处理 URL 验证 - 立即返回
    if (type === 'url_verification') {
      logger.info('飞书 URL 验证 (v1)', { challenge, responseTime: Date.now() - startTime });
      return res.json({ challenge });
    }

    // 立即返回响应，避免超时
    res.json({ code: 0, msg: 'success' });
    
    const responseTime = Date.now() - startTime;
    logger.info('事件响应完成 (v1)', { 
      type, 
      responseTime,
      eventType: event?.event_type
    });

    // 异步处理事件
    if (type === 'event_callback') {
      process.nextTick(async () => {
        try {
          // 特殊处理卡片交互事件
          if (event?.event_type === 'card.action.trigger') {
            await handleCardActionEventV1(event);
          } else {
            // 其他事件交给服务处理
            await feishuService!.handleFeishuEvent(req.body);
          }
          
          logger.info('异步事件处理完成 (v1)', { 
            eventType: event?.event_type,
            totalTime: Date.now() - startTime
          });
        } catch (error) {
          logger.error('异步处理飞书事件失败 (v1)', { 
            error: error instanceof Error ? error.message : error,
            event,
            totalTime: Date.now() - startTime
          });
        }
      });
    }
    
    return; // 显式返回

  } catch (error) {
    logger.error('处理飞书事件失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      body: req.body
    });
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
    return;
  }
});

/**
 * 处理卡片交互事件 (v1)
 */
async function handleCardActionEventV1(event: any): Promise<void> {
  try {
    const { action, user_id, message_id } = event;
    
    logger.info('收到卡片交互事件 (v1)', { 
      action, 
      user_id, 
      message_id,
      event
    });

    if (action && action.value) {
      // 从输入框中获取用户输入的回复内容
      const replyContent = action.form_value?.reply_content;
      
      // 构建完整的action值，包含用户输入
      const actionValue = {
        ...action.value,
        reply_content: replyContent
      };
      
      await handleCardActionV1(actionValue, user_id, message_id);
    }
    
  } catch (error) {
    logger.error('处理卡片交互事件失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      event
    });
  }
}

/**
 * 处理卡片交互动作 (v1)
 */
async function handleCardActionV1(
  actionValue: any, 
  userId: string, 
  messageId: string
): Promise<void> {
  try {
    const { action, review_id, app_id } = actionValue;
    
    logger.info('处理卡片交互动作 (v1)', { 
      action, 
      review_id, 
      app_id, 
      userId, 
      messageId 
    });

    switch (action) {
      case 'submit_reply':
        await handleSubmitReplyV1(actionValue, userId);
        break;
      case 'view_details':
        await handleViewDetailsV1(actionValue, userId);
        break;
      case 'refresh':
        await handleRefreshV1(actionValue, userId);
        break;
      default:
        logger.warn('未知的卡片交互动作 (v1)', { action, actionValue });
    }
  } catch (error) {
    logger.error('处理卡片交互动作失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      actionValue,
      userId,
      messageId
    });
  }
}

/**
 * 处理提交回复 (v1)
 */
async function handleSubmitReplyV1(
  actionValue: any, 
  userId: string
): Promise<void> {
  try {
    const { review_id, reply_content } = actionValue;
    
    if (!review_id) {
      logger.warn('评论ID为空 (v1)', { actionValue, userId });
      return;
    }
    
    if (!reply_content || reply_content.trim().length === 0) {
      logger.warn('回复内容为空 (v1)', { review_id, userId });
      // TODO: 发送错误提示消息到飞书卡片
      return;
    }

    logger.info('开始处理评论回复 (v1)', { 
      review_id, 
      reply_content: reply_content.substring(0, 50) + '...', 
      userId 
    });

    if (!feishuService) {
      throw new Error('飞书服务未初始化');
    }

    // 调用真实的App Store Connect API回复评论
    await feishuService.handleReplyAction(review_id, reply_content, userId);
    
    logger.info('评论回复处理完成 (v1)', { review_id, userId });
    
  } catch (error) {
    logger.error('评论回复失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      actionValue,
      userId
    });
    
    // TODO: 发送错误反馈消息到飞书卡片
  }
}

/**
 * 处理查看详情 (v1)
 */
async function handleViewDetailsV1(
  actionValue: any, 
  userId: string
): Promise<void> {
  try {
    const { review_id } = actionValue;
    logger.info('用户查看评论详情 (v1)', { review_id, userId });
    // 可以发送详细信息卡片
  } catch (error) {
    logger.error('查看详情失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      actionValue,
      userId
    });
  }
}

/**
 * 处理刷新 (v1)
 */
async function handleRefreshV1(
  actionValue: any, 
  userId: string
): Promise<void> {
  try {
    const { review_id } = actionValue;
    logger.info('用户刷新评论 (v1)', { review_id, userId });
    // 可以重新获取评论信息并更新卡片
  } catch (error) {
    logger.error('刷新失败 (v1)', {
      error: error instanceof Error ? error.message : error,
      actionValue,
      userId
    });
  }
}

export default router;
