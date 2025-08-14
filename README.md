# 🏢 Apartment Management System

A modern, full-stack apartment management system built with **Next.js 15**, **Supabase**, and **Tailwind CSS**.

## ✨ Current Features

### 🔐 Authentication & User Management
- **Role-based Authentication** (Admin/Tenant)
- **User Registration & Login** with email verification
- **Automatic role assignment** (tenant by default)
- **Admin role assignment** via database update
- **Secure session management** with Supabase Auth

### 🏠 Admin Features
- **📊 Analytics Dashboard** - Real-time metrics with interactive charts (Recharts)
  - Unit occupancy statistics (occupied/vacant/maintenance)
  - Revenue tracking (current vs previous month)
  - Tenant growth metrics
  - Maintenance request monitoring
- **🏢 Unit Management** - Complete CRUD operations
  - Add, edit, delete apartment units
  - Unit details: bedrooms, bathrooms, square footage, rent
  - Status management (occupied, vacant, under maintenance)
  - Visual unit grid with status indicators
- **👥 Tenant Management** 
  - Create tenant accounts via API
  - View all tenants with contact information
  - Delete tenant accounts
- **📄 Lease Management**
  - Create and manage lease agreements
  - Link tenants to specific units
  - Track lease terms, deposits, and documents
- **💰 Payment Management** 
  - Log and track rent payments
  - Payment history by tenant
  - Monthly payment overviews
- **🔧 Maintenance Requests**
  - View and manage maintenance requests
  - Status tracking (pending, in progress, completed, cancelled)
  - Image uploads for maintenance issues
- **📢 Announcements**
  - Create and manage building announcements
  - Admin-to-tenant communication
- **⚙️ Admin Settings**
  - Profile management
  - System statistics overview
  - Theme toggle (light/dark mode)

### 🏠 Tenant Features
- **🏠 Tenant Dashboard**
  - Personal lease information display
  - Payment history tracking
  - Maintenance request submission
  - Announcement viewing
- **👤 Profile Management**
  - Update personal information
  - Contact details management

### 📱 UI/UX Features
- **Modern Design** with Tailwind CSS and Shadcn UI components
- **Responsive Layout** - Works on all devices
- **Dark/Light Theme** support
- **Interactive Charts** using Recharts
- **Form Validation** with React Hook Form + Zod
- **Loading States** and error handling

## 🛠️ Tech Stack

- **Frontend:** Next.js 15.4.6, React 19.1.1, TypeScript 5.9.2
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **UI/Styling:** Tailwind CSS 3.4.17, Shadcn UI, Tailwind Animate
- **Forms:** React Hook Form 7.62.0 + Zod 4.0.17 validation
- **Charts:** Recharts 2.15.4
- **Icons:** Lucide React 0.539.0
- **Date Handling:** date-fns 4.1.0
- **Deployment:** Vercel/Netlify ready

## 📊 Database Schema

Complete PostgreSQL schema with Row Level Security (RLS):

- **users** - User profiles with roles (admin/tenant)
- **units** - Apartment unit details and status
- **leases** - Tenant-unit relationships with terms
- **payments** - Rent payment records and history
- **maintenance_requests** - Service requests with status tracking
- **announcements** - Management communications

## 🎯 Setup Instructions

### 1. Environment Setup
```bash
# Copy environment template
cp env-example.txt .env.local

# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `SQL Schema.txt` in your Supabase SQL Editor
3. Run the RLS policy fixes from `fix-rls-policies.sql`
4. **Optional:** Add sample data from `sample-data.sql` (22 units with realistic pricing)

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## 📊 Sample Data Included

The system includes realistic sample data (optional):

### 22 Apartment Units
- **Studios (6 units):** $1,200-$1,300 (450-485 sq ft)
- **1 Bedroom (6 units):** $1,600-$1,750 (650-720 sq ft)  
- **2 Bedroom (6 units):** $2,150-$2,400 (920-1,020 sq ft)
- **3 Bedroom (2 units):** $2,900-$3,400 (1,250-1,400 sq ft)
- **Penthouse (2 units):** $4,500-$4,700 (1,800-1,850 sq ft)

### Mixed Occupancy Status
- ✅ 11 Occupied units
- 🔵 9 Vacant units  
- 🟡 2 Under maintenance

## 🔐 User Account Setup

### Create Admin Account
1. Register at `/register`
2. In Supabase dashboard, go to Authentication → Users
3. Find your user and update the `role` field in the `users` table to `'admin'`

### Test Tenant Account
Use the registration page at `/register` - accounts automatically get 'tenant' role.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── admin/           # Admin dashboard and management pages
│   │   ├── announcements/
│   │   ├── leases/
│   │   ├── maintenance/
│   │   ├── payments/
│   │   ├── settings/
│   │   ├── tenants/
│   │   └── units/
│   ├── api/             # API routes for data operations
│   │   └── tenants/
│   ├── login/           # Authentication pages
│   ├── register/
│   └── tenant/          # Tenant dashboard
├── components/
│   ├── admin/           # Admin-specific components
│   └── ui/              # Reusable UI components (Shadcn)
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
└── utils/               # Supabase client setup
```

## 🚀 Development Status

### ✅ Completed Features
- Complete authentication system
- Admin dashboard with analytics
- Full CRUD for units, tenants, leases, payments
- Maintenance request management
- Announcements system
- Responsive UI with dark/light themes
- Database schema with RLS policies

### 🚧 Areas for Enhancement
- [ ] Email notifications for maintenance requests
- [ ] Payment integration (Stripe/PayPal)
- [ ] Lease document upload/storage
- [ ] Advanced reporting and exports
- [ ] Mobile app companion
- [ ] Automated rent reminders
- [ ] Tenant portal enhancements

## 🚀 Deployment

Ready for deployment to:
- **Vercel** (recommended for Next.js)
- **Netlify** 
- Any platform supporting Node.js

### Required Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control** for admin/tenant features
- **Secure authentication** with Supabase Auth
- **Input validation** with Zod schemas
- **Protected API routes** with proper authorization

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Built with ❤️ using modern web technologies for efficient apartment management.**
