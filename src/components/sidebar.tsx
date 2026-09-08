"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/inbox", label: "Inbox", icon: "💬" },
  { href: "/jobs", label: "Jobs", icon: "🧰" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/payments", label: "Payments", icon: "₹" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({
  businessName,
  userName,
}: {
  businessName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
          F
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">FixFlow</p>
          <p className="text-xs leading-tight text-slate-500">{businessName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="mb-2 truncate text-xs text-slate-500">{userName}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
