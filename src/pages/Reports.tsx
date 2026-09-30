import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, FileText } from "lucide-react";
import { Download, TrendingUp, DollarSign, Users, Package } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("month");
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [currentReportType, setCurrentReportType] = useState<string>("");

  // Régénérer le rapport quand la période ou le type change
  useEffect(() => {
    if (currentReportType) {
      const reportData = generateReportData(currentReportType, dateRange);
      setViewingReport(reportData);
    }
  }, [dateRange, currentReportType]);

  const generateReportData = (type: string, period: string = "month", financialData?: any) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case "day":
       startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Récupérer les factures payées depuis localStorage pour le rapport de ventes
    const invoicesData = localStorage.getItem('invoices');
    const invoices = invoicesData ? JSON.parse(invoicesData) : [];
    const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');
    
    // Filtrer les factures selon la période
    const filteredInvoices = paidInvoices.filter((inv: any) => {
      const invoiceDate = new Date(inv.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Normaliser les dates pour ignorer l'heure
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      invoiceDate.setHours(0, 0, 0, 0);
      return invoiceDate >= start && invoiceDate <= end;
    });

    // Si aucune facture n'est trouvée pour la période, utiliser toutes les factures payées
    // pour le développement (à enlever en production quand on aura des factures récentes)
    const displayInvoices = filteredInvoices.length > 0 ? filteredInvoices : paidInvoices;

    switch (type) {
      case "sales":
        return {
          title: `Rapport de Ventes - ${period === "day" ? "Jour" : period === "week" ? "Semaine" : period === "month" ? "Mois" : "Année"}`,
          period: period,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          data: displayInvoices.length > 0 ? displayInvoices.map((inv: any) => ({
            date: new Date(inv.date).toLocaleDateString('fr-FR'),
            product: inv.items.map((item: any) => item.productName).join(', '),
            quantity: inv.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
            amount: `${inv.total.toLocaleString('fr-FR')} FCFA`,
            customer: inv.client
          })) : [],
          summary: displayInvoices.length > 0 ? {
            totalSales: `${displayInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0).toLocaleString('fr-FR')} FCFA`,
            totalProducts: displayInvoices.reduce((sum: number, inv: any) => sum + inv.items.reduce((s: number, item: any) => s + item.quantity, 0), 0),
            totalCustomers: displayInvoices.length,
            averageSale: displayInvoices.length > 0 ? `${Math.round(displayInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0) / displayInvoices.length).toLocaleString('fr-FR')} FCFA` : "0 FCFA"
          } : {
            totalSales: "0 FCFA",
            totalProducts: 0,
            totalCustomers: 0,
            averageSale: "0 FCFA"
          }
        };
      case "inventory":
        return {
          title: `Rapport d'Inventaire - ${period === "day" ? "Jour" : period === "week" ? "Semaine" : period === "month" ? "Mois" : "Année"}`,
          period: period,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
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
          title: `Rapport Clients - ${period === "day" ? "Jour" : period === "week" ? "Semaine" : period === "month" ? "Mois" : "Année"}`,
          period: period,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          data: [
            { name: "Entreprise A", email: "contact@entreprise-a.com", phone: "+221 33 123 45 67", orders: period === "day" ? 2 : period === "week" ? 15 : period === "month" ? 15 : 180, totalSpent: period === "day" ? "3,400 FCFA" : period === "week" ? "25,450 FCFA" : period === "month" ? "25,450 FCFA" : "305,400 FCFA" },
            { name: "Entreprise B", email: "info@entreprise-b.com", phone: "+221 33 234 56 78", orders: period === "day" ? 1 : period === "week" ? 8 : period === "month" ? 8 : 96, totalSpent: period === "day" ? "1,540 FCFA" : period === "week" ? "12,300 FCFA" : period === "month" ? "12,300 FCFA" : "147,600 FCFA" },
            { name: "Entreprise C", email: "hello@entreprise-c.com", phone: "+221 33 345 67 89", orders: period === "day" ? 0 : period === "week" ? 12 : period === "month" ? 12 : 144, totalSpent: period === "day" ? "0 FCFA" : period === "week" ? "18,750 FCFA" : period === "month" ? "18,750 FCFA" : "225,000 FCFA" },
            { name: "Entreprise D", email: "service@entreprise-d.com", phone: "+221 33 456 78 90", orders: period === "day" ? 1 : period === "week" ? 6 : period === "month" ? 6 : 72, totalSpent: period === "day" ? "1,530 FCFA" : period === "week" ? "9,200 FCFA" : period === "month" ? "9,200 FCFA" : "110,400 FCFA" },
            { name: "Entreprise E", email: "contact@entreprise-e.com", phone: "+221 33 567 89 01", orders: period === "day" ? 3 : period === "week" ? 20 : period === "month" ? 20 : 240, totalSpent: period === "day" ? "5,340 FCFA" : period === "week" ? "35,600 FCFA" : period === "month" ? "35,600 FCFA" : "427,200 FCFA" },
          ],
          summary: {
            totalCustomers: 5,
            totalOrders: period === "day" ? 7 : period === "week" ? 61 : period === "month" ? 61 : 732,
            totalRevenue: period === "day" ? "11,810 FCFA" : period === "week" ? "101,300 FCFA" : period === "month" ? "101,300 FCFA" : "1,215,600 FCFA",
            averageOrders: period === "day" ? 1.4 : period === "week" ? 12.2 : period === "month" ? 12.2 : 146.4
          }
        };
      default:
        return { title: "Rapport", data: [], summary: {} };
    }
  };

  const handleViewReport = (reportType: string) => {
    const reportData = generateReportData(reportType, dateRange);
    setViewingReport(reportData);
    setCurrentReportType(reportType);
    // Scroll vers le bas de la page pour voir le rapport
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleDownloadReport = (reportType: string, format: string) => {
    const reportData = generateReportData(reportType, dateRange);
    
    if (format === "csv") {
      const content = generateCSV(reportData);
      const filename = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
      const blob = new Blob([content], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === "txt") {
      const content = generateTXT(reportData);
      const filename = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === "json") {
      const content = JSON.stringify(reportData, null, 2);
      const filename = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([content], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      generatePDF(reportData);
    }
  };

  const generateCSV = (reportData: any) => {
    if (reportData.data.length === 0) return "";
    
    // Headers en français
    const headerMap: { [key: string]: string } = {
      date: "Date",
      product: "Produit",
      quantity: "Quantité",
      amount: "Montant",
      customer: "Client",
      stock: "Stock",
      reserved: "Réservé",
      available: "Disponible",
      status: "Statut",
      name: "Nom",
      email: "Email",
      phone: "Téléphone",
      orders: "Commandes",
      totalSpent: "Total Dépensé",
      totalRevenue: "Revenu Total",
      averageOrders: "Commandes Moyennes"
    };
    
    const headers = Object.keys(reportData.data[0]).map(key => headerMap[key] || key).join(",");
    
    // Formatage des valeurs
    const rows = reportData.data.map((row: any) => {
      return Object.values(row).map((value: any) => {
        // Gérer les valeurs contenant des virgules ou des guillemets
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(",");
    }).join("\n");
    
    // Ajouter un résumé au début
    let content = `${reportData.title}\n`;
    content += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    
    if (reportData.summary) {
      content += "RÉSUMÉ\n";
      Object.entries(reportData.summary).forEach(([key, value]) => {
        const frenchKey = headerMap[key] || key;
        content += `${frenchKey}: ${value}\n`;
      });
      content += "\n";
    }
    
    content += "DÉTAILS\n";
    content += `${headers}\n`;
    content += rows;
    
    return content;
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

  const generatePDF = async (reportData: any) => {
    const element = document.getElementById('report-viewer');
    if (!element) {
      console.error('Element report-viewer not found');
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`rapport-${currentReportType}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
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
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleDownloadReport("sales", "csv")}>
            <Download className="mr-2 h-4 w-4" />
            Exporter ventes CSV
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
                { name: "Inventaire complet", type: "inventory", date: "2026-04-17", status: "Disponible", icon: Package },
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
                        <Download className="mr-1 h-3 w-3" />
                        CSV
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
        <div id="report-viewer" key={currentReportType} className="mt-6 p-6 bg-white text-black rounded-lg border border-gray-300 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2 text-black">
                <FileText className="h-6 w-6 text-black" />
                <span>{viewingReport.title}</span>
              </h2>
              <p className="text-gray-700 mt-2">
                Rapport généré le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => handleDownloadReport(currentReportType, "pdf")}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter PDF
              </Button>
              <Button 
                onClick={() => handleDownloadReport(currentReportType, "json")}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter JSON
              </Button>
              <Button 
                onClick={() => handleDownloadReport(currentReportType, "txt")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Exporter TXT
              </Button>
              <Button 
                onClick={() => handleDownloadReport(currentReportType, "csv")}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter CSV
              </Button>
              <Button 
                onClick={() => setViewingReport(null)}
              >
                Fermer
              </Button>
            </div>
          </div>

          <div>
            {/* Summary Section */}
            {viewingReport.summary && Object.keys(viewingReport.summary).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-black">Résumé</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(viewingReport.summary).map(([key, value]) => (
                    <div key={key} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-sm capitalize text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-xl font-bold text-black">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">Détails</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-black">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      {viewingReport.data.length > 0 && Object.keys(viewingReport.data[0]).map((header) => (
                        <th key={header} className="text-left p-2 border-b border-gray-300 font-medium text-black">
                          {header.charAt(0).toUpperCase() + header.slice(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingReport.data.map((row: any, index: number) => (
                      <tr key={index} className="border-b border-gray-300 hover:bg-gray-50">
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <td key={cellIndex} className="p-2 border-b border-gray-300 text-black">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
