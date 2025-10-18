import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

import api from "@/services/api";
import { tokenStorage } from "@/utils/token-storage";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me/");
      setProfile(data);
    } catch (error) {
      console.error("Erro ao carregar perfil", error);
      tokenStorage.clearAll();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await api.post("/auth/login/", credentials);
      tokenStorage.setAccess(data.access);
      tokenStorage.setRefresh(data.refresh);
      await fetchProfile();
      return data;
    },
    [fetchProfile]
  );

  const logout = useCallback(() => {
    tokenStorage.clearAll();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, loading, login, logout, isAuthenticated: Boolean(profile) }),
    [profile, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
