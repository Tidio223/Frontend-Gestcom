import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, DollarSign, ShoppingCart, Eye, FileText } from "lucide-react";
import { products, formatCurrency } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Sale {
  id: string;
  customer: string;
  date: string;
  items: SaleItem[];
  total: number;
  amount: string;
  status: "completed" | "pending";
  invoiceId?: string;
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([
    { id: "001", customer: "Jean Dupont", amount: "245 FCFA", status: "completed", date: "2026-04-17", items: [], total: 245 },
    { id: "002", customer: "Marie Martin", amount: "189 FCFA", status: "pending", date: "2026-04-17", items: [], total: 189 },
    { id: "003", customer: "Pierre Bernard", amount: "412 FCFA", status: "completed", date: "2026-04-16", items: [], total: 412 },
    { id: "004", customer: "Sophie Petit", amount: "98 FCFA", status: "completed", date: "2026-04-16", items: [], total: 98 },
  ]);
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateItem = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, productId, productName: product.name, unitPrice: product.price, total: product.price * item.quantity } : item
      )
    );
  };

  const updateQuantity = (index: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity, total: item.unitPrice * quantity } : item))
    );
  };

  const handleCreateSale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer || items.length === 0) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    const newSale: Sale = {
      id: String(Date.now()),
      customer,
      date: new Date().toISOString().split("T")[0],
      items,
      total: items.reduce((s, i) => s + i.total, 0),
      amount: formatCurrency(items.reduce((s, i) => s + i.total, 0)),
      status: "completed",
    };

    setSales((prev) => [newSale, ...prev]);
    setItems([]);
    setCustomer("");
    setCreateOpen(false);
    toast({ title: "Vente créée", description: `Vente enregistrée pour ${customer}` });

    // Créer automatiquement la facture correspondante
    createInvoiceFromSale(newSale);
  };

  const createInvoiceFromSale = (sale: Sale) => {
    const invoiceData = {
      id: sale.id,
      number: `FAC-2026-${String(sales.length + 1).padStart(3, "0")}`,
      client: sale.customer,
      date: sale.date,
      items: sale.items,
      total: sale.total,
      status: "pending" as const,
    };

    // Naviguer vers la page factures avec les données pré-remplies
    navigate('/invoices', { state: { newInvoice: invoiceData } });
    toast({ title: "Facture générée", description: `Facture ${invoiceData.number} créée automatiquement` });
  };

  const viewSaleDetails = (sale: Sale) => {
    if (sale.invoiceId) {
      navigate('/invoices', { state: { invoiceId: sale.invoiceId } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventes</h1>
          <p className="text-muted-foreground">
            Gérez vos ventes et suivez vos performances commerciales
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setItems([]); setCustomer(""); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle vente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nouvelle vente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSale} className="space-y-4">
              <div>
                <Label htmlFor="customer">Client</Label>
                <Input
                  id="customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Nom du client"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Articles</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    + Ajouter
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select onValueChange={(v) => updateItem(i, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} - {formatCurrency(p.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(i, Number(e.target.value))}
                          placeholder="Qté"
                        />
                      </div>
                      <div className="w-28 text-right text-sm font-medium text-card-foreground py-2">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="mt-3 text-right font-display font-bold text-lg text-card-foreground">
                    Total: {formatCurrency(items.reduce((s, i) => s + i.total, 0))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={items.length === 0 || !customer}>
                Créer la vente et générer la facture
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,450 FCFA</div>
            <p className="text-xs text-muted-foreground">
              +12% par rapport à hier
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nombre de ventes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +8% par rapport à hier
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">102 FCFA</div>
            <p className="text-xs text-muted-foreground">
              +4% par rapport à hier
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objectif mensuel</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">
              34,200 FCFA / 50,000 FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventes récentes</CardTitle>
          <CardDescription>
            Les dernières transactions enregistrées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Vente #{sale.id}</p>
                  <p className="text-sm text-muted-foreground">{sale.customer}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{sale.amount}</span>
                  <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                    {sale.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{sale.date}</span>
                  {sale.invoiceId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewSaleDetails(sale)}
                      title="Voir la facture"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
