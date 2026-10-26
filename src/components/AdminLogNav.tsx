import Link from "next/link";

const TABS = [
  { href: "/alerts", label: "Alerts" },
  { href: "/kpi", label: "KPIs" },
  { href: "/portal-log", label: "Portal log" },
  { href: "/captain-ips", label: "Captain IPs" },
] as const;

export function AdminLogNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            active === tab.href
              ? "bg-blue-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}