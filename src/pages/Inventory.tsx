import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, AlertTriangle, TrendingDown, Calendar, Download, Printer, Mail, Eye } from "lucide-react";
import { products, formatCurrency } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
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
  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InventoryReport | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Générer les rapports d'inventaire automatiquement
  useEffect(() => {
    generateDailyInventory();
    generateWeeklyInventory();
    generateMonthlyInventory();
  }, []);

  const generateDailyInventory = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // Simuler les ventes de la journée précédente
    const mockSales = [
      { productId: '1', productName: 'Ciment Portland 50kg', quantitySold: 5, unitPrice: 8500 },
      { productId: '2', productName: 'Fer à béton 10mm', quantitySold: 8, unitPrice: 4200 },
      { productId: '3', productName: 'Peinture Acrylique 20L', quantitySold: 2, unitPrice: 18000 },
    ];
    
    const totalSales = mockSales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0);
    const totalValue = mockSales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0);
    
    const dailyReport: InventoryReport = {
      id: `daily-${dateStr}`,
      date: dateStr,
      type: 'daily',
      period: `Inventaire du ${new Date(dateStr).toLocaleDateString('fr-FR')}`,
      items: mockSales.map(item => ({
        ...item,
        total: item.quantitySold * item.unitPrice
      })),
      totalSales,
      totalValue
    };
    
    setReports(prev => {
      const exists = prev.find(r => r.id === dailyReport.id);
      if (!exists) {
        return [...prev, dailyReport];
      }
      return prev;
    });
  };

  const generateWeeklyInventory = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - dayOfWeek - 7);
    
    if (dayOfWeek === 1) { // Lundi
      const dateStr = lastMonday.toISOString().split('T')[0];
      const mockWeeklySales = [
        { productId: '1', productName: 'Ciment Portland 50kg', quantitySold: 25, unitPrice: 8500 },
        { productId: '4', productName: 'Tuyau PVC 110mm', quantitySold: 15, unitPrice: 3500 },
      ];
      
      const weeklyReport: InventoryReport = {
        id: `weekly-${dateStr}`,
        date: dateStr,
        type: 'weekly',
        period: `Inventaire semaine du ${lastMonday.toLocaleDateString('fr-FR')}`,
        items: mockWeeklySales.map(item => ({
          ...item,
          total: item.quantitySold * item.unitPrice
        })),
        totalSales: mockWeeklySales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0),
        totalValue: mockWeeklySales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0)
      };
      
      setReports(prev => {
        const exists = prev.find(r => r.id === weeklyReport.id);
        if (!exists) {
          return [...prev, weeklyReport];
        }
        return prev;
      });
    }
  };

  const generateMonthlyInventory = () => {
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    
    if (isFirstOfMonth) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const dateStr = lastMonth.toISOString().split('T')[0];
      
      const mockMonthlySales = [
        { productId: '1', productName: 'Ciment Portland 50kg', quantitySold: 120, unitPrice: 8500 },
        { productId: '2', productName: 'Fer à béton 10mm', quantitySold: 80, unitPrice: 4200 },
        { productId: '3', productName: 'Peinture Acrylique 20L', quantitySold: 45, unitPrice: 18000 },
        { productId: '6', productName: 'Carrelage 40x40cm', quantitySold: 200, unitPrice: 6800 },
      ];
      
      const monthlyReport: InventoryReport = {
        id: `monthly-${dateStr}`,
        date: dateStr,
        type: 'monthly',
        period: `Inventaire ${lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        items: mockMonthlySales.map(item => ({
          ...item,
          total: item.quantitySold * item.unitPrice
        })),
        totalSales: mockMonthlySales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0),
        totalValue: mockMonthlySales.reduce((sum, item) => sum + (item.quantitySold * item.unitPrice), 0)
      };
      
      setReports(prev => {
        const exists = prev.find(r => r.id === monthlyReport.id);
        if (!exists) {
          return [...prev, monthlyReport];
        }
        return prev;
      });
    }
  };

  const generatePDF = async (report: InventoryReport) => {
    const element = document.getElementById(`inventory-${report.id}`);
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

  const printInventory = (report: InventoryReport) => {
    const element = document.getElementById(`inventory-${report.id}`);
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

  const sendInventory = async (report: InventoryReport) => {
    try {
      // Simulation d'envoi d'email
      toast({ title: "Email envoyé", description: `${report.period} a été envoyé par email` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer l'email", variant: "destructive" });
    }
  };

  const filteredReports = reports.filter(report => report.type === selectedPeriod);

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
          <Select value={selectedPeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Journalier</SelectItem>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            {selectedPeriod === 'daily' ? 'Aujourd\'hui' : selectedPeriod === 'weekly' ? 'Cette semaine' : 'Ce mois'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              +12 ce mois-ci
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
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
            <div className="text-2xl font-bold">45,678 FCFA</div>
            <p className="text-xs text-muted-foreground">
              +5% ce mois-ci
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotation stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-muted-foreground">
              fois par mois
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
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun inventaire {selectedPeriod === 'daily' ? 'journalier' : selectedPeriod === 'weekly' ? 'hebdomadaire' : 'mensuel'} disponible
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{report.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.items.length} produits • Total: {formatCurrency(report.totalValue)}
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
                    <Button variant="ghost" size="sm" onClick={() => sendInventory(report)}>
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={() => setViewOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.period}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div id={`inventory-${selectedReport.id}`} className="p-6 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h2 className="text-2xl font-bold">RAPPORT D'INVENTAIRE</h2>
                <p className="text-lg">{selectedReport.period}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-bold mb-2">Résumé</h3>
                  <p className="text-sm">Nombre de produits: {selectedReport.items.length}</p>
                  <p className="text-sm">Ventes totales: {formatCurrency(selectedReport.totalValue)}</p>
                  <p className="text-sm">Date: {new Date(selectedReport.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Informations</h3>
                  <p className="text-sm">Type: {selectedReport.type === 'daily' ? 'Journalier' : selectedReport.type === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</p>
                  <p className="text-sm">Généré automatiquement</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-3">Détail des ventes</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-bold">Produit</th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-bold">Quantité vendue</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-bold">Prix unitaire HT</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.items.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-4 py-2">{item.productName}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{item.quantitySold}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-6">
                <div className="border border-gray-300 p-4 w-64">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedReport.totalValue)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4 text-xs text-gray-600">
                <p className="mb-2"><strong>Mentions:</strong></p>
                <p className="mb-1">Rapport généré automatiquement par GestCom</p>
                <p>Pour toute question, contactez le service de gestion</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
