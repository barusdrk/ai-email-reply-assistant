import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  getCurrentUser,
  getToken,
} from "../services/auth.js";
import type { User } from "../types/user.js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = getToken();

    if (!token) {
      setUser(null);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      logoutService();
      setUser(null);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      logoutService();
      setUser(null);
      setLoading(false);
    }

    window.addEventListener(
      "auth:logout",
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        "auth:logout",
        handleUnauthorized
      );
    };
  }, []);

  async function login(
    email: string,
    password: string
  ) {
    const result = await loginService(
      email,
      password
    );

    setUser(result.user);
  }

  async function register(
    name: string,
    email: string,
    password: string
  ) {
    const result = await registerService(
      name,
      email,
      password
    );

    setUser(result.user);
  }

  function logout() {
    logoutService();
    setUser(null);
    setLoading(false);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider."
    );
  }

  return context;
}
