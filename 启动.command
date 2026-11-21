#!/bin/bash
# 在 Finder 里双击本文件即可启动「镜台」。
# 关闭弹出的终端窗口即停止服务。

cd "$(cd "$(dirname "$0")" && pwd)" || exit 1

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm use --silent 22 >/dev/null 2>&1 || nvm use --silent default >/dev/null 2>&1 || true
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"

pause() {
  echo
  echo "按回车关闭窗口。"
  read -r _
}

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js。请先安装 Node 20 或更高版本：https://nodejs.org"
  pause
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.26.1 --activate
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未找到 pnpm。请先安装 pnpm 10：https://pnpm.io/installation"
  pause
  exit 1
fi

if [ ! -d node_modules ] || [ ! -d src/frontend/node_modules ]; then
  echo "首次启动，正在安装依赖…"
  if ! pnpm install; then
    echo "依赖安装失败。"
    pause
    exit 1
  fi
fi

PORT=5173
URL="http://127.0.0.1:${PORT}/"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 ${PORT} 已有服务在运行，直接打开浏览器。"
  open "$URL"
  pause
  exit 0
fi

(
  for _ in $(seq 1 90); do
    if curl -fsS -o /dev/null "$URL"; then
      open "$URL"
      exit 0
    fi
    sleep 1
  done
) &

echo "正在启动镜台…"
echo "浏览器将打开 ${URL}"
echo "关闭此窗口即可停止服务。"
exec pnpm dev
