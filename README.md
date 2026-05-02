# MyInvois - Malaysia E-Invoice System

A modern, multi-tenant SaaS application for automating invoice submission to Malaysia's LHDN (Lembaga Hasil Dalam Negeri) via the MyInvois API. Built with a beautiful, professional dark-themed UI.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB-blue)

## ✨ Features

### 🎨 Modern UI/UX
- **Beautiful Dark Theme**: Professional deep blue gradient design
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Glass Morphism**: Modern translucent cards with backdrop blur effects
- **Real-time Updates**: Live status indicators and dynamic data

### 💼 Business Features
- **Multi-tenant Architecture**: Complete data isolation per organization
- **Invoice Management**: Create, track, and submit invoices to LHDN
- **Customer Management**: B2B and B2C customer profiles
- **Product Catalog**: Manage products with tax configurations
- **Automatic Submission**: Background job queue with retry logic
- **Audit Trail**: Complete submission logs and error tracking

### 🔐 Security
- JWT authentication with refresh tokens
- Role-based access control (Admin, Accountant, Viewer)
- AES-256 encryption for sensitive data
- Tenant-level data isolation
- Secure password hashing with bcrypt

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Framer Motion** - Smooth animations
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

### Backend
- **Node.js + Express** - RESTful API server
- **TypeScript** - Type-safe backend
- **MongoDB + Mongoose** - NoSQL database
- **Bull + Redis** - Job queue for background processing
- **JWT** - Secure authentication

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Redis 6+

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Generate secrets
# JWT_SECRET: openssl rand -base64 32
# ENCRYPTION_KEY: openssl rand -hex 16

# Run migrations
npm run migrate

# Start development server
npm run dev

# Start background worker (in separate terminal)
npm run worker
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🎯 Quick Start

1. **Register**: Create your organization account
2. **Add Customers**: Set up your customer database
3. **Add Products**: Configure your product catalog
4. **Create Invoices**: Generate invoices with automatic calculations
5. **Submit to LHDN**: One-click submission with automatic retry

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/       # Database, Redis, environment
│   │   ├── middleware/   # Auth, tenant isolation, error handling
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # MyInvois API client, encryption
│   │   ├── jobs/         # Background job processors
│   │   └── utils/        # Helpers and utilities
│   ├── migrations/       # Database schema
│   └── tests/           # Unit and integration tests
│
└── frontend/
    └── src/
        ├── components/   # Reusable UI components
        ├── pages/        # Page components
        ├── contexts/     # React contexts
        └── lib/          # API client and utilities
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Server
NODE_ENV=development
PORT=3000

# Database (MongoDB Atlas)
DATABASE_URL=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/?appName=einvoice

# Authentication (Generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-jwt-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here

# Encryption (Generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your-32-character-encryption-key

# MyInvois API
MYINVOIS_BASE_URL=https://api.myinvois.hasil.gov.my

# Frontend (for CORS)
FRONTEND_URL=http://localhost:5173

# Redis (required for job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Important Notes:**
- Replace connection string with your actual MongoDB Atlas credentials
- Generate secure secrets using the OpenSSL commands provided
- Ensure MongoDB and Redis are running before starting the backend
- The ENCRYPTION_KEY must be exactly 32 characters

## 🎨 UI Features

### Dashboard
- Real-time statistics with animated counters
- Quick action buttons for common tasks
- System status indicator
- Beautiful gradient cards with hover effects

### Invoice Management
- Modern table with search and filters
- Status badges with color coding
- Smooth animations on data load
- Empty state with helpful prompts

### Invoice Creation
- Multi-step form with validation
- Dynamic line items with calculations
- Real-time total updates
- Beautiful error handling

## 🔄 Invoice Submission Flow

```
User creates invoice → Status: draft
  ↓
User submits → Status: validated → Job queued
  ↓
Background worker picks up job
  ↓
MyInvois API call (OAuth2 + UBL 2.1 format)
  ↓
Success: Status: submitted (save UID, QR code)
Failure: Retry with exponential backoff (1m, 5m, 15m, 1h, 6h)
  ↓
After 6 retries: Status: rejected (notify admin)
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 API Documentation

### Authentication
- `POST /api/v1/auth/register` - Register new organization
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token

### Invoices
- `GET /api/v1/invoices` - List all invoices
- `POST /api/v1/invoices` - Create new invoice
- `GET /api/v1/invoices/:id` - Get invoice details
- `POST /api/v1/invoices/:id/submit` - Submit to LHDN
- `DELETE /api/v1/invoices/:id` - Delete invoice

### Customers & Products
- Similar CRUD endpoints for customers and products

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with ❤️ for Malaysian businesses
- Designed to comply with LHDN MyInvois requirements
- UI inspired by modern SaaS applications

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Made with 🚀 by the MyInvois Team**
