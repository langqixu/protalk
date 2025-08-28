// Jest 测试设置文件

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';

// 模拟环境变量
process.env['APP_STORE_ISSUER_ID'] = 'test-issuer-id';
process.env['APP_STORE_KEY_ID'] = 'test-key-id';
process.env['APP_STORE_PRIVATE_KEY'] = 'test-private-key';
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
process.env['FEISHU_WEBHOOK_URL'] = 'https://test.feishu.cn/webhook';
process.env['PORT'] = '3000';

// 全局测试超时设置
jest.setTimeout(30000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
});
