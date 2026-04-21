import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2, Lock, Unlock, Shield, User as UserIcon, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(100),
  role: z.enum(["caissier", "gerant", "admin"]),
});

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "caissier" | "gerant" | "admin";
  createdAt: string;
}

const Admin = () => {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "caissier" as "caissier" | "gerant" | "admin",
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5001/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des utilisateurs");
      }
      const result = await response.json();
      // Filtrer pour exclure les administrateurs
      return result.data.users.filter((user: UserRow) => user.role !== "admin");
    },
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      // TODO: Implement activity logs endpoint in backend
      return [];
    },
  });

  const callAdmin = async (action: string, data: Record<string, unknown>) => {
    const token = localStorage.getItem("token");
    try {
      let response;
      switch (action) {
        case "create":
          response = await fetch("http://localhost:5001/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });
          break;
        case "delete":
          response = await fetch(`http://localhost:5001/api/users/${data.user_id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          break;
        case "set_role":
          response = await fetch(`http://localhost:5001/api/users/${data.user_id}/role`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ role: data.role }),
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

  const handleRoleChange = async (u: UserRow, role: "caissier" | "gerant" | "admin") => {
    if (u.role === role) return;
    const ok = await callAdmin("set_role", { user_id: u._id, role });
    if (ok) toast.success("Rôle mis à jour");
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
                <Select value={form.role} onValueChange={(v: "caissier" | "gerant" | "admin") => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caissier">Caissier</SelectItem>
                    <SelectItem value="gerant">Gérant</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : users.map((u) => {
                    const isSelf = u._id === currentUser?._id;
                    return (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.name}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v: "caissier" | "gerant" | "admin") => handleRoleChange(u, v)} disabled={isSelf}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="caissier"><div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" />Caissier</div></SelectItem>
                              <SelectItem value="gerant"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Gérant</div></SelectItem>
                              {currentUser?.role === "admin" && <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Admin</div></SelectItem>}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isSelf}>
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune activité enregistrée</TableCell></TableRow>
                  ) : logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-sm">{l.user_email ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.entity_type ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {l.details ? JSON.stringify(l.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
