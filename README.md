# TrialByte Backend

A Node.js/Express backend API for the TrialByte application, providing RESTful endpoints for managing users, roles, therapeutics, drugs, clinical trials, and more.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm** package manager
- **PostgreSQL** database (local or remote)
- **Cloudinary** account (for image/file uploads)
- **EdgeStore** credentials (for file storage)

## Getting Started

### 1. Clone the Repository

```bash
cd trialbyte-backend-v1
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/trialbyte_db

# Server Configuration
PORT=5002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Cloudinary Configuration (for image uploads)
CLOUD_NAME=your-cloudinary-cloud-name
CLOUD_KEY=your-cloudinary-api-key
CLOUD_KEY_SECRET=your-cloudinary-api-secret

# EdgeStore Configuration (for file storage)
EDGE_STORE_ACCESS_KEY=your-edgestore-access-key
EDGE_STORE_SECRET_KEY=your-edgestore-secret-key
```

**Note:** Replace all placeholder values with your actual credentials. Never commit the `.env` file to version control.

### 4. Database Setup

#### Initial Setup

Run the complete setup script to:
- Create database schema
- Create admin user
- Setup admin role

```bash
npm run setup
```

This runs the following commands in sequence:
- `npm run migrate` - Creates database schema
- `npm run create-admin` - Creates admin user
- `npm run setup-admin-role` - Sets up admin role

#### Individual Commands

If you need to run commands individually:

```bash
# Run database migrations
npm run migrate

# Create admin user
npm run create-admin

# Setup admin role
npm run setup-admin-role
```

#### Therapeutic Logs/Notes Migration

If you've pulled recent changes that include updates to therapeutic logs/notes:

```bash
npm run migrate:logs-notes
```

This script:
- Adds the missing `internal_note` column on `therapeutic_logs`
- Migrates `therapeutic_notes` to use JSONB for notes, attachments, and source metadata

#### Mock Data Migration

For development and testing purposes, you can populate the database with sample data:

```bash
node src/migration/create-mock-data.js
```

**Important:** This script will:
- **Clean up existing data** - Removes all existing therapeutic trials and drugs before creating new ones
- Create sample therapeutic trials with:
  - Multiple therapeutic areas (oncology, cardiovascular, autoimmune, etc.)
  - Various trial phases (Phase I, II, III, etc.)
  - Different trial statuses (planned, open, closed, completed, terminated)
  - Complete trial data including outcomes, participation criteria, timing, and results
- Create sample drugs with:
  - Various development statuses
  - Company information
  - Drug identifiers and metadata

**When to use:**
- Setting up a fresh development environment
- Testing frontend features with realistic data
- Demonstrating application functionality
- Development and QA testing

**Warning:** Do not run this script in production! It will delete existing data.

### 5. Start Development Server

```bash
npm start
```

The server will start with **nodemon** for automatic reloading on file changes. The API will be available at `http://localhost:5002` (or the port specified in your `.env` file).

## Available Scripts

- `npm start` - Start development server with nodemon (auto-reload)
- `npm test` - Run test suite using Jest
- `npm run migrate` - Run database schema migrations
- `npm run migrate:logs-notes` - Run therapeutic logs/notes migration
- `npm run create-admin` - Create admin user
- `npm run setup-admin-role` - Setup admin role
- `npm run setup` - Run complete setup (migrate + create-admin + setup-admin-role)
- `npm run plop` - Generate code using Plop templates (controllers, models, routes, validations)
- `npm run build` - No build step required (placeholder)

**Note:** To create mock data for development, run:
```bash
node src/migration/create-mock-data.js
```

## Project Structure

```
trialbyte-backend-v1/
├── api/                    # Serverless API entry point
├── src/
│   ├── controllers/       # Request handlers
│   ├── routers/           # Express route definitions
│   ├── repositories/      # Data access layer
│   ├── services/          # Business logic and external services
│   ├── utils/             # Utility functions
│   ├── errors/            # Custom error classes
│   ├── infrastructure/    # Database connections
│   └── migration/         # Database migration scripts
├── __tests__/             # Test files
├── plop-templates/        # Code generation templates
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## API Endpoints

The API is organized into the following route groups:

- `/api/v1/users` - User management
- `/api/v1/roles` - Role management
- `/api/v1/user-roles` - User-role assignments
- `/api/v1/pending-changes` - Pending change approvals
- `/api/v1/user-activity` - User activity logging
- `/api/v1/therapeutic` - Therapeutic area management
- `/api/v1/drugs` - Drug management
- `/api/v1/queries` - Query management
- `/api/v1/dropdown-management` - Dropdown configuration
- `/api/edgestore` - File upload endpoints

## Development Tips

### Code Generation

Use Plop to generate boilerplate code:

```bash
npm run plop
```

This will prompt you to generate:
- Controllers
- Models
- Routes
- Validations

### Testing

Run the test suite:

```bash
npm test
```

Tests are configured to run in band (sequentially) to avoid database conflicts. The test environment uses a separate test database configuration.

### Debugging

The application uses `console.log` for debugging. Check the terminal output for:
- Database connection status
- CORS evaluation logs
- EdgeStore request logs
- API request/response information

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (Next.js default)
- `http://localhost:3001`
- `http://localhost:5173` (Vite default)
- `http://localhost:4200` (Angular default)
- Any Vercel preview/production URLs
- The URL specified in `FRONTEND_URL` environment variable

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials and permissions
- The connection will retry up to 5 times with exponential backoff

### Port Already in Use

If port 5002 is already in use, either:
- Change the `PORT` in your `.env` file
- Stop the process using port 5002

### Missing Environment Variables

Ensure all required environment variables are set in your `.env` file. Missing variables may cause:
- Authentication failures (JWT_SECRET)
- File upload failures (Cloudinary/EdgeStore)
- CORS issues (FRONTEND_URL)

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong, unique values for `JWT_SECRET`
3. Configure production database URL
4. Set appropriate `FRONTEND_URL` for your frontend domain
5. Ensure all service credentials (Cloudinary, EdgeStore) are production-ready

The application also supports serverless deployment via the `api/index.js` entry point.
