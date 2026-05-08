#!/bin/bash
set -e

echo "========================================="
echo "  TechShop WAF 测试站点 - Ubuntu 部署脚本"
echo "========================================="
echo ""

APP_DIR="/opt/waf-test-site"
NODE_VERSION="18"
SERVICE_NAME="waf-test-site"

# ===== 1. 安装 Node.js =====
install_node() {
  if command -v node &>/dev/null; then
    CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT" -ge "$NODE_VERSION" ]; then
      echo "[OK] Node.js $(node -v) 已安装"
      return
    fi
  fi

  echo "[INSTALL] 安装 Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
  echo "[OK] Node.js $(node -v) 安装完成"
}

# ===== 2. 部署应用 =====
deploy_app() {
  echo "[DEPLOY] 部署应用到 $APP_DIR..."
  mkdir -p "$APP_DIR"
  cp -r ./* "$APP_DIR/"
  cd "$APP_DIR"

  echo "[INSTALL] 安装依赖..."
  npm install --production

  if [ ! -f data.db ]; then
    echo "[SEED] 初始化数据库..."
    node seed.js
  fi

  echo "[OK] 应用部署完成"
}

# ===== 3. 配置 systemd 服务 =====
setup_service() {
  echo "[SERVICE] 配置 systemd 服务..."

  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=TechShop WAF Test Site
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  systemctl restart ${SERVICE_NAME}

  echo "[OK] systemd 服务已配置"
}

# ===== 4. 显示状态 =====
show_status() {
  echo ""
  echo "========================================="
  echo "  部署完成！"
  echo "========================================="
  echo ""
  echo "  服务状态:"
  systemctl status ${SERVICE_NAME} --no-pager 2>/dev/null || echo "  检查失败"

  # 获取服务器 IP
  SERVER_IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo "  访问地址: http://${SERVER_IP}:3000"
  echo ""
  echo "  管理命令:"
  echo "    systemctl start ${SERVICE_NAME}     # 启动"
  echo "    systemctl stop ${SERVICE_NAME}      # 停止"
  echo "    systemctl restart ${SERVICE_NAME}   # 重启"
  echo "    systemctl status ${SERVICE_NAME}    # 状态"
  echo "    journalctl -u ${SERVICE_NAME} -f    # 查看日志"
  echo ""
}

# ===== 执行 =====
if [ "$EUID" -ne 0 ] && [ "$1" != "--non-root" ]; then
  echo "[WARN] 建议以 root 权限运行以完成 systemd 配置"
  echo "      如需跳过 systemd 配置，使用: ./deploy.sh --non-root"
  echo ""
fi

install_node

if [ "$1" = "--non-root" ]; then
  echo "[INFO] 跳过 systemd 配置"
  APP_DIR=$(pwd)
  npm install --production
  if [ ! -f data.db ]; then
    node seed.js
  fi
  echo ""
  echo "[DONE] 依赖已安装。手动启动: npm start"
else
  deploy_app
  setup_service
  show_status
fi
