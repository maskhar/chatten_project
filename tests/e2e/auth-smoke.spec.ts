import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
test("role-less Auth user can log in but cannot enter CMS", async ({ page }) => { const state=JSON.parse(fs.readFileSync(path.resolve(".e2e/auth-user.local.json"),"utf8")); await page.goto("/admin/login"); await page.getByLabel(/email/i).fill(state.email); await page.getByLabel(/kata sandi/i).fill(state.password); await page.getByRole("button",{name:/masuk/i}).click(); await page.goto("/admin"); await expect(page).toHaveURL(/\/admin\/login/); });