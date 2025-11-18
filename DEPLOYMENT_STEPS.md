# 🚀 Complete Deployment Guide to Render.com

## Prerequisites
- [ ] Git installed on your computer
- [ ] GitHub account created
- [ ] Render.com account created (free)

---

## Step 1: Install Git (if not already installed)

Download and install Git from: https://git-scm.com/download/win

To verify installation:
```powershell
git --version
```

---

## Step 2: Create GitHub Repository

1. Go to https://github.com
2. Click **"New"** button (or "+" icon → "New repository")
3. Repository settings:
   - **Repository name**: `voice2text-app` (or your preferred name)
   - **Description**: "AI Voice Assistant for Real Estate Inspections"
   - **Privacy**: Choose Public or Private
   - **DO NOT** check "Initialize with README" (we already have files)
4. Click **"Create repository"**
5. **Copy the repository URL** (it looks like: `https://github.com/YOUR_USERNAME/voice2text-app.git`)

---

## Step 3: Push Code to GitHub

Open PowerShell in your project folder (`C:\Users\HP 745 G6\Downloads\voice2text`) and run:

### 3.1 Initialize Git Repository
```powershell
git init
```

### 3.2 Configure Git (if first time)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3.3 Add All Files
```powershell
git add .
```

### 3.4 Commit Files
```powershell
git commit -m "Initial commit for deployment"
```

### 3.5 Link to GitHub Repository
Replace `YOUR_GITHUB_URL` with the URL you copied in Step 2:
```powershell
git remote add origin YOUR_GITHUB_URL
```

Example:
```powershell
git remote add origin https://github.com/yourusername/voice2text-app.git
```

### 3.6 Push to GitHub
```powershell
git branch -M main
git push -u origin main
```

**Note**: You may be asked to login to GitHub. Follow the prompts.

---

## Step 4: Deploy to Render.com

### 4.1 Sign Up / Login to Render
1. Go to https://render.com
2. Click **"Get Started"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email

### 4.2 Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**

### 4.3 Connect GitHub Repository
1. Click **"Connect account"** to connect GitHub (if not already connected)
2. Grant Render access to your repositories
3. Find and select your `voice2text-app` repository
4. Click **"Connect"**

### 4.4 Configure Web Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `voice2text-app` (or your preferred name)
  - This will be part of your URL: `https://voice2text-app.onrender.com`
- **Region**: Choose closest to you (e.g., Oregon, Frankfurt, Singapore)
- **Branch**: `main`
- **Root Directory**: Leave blank
- **Runtime**: `Python 3`

**Build & Deploy:**
- **Build Command**: 
  ```
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```
  uvicorn app_fastapi:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- Select **"Free"** (no credit card required)

### 4.5 Add Environment Variables

Scroll down to **"Environment Variables"** section and click **"Add Environment Variable"**

Add these 3 variables:

1. **Variable 1:**
   - Key: `ASSEMBLYAI_API_KEY`
   - Value: `dfc57767cdfc43fcb5ac00e6a774c13c`

2. **Variable 2:**
   - Key: `OPENAI_API_KEY`
   - Value: `your_openai_api_key_here` (use your actual key)

3. **Variable 3:**
   - Key: `CREWAI_TRACING_ENABLED`
   - Value: `false`

### 4.6 Create Web Service
1. Click **"Create Web Service"** button at the bottom
2. Wait for deployment (this takes 5-10 minutes)

---

## Step 5: Monitor Deployment

### 5.1 Watch Logs
- Render will show you real-time logs as it builds and deploys
- Look for messages like:
  - ✅ "Build successful"
  - ✅ "Deploy successful"
  - ✅ "Your service is live"

### 5.2 Common Issues & Solutions

**Issue**: Build fails with "requirements.txt not found"
- **Solution**: Check that requirements.txt is in the root of your repo

**Issue**: "Module not found" error
- **Solution**: Make sure all dependencies are in requirements.txt

**Issue**: App crashes on start
- **Solution**: Check environment variables are set correctly

---

## Step 6: Access Your Deployed App

### 6.1 Get Your URL
Once deployment succeeds, you'll see your app URL at the top:
```
https://voice2text-app.onrender.com
```

### 6.2 Test Your App
1. Click the URL to open your app
2. Test both features:
   - Form Filler: `https://your-app.onrender.com/form-filler`
   - Q&A Analysis: `https://your-app.onrender.com/qna-analysis`

---

## Step 7: Share with Client

Send your client the URL:
```
https://voice2text-app.onrender.com
```

**Important Notes for Client:**
- ✅ Works on any device with internet
- ✅ HTTPS enabled (secure)
- ⚠️ First load after inactivity takes ~30 seconds (free tier sleeps)
- ✅ No installation needed - just open in browser

---

## 🔧 Updating Your App (After Initial Deployment)

When you make changes to your code:

```powershell
# 1. Make your changes to the code

# 2. Commit changes
git add .
git commit -m "Description of changes"

# 3. Push to GitHub
git push origin main

# 4. Render automatically detects changes and redeploys!
```

---

## 📊 Render Dashboard Features

In your Render dashboard, you can:
- **View Logs**: See real-time application logs
- **Monitor**: Check CPU/Memory usage
- **Environment**: Update environment variables
- **Settings**: Change build/start commands
- **Manual Deploy**: Force redeploy from a specific commit

---

## 💡 Tips

### Keep App Awake (Prevent Sleep)
Free tier sleeps after 15 minutes of inactivity. To keep it awake:

1. Use **UptimeRobot** (free service):
   - Sign up at https://uptimerobot.com
   - Add new monitor → HTTP(s)
   - URL: Your Render app URL
   - Monitoring interval: 5 minutes
   - This pings your app to keep it awake

### Upgrade to Paid Tier
If you need:
- No sleep/downtime
- More resources
- Custom domains

Upgrade to Starter plan ($7/month) in Render dashboard.

---

## ❓ Troubleshooting

### App Not Loading
1. Check Render dashboard logs for errors
2. Verify environment variables are set
3. Try manual redeploy in Render dashboard

### 502 Bad Gateway
- App is starting up (wait 30-60 seconds)
- Or check logs for startup errors

### Microphone Not Working
- Ensure you're using HTTPS URL (not HTTP)
- Browser needs HTTPS for microphone access
- Check browser permissions

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **GitHub Issues**: Create issues in your repository

---

## ✅ Deployment Checklist

- [ ] Git installed
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web service created
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] App URL working
- [ ] Both pages tested (Form Filler & Q&A)
- [ ] URL shared with client
- [ ] Optional: UptimeRobot configured

---

**Congratulations! Your app is now live and accessible 24/7! 🎉**
