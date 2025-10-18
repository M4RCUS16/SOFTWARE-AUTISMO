import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu, Users2, FileText, BarChart2, ClipboardList, BookOpen, Settings, HeartPulse, LifeBuoy } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { to: "/", label: "Painel", icon: BarChart2 },
  { to: "/patients", label: "Pacientes", icon: Users2 },
  { to: "/assessments", label: "Avaliacoes", icon: ClipboardList },
  { to: "/diagnostic", label: "Avaliacao Diagnostica", icon: FileText },
  { to: "/interventions", label: "Intervencoes", icon: HeartPulse },
  { to: "/reports", label: "Relatorio geral", icon: FileText },
  { to: "/resources", label: "Psicoeducacao", icon: BookOpen },
  { to: "/settings", label: "Configuracoes", icon: Settings },
  { to: "/help", label: "Ajuda", icon: LifeBuoy }
];

export function MainLayout() {
  const { profile, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-light text-slate-700">
      <aside className="hidden w-64 flex-col bg-white shadow-lg lg:flex">
        <div className="flex h-20 items-center gap-2 px-6">
          <HeartPulse className="h-8 w-8 text-primary" />
          <div>
            <p className="text-lg font-semibold text-primary">NeuroAtlas TEA</p>
            <span className="text-xs text-slate-500">Clínica Psicopedagógica</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary ${
                  isActive ? "bg-primary text-white shadow-md" : "text-slate-600"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mx-4 mb-6 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-primary/10 hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-primary">NeuroAtlas TEA</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-semibold text-slate-800">Bem-vinda, {profile?.full_name.split(" ")[0]}</h1>
            <p className="text-sm text-slate-500">
              Profissional {profile?.profession === "psychologist" ? "Psicóloga" : "Psicopedagoga"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-sm font-medium text-slate-700">{profile?.full_name}</span>
              <span className="text-xs text-slate-500">{profile?.institution}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
