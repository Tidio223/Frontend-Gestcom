import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 md:grid md:grid-cols-[1.4fr_1.6fr]">
        <div className="hidden md:flex flex-col justify-between gap-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-700 p-10 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 p-2 shadow-lg shadow-slate-950/20">
                <img src="/favicon.svg" alt="GestCom" className="h-full w-full" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">GestCom</p>
                <h1 className="text-3xl font-bold tracking-tight">Gestion commerciale</h1>
              </div>
            </div>
            <div className="space-y-4 max-w-sm">
              <h2 className="text-4xl font-bold tracking-tight">Bonjour, bienvenue !</h2>
              <p className="text-sm leading-7 text-slate-200/90">
                Gérez vos ventes, stocks et factures avec une interface claire, moderne et facile à utiliser.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            <img src="/login-image.svg" alt="Illustration" className="relative z-10 mx-auto h-64 w-full object-contain" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/40" />
          </div>
        </div>

        <div className="flex items-center justify-center p-8 sm:p-10">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Connexion</p>
              <h2 className="text-3xl font-bold text-slate-900">Accédez à votre espace</h2>
              <p className="text-sm text-slate-500">
                Connectez-vous pour gérer vos opérations commerciales rapidement.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 border-slate-200 bg-white pl-11 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 border-slate-200 bg-white pl-11 pr-11 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Se souvenir de moi
                </label>
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Mot de passe oublié ?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full justify-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/10 hover:from-indigo-700 hover:to-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-slate-500">
              <span>Pas encore de compte ? </span>
              <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Inscrivez-vous
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
