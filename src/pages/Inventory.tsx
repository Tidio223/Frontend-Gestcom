import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, AlertTriangle, TrendingDown, Calendar, Download, Printer, Eye, Search } from "lucide-react";
import { formatCurrency } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL, getFetchOptions } from "@/config/api";
import { SUPER_ADMIN_EMAIL } from "@/config/superadmin";
import PrintableInventory, { computeInventoryBilan } from "@/components/print/PrintableInventory";
import { printHtmlDocument } from "@/lib/print";
import { renderToStaticMarkup } from "react-dom/server";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface InventoryReport {
  id: string;
  date: string;
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  items: InventoryItem[];
  totalSales: number;
  totalValue: number;
}

interface InventoryItem {
  productId: string;
  productName: string;
  quantitySold: number;
  unitPrice: number;
  total: number;
}

const Inventory = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockValueLive, setStockValueLive] = useState<number | null>(null);
  const { toast } = useToast();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // Charger les inventaires depuis l'API
  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventories?type=${selectedPeriod}`, {
        ...getFetchOptions(),
      });
      const data = await response.json();

      if (data.success) {
        setReports(data.data);
        setStockValueLive(data.stockValueActuel ?? null);
      }
    } catch (error) {
      console.error('Error fetching inventories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, [selectedPeriod]);

  // Régénérer les inventaires
  const handleRegenerate = async () => {
    try {
      const options = getFetchOptions();
      const response = await fetch(`${API_BASE_URL}/api/inventories/regenerate`, {
        method: 'POST',
        ...options,
        headers: {
          ...(options.headers as Record<string, string>),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ types: ['daily', 'weekly', 'monthly'] }),
      });

      if (response.ok) {
        toast({ title: "Succès", description: "Inventaires régénérés avec succès" });
        fetchInventories();
      } else {
        toast({ title: "Erreur", description: "Impossible de régénérer les inventaires", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error regenerating inventories:', error);
      toast({ title: "Erreur", description: "Erreur lors de la régénération", variant: "destructive" });
    }
  };

  const printInventory = (report: any) => {
    // Rendu du composant dédié : fonctionne depuis la liste et depuis la fiche
    const html = renderToStaticMarkup(<PrintableInventory report={report} />);
    if (printHtmlDocument(report.period, html)) {
      toast({ title: "Impression lancée", description: `${report.period} est prêt à être imprimé` });
    }
  };

  const generatePDF = async (report: any) => {
    // On rend le document imprimable dans un conteneur hors écran :
    // fonctionne aussi quand la fiche n'est pas ouverte
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.innerHTML = renderToStaticMarkup(<PrintableInventory report={report} />);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
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
      pdf.save(`inventaire-${report.type}-${report.date}.pdf`);
      toast({ title: "PDF généré", description: `L'inventaire ${report.period} a été téléchargé` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      container.remove();
    }
  };

  // Bilan simple de la fiche : mêmes formules que PrintableInventory
  const getBilanLines = (report: any) => {
    if (!report) return null;
    const b = computeInventoryBilan(report);
    const lines: { label: string; value: string; ecart?: boolean }[] = [
      { label: "Stock au début", value: formatCurrency(b.debut) },
      { label: "Vendu pendant la période", value: `- ${formatCurrency(b.vendu)}` },
      { label: "Il reste en stock", value: formatCurrency(b.reste) },
    ];
    if (Math.abs(b.diff) >= 1) {
      lines.push({ label: "Différence constatée", value: formatCurrency(b.diff), ecart: true });
    } else {
      lines.push({ label: "Différence constatée", value: "Aucune différence" });
    }
    return lines;
  };

  // Exports CSV / JSON / TXT de la fiche (mêmes données que l'affichage)
  const exportInventory = (report: any, format: 'csv' | 'json' | 'txt') => {
    const items = report.items || [];
    const totalGros = report.montantInventaire ?? items.reduce((s: number, i: any) => s + (i.total || 0), 0);
    const bilan = getBilanLines(report);
    const detailRows = items.map((i: any) => ({
      'Produit': i.productName,
      'Type': i.typeVente === 'gros' ? 'Gros' : 'Détail',
      'Quantité': i.quantitySold,
      'Prix unitaire (prix de gros)': formatCurrency(i.unitPrice || 0),
      'Total': formatCurrency(i.total || 0),
    }));
    const summaryRows = [
      ['Nombre de produits', String(items.length)],
      ["Montant de l'inventaire (prix de gros)", formatCurrency(totalGros)],
      ['Quantité vendue', String(report.totalProductsSold || 0)],
      ['Date', new Date(report.date).toLocaleDateString('fr-FR')],
      ['Valeur du stock au prix de gros', formatCurrency(report.stockValueActuel ?? report.stockValueWholesale ?? 0)],
    ];

    const download = (content: string, filename: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    const slug = `inventaire-${report.type}-${String(report.date).slice(0, 10)}`;

    if (format === 'json') {
      download(JSON.stringify({
        titre: "Rapport d'Inventaire",
        periode: report.period,
        resume: Object.fromEntries(summaryRows),
        bilanStock: bilan ? Object.fromEntries(bilan.map(l => [l.label, l.value])) : undefined,
        details: detailRows,
      }, null, 2), `${slug}.json`, 'application/json');
    } else if (format === 'csv') {
      const esc = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
      let content = `RAPPORT D'INVENTAIRE - ${report.period}\n\nRÉSUMÉ\n`;
      summaryRows.forEach(([k, v]) => { content += `${esc(k)},${esc(v)}\n`; });
      if (bilan) {
        content += '\nBILAN DU STOCK (prix de gros)\n';
        bilan.forEach(l => { content += `${esc(l.label)},${esc(l.value)}\n`; });
      }
      const headers = Object.keys(detailRows[0] || { 'Produit': '', 'Type': '', 'Quantité': '', 'Prix unitaire (prix de gros)': '', 'Total': '' });
      content += '\nDÉTAIL DES SORTIES DE STOCK (PRIX DE GROS)\n';
      content += headers.map(esc).join(',') + '\n';
      detailRows.forEach((r: any) => { content += headers.map(h => esc(String(r[h]))).join(',') + '\n'; });
      download(content, `${slug}.csv`, 'text/csv');
    } else {
      let content = `RAPPORT D'INVENTAIRE - ${report.period}\n${'='.repeat(50)}\n\nRÉSUMÉ:\n${'-'.repeat(20)}\n`;
      summaryRows.forEach(([k, v]) => { content += `${k}: ${v}\n`; });
      if (bilan) {
        content += `\nBILAN DU STOCK (prix de gros):\n${'-'.repeat(20)}\n`;
        bilan.forEach(l => { content += `${l.label}: ${l.value}\n`; });
      }
      content += `\nDÉTAIL DES SORTIES DE STOCK (PRIX DE GROS):\n${'-'.repeat(20)}\n`;
      detailRows.forEach((r: any, i: number) => {
        content += `${i + 1}. ${Object.values(r).join(' | ')}\n`;
      });
      download(content, `${slug}.txt`, 'text/plain');
    }
    toast({ title: 'Export généré', description: `Inventaire ${report.period} exporté en ${format.toUpperCase()}` });
  };

  const filteredReports = reports.filter(report => {
    const matchesPeriod = report.type === selectedPeriod;
    const matchesSearch = searchTerm === "" ||
      report.period?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.date?.includes(searchTerm) ||
      (report.items || []).some((item: any) => item.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesPeriod && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventaires</h1>
          <p className="text-muted-foreground">
            Suivez vos stocks et gérez vos niveaux d'inventaire
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRegenerate}>
            <Calendar className="mr-2 h-4 w-4" />
            Régénérer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant actuel du stock (prix de gros)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockValueLive != null
                ? formatCurrency(stockValueLive)
                : '0 FCFA'}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.abs(reports[0]?.ecartComptage || 0) > 1
                ? `Écart de ${formatCurrency(Math.abs(reports[0].ecartComptage))} avec le stock réel`
                : 'Aucun écart'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant vendu</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 ? formatCurrency(reports[0]?.totalSales || 0) : '0 FCFA'}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'daily' ? 'Journalier' : selectedPeriod === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 ? reports[0]?.lowStockProducts || 0 : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Réapprovisionnement requis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur stock (gros)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockValueLive != null
                ? formatCurrency(stockValueLive)
                : reports.length > 0 ? formatCurrency(reports[0]?.stockValueWholesale || 0) : '0 FCFA'}
            </div>
            <p className="text-xs text-muted-foreground">
              Au prix de gros
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur stock (détail)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 ? formatCurrency(reports[0]?.stockValueRetail || 0) : '0 FCFA'}
            </div>
            <p className="text-xs text-muted-foreground">
              Au prix de détail
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotation stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 && reports[0]?.stockRotation ? `${reports[0].stockRotation.toFixed(1)}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.length > 0 && reports[0]?.stockRotation ? 'Produits vendus / Stock total' : 'Données insuffisantes'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports d'inventaire</CardTitle>
          <CardDescription>
            Inventaires générés automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setSelectedPeriod(value)} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="daily">Journalier</TabsTrigger>
                <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
                <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un inventaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <TabsContent value="daily" className="mt-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun inventaire journalier disponible
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{report.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.items?.length || 0} produits • Ventes: {formatCurrency(report.totalSales || 0)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(report); setViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => printInventory(report)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => generatePDF(report)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="mt-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun inventaire hebdomadaire disponible
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{report.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.items?.length || 0} produits • Ventes: {formatCurrency(report.totalSales || 0)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(report); setViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => printInventory(report)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => generatePDF(report)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="mt-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun inventaire mensuel disponible
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{report.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.items?.length || 0} produits • Ventes: {formatCurrency(report.totalSales || 0)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(report); setViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => printInventory(report)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => generatePDF(report)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={() => setViewOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.period}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <>
              {/* Document imprimable : même rendu à l'écran, à l'impression et en PDF */}
              <PrintableInventory report={selectedReport} />

              <div className="flex justify-center gap-2 mt-6 no-print">
                <Button onClick={() => printInventory(selectedReport)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
                <Button onClick={() => generatePDF(selectedReport)}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button variant="outline" onClick={() => exportInventory(selectedReport, 'csv')}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => exportInventory(selectedReport, 'json')}>
                  <Download className="mr-2 h-4 w-4" />
                  JSON
                </Button>
                <Button variant="outline" onClick={() => exportInventory(selectedReport, 'txt')}>
                  <Download className="mr-2 h-4 w-4" />
                  TXT
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
