# Account and sign out

## Website login

The marketing site uses **Supabase** auth. You can sign in with email or OAuth providers we enable (such as GitHub or Google). After OAuth, you may land on `/auth/callback` briefly while the session is established, then you are sent back to where you were going.

## Desktop app and account

When the desktop app needs a session, it can open the website login in your browser. Complete login there; the app picks up the session when the flow finishes. Exact wording in the UI may change, but the idea is always: **browser handles credentials**, app stores tokens it needs for entitled features.

## Signing out on the desktop

In the **Zenvi** main window:

- Use the **log out** control on the **menu bar** (top right corner icon). You will be asked to confirm.
- There is also a **Sign out** action in the menus that clears your account session in the app.

Signing out does not delete your local project files. It only ends the logged in account for features that require it.

## Signing out on the website

On the homepage, open the nav. If you are signed in, use **Sign out** next to **Dashboard**. On the **Dashboard** page, **Sign out** returns you to the public site.

> **Tip:** If the app says you are not entitled to a feature after an upgrade, sign out and sign in once so tokens refresh.
