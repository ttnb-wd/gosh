# Quick Git Commands

## 🚀 Push to GitHub (Quick)

```bash
# Add all changes
git add .

# Commit with message
git commit -m "Add Supabase authentication and admin dashboard"

# Push to GitHub
git push origin main
```

## ✅ Verify .env.local is Ignored

```bash
# Check if .env.local is ignored (should output: .env.local)
git check-ignore .env.local

# Check what will be committed (should NOT show .env.local)
git status
```

## 📝 Detailed Commit

```bash
git commit -m "Add Supabase authentication and admin dashboard

Features:
- Supabase auth with email/password
- Role-based access (admin/customer)
- Admin dashboard with orders/products
- Login/signup with proper redirects
- Admin protection
- Product management with decant sizes
- Cart with size-based items
- Payment method selection
- Premium white/gold theme"
```

## 🔍 Check Before Push

```bash
# See what changed
git status

# See what will be committed
git diff --cached

# List all files to be committed
git ls-files
```

## ⚠️ Important

Your `.gitignore` already has `.env*` which means:
- ✅ `.env.local` will NOT be pushed (good!)
- ✅ Your Supabase keys are safe
- ✅ Secrets stay private

## 🎯 Ready to Push?

Run these commands in your terminal:

```bash
git add .
git commit -m "Add Supabase authentication and admin dashboard with role-based access control"
git push origin main
```

Done! 🎉
