# Smart Budget

Smart Budget is a React and TypeScript web app with an embedded AI budget assistant named Frank. Users can chat about spending, budget limits, and savings goals while the app updates the budget view in real time.

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
artifacts/smart-budget/dist/public
```

## Vercel

Vercel uses the root `vercel.json`:

```text
Build command: pnpm --filter @workspace/smart-budget build
Output directory: artifacts/smart-budget/dist/public
```
