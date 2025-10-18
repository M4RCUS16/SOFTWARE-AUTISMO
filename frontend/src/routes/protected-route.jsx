import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({ redirectTo = "/login" }) {
  const { isAuthenticated, loading } = useAuth();

  // eslint-disable-next-line no-console
  console.log("ProtectedRoute -> loading:", loading, "auth:", isAuthenticated);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-light">
        <p className="text-primary-dark animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
