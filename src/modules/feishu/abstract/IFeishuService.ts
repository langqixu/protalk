import { IPusher } from '../../../types';
import { FeishuEvent, FeishuMessage, FeishuCommand } from '../../../types/feishu';
import { ConnectionStatus, FeishuMode } from './IFeishuMode';

export interface IFeishuService extends IPusher {
  // 模式管理
  mode: FeishuMode;
  switchMode(mode: FeishuMode): Promise<void>;
  getModeStatus(): ModeStatus;
  
  // 连接管理
  getConnectionStatus(): ConnectionStatus;
  reconnect(): Promise<void>;
  
  // 事件处理
  handleEvent(event: FeishuEvent): Promise<void>;
  handleMessage(message: FeishuMessage): Promise<void>;
  handleCommand(command: FeishuCommand): Promise<void>;
  
  // 回复操作处理
  handleReplyAction(reviewId: string, replyContent: string, userId: string): Promise<void>;
  
  // 服务管理
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ModeStatus {
  currentMode: FeishuMode;
  availableModes: FeishuMode[];
  lastSwitch: Date;
  switchCount: number;
  isHealthy: boolean;
}
