import React, { useState } from "react";

import api from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

export function SettingsPage() {
  const { profile, logout } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    institution: profile?.institution || "",
    crp: profile?.crp || "",
    accepts_notifications: profile?.accepts_notifications ?? true
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.put("/auth/me/", form);
      setMessage("Dados atualizados com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage("Falha ao atualizar dados.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-800">Configurações</h2>
        <p className="text-sm text-slate-500">Atualize dados profissionais e preferencias de notificacao.</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Nome completo</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">CRP / Registro</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.crp}
              onChange={(event) => setForm((prev) => ({ ...prev, crp: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Instituicao</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.institution}
              onChange={(event) => setForm((prev) => ({ ...prev, institution: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="notify"
              type="checkbox"
              checked={form.accepts_notifications}
              onChange={(event) => setForm((prev) => ({ ...prev, accepts_notifications: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="notify" className="text-sm text-slate-600">
              Receber alertas automaticos de reavaliação e compromissos
            </label>
          </div>
          {message && <p className="md:col-span-2 text-sm text-primary">{message}</p>}
          <div className="md:col-span-2 flex justify-between">
            <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500" onClick={logout}>
              Encerrar sessão
            </button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
              Salvar alteracoes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
