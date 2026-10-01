import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2, Lock, Unlock, Shield, User as UserIcon, Loader2, Ban, CheckCircle, Search, Download, Filter, Calendar, LogIn, LogOut, UserPlus, UserMinus, Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

// Emails des comptes protégés (doivent correspondre aux variables d'environnement backend)
const PROTECTED_EMAILS = [
  "elhadji2013@gmail.com",
  "bahcheick508@gmail.com"
];

const PROTECTED_ROLES = ["admin", "superadmin"];

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(100),
  role: z.enum(["caissier", "gerant"]),
});

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "caissier" | "gerant" | "admin" | "superadmin";
  createdAt: string;
  status?: "active" | "blocked";
}

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    login: "Connexion",
    logout: "Déconnexion",
    create_user: "Création",
    delete_user: "Suppression",
    update_role: "Modification rôle",
    block_user: "Blocage",
    unblock_user: "Déblocage",
    update_profile: "Mise à jour profil"
  };
  return labels[action] || action;
};

const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    login: "default",
    logout: "secondary",
    create_user: "default",
    delete_user: "destructive",
    update_role: "outline",
    block_user: "destructive",
    unblock_user: "default",
    update_profile: "outline"
  };
  return variants[action] || "outline";
};

const getActionIcon = (action: string) => {
  const icons: Record<string, React.ReactNode> = {
    login: <LogIn className="h-4 w-4" />,
    logout: <LogOut className="h-4 w-4" />,
    create_user: <UserPlus className="h-4 w-4" />,
    delete_user: <UserMinus className="h-4 w-4" />,
    update_role: <Settings className="h-4 w-4" />,
    block_user: <Ban className="h-4 w-4" />,
    unblock_user: <CheckCircle className="h-4 w-4" />,
    update_profile: <Activity className="h-4 w-4" />
  };
  return icons[action] || <Activity className="h-4 w-4" />;
};

const Admin = () => {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "caissier" as "caissier" | "gerant",
  });

  // États pour le journal d'activité amélioré
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fonctions de filtrage et exportation
  const filterLogs = (logs: any[]) => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = selectedAction === "all" || log.action === selectedAction;
      const matchesRole = selectedRole === "all" || log.user?.role === selectedRole;
      
      const matchesDate = (!dateRange.start || new Date(log.createdAt) >= new Date(dateRange.start)) &&
                         (!dateRange.end || new Date(log.createdAt) <= new Date(dateRange.end));
      
      return matchesSearch && matchesAction && matchesRole && matchesDate;
    });
  };

  const exportToCSV = (logs: any[]) => {
    const csvContent = [
      ["Utilisateur", "Rôle", "Action", "Description", "Date", "Heure", "Adresse IP", "Statut"],
      ...logs.map(log => [
        log.user?.name || "",
        log.user?.role || "",
        getActionLabel(log.action),
        log.description || "",
        new Date(log.createdAt).toLocaleDateString("fr-FR"),
        new Date(log.createdAt).toLocaleTimeString("fr-FR"),
        log.ipAddress || "",
        "Succès"
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activites_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token non trouvé");
      }
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des utilisateurs");
      }
      const result = await response.json();
      // Filtrer pour exclure les administrateurs (mais les afficher dans la liste)
      return result.data.users;
    },
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token non trouvé");
      }
      const response = await fetch(`${API_BASE_URL}/api/activity`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des logs d'activité");
      }
      const result = await response.json();
      return result.data.logs || [];
    },
  });

  const callAdmin = async (action: string, data: Record<string, unknown>) => {
    const token = localStorage.getItem("token");
    try {
      let response;
      switch (action) {
        case "create":
          response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });
          break;
        case "delete":
          response = await fetch(`${API_BASE_URL}/api/users/${data.user_id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          break;
        case "set_role":
          response = await fetch(`${API_BASE_URL}/api/users/${data.user_id}/role`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ role: data.role }),
          });
          break;
        case "block_user":
          response = await fetch(`${API_BASE_URL}/api/users/${data.user_id}/block`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          break;
        case "unblock_user":
          response = await fetch(`${API_BASE_URL}/api/users/${data.user_id}/unblock`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          break;
        default:
          throw new Error("Action non reconnue");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'opération");
      }

      qc.invalidateQueries({ queryKey: ["admin-users"] });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
      return false;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    
    // Mise à jour optimiste - ajouter immédiatement l'utilisateur à la liste
    const tempUser: UserRow = {
      _id: Date.now().toString(), // ID temporaire
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      createdAt: new Date().toISOString(),
    };
    
    // Ajouter à la liste existante
    qc.setQueryData(["admin-users"], (old: UserRow[] = []) => [...old, tempUser]);
    
    const ok = await callAdmin("create", parsed.data);
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "caissier" });
      toast.success("Utilisateur créé avec succès");
      // Forcer le rafraîchissement pour obtenir les vraies données
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } else {
      // En cas d'erreur, retirer l'utilisateur temporaire
      qc.setQueryData(["admin-users"], (old: UserRow[] = []) => 
        old.filter(u => u._id !== tempUser._id)
      );
    }
  };

  const handleDelete = async (u: UserRow) => {
    const ok = await callAdmin("delete", { user_id: u._id });
    if (ok) toast.success("Utilisateur supprimé");
  };

  const handleRoleChange = async (u: UserRow, role: "caissier" | "gerant") => {
    if (u.role === role) return;
    const ok = await callAdmin("set_role", { user_id: u._id, role });
    if (ok) toast.success("Rôle mis à jour");
  };

  const handleBlockUser = async (u: UserRow) => {
    const ok = await callAdmin("block_user", { user_id: u._id });
    if (ok) toast.success("Utilisateur bloqué");
  };

  const handleUnblockUser = async (u: UserRow) => {
    const ok = await callAdmin("unblock_user", { user_id: u._id });
    if (ok) toast.success("Utilisateur débloqué");
  };

  
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Administration</h1>
          <p className="mt-1 text-muted-foreground">Gestion des utilisateurs et journal d'activité</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Nouvel utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
              <DialogDescription>L'utilisateur pourra se connecter immédiatement.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">Email</Label>
                <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Mot de passe</Label>
                <Input id="pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v: "caissier" | "gerant") => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caissier">Caissier</SelectItem>
                    <SelectItem value="gerant">Gérant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs</CardTitle></CardHeader>
          <CardContent><p className="font-display text-3xl font-bold">{users.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Administrateurs</CardTitle></CardHeader>
          <CardContent><p className="font-display text-3xl font-bold">{adminCount}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="activity">Journal d'activité</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : users.map((u) => {
                    const isSelf = u._id === currentUser?._id;
                    const isProtected = PROTECTED_EMAILS.includes(u.email);
                    const hasProtectedRole = PROTECTED_ROLES.includes(u.role);
                    return (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.name}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}{isProtected && <Badge variant="outline" className="ml-2 text-xs">Protégé</Badge>}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Select 
                            value={u.role} 
                            onValueChange={(v: "caissier" | "gerant") => handleRoleChange(u, v)} 
                            disabled={isSelf || isProtected || hasProtectedRole}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="caissier"><div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" />Caissier</div></SelectItem>
                              <SelectItem value="gerant"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Gérant</div></SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === "blocked" ? "destructive" : "default"}>
                            {u.status === "blocked" ? "Bloqué" : "Actif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {u.status !== "blocked" ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700" disabled={isSelf || isProtected || hasProtectedRole}>
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Bloquer cet utilisateur ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {u.name} ({u.email}) ne pourra plus se connecter.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleBlockUser(u)} className="bg-orange-600 hover:bg-orange-700">
                                      Bloquer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleUnblockUser(u)}
                                disabled={isProtected || hasProtectedRole}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isSelf || isProtected || hasProtectedRole}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {u.name} ({u.email}) sera définitivement supprimé. Action irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(u)} className="bg-destructive hover:bg-destructive/90">
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Journal d'activité
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportToCSV(filterLogs(logs))}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barre de recherche et filtres */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par utilisateur, email ou description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les actions</SelectItem>
                      <SelectItem value="login">Connexion</SelectItem>
                      <SelectItem value="logout">Déconnexion</SelectItem>
                      <SelectItem value="create_user">Création</SelectItem>
                      <SelectItem value="delete_user">Suppression</SelectItem>
                      <SelectItem value="update_role">Modification rôle</SelectItem>
                      <SelectItem value="block_user">Blocage</SelectItem>
                      <SelectItem value="unblock_user">Déblocage</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="gerant">Gérant</SelectItem>
                      <SelectItem value="caissier">Caissier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Filtres de date */}
              <div className="flex gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Du:</span>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Au:</span>
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
                    setSelectedAction("all");
                    setSelectedRole("all");
                    setDateRange({ start: "", end: "" });
                    setCurrentPage(1);
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              </div>
              
              {/* Tableau amélioré */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Heure</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filterLogs(logs).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucune activité trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterLogs(logs)
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((l) => (
                          <TableRow key={l._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{l.user?.name ?? "Système"}</div>
                                <div className="text-xs text-muted-foreground">{l.user?.email ?? ""}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {l.user?.role === "admin" ? "Admin" :
                                 l.user?.role === "gerant" ? "Gérant" : "Caissier"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getActionIcon(l.action)}
                                <Badge variant={getActionVariant(l.action)}>
                                  {getActionLabel(l.action)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={l.description}>
                                {l.description ?? "â\u0080\u0094"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(l.createdAt).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(l.createdAt).toLocaleTimeString("fr-FR", { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit' 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Succès
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filterLogs(logs).length > itemsPerPage && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.ceil(filterLogs(logs).length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
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
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filterLogs(logs).length / itemsPerPage), prev + 1))}
                          className={currentPage === Math.ceil(filterLogs(logs).length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
