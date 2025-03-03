#!/bin/bash

# Make script exit on first error
set -e

echo "Creating a fresh Python 3.11 virtual environment..."
python3.11 -m venv .venv

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip..."
python -m pip install --upgrade pip

echo "Installing core dependencies..."
python -m pip install --no-cache-dir \
    python-dotenv==1.0.1 \
    flask==3.0.3 \
    flask-cors==4.0.0 \
    requests==2.31.0 \
    gunicorn==21.2.0

echo "Installing data processing libraries..."
python -m pip install --no-cache-dir \
    numpy==1.26.4 \
    pandas==2.2.2 \
    pytz==2024.1 \
    python-dateutil==2.9.0.post0

echo "Installing pydantic and related dependencies..."
python -m pip install --no-cache-dir \
    pydantic==2.7.4 \
    pydantic-core==2.18.4 \
    pydantic-settings==2.2.1

echo "Installing OpenAI and jiter..."
python -m pip install --no-cache-dir \
    openai==1.14.3 \
    jiter==0.4.2 \
    tiktoken==0.6.0

echo "Installing LangChain packages..."
python -m pip install --no-cache-dir \
    langchain-core==0.1.38 \
    langchain-community==0.0.34 \
    langchain-openai==0.1.7 \
    langsmith==0.1.54

echo "Installing matplotlib for visualizations..."
python -m pip install --no-cache-dir matplotlib==3.8.4

echo "Installed packages:"
python -m pip list

echo "Dependencies installed successfully!"
echo "You can now run './run_bot.sh' to start the server." 