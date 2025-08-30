# MONITORING_GUIDE

系统监控与告警。

## 关键指标
| 指标 | 描述 | 默认阈值 |
| ---- | ---- | ---- |
| `sync_response_time_ms` | 单次同步耗时 | < 5000 |
| `sync_error_rate` | 同步错误率 | < 0.5 |
| `memory_increase_mb` | 内存增长 | < 10 |
| `throughput_rps` | 处理速率 | > 10 |

## 采集方式
- 日志：Winston `combined.log` / `error.log`
- Prometheus：通过 `/metrics` 暴露（示例脚本在 `scripts/export-metrics.ts`）

## 告警示例（Prometheus Alertmanager）
```yaml
- alert: HighErrorRate
  expr: sync_error_rate > 0.5
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: 错误率超过50%
```

## 本地查看
```bash
tail -f logs/error.log | grep ERROR
```
