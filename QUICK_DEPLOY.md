# 🚀 Quick Deployment Commands

## Git Setup & Push to GitHub

```powershell
# Navigate to your project folder
cd "C:\Users\HP 745 G6\Downloads\voice2text"

# Initialize Git
git init

# Configure Git (first time only)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Add all files
git add .

# Commit
git commit -m "Initial commit for deployment"

# Link to GitHub (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/voice2text-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Render.com Configuration

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
uvicorn app_fastapi:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**
```
ASSEMBLYAI_API_KEY=dfc57767cdfc43fcb5ac00e6a774c13c
OPENAI_API_KEY=your_actual_openai_key
CREWAI_TRACING_ENABLED=false
```

## Update App After Changes

```powershell
git add .
git commit -m "Updated features"
git push origin main
# Render auto-deploys!
```

---

**Your app will be live at:** `https://YOUR-APP-NAME.onrender.com`
