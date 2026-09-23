@echo off
cd /d "%~dp0backend"
python -m pip install -r ai_requirements.txt
python -m uvicorn ai_service:app --host 127.0.0.1 --port 8001
pause
