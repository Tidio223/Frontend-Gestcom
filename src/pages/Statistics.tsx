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
    generateStatistics();
  }, [selectedPeriod]);

  const generateStatistics = () => {
    setLoading(true);
    
    // Simuler les données statistiques
    const mockSalesData: SalesData = {
      period: selectedPeriod === 'day' ? 'Aujourd\'hui' : 
              selectedPeriod === 'week' ? 'Cette semaine' : 
              selectedPeriod === 'month' ? 'Ce mois' : 'Cette année',
      totalSales: Math.floor(Math.random() * 100) + 50,
      totalRevenue: Math.floor(Math.random() * 5000000) + 1000000,
      totalOrders: Math.floor(Math.random() * 200) + 80,
      averageOrderValue: Math.floor(Math.random() * 50000) + 10000,
      growthRate: Math.floor(Math.random() * 40) - 10
    };

    const mockTopProducts: TopProduct[] = [
      { id: '1', name: 'Ciment Portland 50kg', quantitySold: 120, revenue: 1020000, percentage: 25 },
      { id: '2', name: 'Fer à béton 10mm', quantitySold: 80, revenue: 336000, percentage: 18 },
      { id: '3', name: 'Peinture Acrylique 20L', quantitySold: 45, revenue: 810000, percentage: 15 },
      { id: '4', name: 'Carrelage 40x40cm', quantitySold: 200, revenue: 1360000, percentage: 22 },
      { id: '5', name: 'Tuyau PVC 110mm', quantitySold: 60, revenue: 210000, percentage: 12 },
      { id: '6', name: 'Brique rouge standard', quantitySold: 150, revenue: 450000, percentage: 8 }
    ];

    const mockMonthlyData: MonthlyData[] = [
      { month: 'Jan', revenue: 1200000, orders: 45 },
      { month: 'Fev', revenue: 1500000, orders: 52 },
      { month: 'Mar', revenue: 1800000, orders: 61 },
      { month: 'Avr', revenue: 2100000, orders: 68 },
      { month: 'Mai', revenue: 1900000, orders: 59 },
      { month: 'Jun', revenue: 2300000, orders: 72 },
      { month: 'Jul', revenue: 2500000, orders: 78 },
      { month: 'Aou', revenue: 2200000, orders: 71 },
      { month: 'Sep', revenue: 2800000, orders: 85 },
      { month: 'Oct', revenue: 3200000, orders: 92 },
      { month: 'Nov', revenue: 3500000, orders: 98 },
      { month: 'Dec', revenue: 4000000, orders: 110 }
    ];

    setSalesData(mockSalesData);
    setTopProducts(mockTopProducts);
    setMonthlyData(mockMonthlyData);
    setLoading(false);
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
          <Button variant="outline" onClick={generateStatistics}>
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
                <Badge variant="outline">Décembre</Badge>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(4000000)}</p>
              <p className="text-xs text-muted-foreground">110 commandes</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taux de croissance</span>
                <Badge variant="outline" className="text-green-600">+233%</Badge>
              </div>
              <p className="text-2xl font-bold">233%</p>
              <p className="text-xs text-muted-foreground">vs Janvier</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total annuel</span>
                <Badge variant="outline">2026</Badge>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(29000000)}</p>
              <p className="text-xs text-muted-foreground">941 commandes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
