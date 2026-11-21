import { Link, useRouterState } from "@tanstack/react-router";
import { Clapperboard, LayoutGrid, Settings } from "lucide-react";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  /** compact = fullscreen editor: slim bar, no footer, content fills viewport */
  variant?: "default" | "compact";
  /** Center slot of the top bar (e.g. editable canvas name) */
  title?: ReactNode;
  /** Right-side top bar actions */
  actions?: ReactNode;
}

const NAV = [
  { to: "/", label: "画布", icon: LayoutGrid, ocid: "nav.canvases.link" },
  { to: "/settings", label: "设置", icon: Settings, ocid: "nav.settings.link" },
] as const;

export function Layout({
  children,
  variant = "default",
  title,
  actions,
}: LayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const compact = variant === "compact";

  return (
    <div
      className={
        compact
          ? "flex h-screen flex-col overflow-hidden"
          : "flex min-h-screen flex-col"
      }
    >
      <header className="relative z-30 flex h-11 shrink-0 items-center gap-4 border-b bg-card px-4 shadow-subtle">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="nav.home.link"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clapperboard className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            镜台
          </span>
        </Link>

        <span className="h-5 w-px bg-border" aria-hidden />

        {title ? (
          <div className="min-w-0 flex-1">{title}</div>
        ) : (
          <div className="flex-1 text-xs text-muted-foreground">
            轻量视频分镜画布
          </div>
        )}

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}

        <nav aria-label="主导航" className="flex shrink-0 items-center gap-1">
          {NAV.map(({ to, label, icon: Icon, ocid }) => {
            const active =
              to === "/"
                ? pathname === "/" || pathname.startsWith("/canvas")
                : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-ocid={ocid}
                aria-current={active ? "page" : undefined}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main
        className={compact ? "relative min-h-0 flex-1" : "flex-1 bg-background"}
      >
        {children}
      </main>

      {!compact && (
        <footer className="border-t bg-card px-8 py-4 text-center text-xs text-muted-foreground">
          画布与生成结果仅保存在本浏览器 · © {new Date().getFullYear()}. Built
          with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            caffeine.ai
          </a>
        </footer>
      )}
    </div>
  );
}

export default Layout;
