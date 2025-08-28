// 飞书事件类型
export interface FeishuEvent {
  type: 'url_verification' | 'event_callback' | 'message' | 'command';
  challenge?: string;
  event?: {
    type: string;
    message?: FeishuMessage;
    command?: FeishuCommand;
  };
}

// 飞书消息类型
export interface FeishuMessage {
  message_id: string;
  chat_id: string;
  content: string;
  sender: {
    sender_id: string;
    sender_type: string;
  };
  thread_id?: string;
  create_time?: string;
  card?: any; // 卡片消息数据
}

// 飞书指令类型
export interface FeishuCommand {
  command: string;
  text: string;
  user_id: string;
  chat_id: string;
  message_id: string;
  thread_id?: string;
}

// 飞书配置类型
export interface FeishuConfig {
  // 基础配置
  appId: string;
  appSecret: string;
  webhookUrl: string;
  verificationToken?: string;
  encryptKey?: string;
  
  // 连接配置
  mode: 'webhook' | 'eventsource' | 'hybrid';
  eventSourceUrl?: string;
  connectionTimeout?: number;
  
  // 性能配置
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  
  // 队列配置
  queueSize?: number;
  processInterval?: number;
}

// 消息任务类型
export interface MessageTask {
  id: string;
  message: FeishuMessage;
  type: 'new' | 'update' | 'reply' | 'notification';
  timestamp: number;
  retryCount: number;
}

// 队列状态类型
export interface QueueStatus {
  size: number;
  processing: boolean;
  lastProcessed: Date;
  errorCount: number;
  successCount: number;
}

// 连接模式类型
export type ConnectionMode = 'webhook' | 'eventsource' | 'hybrid';

// 模式状态类型
export interface ModeStatus {
  currentMode: ConnectionMode;
  availableModes: ConnectionMode[];
  lastSwitch: Date;
  switchCount: number;
}
