import { useState, useEffect } from "react";
import { Search, Plus, AlertTriangle, Edit, Trash2, History, Package, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { products as initialProducts, Product, formatCurrency } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";
import { COMPANY_INFO } from "@/config/company";
import "@/styles/print.css";

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  date: string;
}

const Products = () => {
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stockManagementOpen, setStockManagementOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [stockManagementType, setStockManagementType] = useState<'entry' | 'exit'>('entry');
  const [stockManagementQuantity, setStockManagementQuantity] = useState(1);
  const [stockManagementReason, setStockManagementReason] = useState("");
  const [stockManagementProductId, setStockManagementProductId] = useState("");
  const { toast } = useToast();

  // Charger les produits et les mouvements de stock depuis localStorage au démarrage
  useEffect(() => {
    // Nettoyer les anciennes données mock au démarrage
    localStorage.removeItem('products');
    
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Produits API:', data);
          // Transformer les données de l'API pour correspondre à l'interface Product
          const productsArray = data.data.products || data.data;
          const transformedProducts = productsArray.map((p: any) => ({
            id: p._id,
            name: p.name,
            category: p.category,
            price: p.price,
            prixGros: p.prixGros || p.price || 0,
            prixDetail: p.prixDetail || p.price || 0,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit || 'unité', // Utiliser l'unité de l'API ou 'unité' par défaut
          }));
          setProductList(transformedProducts);
        } else {
          // Fallback vers localStorage si l'API échoue
          const savedProducts = localStorage.getItem('products');
          if (savedProducts) {
            setProductList(JSON.parse(savedProducts));
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback vers localStorage en cas d'erreur
        const savedProducts = localStorage.getItem('products');
        if (savedProducts) {
          setProductList(JSON.parse(savedProducts));
        }
      }
    };
    fetchProducts();

    // Charger les mouvements de stock depuis localStorage
    const savedMovements = localStorage.getItem('stockMovements');
    if (savedMovements) {
      setMovements(JSON.parse(savedMovements));
    }
  }, []);

  const filtered = productList.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Erreur", description: "Vous devez être connecté pour ajouter un produit", variant: "destructive" });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fd.get("name"),
          category: fd.get("category"),
          prixGros: Number(fd.get("prixGros")),
          prixDetail: Number(fd.get("prixDetail")),
          price: Number(fd.get("prixDetail")), // Utiliser prixDetail comme prix principal pour compatibilité
          stock: Number(fd.get("stock")),
          minStock: Number(fd.get("minStock")),
          unit: fd.get("unit"),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProduct: Product = {
          id: data.data._id,
          name: data.data.name,
          category: data.data.category,
          price: data.data.price,
          prixGros: data.data.prixGros || data.data.price || 0,
          prixDetail: data.data.prixDetail || data.data.price || 0,
          stock: data.data.stock,
          minStock: data.data.minStock,
          unit: data.data.unit || 'unité',
        };
        const updatedList = [newProduct, ...productList];
        setProductList(updatedList);
        localStorage.setItem('products', JSON.stringify(updatedList));
        setOpen(false);
        toast({ title: "Produit ajouté", description: `${newProduct.name} a été ajouté au stock.` });
      } else {
        const error = await response.json();
        toast({ title: "Erreur", description: error.message || "Impossible d'ajouter le produit", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      // Fallback vers localStorage si l'API échoue
      const newProduct: Product = {
        id: String(Date.now()),
        name: fd.get("name") as string,
        category: fd.get("category") as string,
        price: Number(fd.get("price")),
        stock: Number(fd.get("stock")),
        minStock: Number(fd.get("minStock")),
        unit: fd.get("unit") as string,
      };
      const updatedList = [newProduct, ...productList];
      setProductList(updatedList);
      localStorage.setItem('products', JSON.stringify(updatedList));
      setOpen(false);
      toast({ title: "Produit ajouté (local)", description: `${newProduct.name} a été ajouté localement.` });
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const fd = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Erreur", description: "Vous devez être connecté pour modifier un produit", variant: "destructive" });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fd.get("name"),
          category: fd.get("category"),
          prixGros: Number(fd.get("prixGros")),
          prixDetail: Number(fd.get("prixDetail")),
          price: Number(fd.get("prixDetail")),
          stock: Number(fd.get("stock")),
          minStock: Number(fd.get("minStock")),
          unit: fd.get("unit"),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedProduct: Product = {
          id: data.data._id,
          name: data.data.name,
          category: data.data.category,
          price: data.data.price,
          prixGros: data.data.prixGros || data.data.price || 0,
          prixDetail: data.data.prixDetail || data.data.price || 0,
          stock: data.data.stock,
          minStock: data.data.minStock,
          unit: data.data.unit || 'unité',
        };
        const updatedList = productList.map((p) => (p.id === selectedProduct.id ? updatedProduct : p));
        setProductList(updatedList);
        localStorage.setItem('products', JSON.stringify(updatedList));
        setEditOpen(false);
        setSelectedProduct(null);
        toast({ title: "Produit modifié", description: `${updatedProduct.name} a été mis à jour.` });
      } else {
        const error = await response.json();
        toast({ title: "Erreur", description: error.message || "Impossible de modifier le produit", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      // Fallback vers localStorage si l'API échoue
      const updatedProduct: Product = {
        ...selectedProduct,
        name: fd.get("name") as string,
        category: fd.get("category") as string,
        price: Number(fd.get("prixDetail")),
        prixGros: Number(fd.get("prixGros")),
        prixDetail: Number(fd.get("prixDetail")),
        stock: Number(fd.get("stock")),
        minStock: Number(fd.get("minStock")),
        unit: fd.get("unit") as string,
      };
      const updatedList = productList.map((p) => (p.id === selectedProduct.id ? updatedProduct : p));
      setProductList(updatedList);
      localStorage.setItem('products', JSON.stringify(updatedList));
      setEditOpen(false);
      setSelectedProduct(null);
      toast({ title: "Produit modifié (local)", description: `${updatedProduct.name} a été modifié localement.` });
    }
  };

  const handleDelete = () => {
    if (!selectedProduct) return;
    const updatedList = productList.filter((p) => p.id !== selectedProduct.id);
    setProductList(updatedList);
    localStorage.setItem('products', JSON.stringify(updatedList));
    setDeleteOpen(false);
    setSelectedProduct(null);
    toast({ title: "Produit supprimé", description: `${selectedProduct.name} a été supprimé du stock.` });
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setDeleteOpen(true);
  };

  const openStockManagementDialog = () => {
    setStockManagementType('entry');
    setStockManagementQuantity(1);
    setStockManagementReason('');
    setStockManagementProductId('');
    setStockManagementOpen(true);
  };

  const openHistoryDialog = (product: Product) => {
    setSelectedProduct(product);
    // Filtrer les mouvements pour ce produit
    const filteredMovements = movements.filter(m => m.productId === product.id);
    setProductMovements(filteredMovements);
    setHistoryOpen(true);
  };

  const printInventory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = filtered.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td style="text-align: right;">${formatCurrency((p as any).prixGros || p.price)}</td>
        <td style="text-align: right;">${formatCurrency((p as any).prixDetail || p.price)}</td>
        <td style="text-align: right;">${p.stock} ${p.unit}</td>
        <td style="text-align: center;">${p.stock <= p.minStock ? 'Stock bas' : 'En stock'}</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventaire - ${COMPANY_INFO.name}</title>
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
            .document-header h1 {
              font-size: 24pt;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .info-section p {
              margin: 5px 0;
              font-size: 11pt;
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
            thead {
              display: table-header-group;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body class="print-window-body">
          <div class="document-header">
            <h1>INVENTAIRE</h1>
            <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="info-section">
            <p style="font-weight: bold;">${COMPANY_INFO.name}</p>
            <p>${COMPANY_INFO.description}</p>
            <p>E-mail : ${COMPANY_INFO.email}</p>
            <p>Tél : ${COMPANY_INFO.phone}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th style="text-align: right;">Prix Gros</th>
                <th style="text-align: right;">Prix Détail</th>
                <th style="text-align: right;">Stock</th>
                <th style="text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; font-size: 10pt;">
            <p>Total des produits: ${filtered.length}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleStockMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockManagementProductId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un produit", variant: "destructive" });
      return;
    }

    const product = productList.find(p => p.id === stockManagementProductId);
    if (!product) {
      toast({ title: "Erreur", description: "Produit non trouvé", variant: "destructive" });
      return;
    }

    const previousStock = product.stock;
    const newStock = stockManagementType === 'entry' 
      ? previousStock + stockManagementQuantity 
      : previousStock - stockManagementQuantity;

    if (newStock < 0) {
      toast({ title: "Erreur", description: "Stock insuffisant pour cette sortie", variant: "destructive" });
      return;
    }

    // Créer le mouvement de stock
    const newMovement: StockMovement = {
      id: String(Date.now()),
      productId: stockManagementProductId,
      productName: product.name,
      type: stockManagementType,
      quantity: stockManagementQuantity,
      previousStock,
      newStock,
      reason: stockManagementReason,
      date: new Date().toISOString(),
    };

    // Mettre à jour le produit
    const updatedList = productList.map((p) => 
      p.id === stockManagementProductId ? { ...p, stock: newStock } : p
    );
    setProductList(updatedList);
    localStorage.setItem('products', JSON.stringify(updatedList));

    // Sauvegarder le mouvement
    const updatedMovements = [newMovement, ...movements];
    setMovements(updatedMovements);
    localStorage.setItem('stockMovements', JSON.stringify(updatedMovements));

    setStockManagementOpen(false);
    setStockManagementQuantity(1);
    setStockManagementReason('');
    setStockManagementProductId('');
    toast({ 
      title: "Mouvement enregistré", 
      description: `${stockManagementType === 'entry' ? 'Entrée' : 'Sortie'} de ${stockManagementQuantity} unités pour ${product.name}` 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Produits & Stock</h1>
          <p className="mt-1 text-muted-foreground">Gérez votre inventaire et suivez les niveaux de stock</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Ajouter un produit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input name="name" placeholder="Nom du produit" required />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select name="category" defaultValue="alimentation">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alimentation">Alimentation</SelectItem>
                      <SelectItem value="électronique">Électronique</SelectItem>
                      <SelectItem value="vêtements">Vêtements</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="autres">Autres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix de gros</Label>
                    <Input name="prixGros" type="number" min="0" placeholder="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de détail</Label>
                    <Input name="prixDetail" type="number" min="0" placeholder="0" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Input name="unit" placeholder="unité, kg, litre..." defaultValue="unité" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stock initial</Label>
                    <Input name="stock" type="number" min="0" placeholder="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock minimum</Label>
                    <Input name="minStock" type="number" min="0" placeholder="10" defaultValue="10" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1">
                    Ajouter
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={stockManagementOpen} onOpenChange={setStockManagementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Package className="mr-2 h-4 w-4" />Gérer le stock</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Gérer le stock</DialogTitle></DialogHeader>
              <form onSubmit={handleStockMovement} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <Select value={stockManagementProductId} onValueChange={setStockManagementProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {productList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock} {p.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de mouvement</Label>
                  <Select value={stockManagementType} onValueChange={(value: 'entry' | 'exit') => setStockManagementType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrée de stock</SelectItem>
                      <SelectItem value="exit">Sortie de stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={stockManagementQuantity} 
                    onChange={(e) => setStockManagementQuantity(Number(e.target.value))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Raison (optionnel)</Label>
                  <Input 
                    value={stockManagementReason} 
                    onChange={(e) => setStockManagementReason(e.target.value)}
                    placeholder="Ex: Réception fournisseur, Vente, etc."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStockManagementOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={printInventory}>
            <Printer className="mr-2 h-4 w-4" />Imprimer l'inventaire
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Prix Gros</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Prix Détail</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isLow = p.stock <= p.minStock;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 text-right text-card-foreground">{formatCurrency((p as any).prixGros || p.price)}</td>
                  <td className="px-4 py-3 text-right text-card-foreground">{formatCurrency((p as any).prixDetail || p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("font-semibold", isLow ? "text-warning" : "text-card-foreground")}>
                      {p.stock}
                    </span>
                    <span className="text-muted-foreground"> {p.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isLow ? (
                      <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning gap-1">
                        <AlertTriangle className="h-3 w-3" />Stock bas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-success">En stock</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistoryDialog(p)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        title="Historique"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(p)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(p)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                      >
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

      {/* Dialogue d'édition */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom</Label>
                  <Input name="name" defaultValue={selectedProduct.name} required />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input name="category" defaultValue={selectedProduct.category} required />
                </div>
                <div>
                  <Label>Unité</Label>
                  <Input name="unit" defaultValue={selectedProduct.unit} placeholder="kg, m, pièce..." required />
                </div>
                <div>
                  <Label>Prix de gros</Label>
                  <Input name="prixGros" type="number" defaultValue={(selectedProduct as any).prixGros || selectedProduct.price} required />
                </div>
                <div>
                  <Label>Prix de détail</Label>
                  <Input name="prixDetail" type="number" defaultValue={(selectedProduct as any).prixDetail || selectedProduct.price} required />
                </div>
                <div>
                  <Label>Stock initial</Label>
                  <Input name="stock" type="number" defaultValue={selectedProduct.stock} required />
                </div>
                <div>
                  <Label>Stock minimum</Label>
                  <Input name="minStock" type="number" defaultValue={selectedProduct.minStock} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1">
                  Enregistrer
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de suppression */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer le produit <strong>{selectedProduct.name}</strong> ?
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} className="flex-1">
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue d'historique des mouvements */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique des mouvements</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">Stock actuel: {selectedProduct.stock} {selectedProduct.unit}</p>
                </div>
              </div>
              {productMovements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun mouvement enregistré</p>
              ) : (
                <div className="space-y-2">
                  {productMovements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          movement.type === 'entry' ? 'bg-green-100 text-green-600' : 
                          movement.type === 'exit' ? 'bg-orange-100 text-orange-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {movement.type === 'entry' ? <History className="h-4 w-4" /> : 
                           movement.type === 'exit' ? <History className="h-4 w-4" /> : 
                           <History className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">
                            {movement.type === 'entry' ? 'Entrée' : 
                             movement.type === 'exit' ? 'Sortie' : 'Ajustement'} de {movement.quantity} unités
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {movement.previousStock} → {movement.newStock}
                          </p>
                          {movement.reason && (
                            <p className="text-xs text-muted-foreground">{movement.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {new Date(movement.date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.date).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
