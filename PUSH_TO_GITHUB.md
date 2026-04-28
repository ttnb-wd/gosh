# Push to GitHub Guide

## 🚀 Quick Steps

### 1. Check Git Status
```bash
git status
```

### 2. Add All Changes
```bash
git add .
```

### 3. Commit Changes
```bash
git commit -m "Add Supabase authentication and admin dashboard with role-based access control"
```

### 4. Push to GitHub
```bash
git push origin main
```

Or if your branch is named `master`:
```bash
git push origin master
```

## 📝 Detailed Commit Message (Optional)

If you want a more detailed commit message:

```bash
git commit -m "Add Supabase authentication and admin dashboard

Features:
- Supabase authentication with email/password
- Role-based access control (admin/customer)
- Admin dashboard with orders and products management
- Login/signup pages with proper redirects
- Admin protection - only admin role can access /admin routes
- Customer profiles with role management
- Secure authentication using getUser() instead of getSession()
- Product management with decant sizes
- Cart functionality with size-based items
- Payment method selection
- Premium white/ivory + gold theme maintained"
```

## ⚠️ Important: Check .gitignore

Make sure `.env.local` is NOT pushed to GitHub (it contains secrets):

```bash
# Check if .env.local is ignored
git check-ignore .env.local
```

Should output: `.env.local` (meaning it's ignored ✅)

If not ignored, add to `.gitignore`:
```bash
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Add .env.local to gitignore"
```

## 🔍 Verify Before Pushing

### Check what will be committed:
```bash
git diff --cached
```

### Check which files will be pushed:
```bash
git status
```

### Make sure these are NOT included:
- ❌ `.env.local` (contains Supabase keys)
- ❌ `.env` (if it has secrets)
- ❌ `node_modules/` (too large)
- ❌ `.next/` (build files)

## 📦 Complete Push Workflow

```bash
# 1. Check current status
git status

# 2. Add all changes
git add .

# 3. Commit with message
git commit -m "Add Supabase auth and admin dashboard with role-based access"

# 4. Push to GitHub
git push origin main

# If you get an error about upstream, use:
git push -u origin main
```

## 🆕 First Time Setup (If No Repo Yet)

If you haven't initialized git yet:

```bash
# 1. Initialize git
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit: GOSH Perfume ecommerce with Supabase auth"

# 4. Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/gosh-perfume.git

# 5. Push
git push -u origin main
```

## 🔗 Create GitHub Repository

If you don't have a GitHub repo yet:

1. Go to https://github.com/new
2. Repository name: `gosh-perfume` (or your choice)
3. Description: "Luxury perfume ecommerce with Supabase authentication"
4. Choose Public or Private
5. Do NOT initialize with README (you already have files)
6. Click "Create repository"
7. Copy the remote URL
8. Run:
   ```bash
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

## 🌿 Branch Management

If you want to create a feature branch:

```bash
# Create and switch to new branch
git checkout -b feature/supabase-auth

# Push to new branch
git push -u origin feature/supabase-auth
```

## 🔄 Update Existing Repo

If you already have a repo and want to update:

```bash
# Pull latest changes first
git pull origin main

# Add your changes
git add .

# Commit
git commit -m "Add Supabase authentication and admin dashboard"

# Push
git push origin main
```

## 🐛 Common Issues

### Issue: "fatal: not a git repository"
**Solution**: Initialize git first
```bash
git init
```

### Issue: "remote origin already exists"
**Solution**: Update remote URL
```bash
git remote set-url origin YOUR_NEW_URL
```

### Issue: "failed to push some refs"
**Solution**: Pull first, then push
```bash
git pull origin main --rebase
git push origin main
```

### Issue: "Permission denied (publickey)"
**Solution**: Set up SSH key or use HTTPS
```bash
# Use HTTPS instead
git remote set-url origin https://github.com/username/repo.git
```

### Issue: Large files error
**Solution**: Check what's being committed
```bash
git status
# Remove large files from staging
git reset HEAD path/to/large/file
```

## ✅ Verification

After pushing, verify on GitHub:

1. Go to your GitHub repository
2. Check files are uploaded
3. Verify `.env.local` is NOT visible
4. Check commit message is correct
5. Verify all code is there

## 📋 Files That Should Be Pushed

✅ Should be in GitHub:
- `app/` folder
- `components/` folder
- `lib/` folder
- `public/` folder
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `next.config.ts`
- `.gitignore`
- `.env.local.example` (template without secrets)
- `README.md`
- Documentation files (*.md)

❌ Should NOT be in GitHub:
- `.env.local` (has secrets)
- `.env` (if has secrets)
- `node_modules/`
- `.next/`
- `*.log`

## 🎉 Success!

Once pushed, your code is on GitHub and you can:
- Share the repository
- Deploy to Vercel/Netlify
- Collaborate with others
- Track changes
- Create backups

## 🚀 Next Steps

After pushing to GitHub:

1. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repo
   - Add environment variables from `.env.local`
   - Deploy!

2. **Add README**:
   - Create a nice README.md
   - Add setup instructions
   - Document features

3. **Add Collaborators**:
   - Go to repo Settings → Collaborators
   - Invite team members

Your code is now safely on GitHub! 🎉
