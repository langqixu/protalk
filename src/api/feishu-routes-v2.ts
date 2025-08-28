import { Router, Request, Response } from 'express';
import { IFeishuService } from '../modules/feishu/abstract/IFeishuService';
import { FeishuEvent } from '../types/feishu';
import logger from '../utils/logger';

export function createFeishuRoutesV2(feishuService: IFeishuService) {
  const router = Router();

  // 快速响应端点 - 专门用于避免超时
  router.post('/events-fast', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { challenge, type, event } = req.body;

      // 处理 URL 验证
      if (type === 'url_verification') {
        const responseTime = Date.now() - startTime;
        logger.info('快速URL验证', { challenge, responseTime });
        return res.json({ challenge });
      }

      // 立即返回响应，不进行任何处理
      res.json({ ok: true });
      
      const responseTime = Date.now() - startTime;
      logger.info('快速事件响应', { 
        type, 
        responseTime,
        eventType: event?.event_type 
      });

      // 记录事件但不处理
      logger.info('事件已记录（快速模式）', { event });
      
      return;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('快速事件处理失败', { 
        error: error instanceof Error ? error.message : error,
        responseTime
      });
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }
  });

  // 飞书事件验证 - 优化版本
  router.post('/events', async (req: Request, res: Response) => {
    // 立即开始处理，不等待任何异步操作
    const startTime = Date.now();
    
    try {
      const { challenge, type, event } = req.body;

      // 处理 URL 验证 - 立即返回
      if (type === 'url_verification') {
        logger.info('飞书 URL 验证', { challenge, responseTime: Date.now() - startTime });
        return res.json({ challenge });
      }

      // 立即返回响应，避免任何延迟
      res.json({ ok: true });
      
      const responseTime = Date.now() - startTime;
      logger.info('事件响应完成', { 
        type, 
        responseTime,
        eventType: event?.event_type,
        eventData: event,
        fullBody: req.body
      });

      // 异步处理事件 - 使用更轻量的方式
      if (type === 'event_callback') {
        // 使用process.nextTick而不是setImmediate，优先级更高
        process.nextTick(async () => {
          try {
            const feishuEvent: FeishuEvent = {
              type: 'event_callback',
              event
            };
            await feishuService.handleEvent(feishuEvent);
            logger.info('异步事件处理完成', { 
              eventType: event?.event_type,
              totalTime: Date.now() - startTime
            });
          } catch (error) {
            logger.error('异步处理飞书事件失败', { 
              error: error instanceof Error ? error.message : error,
              event,
              totalTime: Date.now() - startTime
            });
          }
        });
      }
      
      return;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('处理飞书事件失败', { 
        error: error instanceof Error ? error.message : error,
        responseTime
      });
      // 即使出错也要返回响应，避免超时
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }
  });

  // 处理斜杠指令
  router.post('/slash-commands', async (req: Request, res: Response) => {
    try {
      const { command, text, user_id, chat_id, message_id, thread_id } = req.body;

      logger.info('收到斜杠指令', { command, text, user_id, chat_id, message_id, thread_id });

      await feishuService.handleCommand({
        command,
        text,
        user_id,
        chat_id,
        message_id,
        thread_id
      });

      res.json({ ok: true });
    } catch (error) {
      logger.error('处理斜杠指令失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 服务状态查询
  router.get('/status', async (_req: Request, res: Response) => {
    try {
      const modeStatus = feishuService.getModeStatus();
      const connectionStatus = feishuService.getConnectionStatus();
      
      res.json({
        success: true,
        data: {
          mode: modeStatus,
          connection: connectionStatus
        }
      });
    } catch (error) {
      logger.error('获取服务状态失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 模式切换
  router.post('/switch-mode', async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      
      if (!mode || !['webhook', 'eventsource'].includes(mode)) {
        return res.status(400).json({ 
          success: false, 
          error: '无效的模式，支持的模式：webhook, eventsource' 
        });
      }

      await feishuService.switchMode(mode);
      
      return res.json({ 
        success: true, 
        message: `模式切换成功：${mode}`,
        data: feishuService.getModeStatus()
      });
    } catch (error) {
      logger.error('模式切换失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 重新连接
  router.post('/reconnect', async (_req: Request, res: Response) => {
    try {
      await feishuService.reconnect();
      
      res.json({ 
        success: true, 
        message: '重新连接成功',
        data: feishuService.getConnectionStatus()
      });
    } catch (error) {
      logger.error('重新连接失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 测试消息发送
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const { review, type, content } = req.body;

      if (review && type) {
        // 测试评论卡片推送
        await feishuService.pushReviewUpdate(review, type);
        return res.json({ success: true, message: '评论卡片推送成功' });
      }

      if (content) {
        // 测试简单文本消息
        await feishuService.pushReviewUpdate({
          id: 'test_review',
          appId: 'test_app',
          rating: 5,
          title: '测试消息',
          body: content,
          nickname: '测试用户',
          createdDate: new Date(),
          isEdited: false
        }, 'new');
        
        return res.json({ success: true, message: '测试消息发送成功' });
      }

      // 默认测试消息
      const defaultContent = '🧪 飞书服务测试成功！\n\n时间：' + new Date().toLocaleString('zh-CN');

      await feishuService.pushReviewUpdate({
        id: 'test_review',
        appId: 'test_app',
        rating: 5,
        title: '测试评论',
        body: defaultContent,
        nickname: '测试用户',
        createdDate: new Date(),
        isEdited: false
      }, 'new');
      
      return res.json({ success: true, message: '测试消息发送成功' });
    } catch (error) {
      logger.error('飞书服务测试失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 处理回复操作
  router.post('/reply-action', async (req: Request, res: Response) => {
    try {
      const { reviewId, replyContent, userId } = req.body;
      
      if (!reviewId || !replyContent || !userId) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少必要参数：reviewId, replyContent, userId' 
        });
      }

      await feishuService.handleReplyAction(reviewId, replyContent, userId);
      
      return res.json({ 
        success: true, 
        message: '回复操作处理成功' 
      });
    } catch (error) {
      logger.error('处理回复操作失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 获取群组列表
  router.get('/chat-list', async (_req: Request, res: Response) => {
    try {
      const chatIds = await (feishuService as any).feishuBot.getChatList();
      res.json({
        success: true,
        data: {
          chatIds,
          count: chatIds.length
        }
      });
    } catch (error) {
      logger.error('获取群组列表失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 获取第一个群组ID
  router.get('/first-chat-id', async (_req: Request, res: Response) => {
    try {
      const chatId = await (feishuService as any).feishuBot.getFirstChatId();
      res.json({
        success: true,
        data: {
          chatId,
          found: !!chatId
        }
      });
    } catch (error) {
      logger.error('获取第一个群组ID失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 发送简单消息
  router.post('/send-message', async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少content参数' 
        });
      }

      const chatId = await (feishuService as any).feishuBot.getFirstChatId();
      if (!chatId) {
        return res.status(400).json({ 
          success: false, 
          error: '没有找到可用的群组' 
        });
      }

      await (feishuService as any).feishuBot.sendMessage(chatId, content);
      
      return res.json({
        success: true,
        data: {
          message: '消息发送成功',
          chatId,
          content
        }
      });
    } catch (error) {
      logger.error('发送消息失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 发送卡片消息
  router.post('/send-card', async (req: Request, res: Response) => {
    try {
      const { cardData } = req.body;
      
      if (!cardData) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少cardData参数' 
        });
      }

      const chatId = await (feishuService as any).feishuBot.getFirstChatId();
      if (!chatId) {
        return res.status(400).json({ 
          success: false, 
          error: '没有找到可用的群组' 
        });
      }

      await (feishuService as any).feishuBot.sendCardMessage(chatId, cardData);
      
      return res.json({
        success: true,
        data: {
          message: '卡片消息发送成功',
          chatId,
          cardType: cardData.header?.title?.content
        }
      });
    } catch (error) {
      logger.error('发送卡片消息失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 指定 chat_id 发送简单消息（用于精确投递到目标群）
  router.post('/send-to', async (req: Request, res: Response) => {
    try {
      const { chat_id, content } = req.body as { chat_id?: string; content?: string };

      if (!chat_id) {
        return res.status(400).json({ success: false, error: '缺少 chat_id 参数' });
      }
      if (!content) {
        return res.status(400).json({ success: false, error: '缺少 content 参数' });
      }

      await (feishuService as any).feishuBot.sendMessage(chat_id, content);

      return res.json({ success: true, data: { message: '消息发送成功', chatId: chat_id, content } });
    } catch (error) {
      logger.error('按 chat_id 发送消息失败', { error: error instanceof Error ? error.message : error });
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
    }
  });

  // 简单的测试端点 - 用于验证JSON格式
  router.post('/test-json', async (req: Request, res: Response) => {
    try {
      const { challenge, type } = req.body;

      // 处理 URL 验证
      if (type === 'url_verification') {
        logger.info('测试URL验证', { challenge });
        return res.json({ challenge });
      }

      // 返回简单的成功响应
      return res.json({ ok: true });
    } catch (error) {
      logger.error('测试端点错误', { error: error instanceof Error ? error.message : error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 最简单的测试端点 - 用于诊断问题
  router.post('/simple', async (req: Request, res: Response) => {
    logger.info('收到简单测试请求', { body: req.body });
    
    // 设置明确的响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 返回最简单的响应
    const response = { ok: true };
    logger.info('发送简单响应', { response });
    
    return res.json(response);
  });

  // 最简单的URL验证端点
  router.post('/verify', async (req: Request, res: Response) => {
    logger.info('收到URL验证请求', { body: req.body });
    
    // 设置明确的响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const { challenge, type } = req.body;
    
    if (type === 'url_verification' && challenge) {
      const response = { challenge };
      logger.info('发送URL验证响应', { response });
      return res.json(response);
    }
    
    const response = { ok: true };
    logger.info('发送默认响应', { response });
    return res.json(response);
  });

  return router;
}
