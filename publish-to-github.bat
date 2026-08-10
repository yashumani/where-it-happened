@echo off
cd /d "%~dp0"
echo Publishing main to https://github.com/yashumani/where-it-happened.git
git status -sb
git push -u origin main
pause
