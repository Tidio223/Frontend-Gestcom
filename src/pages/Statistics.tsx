import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { formatCurrency } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface SalesData {
  period: string;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
}

interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

const Statistics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Récupérer les statistiques depuis l'API
      const statsRes = await fetch(`${API_BASE_URL}/api/sales/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();

      if (statsData.success) {
        const stats = statsData.data;
        setSalesData({
          period: selectedPeriod === 'day' ? 'Aujourd\'hui' : 
                  selectedPeriod === 'week' ? 'Cette semaine' : 
                  selectedPeriod === 'month' ? 'Ce mois' : 'Cette année',
          totalSales: stats.totalSales || 0,
          totalRevenue: stats.todayTotal || 0,
          totalOrders: stats.totalSales || 0,
          averageOrderValue: stats.averageOrderValue || 0,
          growthRate: 0
        });
      }

      // Récupérer les ventes pour les produits les plus vendus
      const salesRes = await fetch(`${API_BASE_URL}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const salesResData = await salesRes.json();

      if (salesResData.success) {
        const sales = salesResData.data.sales || salesResData.data;
        // Calculer les produits les plus vendus
        const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
        sales.forEach((sale: any) => {
          sale.items.forEach((item: any) => {
            if (!productSales[item.productName]) {
              productSales[item.productName] = { name: item.productName, quantity: 0, revenue: 0 };
            }
            productSales[item.productName].quantity += item.quantity;
            productSales[item.productName].revenue += item.total;
          });
        });

        const topProductsData = Object.values(productSales)
          .map((p, index) => ({
            id: index.toString(),
            name: p.name,
            quantitySold: p.quantity,
            revenue: p.revenue,
            percentage: 0
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6);

        const totalRevenue = topProductsData.reduce((sum, p) => sum + p.revenue, 0);
        topProductsData.forEach(p => {
          p.percentage = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
        });

        setTopProducts(topProductsData);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    trendValue 
  }: {
    title: string;
    value: string;
    description: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>{description}</span>
          {trend && trendValue && (
            <div className={`flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos performances commerciales
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={(value: 'day' | 'week' | 'month' | 'year') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStatistics}>
            <Calendar className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires"
          value={formatCurrency(salesData?.totalRevenue || 0)}
          description={salesData?.period || ''}
          icon={DollarSign}
          trend={salesData?.growthRate && salesData.growthRate > 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(salesData?.growthRate || 0)}%`}
        />
        <StatCard
          title="Commandes totales"
          value={salesData?.totalOrders?.toString() || '0'}
          description={salesData?.period || ''}
          icon={ShoppingCart}
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Panier moyen"
          value={formatCurrency(salesData?.averageOrderValue || 0)}
          description="Par commande"
          icon={Package}
          trend="up"
          trendValue="+5%"
        />
        <StatCard
          title="Produits vendus"
          value={salesData?.totalSales?.toString() || '0'}
          description={salesData?.period || ''}
          icon={BarChart3}
          trend="down"
          trendValue="-3%"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Graphique circulaire des produits les plus vendus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Répartition des ventes par produit
            </CardTitle>
            <CardDescription>
              Pourcentage de revenus par produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'][index % 6]
                    } />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {topProducts.slice(0, 3).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ['#0088FE', '#00C49F', '#FFBB28'][index % 3] }}
                    />
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <span>{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Graphique d'évolution mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Évolution des ventes mensuelles
            </CardTitle>
            <CardDescription>
              Chiffre d'affaires et nombre de commandes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée mensuelle disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'CA' : 'Commandes'
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="revenue"
                  />
                  <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="orders" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphique de tendance des ventes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Analyse comparative des performances
          </CardTitle>
          <CardDescription>
            Comparaison mensuelle du chiffre d'affaires et des commandes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Chiffre d\'affaires' : 'Commandes'
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  name="revenue"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                  name="orders"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tableau récapitulatif */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Résumé des performances
          </CardTitle>
          <CardDescription>
            Analyse détaillée de vos indicateurs clés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Meilleur mois</span>
                <Badge variant="outline">{monthlyData.length > 0 ? monthlyData.reduce((max, m) => m.revenue > max.revenue ? m : max, monthlyData[0]).month : 'N/A'}</Badge>
              </div>
              <p className="text-2xl font-bold">{monthlyData.length > 0 ? formatCurrency(Math.max(...monthlyData.map(m => m.revenue))) : '0 FCFA'}</p>
              <p className="text-xs text-muted-foreground">{monthlyData.length > 0 ? `${Math.max(...monthlyData.map(m => m.orders))} commandes` : '0 commandes'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total annuel</span>
                <Badge variant="outline">2026</Badge>
              </div>
              <p className="text-2xl font-bold">{monthlyData.length > 0 ? formatCurrency(monthlyData.reduce((sum, m) => sum + m.revenue, 0)) : '0 FCFA'}</p>
              <p className="text-xs text-muted-foreground">{monthlyData.length > 0 ? `${monthlyData.reduce((sum, m) => sum + m.orders, 0)} commandes` : '0 commandes'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Moyenne mensuelle</span>
                <Badge variant="outline">Moyenne</Badge>
              </div>
              <p className="text-2xl font-bold">{monthlyData.length > 0 ? formatCurrency(Math.round(monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length)) : '0 FCFA'}</p>
              <p className="text-xs text-muted-foreground">{monthlyData.length > 0 ? `${Math.round(monthlyData.reduce((sum, m) => sum + m.orders, 0) / monthlyData.length)} commandes/mois` : '0 commandes/mois'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
