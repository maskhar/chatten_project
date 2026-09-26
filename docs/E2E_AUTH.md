# Operator Auth E2E

Codex runtime cannot create remote Auth users or download Chromium. Run this flow on operator machine with trusted system CA and an installed browser.

## Role-less smoke

```powershell
$env:E2E_ALLOW_REMOTE_SUPABASE="true"
npm run e2e:auth:provision
npm run e2e:auth:session
```

Open `/admin/login` in normal browser. Read temporary credentials only from `.e2e/auth-user.local.json`. Login must authenticate, then `/admin`, `/admin/media`, `/admin/users`, and `/admin/preview` must deny access because role is `none`. Logout in UI.

Run browser test with installed Chrome/Edge:

```powershell
$env:PLAYWRIGHT_CHROME_PATH="C:\path\to\chrome.exe"
$env:E2E_APP_URL="http://localhost:3000"
npx playwright test tests/e2e/auth-smoke.spec.ts
```

Cleanup always:

```powershell
$env:E2E_ALLOW_REMOTE_SUPABASE="true"
npm run e2e:auth:cleanup
```

## Role checks

Repeat provision and cleanup for each role:

```powershell
npm run e2e:auth:provision -- --role editor
npm run e2e:auth:provision -- --role admin
npm run e2e:auth:provision -- --role super_admin
```

Never send temporary credentials to Codex or commit `.e2e/`.