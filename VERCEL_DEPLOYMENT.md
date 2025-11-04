# Vercel Deployment Guide

This guide walks you through deploying the AI Quiz Generator to Vercel.

## Vercel Project Settings

### Basic Configuration

When importing from GitHub, use these settings:

- **Framework Preset**: `Next.js` (auto-detected)
- **Root Directory**: `./` (project root)
- **Build Command**: `npm run build` (or `next build`)
- **Output Directory**: Leave empty (Next.js default)
- **Install Command**: `npm install` (or `yarn install`, `pnpm install`, `bun install`)

### Advanced Settings (Optional)

- **Node.js Version**: 18.x or higher (recommended: 20.x)
- **Environment**: Production (default)

## Required Environment Variables

Add these environment variables in **Vercel Dashboard → Project Settings → Environment Variables**:

### 1. Supabase Configuration (Required)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type**: Plain text
- **Environments**: Production, Preview, Development (all)
- **Description**: Your Supabase project URL
- **Example**: `https://xxxxxxxxxxxxx.supabase.co`
- **Where to find**: Supabase Dashboard → Project Settings → API → Project URL

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type**: Plain text (public)
- **Environments**: Production, Preview, Development (all)
- **Description**: Supabase anonymous key for client-side authentication
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Project Settings → API → anon/public key
- **⚠️ Note**: This is safe to expose in client-side code (it's the anon key)

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: Encrypted (sensitive)
- **Environments**: Production, Preview, Development (all)
- **Description**: Supabase service role key for server-side admin operations
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Project Settings → API → Service Role Key
- **⚠️ Important**: Never expose this in client-side code. It's only used server-side.

### 2. Optional Environment Variables

If you're using OpenAI for quiz generation (legacy feature):
- `OPENAI_API_KEY` (if still needed)

## Step-by-Step: Adding Environment Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to your project** in Vercel Dashboard
2. **Click** "Settings" tab
3. **Click** "Environment Variables" in the left sidebar
4. **For each variable**:
   - Click "Add New"
   - Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the **Value**
   - Select **Environment(s)**:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click "Save"
5. **For sensitive keys** (like `SUPABASE_SERVICE_ROLE_KEY`):
   - Make sure to select "Encrypted" when adding
   - Vercel will automatically encrypt it

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development

vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

### Method 3: Bulk Import (Advanced)

You can also paste multiple environment variables at once:

1. Go to **Settings → Environment Variables**
2. Look for **"Import"** or **"Bulk Add"** option
3. Paste in format:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Environment Variable Reference

| Variable | Type | Required | Environments | Description |
|----------|------|----------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | ✅ Yes | All | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain | ✅ Yes | All | Supabase anonymous key (public, safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Encrypted | ✅ Yes | All | Supabase service role key (secret, server-only) |

## Post-Deployment Checklist

After deploying:

1. **Verify Environment Variables**:
   - Go to **Deployments** → Click latest deployment → **View Logs**
   - Check that no "Missing environment variable" errors appear

2. **Test Authentication**:
   - Visit your deployed site
   - Try signing up with invitation code: `SALES` or `HOSTESS`
   - Verify login works

3. **Test Quiz Flow**:
   - Login as employee
   - Start a quiz
   - Complete and submit
   - Verify certificate displays correctly

4. **Check Database Connection**:
   - Ensure Supabase allows connections from Vercel domains
   - Check Supabase Dashboard → Settings → API → Allowed URLs

## Troubleshooting

### Build Fails: "Missing environment variable"

**Solution**: Ensure all required variables are added for the correct environment (Production, Preview, or Development).

**Required variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for browser client)
- `SUPABASE_SERVICE_ROLE_KEY`

### Build Warnings: "Critical dependency: the request of a dependency is an expression"

These are harmless webpack warnings from Supabase packages. They don't cause build failures. If your build is failing, check:
1. All required environment variables are set
2. Build logs for actual errors (not just warnings)
3. Node.js version compatibility (use 18.x or 20.x)

The `next.config.js` has been updated to suppress these warnings.

### Build Fails: "Cannot find module"

**Solution**: 
- Check that `package.json` has all dependencies
- Verify `Install Command` is correct
- Try deleting `.next` folder and rebuilding

### Runtime Error: "Supabase connection failed"

**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (no trailing slash)
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)
- Ensure Supabase project is active and not paused

### 404 on Routes

**Solution**: 
- Verify `Root Directory` is set to `./`
- Check that `next.config.js` doesn't have conflicting settings

## Supabase Configuration

### Allowed URLs in Supabase

After deploying, add your Vercel domain to Supabase:

1. Go to **Supabase Dashboard → Project Settings → API**
2. Under **"URL Configuration"** → **"Allowed URLs"**
3. Add:
   - `https://your-project.vercel.app`
   - `https://your-project-*.vercel.app` (for preview deployments)
   - Your custom domain if you have one

### Database Setup

Ensure your Supabase database schema is set up:

1. Run the SQL schema from `supabase/schema.sql`
2. Seed initial data:
   ```bash
   npm run supabase:seed
   ```
   (Run this locally with `.env.local` configured, or manually insert data)

## Custom Domain (Optional)

To add a custom domain:

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Add your domain
3. Follow DNS configuration instructions
4. Update Supabase allowed URLs to include your custom domain

## Monitoring

- **Deployments**: View build logs in Vercel Dashboard
- **Analytics**: Enable Vercel Analytics in project settings
- **Logs**: Check function logs in Vercel Dashboard → Logs

## Next Steps

1. ✅ Add environment variables
2. ✅ Trigger first deployment
3. ✅ Test authentication flow
4. ✅ Test quiz functionality
5. ✅ Configure custom domain (optional)
6. ✅ Set up monitoring and alerts

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

