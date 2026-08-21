import { AuthShell } from "@/components/app-shell";
import { RegisterForm } from "./register-form";

export const metadata = { title: "ثبت‌نام" };

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}