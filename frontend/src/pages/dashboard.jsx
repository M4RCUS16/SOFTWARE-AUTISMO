import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarClock, FileCheck2, Users } from "lucide-react";

import api from "@/services/api";

const cardIcons = {
  total_active_patients: Users,
  scales_applied_this_month: FileCheck2,
  average_progress: CalendarClock,
  pending_revaluations: AlertTriangle,
  therapeutic_adherence_rate: CalendarClock
};

export function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [metricsResponse, patientsResponse] = await Promise.all([
          api.get("/dashboard/"),
          api.get("/patients/")
        ]);
        setMetrics(metricsResponse.data);
        setPatients(patientsResponse.data.results || patientsResponse.data);
      } catch (error) {
        console.error("Erro ao carregar painel", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const adherenceChart = useMemo(() => {
    if (!metrics?.progress_series?.length) {
      return [];
    }
    return metrics.progress_series.map((item) => ({
      name: item.patient.split(" ")[0],
      progresso: item.progress,
      adesão: item.adherence
    }));
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-primary">Carregando painel...</p>
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-red-500">Não foi possivel carregar o painel de indicadores.</p>;
  }

  const cards = [
    {
      key: "total_active_patients",
      label: "Pacientes ativos",
      value: metrics.total_active_patients
    },
    {
      key: "scales_applied_this_month",
      label: "Escalas aplicadas no mes",
      value: metrics.scales_applied_this_month
    },
    {
      key: "average_progress",
      label: "Evolução media (%)",
      value: `${metrics.average_progress.toFixed(1)}%`
    },
    {
      key: "pending_revaluations",
      label: "Reavaliações pendentes",
      value: metrics.pending_revaluations
    },
    {
      key: "therapeutic_adherence_rate",
      label: "Adesão terapêutica",
      value: `${metrics.therapeutic_adherence_rate.toFixed(1)}%`
    }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-800">Painel clínico</h2>
        <p className="text-sm text-slate-500">Indicadores consolidados do cuidado multiprofissional.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ key, label, value }) => {
          const Icon = cardIcons[key] || CalendarClock;
          return (
            <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
                </div>
                <span className="rounded-full bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </article>
          );
        })}
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Adesão e progresso terapêutico</h3>
          <p className="mb-4 text-sm text-slate-500">Evolução recente dos pacientes sob responsabilidade.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adherenceChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProgresso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FA3D8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4FA3D8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAdesão" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#475569" />
                <YAxis stroke="#475569" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Area type="monotone" dataKey="progresso" stroke="#2563EB" fillOpacity={1} fill="url(#colorProgresso)" />
                <Area type="monotone" dataKey="adesão" stroke="#059669" fillOpacity={1} fill="url(#colorAdesão)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Alertas recentes</h3>
          <ul className="mt-4 space-y-3">
            {patients.slice(0, 5).map((patient) => (
              <li key={patient.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700">{patient.full_name}</p>
                <p className="text-xs text-slate-500">Revisao PTS em {new Date().toLocaleDateString("pt-BR")}</p>
              </li>
            ))}
            {!patients.length && <p className="text-sm text-slate-500">Cadastre pacientes para acompanhar alertas clínicos.</p>}
          </ul>
        </article>
      </section>
    </div>
  );
}
