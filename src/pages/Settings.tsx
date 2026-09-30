import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Email form state
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newEmail || !confirmEmail || !emailPassword) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    if (newEmail !== confirmEmail) {
      toast({ title: "Erreur", description: "Les adresses e-mail ne correspondent pas", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: "Erreur", description: "Format d'e-mail invalide", variant: "destructive" });
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:5001/api/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail,
          currentPassword: emailPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Succès", description: "Adresse e-mail mise à jour avec succès" });
        setNewEmail("");
        setConfirmEmail("");
        setEmailPassword("");
      } else {
        toast({ title: "Erreur", description: data.message || "Impossible de mettre à jour l'e-mail", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating email:', error);
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:5001/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Succès", description: "Mot de passe mis à jour avec succès" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Erreur", description: data.message || "Impossible de mettre à jour le mot de passe", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres du compte</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et votre sécurité
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Informations du compte</CardTitle>
              <CardDescription>Informations actuelles de votre compte</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Nom d'utilisateur</Label>
              <p className="font-medium">{user?.name || "Non défini"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Rôle</Label>
              <p className="font-medium capitalize">{user?.role || "Non défini"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Adresse e-mail</Label>
              <p className="font-medium">{user?.email || "Non défini"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Modifier l'e-mail
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Modifier le mot de passe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <Card className="max-w-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-4 w-4" />
                Modifier l'adresse e-mail
              </CardTitle>
              <CardDescription className="text-sm">
                Entrez votre nouvelle adresse e-mail et votre mot de passe actuel
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleEmailUpdate} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new-email" className="text-sm">Nouvelle adresse e-mail</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="nouveau@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-email" className="text-sm">Confirmer l'adresse e-mail</Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder="nouveau@email.com"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email-password" className="text-sm">Mot de passe actuel</Label>
                  <Input
                    id="email-password"
                    type="password"
                    placeholder="••••••••"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <Button type="submit" disabled={isUpdatingEmail} className="w-full h-9">
                  {isUpdatingEmail ? "Mise à jour..." : "Mettre à jour l'e-mail"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Card className="max-w-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-4 w-4" />
                Modifier le mot de passe
              </CardTitle>
              <CardDescription className="text-sm">
                Entrez votre mot de passe actuel et choisissez un nouveau mot de passe sécurisé
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="current-password" className="text-sm">Mot de passe actuel</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password" className="text-sm">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-password" className="text-sm">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-9"
                  />
                </div>
                <Button type="submit" disabled={isUpdatingPassword} className="w-full h-9">
                  {isUpdatingPassword ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conseils de sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Utilisez un mot de passe d'au moins 8 caractères avec des lettres, chiffres et symboles</p>
          <p>• Ne partagez jamais votre mot de passe avec quelqu'un</p>
          <p>• Changez votre mot de passe régulièrement</p>
          <p>• Utilisez une adresse e-mail que vous consultez régulièrement</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
