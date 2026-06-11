import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Train, LayoutDashboard, AlertTriangle, Users, MapPin, Wrench, BarChart3,
  LogOut, ShieldCheck, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notification-bell";

interface NavItem { to: string; label: string; icon: typeof Train }

const inspectorNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
];

const maintenanceNav: NavItem[] = [
  { to: "/maintenance", label: "My Tasks", icon: Wrench },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Operations", icon: LayoutDashboard },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/assets", label: "Assets", icon: Wrench },
  { to: "/maintenance", label: "Maintenance Tasks", icon: Wrench },
  { to: "/stations", label: "Stations", icon: MapPin },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin", label: "Inspectors", icon: Users },
];

function SidebarBody({
  nav, pathname, profile, initials, onSignOut, onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  profile: { full_name?: string | null; email?: string | null } | null | undefined;
  initials: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-rail text-primary-foreground">
          <Train className="h-5 w-5" />
        </div>
        <div className="font-display font-bold">
          RailAssist <span className="text-gradient-rail">AI</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((n) => {
          const active = pathname === n.to;
          return (
            <Link
              key={n.label}
              to={n.to}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name ?? "User"}</div>
            <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, kind }: { children: ReactNode; kind: "inspector" | "admin" | "maintenance" }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = kind === "admin" ? adminNav : kind === "maintenance" ? maintenanceNav : inspectorNav;
  const initials = (profile?.full_name ?? profile?.email ?? "U").slice(0, 2).toUpperCase();
  const handleSignOut = () => { signOut().then(() => navigate({ to: "/" })); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar">
        <SidebarBody nav={nav} pathname={pathname} profile={profile} initials={initials} onSignOut={handleSignOut} />
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-sidebar">
                <SidebarBody
                  nav={nav} pathname={pathname} profile={profile} initials={initials}
                  onSignOut={() => { setMobileOpen(false); handleSignOut(); }}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <div className="md:hidden flex h-8 w-8 items-center justify-center rounded-md gradient-rail text-primary-foreground shrink-0">
              <Train className="h-4 w-4" />
            </div>
            <div className="text-sm text-muted-foreground hidden sm:flex items-center gap-2 truncate">
              <ShieldCheck className="h-4 w-4 text-success shrink-0" />
              <span className="truncate">{kind === "admin" ? "Super Admin Console" : kind === "maintenance" ? "Maintenance Workspace" : "Inspector Workspace"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
