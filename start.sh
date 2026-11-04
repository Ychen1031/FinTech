#!/bin/bash
# 銀齡金融翻譯官：一鍵啟動腳本（同時啟動 Python FastAPI 後端與 React 前端）

cd "$(dirname "$0")"

echo "======================================================"
echo "  啟動【銀齡金融翻譯官】高齡者金融文件 AI 導讀與行動指引服務"
echo "======================================================"

# 啟動後端 FastAPI (Port 8001)
echo "👉 正在啟動 Python FastAPI 後端服務 (http://127.0.0.1:8001) ..."
cd backend
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# 啟動前端 React + Vite (Port 5173)
echo "👉 正在啟動 React 前端服務 (http://localhost:5173) ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "------------------------------------------------------"
echo "✅ 系統已啟動！"
echo "🌐 前端操作畫面：http://localhost:5173"
echo "🔌 後端 API 文件：http://127.0.0.1:8001/docs"
echo "按 Ctrl+C 可同時關閉前後端服務。"
echo "------------------------------------------------------"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
