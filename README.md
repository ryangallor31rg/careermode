# CareerMode — deploy guide

## 1. Get the code onto your computer
Download this folder's files (you'll get them as a zip from the chat), unzip them
somewhere on your computer, and open a terminal in that folder.

## 2. Install dependencies and test locally (optional but recommended)
```
npm install
npm run dev
```
This starts a local dev server (usually `http://localhost:5173`) so you can click through
the app before deploying. The AI features (Resume Builder, Import, Interview Prep) won't
work locally yet — they need the API key set up on Vercel in step 5.

## 3. Create the GitHub repo
1. Go to github.com, log in, click **New repository**.
2. Name it `careermode` (or anything you like), keep it **Public** or **Private** — either
   works — and don't initialize it with a README (you already have one).
3. GitHub will show you a page with commands. You'll use ones like these, but first —

### You'll need a Personal Access Token, not your password
GitHub no longer accepts account passwords for pushing code from a terminal. Create a token:
1. github.com → click your profile photo → **Settings** → **Developer settings** →
   **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. Give it a name like "careermode deploy," check the **repo** scope, generate it, and
   **copy the token somewhere safe** — GitHub only shows it once.
3. When you `git push` and it asks for a username/password, use your GitHub username
   (`rgallor31rg`) and paste the **token** as the password.

### Push the code
From inside the project folder:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/rgallor31rg/careermode.git
git push -u origin main
```

## 4. Import into Vercel
1. Go to vercel.com, log in, click **Add New → Project**.
2. Choose **Import Git Repository** and select the `careermode` repo you just pushed.
3. Vercel will auto-detect it as a Vite project — leave the default build settings.
4. **Before clicking Deploy**, open **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: an API key from [console.anthropic.com](https://console.anthropic.com) (Settings → API Keys)
5. Click **Deploy**.

## 5. Done
Vercel gives you a live URL (something like `careermode.vercel.app`). Every time you push
to the `main` branch on GitHub going forward, Vercel automatically redeploys.

## Notes
- Data (your Story Bank, profile info) is saved in each visitor's own browser via
  `localStorage` — it doesn't sync across devices and clears if someone clears their
  browser data. That's fine for personal use; if you ever want it to sync across
  devices, that would need a real backend database instead.
- The `ANTHROPIC_API_KEY` is only ever used server-side (inside `api/claude.js`) — it's
  never sent to the browser, so it's safe to use here.
