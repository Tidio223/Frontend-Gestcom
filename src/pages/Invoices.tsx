import { useState } from "react";
import { Search, Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invoices as initialInvoices, products, Invoice, InvoiceItem, formatCurrency } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  paid: { label: "Payée", className: "border-success/40 bg-success/10 text-success" },
  pending: { label: "En attente", className: "border-warning/40 bg-warning/10 text-warning" },
  overdue: { label: "En retard", className: "border-destructive/40 bg-destructive/10 text-destructive" },
};

const Invoices = () => {
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const { toast } = useToast();

  const filtered = invoiceList.filter(
    (inv) => inv.number.toLowerCase().includes(search.toLowerCase()) || inv.client.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newInvoice: Invoice = {
      id: String(Date.now()),
      number: `FAC-2026-${String(invoiceList.length + 1).padStart(3, "0")}`,
      client: fd.get("client") as string,
      date: new Date().toISOString().split("T")[0],
      items,
      total: items.reduce((s, i) => s + i.total, 0),
      status: "pending",
    };
    setInvoiceList((prev) => [newInvoice, ...prev]);
    setItems([]);
    setCreateOpen(false);
    toast({ title: "Facture créée", description: `${newInvoice.number} pour ${newInvoice.client}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Factures</h1>
          <p className="mt-1 text-muted-foreground">Créez et suivez vos factures de vente</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setItems([]); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Créer une facture</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Client</Label><Input name="client" required /></div>
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
                    </div>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="mt-3 text-right font-display font-bold text-lg text-card-foreground">
                    Total: {formatCurrency(items.reduce((s, i) => s + i.total, 0))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={items.length === 0}>Créer la facture</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher une facture..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">N° Facture</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
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
                  <td className="px-4 py-3 text-right font-semibold text-card-foreground">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          {viewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Facture {viewInvoice.number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium text-card-foreground">{viewInvoice.client}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-card-foreground">{new Date(viewInvoice.date).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  {viewInvoice.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-card-foreground">{item.productName} × {item.quantity}</span>
                      <span className="font-medium text-card-foreground">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-display font-bold text-card-foreground">Total</span>
                  <span className="font-display text-xl font-bold text-card-foreground">{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
