# TEST_GUIDE

项目测试体系说明。

## 测试分类
| 目录 | 类型 | 说明 |
| ---- | ---- | ---- |
| `src/test` | 单元 | 纯逻辑函数、IO Mock |
| `src/test/integration` | 集成 | 模块协作、API 端到端 |
| `src/test/performance` | 性能 | 吞吐量、内存、并发 |
| `src/test/monitoring` | 监控 | 健康检查、告警阈值 |

## 运行脚本
```bash
pnpm test              # 全部
pnpm test src/test     # 仅单元
pnpm test src/test/integration
pnpm test src/test/performance
pnpm test src/test/monitoring
```

## 覆盖率要求
- 行覆盖 >= 80%
- 分支覆盖 >= 70%
- 指标在 CI 中通过 `--coverage` 自动收集。

## 新增测试指引
1. 文件命名 `*.test.ts`
2. 单元测试使用 Jest Mock 依赖
3. 集成测试避免真实外部请求，使用 Stub
4. 不要在性能/监控测试断言业务逻辑
