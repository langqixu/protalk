import crypto from 'crypto';

/**
 * 飞书签名校验工具
 * 根据官方文档实现签名算法
 */
export class FeishuSignature {
  /**
   * 生成签名
   * @param secret 机器人的签名密钥
   * @param timestamp 时间戳
   */
  static generateSignature(secret: string, timestamp: number): string {
    const stringToSign = `${timestamp}\n${secret}`;
    return crypto
      .createHmac('sha256', stringToSign)
      .digest('base64');
  }

  /**
   * 验证签名
   * @param secret 机器人的签名密钥
   * @param timestamp 时间戳
   * @param signature 收到的签名
   */
  static verifySignature(secret: string, timestamp: number, signature: string): boolean {
    const expectedSignature = this.generateSignature(secret, timestamp);
    return expectedSignature === signature;
  }

  /**
   * 为请求添加签名头
   * @param secret 签名密钥
   */
  static getSignatureHeaders(secret: string): { timestamp: string; sign: string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(secret, timestamp);
    
    return {
      timestamp: timestamp.toString(),
      sign
    };
  }
}
