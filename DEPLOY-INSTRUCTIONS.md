# 📊 Project Planner - Deploy to GitHub + Supabase + Vercel

A team project planning tool with Gantt charts, task dependencies, and cloud sync.

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Create a GitHub Repository (2 min)

1. Go to **[github.com](https://github.com)** and sign in (or create account)
2. Click the **+** icon (top right) → **New repository**
3. Name it: `project-planner`
4. Select **Public** or **Private**
5. ✅ Check **"Add a README file"** (optional)
6. Click **Create repository**

---

### Step 2: Upload Files to GitHub (3 min)

**Option A: Using GitHub Web (Easiest)**

1. In your new repo, click **Add file** → **Upload files**
2. Drag ALL files from this folder into the upload area
3. Make sure you see: `app/`, `lib/`, `package.json`, etc.
4. Click **Commit changes**

**Option B: Using Command Line**

```bash
# In this folder, run:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/project-planner.git
git push -u origin main
```

---

### Step 3: Set Up Supabase Database (5 min)

1. Go to **[supabase.com](https://supabase.com)** → Sign up free
2. Click **New Project**
   - Name: `project-planner`
   - Generate and **SAVE** the database password
   - Choose region closest to you
3. Wait ~2 minutes for setup
4. Go to **SQL Editor** (left sidebar)
5. Click **New query**
6. Copy/paste the contents of `supabase-schema.sql`
7. Click **Run** → Should say "Success"
8. Go to **Settings** → **API** and copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...` (the long one)

---

### Step 4: Deploy to Vercel (3 min)

1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub
2. Click **Add New...** → **Project**
3. Find `project-planner` and click **Import**
4. **IMPORTANT** - Add Environment Variables:
   - Click **Environment Variables**
   - Add these two:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

5. Click **Deploy**
6. Wait 1-2 minutes

---

### Step 5: Done! 🎉

Your app is live at: `https://project-planner-xxxxx.vercel.app`

**Share this URL with your team!**

---

## 📁 Project Structure

```
project-planner/
├── app/
│   ├── page.js        # Main application
│   ├── layout.js      # HTML layout
│   └── globals.css    # Styles
├── lib/
│   └── supabase.js    # Database connection
├── package.json       # Dependencies
├── supabase-schema.sql # Database tables
└── README.md          # This file
```

---

## ✨ Features

- **📋 Project Management**: Create, edit, copy, delete projects
- **🏷️ Tagging**: Filter by Customer, Project Manager, Department, etc.
- **📊 Gantt Chart**: Visual timeline with drag-and-drop
- **🔗 Dependencies**: Link tasks with auto-cascading
- **📤 Unscheduled Tasks**: Backlog area for unplanned work
- **💾 Auto-Save**: Changes sync to cloud automatically
- **📁 Import/Export**: CSV support for data portability

---

## 🔧 Making Updates

After making code changes:

```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will automatically redeploy in ~1 minute.

---

## ❓ Troubleshooting

**"Failed to fetch" errors**
- Check environment variables in Vercel dashboard
- Make sure SQL schema was run in Supabase

**App shows blank page**
- Open browser console (F12) for errors
- Verify Supabase URL and key are correct

**Changes not saving**
- Check the save status indicator (top right)
- Verify Supabase database is accessible

---

## 📊 Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Supabase | 500MB database, 50K requests/month |
| Vercel | 100GB bandwidth, unlimited deploys |

More than enough for small-medium teams!

---

## 🔒 Security Notes

- The `anon` key is safe to expose (it's public)
- Row Level Security is enabled on tables
- For user authentication, add Supabase Auth later

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
