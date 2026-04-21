import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, DollarSign, Users, Package } from "lucide-react";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("month");
  const [viewingReport, setViewingReport] = useState<any>(null);

  const generateReportData = (type: string) => {
    switch (type) {
      case "sales":
        return {
          title: "Rapport de Ventes",
          data: [
            { date: "2026-04-01", product: "Ordinateur portable HP", quantity: 5, amount: "4,495 FCFA", customer: "Client A" },
            { date: "2026-04-02", product: "Souris sans fil Logitech", quantity: 12, amount: "348 FCFA", customer: "Client B" },
            { date: "2026-04-03", product: "Clavier mécanique", quantity: 8, amount: "712 FCFA", customer: "Client C" },
            { date: "2026-04-04", product: "Moniteur 27 pouces", quantity: 3, amount: "1,047 FCFA", customer: "Client D" },
            { date: "2026-04-05", product: "Webcam HD", quantity: 15, amount: "600 FCFA", customer: "Client E" },
          ],
          summary: {
            totalSales: "7,202 FCFA",
            totalProducts: 43,
            totalCustomers: 5,
            averageSale: "167 FCFA"
          }
        };
      case "inventory":
        return {
          title: "Rapport d'Inventaire",
          data: [
            { product: "Ordinateur portable HP", stock: 15, reserved: 3, available: 12, status: "En stock" },
            { product: "Souris sans fil Logitech", stock: 45, reserved: 8, available: 37, status: "En stock" },
            { product: "Clavier mécanique", stock: 8, reserved: 2, available: 6, status: "Stock faible" },
            { product: "Moniteur 27 pouces", stock: 0, reserved: 5, available: 0, status: "Rupture" },
            { product: "Webcam HD", stock: 25, reserved: 4, available: 21, status: "En stock" },
          ],
          summary: {
            totalProducts: 5,
            totalStock: 93,
            totalReserved: 22,
            totalAvailable: 76
          }
        };
      case "customers":
        return {
          title: "Rapport Clients",
          data: [
            { name: "Entreprise A", email: "contact@entreprise-a.com", phone: "+221 33 123 45 67", orders: 15, totalSpent: "25,450 FCFA" },
            { name: "Entreprise B", email: "info@entreprise-b.com", phone: "+221 33 234 56 78", orders: 8, totalSpent: "12,300 FCFA" },
            { name: "Entreprise C", email: "hello@entreprise-c.com", phone: "+221 33 345 67 89", orders: 12, totalSpent: "18,750 FCFA" },
            { name: "Entreprise D", email: "service@entreprise-d.com", phone: "+221 33 456 78 90", orders: 6, totalSpent: "9,200 FCFA" },
            { name: "Entreprise E", email: "contact@entreprise-e.com", phone: "+221 33 567 89 01", orders: 20, totalSpent: "35,600 FCFA" },
          ],
          summary: {
            totalCustomers: 5,
            totalOrders: 61,
            totalRevenue: "101,300 FCFA",
            averageOrders: 12.2
          }
        };
      default:
        return { title: "Rapport", data: [], summary: {} };
    }
  };

  const handleViewReport = (reportType: string) => {
    const reportData = generateReportData(reportType);
    setViewingReport(reportData);
  };

  const handleDownloadReport = (reportType: string, format: string) => {
    const reportData = generateReportData(reportType);
    let content = "";
    let filename = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === "csv") {
      content = generateCSV(reportData);
      filename += ".csv";
    } else if (format === "json") {
      content = JSON.stringify(reportData, null, 2);
      filename += ".json";
    } else if (format === "txt") {
      content = generateTXT(reportData);
      filename += ".txt";
    }
    
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : format === "json" ? "application/json" : "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = (reportData: any) => {
    if (reportData.data.length === 0) return "";
    const headers = Object.keys(reportData.data[0]).join(",");
    const rows = reportData.data.map((row: any) => Object.values(row).join(",")).join("\n");
    return `${headers}\n${rows}`;
  };

  const generateTXT = (reportData: any) => {
    let content = `${reportData.title}\n`;
    content += `${"=".repeat(50)}\n\n`;
    content += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    
    if (reportData.summary) {
      content += `RÉSUMÉ:\n`;
      content += `${"-".repeat(20)}\n`;
      Object.entries(reportData.summary).forEach(([key, value]) => {
        content += `${key}: ${value}\n`;
      });
      content += "\n";
    }
    
    content += `DÉTAILS:\n`;
    content += `${"-".repeat(20)}\n`;
    reportData.data.forEach((row: any, index: number) => {
      content += `\n${index + 1}. `;
      Object.entries(row).forEach(([key, value]) => {
        content += `${key}: ${value} | `;
      });
      content = content.slice(0, -2); // Remove last " | "
      content += "\n";
    });
    
    return content;
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Analysez vos performances et générez des rapports détaillés
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleDownloadReport("sales", "csv")}>
            <Download className="mr-2 h-4 w-4" />
            Exporter tout
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125,450 FCFA</div>
            <p className="text-xs text-muted-foreground">
              +15% ce mois-ci
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              +20% ce mois-ci
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits vendus</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">324</div>
            <p className="text-xs text-muted-foreground">
              +8% ce mois-ci
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de croissance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5%</div>
            <p className="text-xs text-muted-foreground">
              Annuel
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rapports disponibles</CardTitle>
            <CardDescription>
              Sélectionnez un rapport pour le consulter ou l'exporter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Rapport de ventes mensuel", type: "sales", date: "2026-04-01", status: "Disponible", icon: DollarSign },
                { name: "Analyse des produits", type: "inventory", date: "2026-04-15", status: "Disponible", icon: Package },
                { name: "Rapport client", type: "customers", date: "2026-04-10", status: "Disponible", icon: Users },
                { name: "Inventaire complet", type: "inventory", date: "2026-04-17", status: "En cours", icon: Package },
                { name: "Performance trimestrielle", type: "sales", date: "2026-03-31", status: "Disponible", icon: TrendingUp },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <report.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{report.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.type} • {report.date}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={report.status === "Disponible" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewReport(report.type)}
                      disabled={report.status !== "Disponible"}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Voir
                    </Button>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadReport(report.type, "csv")}
                        disabled={report.status !== "Disponible"}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadReport(report.type, "json")}
                        disabled={report.status !== "Disponible"}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performances par période</CardTitle>
            <CardDescription>
              Comparaison des performances sur différentes périodes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { period: "Aujourd'hui", sales: "2,450 FCFA", orders: 24, growth: "+12%" },
                { period: "Cette semaine", sales: "18,200 FCFA", orders: 156, growth: "+8%" },
                { period: "Ce mois", sales: "125,450 FCFA", orders: 324, growth: "+15%" },
                { period: "Ce trimestre", sales: "342,100 FCFA", orders: 892, growth: "+18%" },
              ].map((period, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{period.period}</p>
                    <p className="text-sm text-muted-foreground">{period.orders} commandes</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{period.sales}</span>
                    <Badge variant="default" className="text-green-600">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {period.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produits les plus vendus</CardTitle>
          <CardDescription>
            Classement des produits par volume de ventes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { rank: 1, name: "Ordinateur portable HP", sales: 45, revenue: "40,455 FCFA", growth: "+22%" },
              { rank: 2, name: "Souris sans fil Logitech", sales: 89, revenue: "2,581 FCFA", growth: "+15%" },
              { rank: 3, name: "Clavier mécanique", sales: 34, revenue: "3,026 FCFA", growth: "+8%" },
              { rank: 4, name: "Moniteur 27 pouces", sales: 28, revenue: "9,772 FCFA", growth: "+12%" },
              { rank: 5, name: "Webcam HD", sales: 67, revenue: "2,680 FCFA", growth: "+5%" },
            ].map((product) => (
              <div key={product.rank} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium text-sm">
                    {product.rank}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales} unités vendues</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{product.revenue}</span>
                  <Badge variant="default" className="text-green-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {product.growth}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Viewer Modal */}
      {viewingReport && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>{viewingReport.title}</span>
                </CardTitle>
                <CardDescription>
                  Rapport généré le {new Date().toLocaleDateString('fr-FR')}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => handleDownloadReport("sales", "csv")}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => handleDownloadReport("sales", "json")}>
                  <FileText className="mr-2 h-4 w-4" />
                  JSON
                </Button>
                <Button variant="outline" onClick={() => handleDownloadReport("sales", "txt")}>
                  <FileText className="mr-2 h-4 w-4" />
                  TXT
                </Button>
                <Button variant="outline" onClick={() => setViewingReport(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Section */}
            {viewingReport.summary && Object.keys(viewingReport.summary).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Résumé</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(viewingReport.summary).map(([key, value]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Détails</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      {viewingReport.data.length > 0 && Object.keys(viewingReport.data[0]).map((header) => (
                        <th key={header} className="text-left p-2 border-b font-medium">
                          {header.charAt(0).toUpperCase() + header.slice(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingReport.data.map((row: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <td key={cellIndex} className="p-2 border-b">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
