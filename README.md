This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`.env.local`. In the Supabase Dashboard SQL Editor, run these two scripts in
order:

1. [`supabase/schema.sql`](./supabase/schema.sql) creates or updates all app
   tables, row-level security policies, indexes, triggers, RPC functions, and
   authenticated-user permissions. It is safe to re-run and does not drop user
   data.
2. [`supabase/challenge-seed.sql`](./supabase/challenge-seed.sql) populates the
   challenge catalog and repairs generated tasks for users who already joined
   a challenge. It can be re-run safely.

The schema script supports both a fresh Supabase project and projects that
already have the app tables. Existing timestamped SQL migrations have been
consolidated into these two scripts; do not run the old migrations as well.
Refresh the app after both scripts succeed. Re-run the schema script after
updating the app to enable the one-time permanent username feature.

Daily streaks continue when you save a check-in, add a task, or complete a
task. Task-specific streaks still count completions for that task only.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
