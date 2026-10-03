import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, TrendingUp, DollarSign, ShoppingCart, Eye, FileText, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  showDropdown?: boolean;
}

interface Sale {
  _id: string;
  customer: string;
  date: string;
  items: SaleItem[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  invoiceId?: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  prixGros?: number;
  prixDetail?: number;
  stock: number;
  unit: string;
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [typeVente, setTypeVente] = useState<'gros' | 'detail'>('detail');
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  // Charger les produits et les ventes depuis l'API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error('Token manquant');
          setLoading(false);
          return;
        }

        // Charger les produits
        const productsRes = await fetch(`${API_BASE_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const productsData = await productsRes.json();
        console.log('Produits chargés:', productsData);
        if (productsData.success) {
          setProductList(productsData.data.products || productsData.data);
        } else {
          console.error('Erreur produits:', productsData.message);
        }

        // Charger les ventes
        const salesRes = await fetch(`${API_BASE_URL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const salesData = await salesRes.json();
        if (salesData.success) {
          setSales(salesData.data.sales || salesData.data);
        }

        // Charger les statistiques
        const statsRes = await fetch(`${API_BASE_URL}/api/sales/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateItem = (index: number, productId: string) => {
    const product = productList.find((p) => p._id === productId);
    if (!product) return;
    
    // Déterminer le prix selon le type de vente
    const priceToUse = typeVente === 'gros' 
      ? (product.prixGros || product.price || 0)
      : (product.prixDetail || product.price || 0);
    
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, productId, productName: product.name, unitPrice: priceToUse, total: priceToUse * item.quantity } : item
      )
    );
  };

  const updateQuantity = (index: number, quantity: number) => {
    const item = items[index];
    if (!item.productId) return;

    const product = productList.find((p) => p._id === item.productId);
    if (!product) return;

    if (quantity > product.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Le nombre saisi (${quantity}) n'est pas disponible. Stock disponible: ${product.stock} ${product.unit}`,
        variant: "destructive"
      });
      return;
    }

    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity, total: item.unitPrice * quantity } : item))
    );
  };

  // Recalculer tous les prix quand le type de vente change
  const handleTypeVenteChange = (newType: 'gros' | 'detail') => {
    setTypeVente(newType);
    setItems((prev) =>
      prev.map((item) => {
        if (!item.productId) return item;
        const product = productList.find((p) => p._id === item.productId);
        if (!product) return item;
        
        const priceToUse = newType === 'gros' 
          ? (product.prixGros || product.price || 0)
          : (product.prixDetail || product.price || 0);
        
        return { ...item, unitPrice: priceToUse, total: priceToUse * item.quantity };
      })
    );
  };

  const handleCreateSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer || items.length === 0) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customer, items, typeVente }),
      });

      const data = await response.json();

      if (data.success) {
        setSales((prev) => [data.data, ...prev]);
        setItems([]);
        setCustomer("");
        setCreateOpen(false);
        
        toast({ title: "Vente créée", description: `Vente enregistrée pour ${customer}` });

        // Recharger les données
        const salesRes = await fetch(`${API_BASE_URL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const salesData = await salesRes.json();
        if (salesData.success) {
          setSales(salesData.data.sales || salesData.data);
        }

        const statsRes = await fetch(`${API_BASE_URL}/api/sales/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      } else {
        toast({ title: "Erreur", description: data.message || "Erreur lors de la création de la vente", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur de réseau", variant: "destructive" });
    }
  };

  const viewSaleDetails = (sale: Sale) => {
    if (sale.invoiceId) {
      navigate('/invoices', { state: { invoiceId: sale.invoiceId } });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                <Label>Type de vente</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={typeVente === 'detail' ? 'default' : 'outline'}
                    onClick={() => handleTypeVenteChange('detail')}
                    className="flex-1"
                  >
                    Vente au détail
                  </Button>
                  <Button
                    type="button"
                    variant={typeVente === 'gros' ? 'default' : 'outline'}
                    onClick={() => handleTypeVenteChange('gros')}
                    className="flex-1"
                  >
                    Vente en gros
                  </Button>
                </div>
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
                    <div key={i} className="flex gap-2 items-end relative">
                      <div className="flex-1">
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={item.productName}
                            onChange={(e) => {
                              const value = e.target.value;
                              setItems(prev => prev.map((it, idx) => idx === i ? { ...it, productName: value, showDropdown: true } : it));
                            }}
                            onFocus={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, showDropdown: true } : it))}
                            className="w-full"
                          />
                          {item.showDropdown && (
                            <div className="absolute z-[200] w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {productList
                                .filter(p => p.name.toLowerCase().includes((item.productName || '').toLowerCase()))
                                .map((p) => (
                                  <div
                                    key={p._id}
                                    className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                    onClick={() => {
                                      updateItem(i, p._id);
                                      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, showDropdown: false } : it));
                                    }}
                                  >
                                    {p.name} - {formatCurrency(typeVente === 'gros' ? (p.prixGros || p.price) : (p.prixDetail || p.price))}
                                  </div>
                                ))}
                              {productList.filter(p => p.name.toLowerCase().includes((item.productName || '').toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Aucun produit trouvé</div>
                              )}
                            </div>
                          )}
                        </div>
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
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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
            <div className="text-2xl font-bold">{stats ? formatCurrency(stats.todayTotal) : '0 FCFA'}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.todayCount} ventes` : '0 ventes'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nombre de ventes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.totalSales : 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.pendingSales} en attente` : '0 en attente'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatCurrency(stats.averageOrderValue) : '0 FCFA'}</div>
            <p className="text-xs text-muted-foreground">
              Moyenne du jour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatCurrency(stats.monthTotal) : '0 FCFA'}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.monthCount} ventes ce mois` : '0 ventes ce mois'}
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
            {sales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune vente enregistrée</p>
            ) : (
              sales.map((sale) => (
                <div key={sale._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Vente #{sale._id.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">{sale.customer}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{formatCurrency(sale.total)}</span>
                    <Badge variant={sale.status === "completed" ? "default" : sale.status === "cancelled" ? "destructive" : "secondary"}>
                      {sale.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString('fr-FR')}</span>
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
