@echo off
cd client

if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo Starting development server...
npm run serve