# Smart Budget

A conversational budget tracking web app powered by Frank — an AI budget assistant built on Voiceflow. Chat naturally about your spending and watch your budget update in real time, no manual data entry needed.

## Features

- **Live Budget Barometer** — mention a spend amount or budget limit in chat and the progress bar updates automatically
- **AI Chat with Frank** — powered by Voiceflow; understands natural language like *"I spent R500 on food"* or *"My budget is R3000"*
- **Smart Budgeting card** — one click sends a personalised budgeting prompt to Frank
- **Savings Goals card** — get a step-by-step savings plan from Frank based on your income
- **Expense Insights modal** — tiered savings tips that adapt to how much of your budget you've used, with an "Ask Frank" shortcut
- **How it Works modal** — four-step explainer with example phrases for new users
- **Responsive layout** — two-column desktop view, single-column scrollable mobile view with a hamburger nav menu
- **Dark cosmic theme** — deep purple radial gradient with animated star field

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Chatbot | Voiceflow widget-next (`bundle.mjs`) |
| Monorepo | pnpm workspaces |

## Project Structure

```
artifacts/smart-budget/
├── src/
│   ├── pages/
│   │   └── Home.tsx        # Main page — all components live here
│   └── index.css           # Global styles, Tailwind imports, utility classes
├── index.html
├── vite.config.ts
└── package.json
netlify.toml                # Netlify build config (root of repo)
```

## Getting Started (local dev)

> Requires Node 24 and pnpm.

```bash
# Install dependencies
pnpm install

# Run the Smart Budget dev server
pnpm --filter @workspace/smart-budget run dev
```

The app will be available at the port assigned by the `PORT` environment variable (default `5173`).

## Deploying to Netlify

A `netlify.toml` is included at the repo root. Connect your GitHub repository to Netlify and it will:

1. Run `pnpm --filter @workspace/smart-budget run build`
2. Publish from `artifacts/smart-budget/dist/public`
3. Handle client-side routing via a catch-all redirect to `index.html`

No extra environment variables are required.

## How the Budget Auto-Update Works

The app monkey-patches `window.fetch` to intercept requests to the Voiceflow runtime. When a user message is detected, it runs through a keyword parser that looks for spend/limit phrases and extracts currency amounts. Matched messages trigger a barometer update with a brief purple flash animation.

**Example phrases Frank understands:**
- `"I spent R500 on groceries"` → adds R500 to spent
- `"My budget is R5000"` → sets the budget limit
- `"I've already spent R1200 this month"` → sets the spent total

## Voiceflow Configuration

| Setting | Value |
|---|---|
| Project ID | `69dbef45529f718cef5279b8` |
| Version | `production` |
| Runtime URL | `https://general-runtime.voiceflow.com` |
| Voice URL | `https://runtime-api.voiceflow.com` |
| Render mode | Embedded (right panel) |

## License

MIT
