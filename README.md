# Smart Budget Chat Bot

Live site: https://smart-budget-chatbot1.netlify.app/

Smart Budget is a web app that helps users manage money through a conversational AI assistant named Frank. Instead of filling in long forms or spreadsheets, users can chat naturally about spending, budget limits, and savings goals while the app updates the budget view in real time.

## Why It Was Created

Smart Budget was created to help young professionals and students build better saving habits. Many people in this group manage irregular expenses, limited income, transport costs, food costs, study needs, rent, subscriptions, and social spending all at once.

The goal of the app is to make budgeting feel easier, less intimidating, and more personal. Frank gives users a simple way to reflect on their spending, set limits, and get saving guidance without needing advanced financial knowledge.

## What The App Does

- Lets users chat with Frank, an embedded AI budget assistant.
- Tracks spending and budget limits from natural chat messages.
- Updates a live budget barometer as users mention money amounts.
- Gives budgeting prompts and savings guidance.
- Shows expense insights based on how much of the budget has been used.
- Works on desktop and mobile screens.

## Who It Is For

Smart Budget is designed for:

- Students learning to manage monthly allowances or part-time income.
- Young professionals starting to budget salaries and expenses.
- Anyone who wants a simple, friendly way to understand spending habits.

## Built With

| Area | Tools |
| --- | --- |
| Frontend | React 19, TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| AI assistant | Voiceflow embedded chat |
| Package manager | pnpm workspaces |
| Deployment | Netlify, Vercel configuration |

## Project Structure

```text
artifacts/smart-budget/
  src/
    pages/Home.tsx
    index.css
  index.html
  vite.config.ts
  package.json

artifacts/api-server/
  src/app.ts

vercel.json
pnpm-workspace.yaml
```

## Run Locally

```bash
corepack enable
corepack pnpm install
corepack pnpm --filter @workspace/smart-budget dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build

```bash
corepack pnpm --filter @workspace/smart-budget build
```

The built app is created at:

```text
artifacts/smart-budget/dist
```

## Vercel Deployment

Vercel uses the root `vercel.json`:

```text
Build command: pnpm --filter @workspace/smart-budget build
Output directory: artifacts/smart-budget/dist
```

The app also includes a rewrite rule so the deployed site loads correctly from any route.
