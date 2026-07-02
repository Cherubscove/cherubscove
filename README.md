# Welcome to your Lovable project

This project is a Vite + React SPA using Supabase for public event listings, registrations, and admin content management.

## Deployment Environment Variables

For Vercel deployment, set the following environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These values are required for the frontend to initialize the Supabase client and avoid the runtime error `supabaseUrl is required.`
