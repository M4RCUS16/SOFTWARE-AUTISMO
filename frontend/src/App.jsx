import React from "react";

import { AuthProvider } from "@/contexts/auth-context";
import { AppRoutes } from "@/routes";

function App() {
  // eslint-disable-next-line no-console
  console.log("Renderizando componente App");
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
