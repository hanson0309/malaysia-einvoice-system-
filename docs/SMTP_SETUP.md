# SMTP Email Configuration Guide

## Current Status

The backend `.env` file has SMTP credentials configured, but Gmail requires an **App Password** instead of your regular account password for security reasons.

## Gmail SMTP Setup (Recommended)

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the steps to enable 2FA if not already enabled

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **App**: Choose "Mail"
3. Select **Device**: Choose "Other (Custom name)" and enter "MyInvois System"
4. Click **Generate**
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Update .env File

Replace the current `SMTP_PASSWORD` in `backend/.env`:

```env
SMTP_USER=hansonng00@gmail.com
SMTP_PASSWORD=your_16_character_app_password_here
SMTP_FROM_NAME=MyInvois System
```

**Important:** Remove spaces from the app password when pasting.

### Step 4: Test Email Sending

1. Restart the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Create a test invoice and try sending it via email

3. Check for errors in the backend console

## Alternative: Use SendGrid (Production Recommended)

For production use, consider using SendGrid instead of Gmail:

### Why SendGrid?

- ✅ Higher sending limits (100 emails/day free tier)
- ✅ Better deliverability
- ✅ Email analytics and tracking
- ✅ No 2FA or app password needed
- ✅ Professional sender reputation

### SendGrid Setup

1. Sign up at: https://sendgrid.com/
2. Create an API key
3. Update `backend/src/services/EmailService.ts`:

```typescript
this.transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});
```

4. Update `.env`:
```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMTP_USER=noreply@yourdomain.com
SMTP_FROM_NAME=MyInvois System
```

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause:** Using regular password instead of App Password

**Solution:** Follow Step 2 above to generate an App Password

### Error: "SMTP credentials not configured"

**Cause:** Missing SMTP_USER or SMTP_PASSWORD in .env

**Solution:** Ensure both variables are set in `backend/.env`

### Emails not arriving

**Possible causes:**
1. Check spam/junk folder
2. Verify recipient email address is correct
3. Check backend console for error messages
4. Verify Gmail account is not blocked (check https://myaccount.google.com/notifications)

### Gmail daily sending limit reached

**Limit:** 500 emails per day for Gmail accounts

**Solution:** 
- Use SendGrid for higher volume
- Or create multiple Gmail accounts and rotate

## Current Configuration

**File:** `backend/.env`

```env
SMTP_USER=hansonng00@gmail.com
SMTP_PASSWORD=040309hanson  # ⚠️ NEEDS TO BE REPLACED WITH APP PASSWORD
SMTP_FROM_NAME=MyInvois System
```

**Status:** ⚠️ **Action Required** - Replace password with App Password

## Security Notes

- ✅ Never commit `.env` file to git (already in `.gitignore`)
- ✅ Use App Passwords instead of account passwords
- ✅ Rotate credentials periodically
- ✅ Use environment-specific credentials (dev/staging/prod)
- ⚠️ Current password in .env appears to be a regular password - replace it immediately

## Next Steps

1. **Immediate:** Generate Gmail App Password and update `.env`
2. **Short-term:** Test email sending functionality
3. **Long-term:** Consider migrating to SendGrid for production
