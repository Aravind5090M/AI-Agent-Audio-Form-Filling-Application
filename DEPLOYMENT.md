# Voice to Text AI Assistant - Deployment Guide

## Deploy to Render.com (Free)

### Step 1: Prepare Your Code

1. **IMPORTANT**: Remove hardcoded API keys from `app_fastapi.py`
   - Comment out or remove the default values in lines with API keys
   - Keys will be set as environment variables in Render

2. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

### Step 2: Deploy to Render

1. Go to https://render.com and sign up/login

2. Click **"New +"** → **"Web Service"**

3. Connect your GitHub repository

4. Configure the service:
   - **Name**: `voice2text-assistant` (or your preferred name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app_fastapi:app --host 0.0.0.0 --port $PORT`

5. **Environment Variables** (click "Add Environment Variable"):
   - Key: `ASSEMBLYAI_API_KEY`, Value: `your_assemblyai_key`
   - Key: `OPENAI_API_KEY`, Value: `your_openai_key`
   - Key: `CREWAI_TRACING_ENABLED`, Value: `false`

6. Choose **Free** tier

7. Click **"Create Web Service"**

8. Wait 5-10 minutes for deployment

9. Your app will be live at: `https://voice2text-assistant.onrender.com`

### Step 3: Test

Visit your URL and test all features!

### Notes:

- **Free tier sleeps after 15 min** of inactivity (first request after sleep takes ~30s)
- **To keep it awake**: Use a service like UptimeRobot to ping your URL every 10 minutes
- **Upgrade to paid** ($7/mo) for always-on service

---

## Alternative: Deploy to Railway.app

1. Install Railway CLI:
   ```powershell
   npm install -g @railway/cli
   ```

2. Deploy:
   ```powershell
   railway login
   railway init
   railway variables set ASSEMBLYAI_API_KEY=your_key
   railway variables set OPENAI_API_KEY=your_key
   railway variables set CREWAI_TRACING_ENABLED=false
   railway up
   ```

3. Get your URL:
   ```powershell
   railway domain
   ```

Railway is faster and doesn't sleep on free tier (but limited to $5 credit/month).

---

## Security Checklist Before Deployment:

- [ ] Remove hardcoded API keys from code
- [ ] Set API keys as environment variables
- [ ] Add `.gitignore` to exclude sensitive files
- [ ] Test locally with environment variables first
- [ ] Consider adding basic authentication if needed

---

## Troubleshooting:

**App won't start:**
- Check logs in Render/Railway dashboard
- Verify all environment variables are set
- Check that requirements.txt has all dependencies

**502 Bad Gateway:**
- App might be starting up (wait 30s)
- Check if port binding is correct (use $PORT)

**Audio recording doesn't work:**
- Browser might block mic on HTTP - use HTTPS URL provided by platform
- Clear browser cache and try again
