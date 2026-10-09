import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Plus, Search, Download, Filter, Calendar, TrendingUp, TrendingDown, DollarSign, 
  Wallet, CreditCard, Building, Users, FileText, Edit, Trash2, Eye, MoreHorizontal,
  ArrowUpCircle, ArrowDownCircle, PiggyBank
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL, getFetchOptions } from "@/config/api";

// Schéma de validation
const transactionSchema = z.object({
  type: z.enum(["expense", "salary"]),
  amount: z.number().min(0, "Le montant doit être positif"),
  description: z.string().min(1, "La description est requise").max(500, "Maximum 500 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  date: z.string().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "check", "other"]).optional(),
  reference: z.string().optional(),
  recipient: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.type === "salary" && !data.recipient) {
    return false;
  }
  return true;
}, {
  message: "L'employé destinataire est requis pour les paiements de salaire",
  path: ["recipient"],
}).refine((data) => {
  if (data.paymentMethod && data.paymentMethod !== "cash" && !data.reference) {
    return false;
  }
  return true;
}, {
  message: "La référence est requise pour les paiements non en espèces",
  path: ["reference"],
});

const Financial = () => {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
    paymentMethod: "cash",
    reference: "",
    recipient: "",
    tags: [],
  });

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Récupérer les transactions
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ["financial-transactions", currentPage, selectedType, selectedCategory, dateRange, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (selectedType !== "all") params.append("type", selectedType);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`${API_BASE_URL}/api/financial/transactions?${params}`, {
        ...getFetchOptions(),
      });

      if (!response.ok) throw new Error("Erreur lors de la récupération des transactions");
      return response.json();
    },
  });

  // Récupérer les statistiques
  const { data: statsData } = useQuery({
    queryKey: ["financial-stats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/financial/stats`, {
        ...getFetchOptions(),
      });

      if (!response.ok) throw new Error("Erreur lors de la récupération des statistiques");
      return response.json();
    },
  });

  // Récupérer la liste des utilisateurs pour les paiements de salaires
  const { data: usersData } = useQuery({
    queryKey: ["users-for-salaries"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        ...getFetchOptions(),
      });

      if (!response.ok) throw new Error("Erreur lors de la récupération des utilisateurs");
      const result = await response.json();
      return result.data.users.filter((user: any) => user.role !== 'admin');
    },
  });

  // Mutation pour créer/mettre à jour une transaction
  const transactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingTransaction
        ? `${API_BASE_URL}/api/financial/transactions/${editingTransaction._id}`
        : `${API_BASE_URL}/api/financial/transactions`;

      const method = editingTransaction ? "PUT" : "POST";
      const options = getFetchOptions();

      const response = await fetch(url, {
        method,
        ...options,
        headers: {
          ...(options.headers as Record<string, string>),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-transactions"] });
      qc.invalidateQueries({ queryKey: ["financial-stats"] });
      toast.success(editingTransaction ? "Transaction mise à jour" : "Transaction créée");
      setOpen(false);
      setEditingTransaction(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Erreur de mutation:', error);
      toast.error(error.message || "Erreur lors de l'opération");
    },
  });

  // Mutation pour supprimer une transaction
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/api/financial/transactions/${id}`, {
        method: "DELETE",
        ...getFetchOptions(),
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-transactions"] });
      qc.invalidateQueries({ queryKey: ["financial-stats"] });
      toast.success("Transaction supprimée");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  const resetForm = () => {
    setForm({
      type: "expense",
      amount: "",
      description: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
      paymentMethod: "cash",
      reference: "",
      recipient: "",
      tags: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validatedData = transactionSchema.parse({
        ...form,
        amount: parseFloat(form.amount),
        // Convertir les tags en tableau si c'est une chaîne
        tags: Array.isArray(form.tags) ? form.tags : [],
      });

      await transactionMutation.mutateAsync(validatedData);
    } catch (error) {
      console.error('Erreur de validation:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(`${firstError.path.join('.')}: ${firstError.message}`);
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur lors de la validation");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setForm({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      date: new Date(transaction.date).toISOString().split('T')[0],
      paymentMethod: transaction.paymentMethod || "cash",
      reference: transaction.reference || "",
      recipient: transaction.recipient?._id || "",
      tags: transaction.tags || [],
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income": return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "expense": return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case "salary": return <Users className="h-4 w-4 text-blue-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "income": return "Entrée";
      case "expense": return "Dépense";
      case "salary": return "Salaire";
      default: return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Espèces",
      bank_transfer: "Virement bancaire",
      mobile_money: "Mobile Money",
      check: "Chèque",
      other: "Autre",
    };
    return labels[method] || method;
  };

  const exportToCSV = () => {
    if (!transactionsData?.data?.transactions) return;

    const csvContent = [
      ["Date", "Type", "Catégorie", "Description", "Montant", "Méthode de paiement", "Référence", "Enregistré par"],
      ...transactionsData.data.transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString("fr-FR"),
        getTypeLabel(t.type),
        t.category,
        t.description,
        t.amount.toString(),
        getPaymentMethodLabel(t.paymentMethod),
        t.reference || "",
        t.recordedBy?.name || "",
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion Financière</h1>
          <p className="text-muted-foreground">
            Suivez les entrées, sorties, dépenses et salaires de votre boutique
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTransaction(null); resetForm(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction 
                    ? "Modifiez les informations de la transaction"
                    : "Enregistrez une nouvelle transaction financière"
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Dépense</SelectItem>
                          <SelectItem value="salary">Salaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Montant (FCFA)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      placeholder="Ex: Ventes, Loyer, Salaires..."
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      required
                    />
                  </div>
                  {form.type === "salary" && (
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Employé</Label>
                      <Select value={form.recipient} onValueChange={(value) => setForm(prev => ({ ...prev, recipient: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un employé" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersData?.map((user: any) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description / Motif</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez le motif de cette transaction..."
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                      <Select value={form.paymentMethod} onValueChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="check">Chèque</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {form.paymentMethod !== "cash" && (
                    <div className="space-y-2">
                      <Label htmlFor="reference">
                        Référence {form.paymentMethod === "check" ? "(N° chèque)" : form.paymentMethod === "bank_transfer" ? "(Référence virement)" : "(N° facture)"}
                      </Label>
                      <Input
                        id="reference"
                        placeholder={form.paymentMethod === "check" ? "Numéro du chèque" : form.paymentMethod === "bank_transfer" ? "Référence du virement" : "Numéro de facture"}
                        value={form.reference}
                        onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                        required
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Enregistrement..." : (editingTransaction ? "Mettre à jour" : "Enregistrer")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques */}
      {statsData?.data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrées</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsData.data.stats.income.total.toLocaleString('fr-FR')} FCFA
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData.data.stats.income.count} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsData.data.stats.expense.total.toLocaleString('fr-FR')} FCFA
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData.data.stats.expense.count} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Salaires</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsData.data.stats.salary.total.toLocaleString('fr-FR')} FCFA
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData.data.stats.salary.count} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statsData.data.stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statsData.data.stats.balance.toLocaleString('fr-FR')} FCFA
              </div>
              <p className="text-xs text-muted-foreground">
                Balance actuelle
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                  <SelectItem value="salary">Salaires</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">au</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-40"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedType("all");
                  setSelectedCategory("all");
                  setDateRange({ start: "", end: "" });
                  setCurrentPage(1);
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
          <CardDescription>
            {transactionsData?.data?.pagination?.total || 0} transactions trouvées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Employé</TableHead>
                  <TableHead>Enregistré par</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : !transactionsData?.data?.transactions?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  transactionsData.data.transactions.map((transaction: any) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <Badge variant={transaction.type === 'income' ? 'default' : transaction.type === 'expense' ? 'destructive' : 'secondary'}>
                            {getTypeLabel(transaction.type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{transaction.category}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </TableCell>
                      <TableCell className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('fr-FR')} FCFA
                      </TableCell>
                      <TableCell className="text-sm">
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.recipient?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{transaction.recordedBy?.name}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(transaction._id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {transactionsData?.data?.pagination && transactionsData.data.pagination.pages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: transactionsData.data.pagination.pages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(transactionsData.data.pagination.pages, prev + 1))}
                      className={currentPage === transactionsData.data.pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Financial;
