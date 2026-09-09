import { Container } from "@/components/ui/container";
import { LoginForm } from "./login-form";
export default function LoginPage() { return <main className="min-h-screen py-16"><Container><h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>Admin sign in</h1><LoginForm /></Container></main>; }
