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
 * 获取服务状态 / 紧急修复
 * GET /feishu/status?emergency=mark-historical&confirm=true
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    // 🚨 紧急修复逻辑
    if (req.query['emergency'] === 'mark-historical') {
      logger.info('🚨 通过status端点执行紧急修复');
      
      const { SupabaseManager } = require('../modules/storage/SupabaseManager');
      const dbManager = new SupabaseManager();
      
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
      
      if (req.query['confirm'] === 'true') {
        // 实际执行
        const { error: updateError } = await dbManager.client
          .from('app_reviews')
          .update({ 
            is_pushed: true, 
            push_type: 'emergency_historical_batch',
            updated_at: new Date().toISOString()
          })
          .lt('created_date', cutoff.toISOString())
          .or('is_pushed.is.null,is_pushed.eq.false');
        
        if (updateError) {
          throw new Error(`紧急修复失败: ${updateError.message}`);
        }
        
        logger.info('✅ 紧急修复完成：历史评论已标记为已推送');
        
        res.json({
          success: true,
          emergency: 'completed',
          message: '历史评论已批量标记为已推送',
          cutoffDate: cutoff.toISOString()
        });
        return;
      } else {
        // 预览模式
        const { data: reviews, error: queryError } = await dbManager.client
          .from('app_reviews')
          .select('review_id, created_date, title')
          .lt('created_date', cutoff.toISOString())
          .or('is_pushed.is.null,is_pushed.eq.false')
          .limit(10);
        
        if (queryError) {
          throw new Error(`查询失败: ${queryError.message}`);
        }
        
        res.json({
          success: true,
          emergency: 'preview',
          message: `发现 ${reviews.length} 条未推送的历史评论`,
          cutoffDate: cutoff.toISOString(),
          sampleReviews: reviews.slice(0, 5).map((r: any) => ({
            id: r.review_id.slice(0, 20) + '...',
            date: r.created_date,
            title: r.title?.slice(0, 30) + '...'
          })),
          instruction: '添加 &confirm=true 参数执行实际修复'
        });
        return;
      }
    }

    // 正常状态查询
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
        // 🔧 优化模拟评论数据，使用真实appId和更丰富的测试内容
        const mockReview = {
          reviewId: 'test_review_' + Date.now(),
          appId: '1077776989', // 潮汐应用的真实ID
          rating: 5,
          title: '优秀的专注应用！',
          body: '潮汐真的是一个非常棒的专注应用！界面设计简洁美观，各种自然声音很舒缓，帮助我在工作和学习时保持专注。特别喜欢番茄钟功能，让我的时间管理更加高效。强烈推荐给需要提高专注力的朋友们！',
          reviewerNickname: '专注达人小张',
          createdDate: new Date(),
          isEdited: false,
          territoryCode: 'CN',
          responseBody: null,
          responseDate: null,
          isPushed: false,
          pushType: 'new' as const,
          firstSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
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
 * 处理卡片交互事件 (兼容旧版本)
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
  
  // 🔧 DEBUG: 打印所有原始事件
  console.log('🚨 RAW EVENT:', JSON.stringify(req.body, null, 2));
  
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
          logger.info('🔧 DEBUG: 处理事件回调', {
            eventType: event?.event_type,
            action: event?.action,
            hasAction: !!event?.action,
            hasValue: !!event?.action?.value
          });
          
          // 特殊处理卡片交互事件（兼容新旧版本）
          if (event?.event_type === 'card.action.trigger' || event?.event_type === 'card.action.trigger_v1') {
            await handleCardActionEventV1(event);
          } else if (event?.event_type === 'card.form.submit') {
            // 处理模态框表单提交事件
            await handleModalSubmitEvent(event);
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
 * 处理卡片交互事件 (v1) - 支持 form 表单容器
 */
async function handleCardActionEventV1(event: any): Promise<void> {
  try {
    const { action, user_id, message_id, trigger_id, form_value } = event;
    
    logger.info('收到卡片交互事件 (v1)', { 
      action, 
      user_id, 
      message_id,
      trigger_id,
      eventType: event.event_type,
      hasFormValue: !!form_value,
      actionValue: action?.value,
      fullEvent: JSON.stringify(event).substring(0, 500) + '...'
    });

    if (action && action.value) {
      // 从飞书官方 form 表单容器中获取用户输入
      const replyContent = form_value?.reply_content || action.form_value?.reply_content;
      
      // 构建完整的action值，包含用户输入
      const actionValue = {
        ...action.value,
        reply_content: replyContent,
        trigger_id: trigger_id // 添加 trigger_id 用于模态框
      };
      
      logger.debug('解析的表单数据', {
        replyContent: replyContent?.substring(0, 50) + (replyContent?.length > 50 ? '...' : ''),
        actionType: actionValue.action
      });
      
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
 * 处理卡片交互动作 (v1) - 支持完整回复流程
 */
async function handleCardActionV1(
  actionValue: any, 
  userId: string, 
  messageId: string
): Promise<void> {
  try {
    // 兼容新的简化格式 {a: "action"} 和旧格式 {action: "action"}
    const action = actionValue.a || actionValue.action;
    const { review_id, app_name, author, reply_content } = actionValue;
    
    logger.info('处理卡片交互动作 (v1)', { 
      action, 
      review_id, 
      app_name, 
      author,
      userId, 
      messageId,
      hasReplyContent: !!reply_content
    });

    switch (action) {
      case 'ping':
        // 🧪 处理极简测试按钮
        logger.info('🎯 收到测试按钮点击！', { actionValue, userId, messageId });
        // 简单回复确认收到
        if (feishuService) {
          const confirmCard = {
            config: { wide_screen_mode: true },
            header: {
              title: { tag: 'plain_text', content: '✅ 按钮测试成功' },
              template: 'green'
            },
            elements: [
              {
                tag: 'div',
                text: { tag: 'plain_text', content: `按钮点击事件成功收到！时间戳：${actionValue.t}` }
              }
            ]
          };
          await feishuService.updateCardMessage(messageId, confirmCard);
        }
        break;
      case 'reply_review':
        await handleReplyReview(review_id, messageId);
        break;
      case 'submit_reply':
        await handleSubmitReply(review_id, reply_content, messageId);
        break;
      case 'edit_reply':
        await handleEditReply(review_id, messageId);
        break;
      case 'update_reply':
        await handleUpdateReply(review_id, reply_content, messageId);
        break;
      case 'cancel_reply':
      case 'cancel_edit':
        await handleCancelReply(review_id, messageId);
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

/**
 * 部署验证接口
 * POST /feishu/deployment/verify
 * 推送最新5条评论来验证卡片功能
 */
router.post('/deployment/verify', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    // 导入部署验证服务
    const { DeploymentVerificationService } = require('../services/DeploymentVerificationService');
    
    // 获取推送服务实例
    const pusher = feishuService;
    
    if (!pusher) {
      res.status(500).json({
        success: false,
        error: '飞书服务未初始化'
      });
      return;
    }
    
    // 直接创建数据库管理器实例
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const { loadConfig } = require('../config');
    const { env: envConfig } = loadConfig();
    const db = new SupabaseManager({ supabase: envConfig.supabase });

    // 创建验证服务实例
    const verificationService = new DeploymentVerificationService(db, pusher);
    
    logger.info('开始执行部署验证', { 
      timestamp: new Date().toISOString(),
      requestIP: req.ip 
    });

    // 执行验证流程
    const result = await verificationService.runDeploymentVerification();

    res.json({
      success: true,
      message: '部署验证完成',
      data: result
    });

  } catch (error) {
    handleError(res, error, '部署验证失败');
  }
});

/**
 * 获取最新评论接口（仅用于验证）
 * GET /feishu/deployment/latest-reviews
 */
router.get('/deployment/latest-reviews', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { DeploymentVerificationService } = require('../services/DeploymentVerificationService');
    
    // 直接创建数据库管理器实例
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const { loadConfig } = require('../config');
    const { env: envConfig } = loadConfig();
    const db = new SupabaseManager({ supabase: envConfig.supabase });

    const verificationService = new DeploymentVerificationService(db, null as any);
    const limit = parseInt(req.query['limit'] as string) || 5;
    
    const reviews = await verificationService.getLatestReviews(limit);

    res.json({
      success: true,
      data: {
        reviews: reviews.map((review: any) => ({
          reviewId: review.reviewId,
          appId: review.appId,
          rating: review.rating,
          title: review.title,
          body: review.body?.substring(0, 100) + '...',
          reviewerNickname: review.reviewerNickname,
          reviewDate: review.createdDate,
          isPushed: review.isPushed,
          pushType: review.pushType
        })),
        count: reviews.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    handleError(res, error, '获取最新评论失败');
  }
});

/**
 * 处理模态对话框提交事件
 * POST /feishu/modal-actions
 */
router.post('/modal-actions', async (req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    const { view, user_id } = req.body;
    
    logger.info('收到模态对话框提交事件', { 
      view_id: view?.view_id,
      user_id
    });

    // 立即响应飞书服务器
    res.json({ 
      success: true,
      code: 0,
      message: 'OK'
    });

    // 异步处理模态对话框提交
    if (view && view.state && view.state.values) {
      await handleModalSubmit(view, user_id);
    }

      return;
  } catch (error) {
    handleError(res, error, '处理模态对话框提交');
  }
});

// ================================
// 新的卡片交互处理函数
// ================================

/**
 * 处理"回复评论"按钮点击 - 展开输入框
 */
async function handleReplyReview(reviewId: string, messageId: string): Promise<void> {
  try {
    if (!feishuService) {
      logger.error('飞书服务未初始化');
      return;
    }

    logger.info('处理回复评论交互', { reviewId, messageId });

    // 从数据库获取评论数据
    const review = await getReviewFromDatabase(reviewId);
    if (!review) {
      logger.error('评论不存在', { reviewId });
      return;
    }

    // 构建带有输入框的卡片数据
    const { buildReviewCardV2 } = require('../utils/feishu-card-v2-builder');
    const cardData = buildReviewCardV2({
      ...review,
      card_state: 'replying',
      message_id: messageId
    });
    
    // 更新卡片
    await feishuService!.updateCardMessage(messageId, cardData);

    // 更新数据库中的卡片状态
    await updateReviewCardState(reviewId, 'replying', messageId);

    logger.info('回复评论卡片更新成功', { reviewId, messageId });
  } catch (error) {
    logger.error('处理回复评论失败', { 
      reviewId, 
      messageId, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理"提交回复"按钮点击 - 提交开发者回复
 */
async function handleSubmitReply(reviewId: string, replyContent: string, messageId: string): Promise<void> {
  try {
    if (!feishuService) {
      logger.error('飞书服务未初始化');
      return;
    }

    if (!replyContent || replyContent.trim().length === 0) {
      logger.warn('回复内容为空', { reviewId });
      return;
    }

    logger.info('处理提交回复', { reviewId, messageId, replyLength: replyContent.length });

    // 从数据库获取评论数据
    const review = await getReviewFromDatabase(reviewId);
    if (!review) {
      logger.error('评论不存在', { reviewId });
      return;
    }

    // 调用 App Store Connect API 提交回复
    const replyResult = await submitReplyToAppStore(reviewId, replyContent);
    
    if (!replyResult.success) {
      logger.error('App Store 回复提交失败', { reviewId, error: replyResult.error });
      return;
    }

    // 更新数据库中的开发者回复
    await updateDeveloperReply(reviewId, replyContent, replyResult.responseDate);

    // 获取更新后的评论数据
    const updatedReview = await getReviewFromDatabase(reviewId);
    
    // 构建已回复状态的卡片
    const { buildReviewCardV2 } = require('../utils/feishu-card-v2-builder');
    const cardData = buildReviewCardV2({
      ...updatedReview,
      card_state: 'replied',
      message_id: messageId
    });
    
    // 更新卡片显示
    await feishuService!.updateCardMessage(messageId, cardData);

    // 更新数据库中的卡片状态
    await updateReviewCardState(reviewId, 'replied', messageId);

    logger.info('提交回复成功', { reviewId, messageId });
  } catch (error) {
    logger.error('处理提交回复失败', { 
      reviewId, 
      messageId, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理"编辑回复"按钮点击 - 展开编辑输入框
 */
async function handleEditReply(reviewId: string, messageId: string): Promise<void> {
  try {
    if (!feishuService) {
      logger.error('飞书服务未初始化');
      return;
    }

    logger.info('处理编辑回复交互', { reviewId, messageId });

    // 从数据库获取评论数据
    const review = await getReviewFromDatabase(reviewId);
    if (!review) {
      logger.error('评论不存在', { reviewId });
      return;
    }

    // 更新卡片状态为 'editing_reply' 并显示预填充的输入框
    const updatedCard = feishuService!.createReviewCard(review, 'editing_reply');
    await feishuService!.updateCardMessage(messageId, updatedCard);

    // 更新数据库中的卡片状态
    await updateReviewCardState(reviewId, 'editing_reply', messageId);

    logger.info('编辑回复卡片更新成功', { reviewId, messageId });
  } catch (error) {
    logger.error('处理编辑回复失败', { 
      reviewId, 
      messageId, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理"更新回复"按钮点击 - 更新开发者回复
 */
async function handleUpdateReply(reviewId: string, replyContent: string, messageId: string): Promise<void> {
  try {
    if (!feishuService) {
      logger.error('飞书服务未初始化');
      return;
    }

    if (!replyContent || replyContent.trim().length === 0) {
      logger.warn('回复内容为空', { reviewId });
      return;
    }

    logger.info('处理更新回复', { reviewId, messageId, replyLength: replyContent.length });

    // 从数据库获取评论数据
    const review = await getReviewFromDatabase(reviewId);
    if (!review) {
      logger.error('评论不存在', { reviewId });
      return;
    }

    // 调用 App Store Connect API 更新回复
    const replyResult = await submitReplyToAppStore(reviewId, replyContent);
    
    if (!replyResult.success) {
      logger.error('App Store 回复更新失败', { reviewId, error: replyResult.error });
      return;
    }

    // 更新数据库中的开发者回复
    await updateDeveloperReply(reviewId, replyContent, replyResult.responseDate);

    // 获取更新后的评论数据
    const updatedReview = await getReviewFromDatabase(reviewId);
    
    // 更新卡片显示更新后的回复，状态改为 'replied'
    const updatedCard = feishuService!.createReviewCard(updatedReview, 'replied');
    await feishuService!.updateCardMessage(messageId, updatedCard);

    // 更新数据库中的卡片状态
    await updateReviewCardState(reviewId, 'replied', messageId);

    logger.info('更新回复成功', { reviewId, messageId });
  } catch (error) {
    logger.error('处理更新回复失败', { 
      reviewId, 
      messageId, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理"取消"按钮点击 - 恢复初始状态
 */
async function handleCancelReply(reviewId: string, messageId: string): Promise<void> {
  try {
    if (!feishuService) {
      logger.error('飞书服务未初始化');
      return;
    }

    logger.info('处理取消回复交互', { reviewId, messageId });

    // 从数据库获取评论数据
    const review = await getReviewFromDatabase(reviewId);
    if (!review) {
      logger.error('评论不存在', { reviewId });
      return;
    }

    // 判断原始状态
    const originalState = review.responseBody ? 'replied' : 'initial';
    
    // 恢复到原始状态
    const updatedCard = feishuService!.createReviewCard(review, originalState);
    await feishuService!.updateCardMessage(messageId, updatedCard);

    // 更新数据库中的卡片状态
    await updateReviewCardState(reviewId, originalState, messageId);

    logger.info('取消回复成功', { reviewId, messageId, originalState });
  } catch (error) {
    logger.error('处理取消回复失败', { 
      reviewId, 
      messageId, 
      error: error instanceof Error ? error.message : error 
    });
  }
}



// ================================
// 数据库操作辅助函数
// ================================

/**
 * 从数据库获取评论数据
 */
async function getReviewFromDatabase(reviewId: string): Promise<any> {
  try {
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const dbManager = new SupabaseManager();

    const result = await dbManager.client
      .from('app_reviews')
      .select('*')
      .eq('review_id', reviewId)
      .single();

    if (result.error) {
      logger.error('查询评论失败', { reviewId, error: result.error.message });
      return null;
    }

    // 转换数据库字段到 AppReview 格式
    const review = {
      reviewId: result.data.review_id,
      appId: result.data.app_id,
      rating: result.data.rating,
      title: result.data.title,
      body: result.data.body,
      reviewerNickname: result.data.nickname,
      createdDate: new Date(result.data.review_date),
      isEdited: result.data.is_edited,
      responseBody: result.data.response_body,
      responseDate: result.data.response_date ? new Date(result.data.response_date) : null,
      appVersion: result.data.app_version,
      territoryCode: result.data.territory_code,
      feishuMessageId: result.data.feishu_message_id,
      cardState: result.data.card_state || 'initial'
    };

    return review;
  } catch (error) {
    logger.error('获取评论数据失败', { reviewId, error: error instanceof Error ? error.message : error });
    return null;
  }
}

/**
 * 更新评论的卡片状态
 */
async function updateReviewCardState(reviewId: string, cardState: string, messageId?: string): Promise<void> {
  try {
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const dbManager = new SupabaseManager();

    const updateData: any = { card_state: cardState };
    if (messageId) {
      updateData.feishu_message_id = messageId;
    }

    const result = await dbManager.client
      .from('app_reviews')
      .update(updateData)
      .eq('review_id', reviewId);

    if (result.error) {
      logger.error('更新评论卡片状态失败', { reviewId, cardState, error: result.error.message });
    } else {
      logger.info('评论卡片状态更新成功', { reviewId, cardState, messageId });
    }
  } catch (error) {
    logger.error('更新评论卡片状态异常', { reviewId, cardState, error: error instanceof Error ? error.message : error });
  }
}

/**
 * 更新开发者回复内容
 */
async function updateDeveloperReply(reviewId: string, replyContent: string, responseDate: Date): Promise<void> {
  try {
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const dbManager = new SupabaseManager();

    const result = await dbManager.client
      .from('app_reviews')
      .update({
        response_body: replyContent,
        response_date: responseDate.toISOString()
      })
      .eq('review_id', reviewId);

    if (result.error) {
      logger.error('更新开发者回复失败', { reviewId, error: result.error.message });
    } else {
      logger.info('开发者回复更新成功', { reviewId, replyLength: replyContent.length });
    }
  } catch (error) {
    logger.error('更新开发者回复异常', { reviewId, error: error instanceof Error ? error.message : error });
  }
}

/**
 * 提交回复到 App Store Connect API
 */
async function submitReplyToAppStore(reviewId: string, replyContent: string): Promise<{ success: boolean; responseDate: Date; error?: string }> {
  try {
    // 这里应该调用实际的 App Store Connect API
    // 目前返回模拟结果
    logger.info('模拟提交回复到 App Store', { reviewId, replyLength: replyContent.length });
    
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      responseDate: new Date()
    };
  } catch (error) {
    logger.error('提交 App Store 回复失败', { reviewId, error: error instanceof Error ? error.message : error });
    return {
      success: false,
      responseDate: new Date(),
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 处理模态框表单提交事件（从 /feishu/events 调用）
 */
async function handleModalSubmitEvent(event: any): Promise<void> {
  try {
    logger.info('处理模态框表单提交事件', { 
      eventType: event.event_type,
      userId: event?.operator?.user_id 
    });

    // 适配事件结构到原有的 handleModalSubmit 函数
    const view = {
      view_id: event?.modal_id || event?.id,
      state: event?.form_data || event?.state,
      external_id: event?.external_id
    };

    await handleModalSubmit(view, event?.operator?.user_id || 'unknown');
  } catch (error) {
    logger.error('处理模态框表单提交事件失败', { 
      error: error instanceof Error ? error.message : error,
      event
    });
  }
}

/**
 * 处理模态对话框提交
 */
async function handleModalSubmit(view: any, userId: string): Promise<void> {
  try {
    logger.info('处理模态对话框提交', { view_id: view.view_id, userId });

    // 解析表单数据
    const formValues: any = view.state.values;
    const formValuesList = Object.values(formValues);
    const issueType = (formValuesList[0] as any)?.['issue_type']?.option?.value;
    const description = (formValuesList[1] as any)?.['description']?.value;

    if (!issueType) {
      logger.warn('模态对话框缺少问题类型', { userId, view_id: view.view_id });
      return;
    }

    // 从 view_id 或其他地方获取 review_id (需要在打开 modal 时传递)
    // 这里我们假设可以从某种方式获取到 review_id
    const reviewId = extractReviewIdFromModal(view);

    if (!reviewId) {
      logger.error('无法从模态对话框中获取评论ID', { userId, view_id: view.view_id });
      return;
    }

    // 保存问题报告到数据库
    await saveIssueReport(reviewId, issueType, description || '', userId);

    logger.info('问题报告保存成功', { 
      reviewId, 
      issueType, 
      userId,
      hasDescription: !!description 
    });

  } catch (error) {
    logger.error('处理模态对话框提交失败', { 
      userId, 
      view_id: view?.view_id,
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 从模态对话框中提取评论ID
 */
function extractReviewIdFromModal(view: any): string | null {
  try {
    // 这里需要根据实际的飞书 modal 结构来提取 review_id
    // 可能需要在打开 modal 时将 review_id 编码到 view_id 或其他字段中
    return view.external_id || view.view_id?.split('_')?.[1] || null;
  } catch (error) {
    logger.error('提取评论ID失败', { error: error instanceof Error ? error.message : error });
    return null;
  }
}

/**
 * 保存问题报告到数据库
 */
async function saveIssueReport(
  reviewId: string, 
  issueType: string, 
  description: string, 
  reporterOpenId: string
): Promise<void> {
  try {
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const dbManager = new SupabaseManager();

    const result = await dbManager.client
      .from('review_issue_reports')
      .insert({
        review_id: reviewId,
        issue_type: issueType,
        description: description,
        reporter_open_id: reporterOpenId,
        status: 'pending'
      });

    if (result.error) {
      logger.error('保存问题报告失败', { 
        reviewId, 
        issueType, 
        error: result.error.message 
      });
    } else {
      logger.info('问题报告保存成功', { 
        reviewId, 
        issueType, 
        reporterOpenId 
      });
    }
  } catch (error) {
    logger.error('保存问题报告异常', { 
      reviewId, 
      issueType, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

// 🚨 紧急修复API：批量标记历史评论为已推送
router.post('/emergency/mark-historical-pushed', async (req: Request, res: Response) => {
  try {
    logger.info('🚨 执行紧急修复：批量标记历史评论为已推送');
    
    const { cutoffDate, dryRun = true } = req.body;
    const cutoff = cutoffDate ? new Date(cutoffDate) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
    
    // 创建数据库连接
    const { SupabaseManager } = require('../modules/storage/SupabaseManager');
    const dbManager = new SupabaseManager();
    
    // 查询需要标记的评论
    const { data: reviews, error: queryError } = await dbManager.client
      .from('app_reviews')
      .select('review_id, created_date, title')
      .lt('created_date', cutoff.toISOString())
      .or('is_pushed.is.null,is_pushed.eq.false');
    
    if (queryError) {
      throw new Error(`查询失败: ${queryError.message}`);
    }
    
    logger.info(`找到 ${reviews.length} 条需要标记的历史评论`);
    
    if (dryRun) {
      res.json({
        success: true,
        dryRun: true,
        message: `找到 ${reviews.length} 条历史评论待标记`,
        cutoffDate: cutoff.toISOString(),
        sampleReviews: reviews.slice(0, 5).map((r: any) => ({
          id: r.review_id.slice(0, 20) + '...',
          date: r.created_date,
          title: r.title?.slice(0, 30) + '...'
        }))
      });
      return;
    }
    
    // 实际执行标记
    const { error: updateError } = await dbManager.client
      .from('app_reviews')
      .update({ 
        is_pushed: true, 
        push_type: 'historical_batch',
        updated_at: new Date().toISOString()
      })
      .lt('created_date', cutoff.toISOString())
      .or('is_pushed.is.null,is_pushed.eq.false');
    
    if (updateError) {
      throw new Error(`批量更新失败: ${updateError.message}`);
    }
    
    logger.info(`✅ 成功标记 ${reviews.length} 条历史评论为已推送`);
    
    res.json({
      success: true,
      message: `成功标记 ${reviews.length} 条历史评论为已推送`,
      updatedCount: reviews.length,
      cutoffDate: cutoff.toISOString()
    });
    
  } catch (error) {
    logger.error('🚨 紧急修复失败', { 
      error: error instanceof Error ? error.message : error 
    });
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 🧪 极简按钮测试端点  
router.post('/test/simple-button', async (_req: Request, res: Response) => {
  try {
    if (!ensureServiceInitialized(res)) return;

    logger.info('🧪 发送极简按钮测试卡片');

    // 最简单的卡片格式，符合飞书V2标准
    const simpleCard = {
      elements: [
        {
          tag: 'div',
          text: { tag: 'plain_text', content: '🧪 测试按钮交互' }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '点击测试' },
              type: 'primary',
              action_type: 'request',
              value: { action: 'ping' }
            }
          ]
        }
      ]
    };

    const chatId = await feishuService!.getFirstChatId();
    await feishuService!.sendCardMessage(chatId!, simpleCard);

    res.json({
      success: true,
      message: '极简测试卡片发送成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    handleError(res, error, '发送测试卡片');
  }
});

export default router;
