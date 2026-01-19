
@echo off
echo Setting up OMPOI Indic Chatbot...

echo [1/4] Setting up Backend Virtual Environment...
cd backend
python -m venv venv
call venv\Scripts\activate

echo [2/4] Installing Backend Dependencies...
pip install -r requirements.txt
if not exist "IndicTransToolkit" (
    echo Cloning IndicTransToolkit...
    git clone https://github.com/AI4Bharat/IndicTransToolkit
)
cd IndicTransToolkit
pip install -e .
cd ..

echo [3/4] Backend Setup Complete.

echo [4/4] Setting up Frontend...
cd ..\frontend
call npm install
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p
call npm install lucide-react

echo Setup Complete!
echo To run Backend: cd backend && venv\Scripts\activate && uvicorn main:app --reload
echo To run Frontend: cd frontend && npm run dev
pause
