import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white">
            F
          </div>
          <h1 className="text-2xl font-semibold text-white">FixFlow</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every WhatsApp message becomes a job.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Demo account — Kool Care AC Services
        </p>
      </div>
    </div>
  );
}
