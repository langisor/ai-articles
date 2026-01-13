Great! Let me guide you through deploying your VitePress app to **free hosting providers** (excluding Netlify and Vercel).

## 🚀 Best Free Hosting Options for VitePress

### 1. **GitHub Pages** (Recommended - Completely Free)

### 2. **Cloudflare Pages** (Excellent, with generous free tier)

### 3. **Render** (Good alternative)

### 4. **GitLab Pages** (Similar to GitHub Pages)

---

## 🌟 Option 1: GitHub Pages (Recommended)

### Step 1: Prepare Your Project

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### Step 2: Configure Base Path

Update your `docs/.vitepress/config.ts`:

```typescript
export default defineConfig({
  base: "/your-repo-name/", // Change this to your repository name
  // ... rest of your config
});
```

**Example:** If your repo is `github.com/username/ai-articles`, set:

```typescript
base: '/ai-articles/',
```

**Note:** If using custom domain or username.github.io, use:

```typescript
base: '/',
```

### Step 3: Create Deploy Script

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy VitePress site to Pages

on:
  push:
    branches: [main] # Change to 'master' if that's your default branch
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Install dependencies
        run: npm ci

      - name: Build with VitePress
        run: npm run docs:build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 4: Enable GitHub Pages

1. Push your code to GitHub
2. Go to your repository on GitHub
3. Click **Settings** → **Pages**
4. Under **Source**, select **GitHub Actions**
5. Wait for the workflow to complete

**Your site will be live at:**

- `https://username.github.io/repo-name/`

---

## 🌟 Option 2: Cloudflare Pages

### Step 1: Create Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up for free account

### Step 2: Connect Git Repository

1. Click **Pages** → **Create a project**
2. Connect your GitHub/GitLab account
3. Select your repository

### Step 3: Configure Build Settings

```
Framework preset: VitePress
Build command: npm run docs:build
Build output directory: docs/.vitepress/dist
Root directory: (leave empty)
Environment variables: NODE_VERSION = 18
```

### Step 4: Deploy

Click **Save and Deploy**

**Your site will be live at:**

- `https://your-project.pages.dev`
- You can add custom domain for free!

### Benefits

- ✅ Unlimited bandwidth
- ✅ Free SSL
- ✅ Global CDN
- ✅ Automatic deployments
- ✅ Preview deployments for PRs

---

## 🌟 Option 3: Render

### Step 1: Create Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Static Site

1. Click **New** → **Static Site**
2. Connect your repository

### Step 3: Configure

```
Name: ai-articles
Branch: main
Build Command: npm install && npm run docs:build
Publish Directory: docs/.vitepress/dist
```

### Step 4: Add Environment Variables (Optional)

```
NODE_VERSION = 18
```

### Step 5: Deploy

Click **Create Static Site**

**Your site will be live at:**

- `https://your-site.onrender.com`

---

## 🌟 Option 4: GitLab Pages

### Step 1: Create `.gitlab-ci.yml` in root

```yaml
image: node:18

pages:
  cache:
    paths:
      - node_modules/

  script:
    - npm install
    - npm run docs:build
    - mv docs/.vitepress/dist public

  artifacts:
    paths:
      - public

  only:
    - main
```

### Step 2: Update Config

In `docs/.vitepress/config.ts`:

```typescript
export default defineConfig({
  base: "/your-repo-name/",
  // ... rest of config
});
```

### Step 3: Push to GitLab

Push your code to GitLab repository

**Your site will be live at:**

- `https://username.gitlab.io/repo-name/`

---

## 📋 Comparison Table

| Provider             | Free Tier    | Bandwidth   | Build Time | Custom Domain | SSL     |
| -------------------- | ------------ | ----------- | ---------- | ------------- | ------- |
| **GitHub Pages**     | ✅ Unlimited | 100GB/month | 10 min     | ✅ Free       | ✅ Auto |
| **Cloudflare Pages** | ✅ Unlimited | Unlimited   | 20 min     | ✅ Free       | ✅ Auto |
| **Render**           | ✅ Yes       | 100GB/month | 15 min     | ✅ Paid       | ✅ Auto |
| **GitLab Pages**     | ✅ Unlimited | Limited     | 10 min     | ✅ Free       | ✅ Auto |

---

## 🎯 My Recommendation: **GitHub Pages + Cloudflare Pages**

**Use GitHub Pages if:**

- ✅ You're already using GitHub
- ✅ Want simple setup
- ✅ Don't need advanced features

**Use Cloudflare Pages if:**

- ✅ Want unlimited bandwidth
- ✅ Need better performance (faster CDN)
- ✅ Want preview deployments
- ✅ Need web analytics (free)

---

## 🔧 Pre-Deployment Checklist

Before deploying, make sure:

```bash
# 1. Test build locally
npm run docs:build

# 2. Preview production build
npm run docs:preview

# 3. Check all links work
# Navigate through your site

# 4. Verify search works
# Try searching for articles

# 5. Test on mobile
# Use browser dev tools
```

---

## 🐛 Common Issues & Fixes

### Issue: 404 on routes

**Fix:** Update `docs/.vitepress/config.ts`:

```typescript
cleanUrls: true, // Removes .html from URLs
```

### Issue: Assets not loading

**Fix:** Check your `base` path in config:

```typescript
base: '/correct-repo-name/', // Must match exactly
```

### Issue: Build fails

**Fix:** Add `.npmrc` file:

```
engine-strict=false
```

---

## 📦 Complete Deployment Steps for GitHub Pages

### Quick Start

```bash
# 1. Update config with base path
# Edit docs/.vitepress/config.ts

# 2. Create .github/workflows/deploy.yml
# Copy the GitHub Actions workflow above

# 3. Commit and push
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main

# 4. Enable GitHub Pages
# Go to repo Settings → Pages → Source: GitHub Actions

# 5. Wait for deployment
# Check Actions tab for progress

# Done! Your site is live! 🎉
```

---

## 🌐 Using Custom Domain (Optional)

### For GitHub Pages

1. Add `docs/public/CNAME` file:

```
yourdomain.com
```

1. In repo settings → Pages → Custom domain
2. Enter your domain
3. Update DNS records at your domain provider:

```
Type: CNAME
Name: www (or @)
Value: username.github.io
```

### For Cloudflare Pages

1. Go to your project settings
2. Click **Custom domains**
3. Add your domain
4. Cloudflare automatically handles DNS

---

## 🚀 Ready to Deploy?

**Easiest Option:** Copy the GitHub Actions workflow above, push to GitHub, and enable Pages!

**Best Performance:** Use Cloudflare Pages for unlimited bandwidth and global CDN.

Which hosting provider would you like detailed setup instructions for? I can walk you through step-by-step! 🎯
