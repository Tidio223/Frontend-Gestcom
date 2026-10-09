import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { API_BASE_URL, getFetchOptions } from "@/config/api";

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").max(100),
});

const Auth = () => {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Détecter le token de réinitialisation dans l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('resetToken');
    if (token) {
      setResetToken(token);
      setResetPasswordOpen(true);
    }
  }, []);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Connexion réussie");
      navigate("/", { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setResetSubmitting(true);
    try {
      const options = getFetchOptions();
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        ...options,
        headers: { ...(options.headers as Record<string, string>), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Email de réinitialisation envoyé");
        if (data.data && data.data.resetToken) {
          // Mode développement : email non envoyé, on garde le token
          setResetToken(data.data.resetToken);
          setForgotPasswordOpen(false);
          setResetPasswordOpen(true);
        } else {
          // Mode production : email envoyé
          setForgotPasswordOpen(false);
        }
      } else {
        toast.error(data.message || "Erreur lors de la demande");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
    setResetSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      toast.error("Données incomplètes");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setResetSubmitting(true);
    try {
      const options = getFetchOptions();
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        ...options,
        headers: { ...(options.headers as Record<string, string>), 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Mot de passe réinitialisé avec succès");
        setResetPasswordOpen(false);
        setResetToken("");
        setNewPassword("");
      } else {
        toast.error(data.message || "Erreur lors de la réinitialisation");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
    setResetSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Formes abstraites d'arrière-plan avec couleurs de l'application */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="space-y-8">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent p-2 shadow-lg">
                <img src="/favicon.svg" alt="GestCom" className="h-full w-full" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GestCom</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion commerciale</h1>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour gérer vos opérations commerciales
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-2xl">
            <div>
              <Label htmlFor="email" className="text-muted-foreground">User Name</Label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 border-input bg-background text-foreground pl-11 focus:border-primary focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 border-input bg-background text-foreground pl-11 pr-11 focus:border-primary focus:ring-primary placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="font-medium text-primary hover:text-primary/80"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full justify-center bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:from-primary/90 hover:to-accent/90 h-12 text-lg font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  LOGIN...
                </>
              ) : (
                "LOGIN"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Modal Mot de passe oublié */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mot de passe oublié</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Entrez votre email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="mt-2"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetSubmitting}
            >
              {resetSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Envoyer le mail"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Réinitialisation du mot de passe */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Entrez votre nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-2"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetSubmitting}
            >
              {resetSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                "Réinitialiser"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
