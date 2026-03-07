#!/bin/bash
cd /root/.nvm/versions/node/v22.22.0/lib/node_modules/xiaohongshu-mcp-server
export DISPLAY=:99
Xvfb :99 -screen 0 1280x800x24 > /dev/null 2>&1 &
sleep 2
python3 main.py
