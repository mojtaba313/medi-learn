import { Suspense } from "react";
import { AuthShell } from "@/components/app-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}