# Box Warehouse Management System (WMS)

A full-stack warehouse management system for tracking inventory movement with QR code scanning capabilities.

## Features

- **Dashboard**: Real-time inventory tracking with daily, weekly, and monthly views
- **QR Code Scanning**: Incoming and outgoing pallet tracking with destination management
- **Inventory Tracking**: On-hand inventory with starting balance integration
- **User Authentication**: Role-based access (scanner, desktop, admin)
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Tech Stack

- **Frontend**: React 19, Vite, Recharts
- **Backend**: Express.js, PostgreSQL
- **Authentication**: JWT
- **QR Code**: html5-qrcode

## Project Structure

```
box-wms/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Scan.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/           # Express backend
│   ├── src/
|   |   ├── db/
|   |   |   ├── schema.sql
|   |   |   └── seed.sql
│   │   ├── db.js
│   │   └── server.js
│   └── package.json
├── .env               # Environment variables (not committed)
├── .env.example       # Example environment file
└── .gitignore
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Clone the Repository

```bash
git clone <repository-url>
cd box-wms
```

### 2. Environment Setup

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update `.env` with your database credentials:

```dotenv
DATABASE_URL=postgres://postgres:password@localhost:5432/box_wms
JWT_SECRET=your_secure_jwt_secret_key
```

### 3. Database Setup

Create the database and apply the schema:

```bash
psql -U postgres -c "CREATE DATABASE box_wms;"
psql -U postgres -d box_wms -f backend/src/db/schema.sql
psql -U postgres -d box_wms -f backend/src/db/seed.sql
```

This will:
- Create all necessary tables from `schema.sql`
- Seed initial user data from `seed.sql`

### 4. Backend Setup

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:3000`

### 5. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/me` - Get current user info
- `POST /api/logout` - User logout

### Inventory Management
- `POST /api/incoming` - Record incoming pallet
- `POST /api/outgoing` - Record outgoing pallet

### Dashboard
- `GET /api/dashboard/daily` - Daily movement data
- `GET /api/dashboard/destinations` - Outgoing by destination
- `GET /api/dashboard/day-details` - Detailed movements for a date
- `GET /api/dashboard/starting-balance` - Starting inventory balance

## Development

### Scripts

**Backend:**
- `npm start` - Start server (development)
- `npm run dev` - Start with nodemon (auto-reload)

**Frontend:**
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT