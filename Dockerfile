FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files
COPY MiniCryptoSimulator.slnx ./
COPY MiniCryptoSimulator.API/MiniCryptoSimulator.API.csproj MiniCryptoSimulator.API/
COPY MiniCryptoSimulator.Application/MiniCryptoSimulator.Application.csproj MiniCryptoSimulator.Application/
COPY MiniCryptoSimulator.Domain/MiniCryptoSimulator.Domain.csproj MiniCryptoSimulator.Domain/
COPY MiniCryptoSimulator.Infrastructure/MiniCryptoSimulator.Infrastructure.csproj MiniCryptoSimulator.Infrastructure/
COPY MiniCryptoSimulator.Tests/MiniCryptoSimulator.Tests.csproj MiniCryptoSimulator.Tests/

# Restore dependencies
RUN dotnet restore MiniCryptoSimulator.API/MiniCryptoSimulator.API.csproj

# Copy the rest of the code
COPY . .

# Build and publish
WORKDIR /src/MiniCryptoSimulator.API
RUN dotnet publish -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

# Expose port and start
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "MiniCryptoSimulator.API.dll"]
