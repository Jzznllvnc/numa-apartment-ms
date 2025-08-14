# 🏢 Apartment Management System

A modern, full-stack apartment management system built with **Next.js**, **Supabase**, and **Tailwind CSS**.

## ✨ Features

- 🔐 **Role-based Authentication** (Admin/Tenant)
- 🏠 **Unit Management** - Add, edit, delete apartment units
- 👥 **Tenant Management** - Manage tenant accounts and profiles
- 📄 **Lease Management** - Create and track lease agreements
- 💰 **Payment Tracking** - Log and monitor rent payments
- 🔧 **Maintenance Requests** - Submit and manage maintenance requests
- 📢 **Announcements** - Admin to tenant communication
- 📊 **Analytics Dashboard** - Real-time metrics and charts
- 📱 **Responsive Design** - Works on all devices

## 🚀 Live Demo

The system includes realistic sample data with:
- 22 apartment units across 9 floors
- Studio, 1BR, 2BR, 3BR, and Penthouse units
- Mixed occupancy status (occupied, vacant, under maintenance)
- Sample announcements and realistic rent prices

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI/Styling:** Tailwind CSS, Shadcn UI
- **Charts:** Recharts
- **Deployment:** Vercel/Netlify ready

## 🎯 Setup Instructions

### 1. Environment Setup
```bash
# Copy environment template
cp env-example.txt .env.local

# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `temp/SQL Schema.txt` in your Supabase SQL Editor
3. Run the RLS policy fixes from `fix-rls-policies.sql`
4. Add sample data from `sample-data.sql`

### 3. Run the Application
```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## 👨‍💼 Admin Features

### Dashboard
- Real-time metrics (revenue, occupancy, maintenance requests)
- Unit status breakdown (occupied/vacant/maintenance)
- Interactive charts and analytics

### Unit Management
- ➕ Add new apartment units
- ✏️ Edit unit details (bedrooms, bathrooms, rent, status)
- 🗑️ Delete units
- 📊 View unit grid with status indicators

### Quick Actions
- Navigate to tenant management
- Access lease management
- Handle maintenance requests
- Post announcements

## 🏠 Tenant Features

### Dashboard
- View lease information
- Check payment history
- Submit maintenance requests
- Read announcements from management

## 📊 Sample Data Included

The system comes with realistic sample data:

### Units
- **Studios:** $1,200-$1,300 (450-485 sq ft)
- **1 Bedroom:** $1,600-$1,750 (650-720 sq ft)  
- **2 Bedroom:** $2,150-$2,400 (920-1,020 sq ft)
- **3 Bedroom:** $2,900-$3,400 (1,250-1,400 sq ft)
- **Penthouse:** $4,500-$4,700 (1,800-1,850 sq ft)

### Status Distribution
- ✅ 11 Occupied units
- 🔵 9 Vacant units
- 🟡 2 Under maintenance

## 🔐 User Accounts

### Create Admin Account
1. Register at `/register`
2. In Supabase, change the user's role to 'admin' in the `users` table

### Create Tenant Account
1. Register at `/register` (automatically gets 'tenant' role)
2. Or use the recommended test account:
   - Email: `tenant@example.com`
   - Password: `password123`

## 🏗️ Architecture

### Database Schema
- **users** - User profiles with roles
- **units** - Apartment unit details
- **leases** - Tenant-unit relationships
- **payments** - Rent payment records
- **maintenance_requests** - Service requests
- **announcements** - Management communications

### Security
- Row Level Security (RLS) enabled
- Role-based access control
- Secure authentication with Supabase Auth

### UI Components
- Modern card-based design
- Responsive grid layouts
- Interactive forms with validation
- Real-time data updates

## 🚀 Deployment

The application is ready for deployment to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- Any platform supporting Node.js

Environment variables needed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Next Steps

Planned features:
- [ ] Lease document upload/storage
- [ ] Email notifications
- [ ] Payment integration
- [ ] Tenant portal enhancements
- [ ] Advanced reporting
- [ ] Mobile app

## 🤝 Contributing

This is a complete, production-ready apartment management system. Feel free to customize and extend it for your needs!

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.
