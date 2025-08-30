# ERROR_HANDLING_GUIDE

统一错误处理与日志规范。

## 核心工具
- `error-handler.ts`
  - `getErrorMessage(err)` 获取安全字符串
  - `logError(context, err, meta)` 标准化日志
- `operation-logger.ts`
  - `createOperationLogger(name)` 步骤级别日志
  - `createBatchLogger(name,total)` 批处理统计

## 使用示例
```ts
import { createOperationLogger } from 'utils/operation-logger';

const logger = createOperationLogger('同步评论');
logger.progress('开始调用 API');
...
logger.success();
```

## 设计原则
1. 业务代码不直接使用 `console.*`
2. 捕获未知异常时第一时间 `logError`
3. 日志字段必须 JSON 可序列化
