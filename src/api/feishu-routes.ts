import { Router, Request, Response } from 'express';
import { FeishuBot } from '../modules/feishu/FeishuBot';
import logger from '../utils/logger';

export function createFeishuRoutes(bot: FeishuBot) {
  const router = Router();

  // 飞书事件验证
  router.post('/events', async (req: Request, res: Response) => {
    try {
      const { challenge, type, event } = req.body;

      // 处理 URL 验证
      if (type === 'url_verification') {
        logger.info('飞书 URL 验证', { challenge });
        return res.json({ challenge });
      }

      // 处理事件
      if (type === 'event_callback') {
        await handleFeishuEvent(event);
      }

      return res.json({ ok: true });
    } catch (error) {
      logger.error('处理飞书事件失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 处理斜杠指令
  router.post('/slash-commands', async (req: Request, res: Response) => {
    try {
      const { command, text, user_id, chat_id, message_id, thread_id } = req.body;

      logger.info('收到斜杠指令', { command, text, user_id, chat_id, message_id, thread_id });

      await bot.handleSlashCommand({
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

  // 注册斜杠指令
  router.post('/register-commands', async (_req: Request, res: Response) => {
    try {
      await bot.registerSlashCommands();
      res.json({ success: true, message: '斜杠指令注册成功' });
    } catch (error) {
      logger.error('注册斜杠指令失败', { 
        error: error instanceof Error ? error.message : error 
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // 测试飞书机器人
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const { chat_id } = req.body;
      
      if (!chat_id) {
        return res.status(400).json({ error: '缺少 chat_id 参数' });
      }

      await bot.sendMessage(chat_id, '🧪 飞书机器人测试成功！\n\n时间：' + new Date().toLocaleString('zh-CN'));
      
      return res.json({ success: true, message: '测试消息发送成功' });
    } catch (error) {
      logger.error('飞书机器人测试失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  return router;
}

/**
 * 处理飞书事件
 */
async function handleFeishuEvent(event: any): Promise<void> {
  try {
    const { event_type } = event;

    switch (event_type) {
      case 'message':
        await handleMessageEvent(event);
        break;
      case 'slash_command':
        await handleSlashCommandEvent(event);
        break;
      default:
        logger.debug('未处理的事件类型', { event_type });
    }
  } catch (error) {
    logger.error('处理飞书事件失败', { 
      event, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理消息事件
 */
async function handleMessageEvent(event: any): Promise<void> {
  try {
    const { message, sender } = event;
    
    logger.info('收到消息事件', { 
      message_id: message.message_id,
      chat_id: message.chat_id,
      sender_id: sender.sender_id
    });

    // 这里可以添加消息处理逻辑
    // 比如检测是否包含特定关键词等

  } catch (error) {
    logger.error('处理消息事件失败', { 
      event, 
      error: error instanceof Error ? error.message : error 
    });
  }
}

/**
 * 处理斜杠指令事件
 */
async function handleSlashCommandEvent(event: any): Promise<void> {
  try {
    const { command, text, user_id, chat_id, message_id, thread_id } = event;
    
    logger.info('收到斜杠指令事件', { 
      command, 
      text, 
      user_id, 
      chat_id, 
      message_id, 
      thread_id 
    });

    // 这里可以添加指令处理逻辑
    // 实际的指令处理在 FeishuBot 中完成

  } catch (error) {
    logger.error('处理斜杠指令事件失败', { 
      event, 
      error: error instanceof Error ? error.message : error 
    });
  }
}
