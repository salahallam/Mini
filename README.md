# Chatter — Supabase + Vite

Production-ready frontend for Chatter using Supabase Auth, PostgreSQL and Realtime.

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never put a Supabase Secret Key in the frontend.

## 3. Run locally

```bash
npm run dev
```

## 4. Production build

```bash
npm run build
npm run preview
```

The deploy output is `dist/`.

## Deploy

Works with Vercel, Netlify, Cloudflare Pages, GitHub Pages with an appropriate SPA setup, or any static host that can run `npm run build`.

Build command: `npm run build`
Output directory: `dist`

Add these environment variables in the hosting provider:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The Supabase database setup remains in `supabase/schema.sql`.
