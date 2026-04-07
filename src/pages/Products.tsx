import { useState } from "react";
import { Search, Plus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { products as initialProducts, Product, formatCurrency } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const filtered = productList.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newProduct: Product = {
      id: String(Date.now()),
      name: fd.get("name") as string,
      category: fd.get("category") as string,
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      minStock: Number(fd.get("minStock")),
      unit: fd.get("unit") as string,
    };
    setProductList((prev) => [newProduct, ...prev]);
    setOpen(false);
    toast({ title: "Produit ajouté", description: `${newProduct.name} a été ajouté au stock.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Produits & Stock</h1>
          <p className="mt-1 text-muted-foreground">Gérez votre inventaire et suivez les niveaux de stock</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Ajouter un produit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Nom</Label><Input name="name" required /></div>
                <div><Label>Catégorie</Label><Input name="category" required /></div>
                <div><Label>Unité</Label><Input name="unit" placeholder="kg, m, pièce..." required /></div>
                <div><Label>Prix unitaire</Label><Input name="price" type="number" required /></div>
                <div><Label>Stock initial</Label><Input name="stock" type="number" required /></div>
                <div><Label>Stock minimum</Label><Input name="minStock" type="number" required /></div>
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
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
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Prix</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isLow = p.stock <= p.minStock;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 text-right text-card-foreground">{formatCurrency(p.price)}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;
