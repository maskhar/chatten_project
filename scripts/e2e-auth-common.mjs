import crypto from "node:crypto";

export const e2eRoles = ["none", "editor", "admin", "super_admin"];
export function requireRemoteOptIn(value) { if (value !== "true") throw new Error("Set E2E_ALLOW_REMOTE_SUPABASE=true before mutating remote Auth state."); }
export function parseRole(argv) { const index = argv.indexOf("--role"); const role = index >= 0 ? argv[index + 1] : "none"; if (!e2eRoles.includes(role)) throw new Error("Role must be one of: none, editor, admin, super_admin."); return role; }
export function createCredentials() { return { email: `chatten-e2e-${Date.now()}-${crypto.randomBytes(6).toString("hex")}@example.invalid`, password: crypto.randomBytes(32).toString("base64url") }; }
export function validateState(value) { if (!value || typeof value !== "object" || typeof value.userId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.userId) || typeof value.email !== "string" || typeof value.password !== "string" || !e2eRoles.includes(value.role)) throw new Error("Invalid E2E Auth state file."); return value; }
export function requiredEnv(env) { const url=env.NEXT_PUBLIC_SUPABASE_URL; const serviceRoleKey=env.SUPABASE_SERVICE_ROLE_KEY; const anonKey=env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !serviceRoleKey || !anonKey) throw new Error("Missing Supabase runtime configuration."); return { url, serviceRoleKey, anonKey }; }