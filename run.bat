@echo off
echo Bypassing Smart App Control and starting Backend on Port 5215...
cd MiniCryptoSimulator.API
dotnet publish -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o out
.\out\MiniCryptoSimulator.API.exe --urls "http://localhost:5215" --environment "Development"
