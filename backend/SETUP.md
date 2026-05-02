# Backend Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)

## MongoDB Setup

### Option 1: Local MongoDB Installation

1. **Download and Install MongoDB**
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Run the installer and follow the setup wizard
   - MongoDB will run as a Windows service by default

2. **Verify MongoDB is Running**
   ```bash
   mongosh
   ```
   If connected successfully, you'll see the MongoDB shell.

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string and update `.env`:
   ```
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/einvoice
   ```

### Option 3: Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Environment Setup

1. **Copy the environment file**
   ```bash
   cp .env.example .env
   ```

2. **Update the .env file with your settings**
   - `DATABASE_URL`: Your MongoDB connection string
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET`: Generate with `openssl rand -base64 32`
   - `ENCRYPTION_KEY`: Generate with `openssl rand -hex 16`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Database Connection String Format

- **Local**: `mongodb://localhost:27017/einvoice`
- **With auth**: `mongodb://username:password@localhost:27017/einvoice`
- **Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/einvoice`

## Verify Setup

Visit http://localhost:3000/health - you should see:
```json
{
  "status": "ok",
  "timestamp": "2026-05-02T..."
}
```
