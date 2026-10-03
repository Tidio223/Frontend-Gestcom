import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, Plus, Eye, Printer, Download, Edit, Trash2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { products, Invoice, InvoiceItem, formatCurrency } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { API_BASE_URL } from "@/config/api";

const statusConfig = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid: { label: "Payée", className: "bg-green-100 text-green-800 border-green-200" },
  overdue: { label: "En retard", className: "bg-red-100 text-red-800 border-red-200" },
};

const Invoices = () => {
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [filterTypeVente, setFilterTypeVente] = useState<'all' | 'gros' | 'detail'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Charger les factures depuis l'API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        console.log('Chargement des factures depuis:', API_BASE_URL);
        const response = await fetch(`${API_BASE_URL}/api/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        console.log('Réponse factures:', data);
        
        if (data.success) {
          // Transformer les données de l'API pour correspondre à l'interface
          const transformedInvoices = data.data.map((inv: any) => ({
            id: inv._id,
            number: inv.number,
            client: inv.client,
            date: inv.date,
            items: inv.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
            total: inv.total,
            status: inv.status,
            typeVente: inv.typeVente,
          }));
          setInvoiceList(transformedInvoices);
        } else {
          console.error('Erreur API factures:', data.message);
          toast({ title: "Erreur", description: data.message || "Erreur lors du chargement des factures", variant: "destructive" });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des factures:', error);
        toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const filtered = invoiceList.filter(inv => 
    (filterTypeVente === 'all' || inv.typeVente === filterTypeVente) &&
    (inv.number.toLowerCase().includes(search.toLowerCase()) ||
    inv.client.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Chargement des factures...</div>
      </div>
    );
  }

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateItem = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        productId: product.id,
        productName: product.name,
        quantity: newItems[index].quantity,
        unitPrice: product.price,
        total: newItems[index].quantity * product.price,
      };
      setItems(newItems);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].unitPrice;
    setItems(newItems);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const deleteInvoice = (invoice: Invoice) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.number} ?`)) {
      const updatedList = invoiceList.filter((inv) => inv.id !== invoice.id);
      setInvoiceList(updatedList);
      localStorage.setItem('invoices', JSON.stringify(updatedList));
      toast({ title: "Facture supprimée", description: `La facture ${invoice.number} a été supprimée` });
    }
  };

  const markAsPaid = (invoice: Invoice) => {
    const updatedInvoice = { ...invoice, status: "paid" as const };
    const updatedList = invoiceList.map((inv) => inv.id === invoice.id ? updatedInvoice : inv);
    setInvoiceList(updatedList);
    localStorage.setItem('invoices', JSON.stringify(updatedList));
    toast({ title: "Facture payée", description: `${invoice.number} est maintenant prise en compte dans les rapports` });
  };

  const updateInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setItems(invoice.items);
    // Ouvrir le dialogue de modification avec les données pré-remplies
    setCreateOpen(true);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    if (editingInvoice) {
      // Mode modification
      const updatedInvoice: Invoice = {
        ...editingInvoice,
        client: fd.get("client") as string,
        status: fd.get("status") as string || editingInvoice.status,
        items,
        total: items.reduce((s, i) => s + i.total, 0),
      };
      const updatedList = invoiceList.map((inv) => inv.id === editingInvoice.id ? updatedInvoice : inv);
      setInvoiceList(updatedList);
      localStorage.setItem('invoices', JSON.stringify(updatedList));
      
      if (updatedInvoice.status === "paid" && editingInvoice.status !== "paid") {
        toast({ title: "Facture payée", description: `${updatedInvoice.number} est maintenant prise en compte dans les rapports` });
      } else {
        toast({ title: "Facture modifiée", description: `${updatedInvoice.number} mise à jour` });
      }
      setEditingInvoice(null);
    } else {
      // Mode création
      const newInvoice: Invoice = {
        id: String(Date.now()),
        number: `FAC-2026-${String(invoiceList.length + 1).padStart(3, "0")}`,
        client: fd.get("client") as string,
        date: new Date().toISOString().split("T")[0],
        items,
        total: items.reduce((s, i) => s + i.total, 0),
        status: "pending",
      };
      const updatedList = [newInvoice, ...invoiceList];
      setInvoiceList(updatedList);
      localStorage.setItem('invoices', JSON.stringify(updatedList));
      toast({ title: "Facture créée", description: `${newInvoice.number} pour ${newInvoice.client}` });
    }
    
    setItems([]);
    setCreateOpen(false);
  };

  const generatePDF = async (invoice: Invoice) => {
    const element = document.getElementById(`invoice-${invoice.id}`);
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
      pdf.save(`facture-${invoice.number}.pdf`);
      toast({ title: "PDF généré", description: `La facture ${invoice.number} a été téléchargée` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    }
  };

  const printInvoice = (invoice: Invoice) => {
    const element = document.getElementById(`invoice-${invoice.id}`);
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${invoice.number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
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
    
    toast({ title: "Impression lancée", description: `Facture ${invoice.number} prête à être imprimée` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Factures</h1>
          <p className="mt-1 text-muted-foreground">Créez et suivez vos factures de vente</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une facture..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10" 
            />
          </div>
          <Select value={filterTypeVente} onValueChange={(v: 'all' | 'gros' | 'detail') => setFilterTypeVente(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type de vente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="detail">Détail</SelectItem>
              <SelectItem value="gros">Gros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setItems([]); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingInvoice ? "Modifier une facture" : "Créer une facture"}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Client</Label>
              <Input 
                name="client" 
                defaultValue={editingInvoice?.client || ""}
                required 
              />
            </div>
            {editingInvoice && (
              <div>
                <Label>Statut</Label>
                <Select name="status" defaultValue={editingInvoice.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Articles</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Ajouter</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select onValueChange={(v) => updateItem(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateQuantity(i, Number(e.target.value))} />
                    </div>
                    <div className="w-28 text-right text-sm font-medium text-card-foreground py-2">
                      {formatCurrency(item.total)}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => deleteItem(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={items.length === 0}>
              {editingInvoice ? "Mettre à jour" : "Créer la facture"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">N° Facture</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Montant</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const sc = statusConfig[inv.status];
              return (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">{inv.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.client}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(inv.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    {inv.typeVente ? (
                      <Badge variant={inv.typeVente === 'gros' ? 'default' : 'secondary'} className="text-xs">
                        {inv.typeVente === 'gros' ? 'Gros' : 'Détail'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-card-foreground">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inv.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => markAsPaid(inv)} title="Marquer comme payée">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => updateInvoice(inv)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => printInvoice(inv)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => generatePDF(inv)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteInvoice(inv)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Facture {viewInvoice?.number}</DialogTitle></DialogHeader>
          {viewInvoice && (
            <>
              <div id={`invoice-${viewInvoice.id}`} className="p-6 bg-white text-gray-900" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">FACTURE</h1>
                  <p className="text-lg text-gray-900">N° {viewInvoice.number}</p>
                  <p className="text-sm text-gray-600">Date: {new Date(viewInvoice.date).toLocaleDateString('fr-FR')}</p>
                  {viewInvoice.typeVente && (
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      Type de vente: {viewInvoice.typeVente === 'gros' ? 'Vente en gros' : 'Vente au détail'}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h3 className="font-bold mb-2 text-gray-900">Émetteur</h3>
                    <p className="text-sm text-gray-900">GestCom</p>
                    <p className="text-sm text-gray-900">123 Rue de la République</p>
                    <p className="text-sm text-gray-900">75001 Paris</p>
                    <p className="text-sm text-gray-900">Tél: 01 23 45 67 89</p>
                    <p className="text-sm text-gray-900">Email: contact@gestcom.com</p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-gray-900">Destinataire</h3>
                    <p className="text-sm font-medium text-gray-900">{viewInvoice.client}</p>
                    <p className="text-sm text-gray-600">Adresse du client</p>
                    <p className="text-sm text-gray-600">Ville, Code postal</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">Détail des produits/services</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-bold text-gray-900">Désignation</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-bold text-gray-900">Quantité</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-900">Prix unitaire HT</th>
                        <th className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoice.items.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-gray-300 px-4 py-2 text-gray-900">{item.productName}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-gray-900">{item.quantity}</td>
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
                      <span className="font-bold text-lg text-gray-900">{formatCurrency(viewInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-4 text-xs text-gray-600">
                  <p className="mb-2 text-gray-900"><strong>Mentions légales:</strong></p>
                  <p className="mb-1 text-gray-600">En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.</p>
                  <p className="text-gray-600">TVA non applicable, art. 293 B du CGI</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mt-6">
                <Button onClick={() => printInvoice(viewInvoice)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
                <Button onClick={() => generatePDF(viewInvoice)}>
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

export default Invoices;
