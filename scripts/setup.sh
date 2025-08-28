#!/bin/bash

# App Store 评论服务设置脚本

echo "🚀 开始设置 App Store 评论服务..."

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+ 版本"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 创建环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "✅ 环境变量文件已创建，请编辑 .env 文件填入你的配置"
else
    echo "ℹ️  环境变量文件已存在"
fi

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs

# 检查配置文件
if [ ! -f config.json ]; then
    echo "❌ config.json 文件不存在，请创建并配置"
    exit 1
fi

echo "✅ 配置文件检查通过"

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

echo "✅ 项目构建完成"

# 运行测试
echo "🧪 运行测试..."
npm test

if [ $? -ne 0 ]; then
    echo "⚠️  测试失败，但继续设置"
else
    echo "✅ 测试通过"
fi

echo ""
echo "🎉 设置完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 编辑 .env 文件，填入你的配置信息"
echo "2. 在 Supabase 中执行 database/init.sql 创建数据库表"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo "4. 访问 http://localhost:3000/api/health 检查服务状态"
echo ""
echo "📚 更多信息请查看 README.md"
