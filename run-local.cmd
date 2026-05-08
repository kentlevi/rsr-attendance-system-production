@echo off
cd /d "%~dp0"
set NODE_ENV=production
node.exe dist\server.cjs
