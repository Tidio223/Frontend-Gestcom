import { LayoutDashboard, Package, FileText, TrendingUp, Shield, LogOut, ShoppingCart, BarChart3, Users as UsersIcon, Archive, PieChart, Wallet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const baseNav = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/products", icon: Package, label: "Produits" },
  { to: "/sales", icon: ShoppingCart, label: "Ventes" },
  { to: "/inventory", icon: Archive, label: "Inventaires" },
  { to: "/invoices", icon: FileText, label: "Factures" },
];

const gerantNav = [
  ...baseNav,
  { to: "/statistics", icon: PieChart, label: "Statistiques" },
  { to: "/reports", icon: BarChart3, label: "Rapports" },
  { to: "/financial", icon: Wallet, label: "Gestion Financière" },
];

const adminNav = [
  ...gerantNav,
  { to: "/admin", icon: UsersIcon, label: "Utilisateurs" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { role, user, signOut } = useAuth();
  const navItems = role === "admin" ? adminNav : role === "gerant" ? gerantNav : baseNav;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <TrendingUp className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-sidebar-primary">GestCom</h1>
          <p className="text-xs text-sidebar-muted">Gestion Commerciale</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        {user && (
          <div className="space-y-2">
            <div className="text-xs">
              <p className="font-medium text-sidebar-primary truncate">{user.name}</p>
              <p className="text-sidebar-muted capitalize">{role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        )}
        <p className="text-xs text-sidebar-muted">© 2026 GestCom v1.0</p>
      </div>
    </aside>
  );
};

export default AppSidebar;
