import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, FileText } from "lucide-react";
import { Download, TrendingUp, DollarSign, Users, Package, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { API_BASE_URL, getFetchOptions } from "@/config/api";
import { COMPANY_INFO } from "@/config/company";
import { SUPER_ADMIN_EMAIL } from "@/config/superadmin";
import "@/styles/print.css";

const Reports = () => {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("month");
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [currentReportType, setCurrentReportType] = useState<string>("");
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // Charger les rapports depuis l'API
  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        ...getFetchOptions(),
      });
      const data = await response.json();

      if (data.success) {
        setSavedReports(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Régénérer les rapports
  const handleRegenerate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/regenerate`, {
        method: 'POST',
        ...getFetchOptions(),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ types: ['sales', 'inventory', 'customers'], period: dateRange }),
      });

      if (response.ok) {
        toast({ title: "Succès", description: "Rapports régénérés avec succès" });
        fetchReports();
      } else {
        toast({ title: "Erreur", description: "Impossible de régénérer les rapports", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error regenerating reports:', error);
      toast({ title: "Erreur", description: "Erreur lors de la régénération", variant: "destructive" });
    }
  };

  const generateReportData = (type: string, period: string = "month") => {
    // Utiliser les rapports existants depuis l'API
    const report = savedReports.find(r => r.type === type && r.period === period);
    
    if (report) {
      return report;
    }

    // Fallback : générer localement si aucun rapport trouvé
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

    return {
      title: `Rapport ${type} - ${period}`,
      period: period,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      data: [],
      summary: {
        totalSales: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      }
    };
  };

  const handleViewReport = (reportType: string) => {
    const reportData = generateReportData(reportType, dateRange);
    setViewingReport(reportData);
    setCurrentReportType(reportType);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
        method: 'DELETE',
        ...getFetchOptions(),
      });

      if (response.ok) {
        toast({ title: "Succès", description: "Rapport supprimé avec succès" });
        fetchReports();
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer le rapport", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
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
      totalRevenue: "Chiffre d'affaires",
      averageOrders: "Commandes Moyennes",
      totalSales: "Total ventes",
      totalProducts: "Quantité totale vendue",
      totalCustomers: "Clients",
      averageOrderValue: "Panier moyen",
      topProducts: "Produits les plus vendus"
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
        // Gérer les tableaux (comme topProducts)
        if (Array.isArray(value)) {
          content += `${frenchKey}:\n`;
          value.forEach((item: any, idx: number) => {
            content += `  ${idx + 1}. ${item.productName || item.name || 'Produit'} - ${item.quantitySold || item.quantity || 0} unités - ${item.revenue || item.total || 0} F CFA\n`;
          });
        } else {
          content += `${frenchKey}: ${value}\n`;
        }
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
        const frenchKey = headerMap[key] || key;
        // Gérer les tableaux (comme topProducts)
        if (Array.isArray(value)) {
          content += `${frenchKey}:\n`;
          value.forEach((item: any, idx: number) => {
            content += `  ${idx + 1}. ${item.productName || item.name || 'Produit'} - ${item.quantitySold || item.quantity || 0} unités - ${item.revenue || item.total || 0} F CFA\n`;
          });
        } else {
          content += `${frenchKey}: ${value}\n`;
        }
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

  const printReport = () => {
    const element = document.getElementById('report-viewer');
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport - ${viewingReport.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Arial&display=swap');
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 15mm; 
              background: white; 
              color: black;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
            .document-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .document-header h2 {
              font-size: 20pt;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .summary-section {
              margin-bottom: 30px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .summary-item {
              border: 1px solid #000;
              padding: 10px;
              background: #f9f9f9;
            }
            .summary-item p:first-child {
              font-size: 9pt;
              margin: 0 0 5px 0;
            }
            .summary-item p:last-child {
              font-size: 14pt;
              font-weight: bold;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            tr {
              page-break-inside: avoid;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body class="print-window-body">
          <div class="document-header">
            <h2>${viewingReport.title}</h2>
            <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="font-size: 10pt;">${COMPANY_INFO.name} - ${COMPANY_INFO.description}</p>
          </div>
          
          ${viewingReport.summary && Object.keys(viewingReport.summary).length > 0 ? `
          <div class="summary-section">
            <h3 style="font-size: 14pt; margin-bottom: 10px;">Résumé</h3>
            <div class="summary-grid">
              ${Object.entries(viewingReport.summary).map(([key, value]) => `
                <div class="summary-item">
                  <p>${key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p>${String(value)}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <h3 style="font-size: 14pt; margin-bottom: 10px;">Détails</h3>
          <table>
            <thead>
              <tr>
                ${viewingReport.data.length > 0 ? Object.keys(viewingReport.data[0]).map(header => `
                  <th>${header.charAt(0).toUpperCase() + header.slice(1)}</th>
                `).join('') : ''}
              </tr>
            </thead>
            <tbody>
              ${viewingReport.data.map((row: any) => `
                <tr>
                  ${Object.values(row).map((value: any) => `
                    <td>${String(value)}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
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
          <Button variant="outline" onClick={handleRegenerate}>
            <Calendar className="mr-2 h-4 w-4" />
            Régénérer
          </Button>
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
            <div className="text-2xl font-bold">
              {savedReports.length > 0 && savedReports[0]?.summary?.totalRevenue 
                ? `${savedReports[0].summary.totalRevenue.toLocaleString('fr-FR')} FCFA` 
                : "0 FCFA"}
            </div>
            <p className="text-xs text-muted-foreground">
              {savedReports.length > 0 ? "Basé sur les rapports" : "Aucune donnée"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {savedReports.length > 0 ? (savedReports[0]?.summary?.totalCustomers || 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {savedReports.length > 0 ? "Basé sur les rapports" : "Aucune donnée"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantité totale vendue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {savedReports.length > 0 ? (savedReports[0]?.summary?.totalProducts || 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {savedReports.length > 0 ? "Basé sur les rapports" : "Aucune donnée"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rapports générés</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedReports.length}</div>
            <p className="text-xs text-muted-foreground">
              Total des rapports
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
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Chargement...</p>
              ) : savedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun rapport sauvegardé</p>
              ) : (
                savedReports.map((report) => (
                  <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{report.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.type} • {new Date(report.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Disponible</Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setViewingReport(report);
                          setCurrentReportType(report.type);
                        }}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        Voir
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report._id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
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
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Chargement...</p>
              ) : savedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
              ) : (
                savedReports.slice(0, 4).map((report, index) => (
                  <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">{new Date(report.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">
                        {report.summary?.totalRevenue 
                          ? `${report.summary.totalRevenue.toLocaleString('fr-FR')} FCFA` 
                          : "0 FCFA"}
                      </span>
                      <Badge variant="default" className="text-green-600">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Disponible
                      </Badge>
                    </div>
                  </div>
                ))
              )}
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
            {savedReports.length === 0 || !savedReports[0]?.data?.summary?.topProducts || savedReports[0]?.data?.summary?.topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
            ) : (
              savedReports[0]?.data?.summary?.topProducts.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.productName || 'Produit'}</p>
                      <p className="text-sm text-muted-foreground">{item.quantitySold || 0} unités vendues</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{item.revenue?.toLocaleString('fr-FR') || '0'} F CFA</span>
                    <Badge variant="default" className="text-green-600">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Top produit
                    </Badge>
                  </div>
                </div>
              )) || <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Viewer Modal */}
      {viewingReport && (
        <div id="report-viewer" key={currentReportType} className="print-document mt-6 p-6 bg-white text-black rounded-lg border border-gray-300 shadow-lg">
          <div className="document-header flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2 text-black">
                <FileText className="h-6 w-6 text-black" />
                <span>{viewingReport.title}</span>
              </h2>
              <p className="text-gray-700 mt-2">
                Rapport généré le {new Date().toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-gray-600 mt-1">{COMPANY_INFO.name} - {COMPANY_INFO.description}</p>
            </div>
            <div className="flex items-center space-x-2 print-hide">
              <Button 
                onClick={printReport}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
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
