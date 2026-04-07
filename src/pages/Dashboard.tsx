import { DollarSign, Package, FileText, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import KpiCard from "@/components/KpiCard";
import { products, invoices, salesData, formatCurrency } from "@/data/mock-data";

const Dashboard = () => {
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble de votre activité commerciale</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(totalRevenue)}
          change="+12% vs mois dernier"
          changeType="positive"
          icon={DollarSign}
        />
        <KpiCard
          title="Produits en stock"
          value={String(products.length)}
          change={`${products.reduce((s, p) => s + p.stock, 0)} unités`}
          changeType="neutral"
          icon={Package}
        />
        <KpiCard
          title="Factures en attente"
          value={String(pendingInvoices.length)}
          change={formatCurrency(pendingInvoices.reduce((s, i) => s + i.total, 0))}
          changeType="negative"
          icon={FileText}
        />
        <KpiCard
          title="Alertes stock"
          value={String(lowStockProducts.length)}
          change="Sous le seuil minimum"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-warning/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">Évolution des ventes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Revenu"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">Alertes stock bas</h2>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte</p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning">{p.stock}</p>
                    <p className="text-xs text-muted-foreground">min: {p.minStock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
