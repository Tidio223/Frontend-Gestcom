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

  // Libellés français pour les clés des rapports (fiche + exports)
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
    totalSpent: "Total dépensé",
    totalSales: "Nombre de ventes",
    totalProducts: "Nombre de produits",
    totalCustomers: "Nombre de clients",
    totalRevenue: "Chiffre d'affaires total",
    averageOrderValue: "Panier moyen",
    averageOrders: "Commandes moyennes",
    totalStock: "Stock total",
    totalReserved: "Stock réservé",
    totalAvailable: "Stock disponible",
    totalOrders: "Nombre de commandes",
    type: "Type",
    description: "Description",
  };

  const statusLabels: { [key: string]: string } = {
    completed: "Terminée",
    pending: "En attente",
    cancelled: "Annulée",
    overdue: "En retard",
    paid: "Payée",
    confirmed: "Confirmée",
  };

  const typeLabels: { [key: string]: string } = {
    sales: "Ventes",
    inventory: "Inventaire",
    customers: "Clients",
    financial: "Financier",
  };

  const typeTitles: { [key: string]: string } = {
    sales: "Rapport de Ventes",
    inventory: "Rapport d'Inventaire",
    customers: "Rapport Clients",
    financial: "Rapport Financier",
  };

  const periodLabels: { [key: string]: string } = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
  };

  const currencyKeys = ['amount', 'totalSpent', 'revenue', 'totalRevenue', 'averageOrderValue'];

  const formatFCFA = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;

  const getReportTitle = (report: any) =>
    `${typeTitles[report?.type] || report?.type || 'Rapport'} - ${periodLabels[report?.period] || report?.period || ''}`;

  // Libellé de résumé adapté au type de rapport
  const getSummaryLabel = (key: string, reportType: string) => {
    if (key === 'totalProducts') {
      return reportType === 'sales' ? 'Produits vendus' : 'Nombre de produits';
    }
    return headerMap[key] || key;
  };

  const formatCellValue = (key: string, value: any) => {
    if (currencyKeys.includes(key)) {
      return formatFCFA(Math.round(Number(value) || 0));
    }
    if (key === 'date') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
    }
    if (key === 'status' || key === 'type') {
      return statusLabels[String(value)] || String(value);
    }
    return String(value);
  };

  // Résumé affiché dans la fiche et les exports : pour les ventes, les valeurs
  // sont recalculées depuis les lignes du tableau (toujours cohérentes, même
  // pour les rapports générés avant le correctif). Les tableaux (topProducts)
  // sont exclus.
  const getDisplaySummary = (report: any) => {
    const rows = report?.data || [];
    const type = report?.type || currentReportType;

    if (type === 'sales') {
      const totalRevenue = rows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      const totalSales = rows.length;
      const productsSold = rows.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0);
      const customers = new Set(rows.map((r: any) => r.customer)).size;
      return [
        { label: 'Nombre de ventes', value: String(totalSales) },
        { label: 'Produits vendus', value: String(productsSold) },
        { label: 'Nombre de clients', value: String(customers) },
        { label: "Chiffre d'affaires total", value: formatFCFA(totalRevenue) },
        { label: 'Panier moyen', value: formatFCFA(totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0) },
      ];
    }

    return Object.entries(report?.summary || {})
      .filter(([, value]) => !Array.isArray(value) && typeof value !== 'object')
      .map(([key, value]) => {
        const num = Number(value);
        let formatted = String(value);
        if (!isNaN(num) && value !== '' && value !== null) {
          formatted = currencyKeys.includes(key)
            ? formatFCFA(Math.round(num))
            : String(Number.isInteger(num) ? num : Math.round(num * 10) / 10);
        }
        return { label: getSummaryLabel(key, type), value: formatted };
      });
  };

  // Bilan du stock (prix de gros) : lignes affichées dans la fiche, l'impression
  // et les exports. Les valeurs sont calculées et persistées par le backend.
  const getBilanLines = (report: any) => {
    const b = report?.bilanStock;
    if (!b || b.montantStockActuel == null) return null;
    const lines: { label: string; value: string; ecart?: boolean }[] = [
      { label: "Montant du stock au début", value: formatFCFA(b.montantOuverture || 0) },
    ];
    if ((b.montantEntrees || 0) > 0) {
      lines.push({ label: "Entrées de stock (au prix de gros)", value: `+ ${formatFCFA(b.montantEntrees)}` });
    }
    lines.push({ label: "Montant de l'inventaire (sorties au prix de gros)", value: `- ${formatFCFA(b.montantInventaire || 0)}` });
    lines.push({ label: "Montant actuel du stock", value: formatFCFA(b.montantStockActuel) });
    if (Math.abs(b.ecartStock || 0) > 1) {
      lines.push({
        label: `Écart avec le stock réel (${formatFCFA(b.montantStockReel || 0)})`,
        value: formatFCFA(b.ecartStock),
        ecart: true,
      });
    }
    return lines;
  };

  // Objet JSON exporté : clés en français, sans topProducts ni objets bruts
  const buildExportJSON = (report: any) => {
    const headers = report?.data?.length > 0 ? Object.keys(report.data[0]) : [];
    return {
      titre: getReportTitle(report),
      type: typeLabels[report?.type] || report?.type,
      periode: periodLabels[report?.period] || report?.period,
      genereLe: new Date().toLocaleDateString('fr-FR'),
      entreprise: `${COMPANY_INFO.name} - ${COMPANY_INFO.description}`,
      resume: Object.fromEntries(getDisplaySummary(report).map(i => [i.label, i.value])),
      bilanStock: getBilanLines(report)
        ? Object.fromEntries(getBilanLines(report)!.map(i => [i.label, i.value]))
        : undefined,
      details: (report?.data || []).map((row: any) =>
        Object.fromEntries(headers.map(h => [headerMap[h] || h, formatCellValue(h, row[h])]))
      ),
    };
  };

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
      const options = getFetchOptions();
      const response = await fetch(`${API_BASE_URL}/api/reports/regenerate`, {
        method: 'POST',
        ...options,
        headers: {
          ...(options.headers as Record<string, string>),
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
      title: `${typeTitles[type] || type} - ${periodLabels[period] || period}`,
      type: type,
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
    // Si la fiche est ouverte, exporter exactement le rapport affiché
    const reportData = viewingReport && viewingReport.type === reportType
      ? viewingReport
      : generateReportData(reportType, dateRange);
    const slug = (typeLabels[reportType] || reportType).toLowerCase();
    const fileDate = new Date().toISOString().split('T')[0];
    
    const download = (content: string, filename: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    if (format === "csv") {
      download(generateCSV(reportData), `rapport-${slug}-${fileDate}.csv`, "text/csv");
    } else if (format === "txt") {
      download(generateTXT(reportData), `rapport-${slug}-${fileDate}.txt`, "text/plain");
    } else if (format === "json") {
      download(JSON.stringify(buildExportJSON(reportData), null, 2), `rapport-${slug}-${fileDate}.json`, "application/json");
    } else if (format === "pdf") {
      generatePDF(reportData);
    }
  };

  const generateCSV = (reportData: any) => {
    const rows = reportData.data || [];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    const escape = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;

    let content = `${getReportTitle(reportData)}\n`;
    content += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    content += "RÉSUMÉ\n";
    getDisplaySummary(reportData).forEach((item) => {
      content += `${item.label}: ${item.value}\n`;
    });

    const bilan = getBilanLines(reportData);
    if (bilan) {
      content += "\nBILAN DU STOCK (prix de gros)\n";
      bilan.forEach((item) => {
        content += `${item.label}: ${item.value}\n`;
      });
    }

    if (headers.length > 0) {
      content += "\nDÉTAILS\n";
      content += headers.map((h) => headerMap[h] || h).join(",") + "\n";
      content += rows
        .map((row: any) => headers.map((h) => escape(formatCellValue(h, row[h]))).join(","))
        .join("\n");
    }

    return content;
  };

  const generateTXT = (reportData: any) => {
    let content = `${getReportTitle(reportData)}\n`;
    content += `${"=".repeat(50)}\n\n`;
    content += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    content += `RÉSUMÉ:\n`;
    content += `${"-".repeat(20)}\n`;
    getDisplaySummary(reportData).forEach((item) => {
      content += `${item.label}: ${item.value}\n`;
    });

    const bilan = getBilanLines(reportData);
    if (bilan) {
      content += `\nBILAN DU STOCK (prix de gros):\n`;
      content += `${"-".repeat(20)}\n`;
      bilan.forEach((item) => {
        content += `${item.label}: ${item.value}\n`;
      });
    }

    content += `\nDÉTAILS:\n`;
    content += `${"-".repeat(20)}\n`;
    (reportData.data || []).forEach((row: any, index: number) => {
      content += `\n${index + 1}. `;
      content += Object.entries(row)
        .map(([key, value]) => `${headerMap[key] || key}: ${formatCellValue(key, value)}`)
        .join(' | ');
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
      const slug = (typeLabels[currentReportType] || currentReportType).toLowerCase();
      pdf.save(`rapport-${slug}-${new Date().toISOString().split('T')[0]}.pdf`);
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
          <title>${getReportTitle(viewingReport)}</title>
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
              page-break-inside: avoid;
            }
            .summary-section {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
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
            <h2>${getReportTitle(viewingReport)}</h2>
            <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="font-size: 10pt;">${COMPANY_INFO.name} - ${COMPANY_INFO.description}</p>
          </div>
          
          ${getDisplaySummary(viewingReport).length > 0 ? `
          <div class="summary-section">
            <h3 style="font-size: 14pt; margin-bottom: 10px;">Résumé</h3>
            <div class="summary-grid">
              ${getDisplaySummary(viewingReport).map((item) => `
                <div class="summary-item">
                  <p>${item.label}</p>
                  <p>${item.value}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${getBilanLines(viewingReport) ? `
          <div class="summary-section">
            <h3 style="font-size: 14pt; margin-bottom: 10px;">Bilan du stock (prix de gros)</h3>
            <table style="margin-top: 0;">
              <tbody>
                ${getBilanLines(viewingReport)!.map((item) => `
                  <tr>
                    <td>${item.label}</td>
                    <td style="text-align: right; font-weight: bold; ${item.ecart ? 'color: #b45309;' : ''}">${item.value}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <h3 style="font-size: 14pt; margin-bottom: 10px;">Détails</h3>
          <table>
            <thead>
              <tr>
                ${viewingReport.data.length > 0 ? Object.keys(viewingReport.data[0]).map(header => `
                  <th>${headerMap[header] || header}</th>
                `).join('') : ''}
              </tr>
            </thead>
            <tbody>
              ${viewingReport.data.map((row: any) => `
                <tr>
                  ${Object.keys(viewingReport.data[0] || {}).map((key) => `
                    <td>${formatCellValue(key, row[key])}</td>
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

  // Premier rapport de ventes disposant d'un classement de produits
  const topProducts: any[] =
    savedReports.find((r) => r.type === 'sales' && Array.isArray(r.summary?.topProducts))
      ?.summary?.topProducts || [];

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
                      <p className="text-sm text-muted-foreground">{typeLabels[report.type] || report.type} • {new Date(report.date).toLocaleDateString('fr-FR')}</p>
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
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
            ) : (
              topProducts.slice(0, 5).map((item: any, index: number) => (
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
                    <span className="font-medium">{formatFCFA(item.revenue || 0)}</span>
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
                <span>{getReportTitle(viewingReport)}</span>
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
            {getDisplaySummary(viewingReport).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-black">Résumé</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getDisplaySummary(viewingReport).map((item, index) => (
                    <div key={index} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-700">{item.label}</p>
                      <p className="text-xl font-bold text-black">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bilan du stock (valeurs calculées par le backend, prix de gros) */}
            {getBilanLines(viewingReport) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-black">Bilan du stock</h3>
                <div className="border border-gray-300 rounded-lg bg-gray-50 divide-y divide-gray-200">
                  {getBilanLines(viewingReport)!.map((item, index) => (
                    <div key={index} className="flex justify-between items-center px-4 py-2 text-sm">
                      <span className={item.ecart ? "text-amber-700" : "text-gray-700"}>{item.label}</span>
                      <span className={`font-medium ${item.ecart ? "text-amber-700" : "text-black"}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Montants valorisés au prix de gros.</p>
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
                          {headerMap[header] || header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingReport.data.map((row: any, index: number) => (
                      <tr key={index} className="border-b border-gray-300 hover:bg-gray-50">
                        {Object.keys(viewingReport.data[0] || {}).map((key, cellIndex) => (
                          <td key={cellIndex} className="p-2 border-b border-gray-300 text-black">
                            {formatCellValue(key, row[key])}
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
