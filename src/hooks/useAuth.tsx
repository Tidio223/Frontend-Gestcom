import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API_BASE_URL } from "@/config/api";

type AppRole = "admin" | "gerant" | "caissier" | "superadmin";

interface User {
  _id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier le token au démarrage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Vérifier si le token est valide
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.data);
            setRole(data.data.role);
          } else {
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        setUser(data.data);
        setRole(data.data.role);
        return { error: null };
      } else {
        return { error: data.message || "Erreur de connexion" };
      }
    } catch (error) {
      return { error: "Erreur de réseau" };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
