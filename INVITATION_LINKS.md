# Invitation Code Links Guide

This guide explains how to create and share special signup links for users with invitation codes.

## How It Works

The application automatically detects invitation codes in the URL and:
1. **Auto-fills** the invitation code field
2. **Switches to "Sign up" mode** automatically
3. Users just need to fill in their personal information

## Available Invitation Codes

### Static Codes (Reusable, Never Expire)

These codes can be used by multiple users and never expire:

- **`SALES`** - For Sales team members
  - Role: `employee`
  - Category: `sales`
  - Certification: `sales-cert`

- **`HOSTESS`** - For Hostess team members
  - Role: `employee`
  - Category: `hostess`
  - Certification: `hostess-cert`

### Dynamic Codes (One-Time Use)

Single-use codes can be created by admins in the database. These expire after use.

## Creating Signup Links

### For Sales Team

**Link Format:**
```
https://your-domain.com/?code=SALES
```

**Example:**
```
https://ai-quiz-generator.vercel.app/?code=SALES
```

### For Hostess Team

**Link Format:**
```
https://your-domain.com/?code=HOSTESS
```

**Example:**
```
https://ai-quiz-generator.vercel.app/?code=HOSTESS
```

### For Custom Codes

If you have a custom invitation code (e.g., `NUANU-SALES-7G4XQ`):

**Link Format:**
```
https://your-domain.com/?code=YOUR-CODE
```

**Example:**
```
https://ai-quiz-generator.vercel.app/?code=NUANU-SALES-7G4XQ
```

## How Users Sign Up

### Step-by-Step Process

1. **User clicks the invitation link** (e.g., `https://your-domain.com/?code=SALES`)
2. **Page automatically**:
   - Opens the "Sign up" tab
   - Pre-fills the invitation code field
3. **User fills in**:
   - Corporate email (e.g., `john@nuanu.com`)
   - First name
   - Last name
   - Password
4. **User clicks "Sign up"**
5. **System automatically**:
   - Creates account with correct role (`employee`)
   - Assigns category (`sales` or `hostess`)
   - Links to appropriate certification
   - Assigns a random quiz from their category

## Sharing Links with Your Team

### Option 1: Share via Email/Message

**For Sales Team:**
```
Hi! Welcome to the Nuanu Certification System.

Click this link to sign up: https://your-domain.com/?code=SALES

You'll need to:
- Enter your email and password
- Fill in your first and last name
- The invitation code is already filled in for you

Once signed up, you can access your certification dashboard.
```

**For Hostess Team:**
```
Hi! Welcome to the Nuanu Certification System.

Click this link to sign up: https://your-domain.com/?code=HOSTESS

You'll need to:
- Enter your email and password
- Fill in your first and last name
- The invitation code is already filled in for you

Once signed up, you can access your certification dashboard.
```

### Option 2: QR Codes

Generate QR codes for each link:
- Sales QR Code: `https://your-domain.com/?code=SALES`
- Hostess QR Code: `https://your-domain.com/?code=HOSTESS`

### Option 3: Printed Cards/Flyers

Include the link on printed materials:
```
Nuanu Certification Portal
Scan QR code or visit:
https://your-domain.com/?code=SALES
```

## Link Shortening (Optional)

You can use URL shorteners to make links more user-friendly:

**Before:**
```
https://ai-quiz-generator.vercel.app/?code=SALES
```

**After (using bit.ly or similar):**
```
https://bit.ly/nuanu-sales
```

Or use a custom domain:
```
https://nuanu.dev/signup/sales
```

## Testing the Links

### Test Sales Link:
1. Visit: `https://your-domain.com/?code=SALES`
2. Verify:
   - ✓ "Sign up" tab is active
   - ✓ Invitation code field shows "SALES"
   - ✓ Can complete signup form

### Test Hostess Link:
1. Visit: `https://your-domain.com/?code=HOSTESS`
2. Verify:
   - ✓ "Sign up" tab is active
   - ✓ Invitation code field shows "HOSTESS"
   - ✓ Can complete signup form

## Troubleshooting

### Link Doesn't Auto-Fill Code

**Possible causes:**
- Code is case-sensitive (should be uppercase: `SALES`, not `sales`)
- URL parameter is missing (check for `?code=SALES`)
- Browser cached the page

**Solution:**
- Use uppercase codes: `SALES` or `HOSTESS`
- Ensure URL has `?code=` parameter
- Clear browser cache or use incognito mode

### Invalid Code Error

**Possible causes:**
- Code doesn't exist in database
- Code was already used (for non-static codes)
- Code expired (for time-limited codes)

**Solution:**
- Verify code exists in `invitation_codes` table
- For static codes (`SALES`, `HOSTESS`), they should always work
- Check Supabase dashboard for code status

### User Can't Sign Up

**Possible causes:**
- Email already registered
- Missing required fields
- Invalid email format

**Solution:**
- Check if email exists in Supabase `users` table
- Ensure all fields are filled (email, password, first name, last name)
- Verify email format is valid

## Admin: Creating Custom Codes

To create custom invitation codes, insert them into Supabase:

```sql
INSERT INTO invitation_codes (code, role, category, notes, expires_at)
VALUES 
  ('CUSTOM-CODE-123', 'employee', 'sales', 'Special sales team code', NULL);
```

Then share the link:
```
https://your-domain.com/?code=CUSTOM-CODE-123
```

## Best Practices

1. **Use Static Codes for Teams**: Use `SALES` and `HOSTESS` for regular team onboarding
2. **Use Custom Codes for Special Events**: Create one-time codes for specific campaigns or batches
3. **Set Expiration Dates**: For time-limited campaigns, set `expires_at` in the database
4. **Track Usage**: Monitor `used_at` and `used_by` fields to see who used which codes
5. **Share Securely**: Send links via secure channels (email, Slack, printed materials)

## Example Email Template

```
Subject: Welcome to Nuanu Certification Portal

Hi [Name],

Welcome to the Nuanu team! You can now access our certification system.

👉 Sign up here: https://your-domain.com/?code=SALES

The invitation code is already included in the link, so you just need to:
1. Fill in your email and password
2. Enter your first and last name
3. Click "Sign up"

After signing up, you'll be able to:
- Access your certification dashboard
- Take your assigned certification test
- View your results and certificates

If you have any questions, please contact the admin team.

Welcome aboard!
The Nuanu Team
```

## Quick Reference

| Code | Role | Category | Link |
|------|------|----------|------|
| `SALES` | employee | sales | `/?code=SALES` |
| `HOSTESS` | employee | hostess | `/?code=HOSTESS` |

---

**Need Help?**
- Check Supabase dashboard for code status
- Verify code exists in `invitation_codes` table
- Test links in incognito/private browsing mode

