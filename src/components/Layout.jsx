import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  LayoutDashboard, Clock, Users, CalendarRange, CalendarClock,
  BarChart3, MapPin, LogOut, Menu, X, Activity, Settings, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "user"] },
  { to: "/attendance", label: "Attendance", icon: Clock, roles: ["admin", "user"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["admin"] },
  { to: "/shifts", label: "Shifts", icon: CalendarRange, roles: ["admin"] },
  { to: "/leave", label: "Leave", icon: CalendarClock, roles: ["admin", "user"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
];

const settingsItems = [
  { to: "/locations", label: "Locations", icon: MapPin, roles: ["admin"] },
];

export default function Layout() {
  const { user, employee, isAdmin, loading } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user?.role || "user")
  );

  const visibleSettingsItems = settingsItems.filter((item) =>
    item.roles.includes(user?.role || "user")
  );

  const settingsActive = visibleSettingsItems.some(
    (item) => location.pathname.startsWith(item.to)
  );

  const greetingName = employee?.full_name || user?.full_name || "User";
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning"
    : greetingHour < 18 ? "Good afternoon"
    : "Good evening";

  const renderSidebar = () => (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-heading font-bold text-base text-sidebar-accent-foreground leading-tight">Vibe</p>
          <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Attendance & Efficiency</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {visibleSettingsItems.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                settingsActive
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  settingsOpen ? "rotate-180" : "rotate-0"
                )}
              />
            </button>
            {settingsOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-1">
                {visibleSettingsItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <item.icon className="w-[16px] h-[16px] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground shrink-0">
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {employee?.full_name || user?.full_name || "User"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {isAdmin ? "Administrator" : "Employee"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0">{renderSidebar()}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">{renderSidebar()}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b bg-card shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-heading font-bold truncate">{greeting}, {greetingName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}