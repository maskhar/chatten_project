import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { LoginForm } from "./login-form";
// A30: LoginForm reads `?next=`, so it needs a Suspense boundary or the
// prerender of this otherwise-static page fails.
export default function LoginPage() { return <main className="min-h-screen py-16"><Container><h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>Admin sign in</h1><Suspense fallback={null}><LoginForm /></Suspense></Container></main>; }
