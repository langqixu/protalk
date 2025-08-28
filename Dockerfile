# 使用 Node.js 20 Alpine 进行构建（满足 eventsource 要求）
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装全量依赖（包含 devDependencies）用于编译 TypeScript
RUN npm ci

# 复制源代码
COPY . .

# 构建 TypeScript 代码
RUN npm run build

# 仅保留运行时依赖
RUN npm prune --omit=dev

# -------- 运行时镜像 --------
FROM node:20-alpine AS runner
WORKDIR /app

# 拷贝运行所需文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/config.json ./config.json

# 日志目录
RUN mkdir -p /app/logs

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "dist/index.js"]
