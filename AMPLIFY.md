# Deploying the Forever Faded client on AWS Amplify

Amplify builds and hosts the **client only** (React/Vite). The Node API must be deployed elsewhere (e.g. Elastic Beanstalk, ECS, Lambda + API Gateway).

## 1. Build (amplify.yml)

The repo includes `amplify.yml` that:

- Runs from repo root, `cd client`, then `npm ci` and `npm run build`
- Uses **artifacts baseDirectory:** `client/dist`
- Caches `client/node_modules`

In Amplify Console → App settings → Build settings, use the **amplify.yml** from the repo (default).

## 2. Environment variable (required for API)

In Amplify Console → App settings → Environment variables, add:

| Name            | Value                                      |
|-----------------|--------------------------------------------|
| `VITE_API_URL`  | Your backend base URL **including** `/api` |

Examples:

- `https://your-api.example.com/api`
- `https://xxxx.execute-api.us-east-1.amazonaws.com/api`

The client sends requests to `VITE_API_URL + path` (e.g. `.../api/auth/login`). If `VITE_API_URL` is not set, the app uses `/api` (same origin), which only works when the API is served from the same host or behind a proxy.

## 3. SPA redirect (required for React Router)

So routes like `/book`, `/dashboard` work on refresh or direct links, add a **rewrite** in Amplify:

**Hosting → Rewrites and redirects → Edit:**

- **Source address:**  
  `<^[^.]+$|\.(?!js|css|gif|jpg|jpeg|png|svg|ico|woff|woff2|ttf|eot)$>`
- **Target address:** `/index.html`
- **Type:** `200 (Rewrite)`

This sends all requests that are not static assets to `index.html` so React Router can handle the route.

## 4. Optional: custom domain / redirects

Configure custom domain and HTTPS in Amplify Console as needed.

## Summary checklist

- [ ] API deployed and reachable at a URL
- [ ] `VITE_API_URL` set in Amplify env vars (e.g. `https://your-api.com/api`)
- [ ] SPA rewrite rule added (source regex → `/index.html`, type 200)
- [ ] Build uses `amplify.yml` and artifacts from `client/dist`
