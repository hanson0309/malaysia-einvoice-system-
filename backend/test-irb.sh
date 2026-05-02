#!/bin/bash

# IRB API 集成快速测试脚本

echo "🚀 Malaysia E-Invoice System - IRB API 测试"
echo "=========================================="
echo ""

# 检查环境变量
echo "📋 检查环境变量..."
if [ -z "$MYINVOIS_BASE_URL" ]; then
    echo "⚠️  警告: MYINVOIS_BASE_URL 未设置"
    echo "   建议设置: export MYINVOIS_BASE_URL=https://api.myinvois.hasil.gov.my"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "⚠️  警告: ENCRYPTION_KEY 未设置"
    echo "   建议设置: export ENCRYPTION_KEY=your-32-character-key"
fi

echo ""

# 编译 TypeScript
echo "🔨 编译 TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

echo "✅ 编译成功"
echo ""

# 运行测试
echo "🧪 运行单元测试..."
npm test -- irbService.test.ts

echo ""

# 启动服务器
echo "🌐 启动开发服务器..."
echo "   服务器地址: http://localhost:3000"
echo "   IRB API 端点:"
echo "   - POST /api/v1/irb/submit/:invoiceId"
echo "   - GET  /api/v1/irb/status/:invoiceId"
echo "   - POST /api/v1/irb/tin-lookup"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
