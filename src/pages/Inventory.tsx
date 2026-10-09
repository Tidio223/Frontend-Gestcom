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
      const response = await fetch(`${API_BASE_URL}/api/inventories/regenerate`, {
        method: 'POST',
        ...getFetchOptions(),
        headers: {
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
    const element = document.getElementById(`inventory-${report._id}`);
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.period}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            .items { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; margin: 10px 0; }
            .total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    toast({ title: "Impression lancée", description: `${report.period} est prêt à être imprimé` });
  };

  const generatePDF = async (report: any) => {
    const element = document.getElementById(`inventory-${report._id}`);
    if (!element) return;

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
      pdf.save(`inventaire-${report.type}-${report.date}.pdf`);
      toast({ title: "PDF généré", description: `L'inventaire ${report.period} a été téléchargé` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    }
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
            <CardTitle className="text-sm font-medium">Inventaires générés</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'daily' ? 'Journaliers' : selectedPeriod === 'weekly' ? 'Hebdomadaires' : 'Mensuels'}
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
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 ? formatCurrency(reports.reduce((sum, r) => sum + (r.totalValue || 0), 0)) : '0 FCFA'}
            </div>
            <p className="text-xs text-muted-foreground">
              Basé sur les inventaires
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
                          {report.items?.length || 0} produits • Total: {formatCurrency(report.totalValue || 0)}
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
                          {report.items?.length || 0} produits • Total: {formatCurrency(report.totalValue || 0)}
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
                          {report.items?.length || 0} produits • Total: {formatCurrency(report.totalValue || 0)}
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
              <div id={`inventory-${selectedReport._id}`} className="p-6 bg-white text-gray-900" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">RAPPORT D'INVENTAIRE</h2>
                  <p className="text-lg text-gray-900">{selectedReport.period}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h3 className="font-bold mb-2 text-gray-900">Résumé</h3>
                    <p className="text-sm text-gray-900">Nombre de produits: {selectedReport.items?.length || 0}</p>
                    <p className="text-sm text-gray-900">Ventes totales: {formatCurrency(selectedReport.totalValue || 0)}</p>
                    <p className="text-sm text-gray-900">Date: {new Date(selectedReport.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-gray-900">Informations</h3>
                    <p className="text-sm text-gray-900">Type: {selectedReport.type === 'daily' ? 'Journalier' : selectedReport.type === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</p>
                    <p className="text-sm text-gray-900">Généré automatiquement</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">Détail des ventes</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-bold text-gray-900">Produit</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-bold text-gray-900">Quantité vendue</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-900">Prix unitaire HT</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-gray-300 px-4 py-2 text-gray-900">{item.productName}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-gray-900">{item.quantitySold}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-6">
                  <div className="border border-gray-300 p-4 w-64 bg-gray-50">
                    <div className="flex justify-between">
                      <span className="font-bold text-lg text-gray-900">Total:</span>
                      <span className="font-bold text-lg text-gray-900">{formatCurrency(selectedReport.totalValue || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-4 text-xs text-gray-600">
                  <p className="mb-2 text-gray-900"><strong>Mentions:</strong></p>
                  <p className="mb-1 text-gray-600">Rapport généré automatiquement par GestCom</p>
                  <p className="text-gray-600">Pour toute question, contactez le service de gestion</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mt-6">
                <Button onClick={() => printInventory(selectedReport)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
                <Button onClick={() => generatePDF(selectedReport)}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
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
