import { useState, useEffect } from "react";
import { DollarSign, Package, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import KpiCard from "@/components/KpiCard";
import { formatCurrency } from "@/data/mock-data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Récupérer les produits
      const productsRes = await fetch(`${API_BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = await productsRes.json();
      if (productsData.success) {
        const productsArray = productsData.data.products || productsData.data;
        setProducts(productsArray.map((p: any) => ({
          id: p._id,
          name: p.name,
          category: p.category,
          stock: p.stock,
          minStock: p.minStock
        })));
      }

      // Récupérer les ventes
      const salesRes = await fetch(`${API_BASE_URL}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const salesData = await salesRes.json();
      if (salesData.success) {
        const salesArray = salesData.data.sales || salesData.data;
        setSales(salesArray);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const pendingSales = sales.filter((s) => s.status === "pending");

  // Générer les données de ventes pour les 7 derniers jours
  const salesData = sales.slice(-7).map((sale, index) => ({
    month: new Date(sale.createdAt).toLocaleDateString('fr-FR', { weekday: 'short' }),
    revenue: sale.total,
    profit: sale.total * 0.29
  }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble de votre activité commerciale</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires (Sem.)"
          value={formatCurrency(totalRevenue)}
          change={sales.length > 0 ? `${sales.length} ventes` : "Aucune vente"}
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-primary/10"
        />
        <KpiCard
          title="Bénéfice net (Sem.)"
          value={formatCurrency(totalRevenue * 0.29)}
          change="Marge 29%"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-accent/10"
        />
        <KpiCard
          title="Produits en rupture"
          value={String(lowStockProducts.length)}
          change={`${products.filter((p) => p.stock > p.minStock && p.stock <= p.minStock * 1.5).length} en stock faible`}
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-warning/10"
        />
        <KpiCard
          title="Ventes (Semaine)"
          value={String(sales.length)}
          change={`${pendingSales.length} en attente`}
          changeType="negative"
          icon={FileText}
          iconColor="bg-primary/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">Évolution des ventes 7 derniers jours</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === "revenue" ? "Chiffre d'affaires" : "Bénéfice"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "13px",
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} name="revenue" />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} name="profit" />
            </LineChart>
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
