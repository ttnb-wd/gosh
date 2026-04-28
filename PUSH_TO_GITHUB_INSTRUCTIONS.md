# Push to GitHub Instructions

## Prerequisites
You need to have Git installed on your system. If not installed:
- Download from: https://git-scm.com/download/win
- Or install via winget: `winget install Git.Git`

## Steps to Push Changes

### 1. Open Git Bash or PowerShell in the gosh-main directory
```bash
cd C:\Users\ACER\Desktop\gosh-main\gosh-main
```

### 2. Check current status
```bash
git status
```

### 3. Add all changes
```bash
git add .
```

### 4. Commit changes
```bash
git commit -m "Fix decant dropdown z-index issue using React Portal

- Implemented React Portal to render dropdown outside product card DOM
- Dropdown now always appears above all product cards/images
- Fixed z-index stacking context issues
- Updated state management to store full decant objects
- Added dynamic positioning with scroll/resize handling
- Simplified product card z-index management
- Maintained same visual design and functionality"
```

### 5. Check remote repository
```bash
git remote -v
```

### 6. If remote is not set or needs to be updated to ttnb-wd account:
```bash
# Remove existing remote (if any)
git remote remove origin

# Add new remote with ttnb-wd account
git remote add origin https://github.com/ttnb-wd/gosh-main.git
```

### 7. Push to GitHub
```bash
# First time push (set upstream)
git push -u origin main

# Or if branch is named master
git push -u origin master

# Or if branch is named something else, check with:
git branch
# Then push with the correct branch name
```

### 8. If you need to authenticate:
You may be prompted for GitHub credentials. Use:
- Username: `ttnb-wd`
- Password: Use a Personal Access Token (not your GitHub password)

To create a Personal Access Token:
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Copy the token and use it as your password

## Alternative: Using GitHub Desktop
If you prefer a GUI:
1. Install GitHub Desktop: https://desktop.github.com/
2. Open the repository in GitHub Desktop
3. Review changes
4. Write commit message
5. Click "Commit to main"
6. Click "Push origin"

## Files Changed in This Update
- `gosh-main/components/ProductSection.tsx` - Fixed decant dropdown with React Portal
- `gosh-main/DECANT_DROPDOWN_PORTAL_FIX.md` - Documentation of the fix

## Commit Summary
This update fixes the decant dropdown appearing behind other product cards by implementing React Portal to render the dropdown menu outside the product card DOM hierarchy, ensuring it always appears on top regardless of z-index stacking contexts.
