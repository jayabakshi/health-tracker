# HealthTrend - Smart Health Tracker

HealthTrend is a modern, responsive web application for tracking healthcare appointments and medication schedules.

## Features
- **Dashboard**: Quick overview of upcoming appointments and medication adherence.
- **Appointments**: Book, edit, and track doctor visits.
- **Medications**: Log medications, set schedules, and mark them as taken.
- **Calendar**: Visual month-view of your health schedule.
- **Local Privacy**: All data is stored in your browser's LocalStorage. No data is sent to supreme servers.

## Setup (Local)
Simply open `index.html` in your browser.
Or run a local server:
\`\`\`bash
python -m http.server 8080
\`\`\`

## Deployment

Since this is a static web application (HTML/CSS/JS), it can be deployed for free on many platforms.

### Option 1: GitHub Pages (Recommended)
1. Initialize git (if not already done): \`git init\`
2. Commit your files: \`git add . && git commit -m "Ready for deploy"\`
3. Create a repository on GitHub.
4. Push your code:
   \`\`\`bash
   git remote add origin https://github.com/YOUR_USERNAME/health-tracker.git
   git push -u origin main
   \`\`\`
5. Go to Repository **Settings** > **Pages**.
6. Set **Source** to \`main\` branch.
7. Your site will be live at \`https://YOUR_USERNAME.github.io/health-tracker\`.

### Option 2: Netlify / Vercel
1. Create an account on [Netlify](https://netlify.com) or [Vercel](https://vercel.com).
2. Drag and drop the \`health-tracker\` folder into their dashboard.
3. It will be deployed instantly.

### Option 3: Backend Integration
Currently, this app is **Frontend Only**. To enable syncing across devices, a backend API would be required.
