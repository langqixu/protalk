import { FeishuEvent, FeishuMessage, FeishuCommand } from '../../../types/feishu';

export type FeishuMode = 'webhook' | 'eventsource' | 'hybrid';

export interface ConnectionStatus {
  mode: FeishuMode;
  connected: boolean;
  lastHeartbeat: Date;
  errorCount: number;
  messageCount: number;
}

export interface IFeishuMode {
  // 初始化
  initialize(): Promise<void>;
  
  // 消息推送
  pushMessage(message: FeishuMessage): Promise<void>;
  pushBatch(messages: FeishuMessage[]): Promise<void>;
  
  // 事件处理
  handleEvent(event: FeishuEvent): Promise<void>;
  handleMessage(message: FeishuMessage): Promise<void>;
  handleCommand(command: FeishuCommand): Promise<void>;
  
  // 连接状态
  isConnected(): boolean;
  getStatus(): ConnectionStatus;
  
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
}
