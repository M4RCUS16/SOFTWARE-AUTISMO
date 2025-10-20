import React, { useEffect, useState } from "react";
import { ActivitySquare, CalendarPlus } from "lucide-react";

import api from "@/services/api";
import { extractArray, ensureArray } from "@/utils/data-helpers";

const sessionTypes = [
  { value: "psychological", label: "Sessao Psicologica" },
  { value: "psychopedagogical", label: "Sessao Psicopedagógica" },
  { value: "assessment", label: "Avaliação" },
  { value: "reevaluation", label: "Reavaliação" }
];

export function InterventionsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({
    session_type: "psychological",
    session_date: "",
    duration_minutes: 50,
    activities: "",
    behaviour_observations: "",
    progress_notes: "",
    progress_index: 75
  });

  useEffect(() => {
    async function loadPatients() {
      const { data } = await api.get("/patients/");
      const list = extractArray(data);
      setPatients(list);
      if (list.length) {
        setSelectedPatient(String(list[0].id));
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadSessions() {
      if (!selectedPatient) return;
      const { data } = await api.get(`/patients/${selectedPatient}/sessions/`);
      setSessions(extractArray(data));
    }
    loadSessions();
  }, [selectedPatient]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    try {
      const payload = {
        session_type: form.session_type,
        session_date: form.session_date,
        duration_minutes: form.duration_minutes,
        activities: form.activities,
        behaviour_observations: form.behaviour_observations,
        progress_notes: form.progress_notes,
        progress_scales: { progress: Number(form.progress_index) || 0 }
      };
      const { data } = await api.post(`/patients/${selectedPatient}/sessions/`, payload);
      setSessions((prev) => [data, ...ensureArray(prev)]);
      setForm({
        session_type: "psychological",
        session_date: "",
        duration_minutes: 50,
        activities: "",
        behaviour_observations: "",
        progress_notes: "",
        progress_index: 75
      });
    } catch (error) {
      console.error(error);
      alert("Não foi possivel registrar a sessão.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <ActivitySquare className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Intervenções e sessoes</h2>
          <p className="text-sm text-slate-500">Registre encontros terapêuticos com indicadores de evolução.</p>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-6" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Paciente</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={selectedPatient}
              onChange={(event) => setSelectedPatient(event.target.value)}
            >
              {ensureArray(patients).map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Tipo de sessão</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.session_type}
              onChange={(event) => setForm((prev) => ({ ...prev, session_type: event.target.value }))}
            >
              {sessionTypes.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Data</label>
            <input
              type="date"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.session_date}
              onChange={(event) => setForm((prev) => ({ ...prev, session_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Duracao (min)</label>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.duration_minutes}
              onChange={(event) => setForm((prev) => ({ ...prev, duration_minutes: Number(event.target.value) }))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase text-slate-500">Atividades</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.activities}
              onChange={(event) => setForm((prev) => ({ ...prev, activities: event.target.value }))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase text-slate-500">Observações comportamentais</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.behaviour_observations}
              onChange={(event) => setForm((prev) => ({ ...prev, behaviour_observations: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Indice de progresso (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.progress_index}
              onChange={(event) => setForm((prev) => ({ ...prev, progress_index: event.target.value }))}
            />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs font-semibold uppercase text-slate-500">Notas de progresso</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.progress_notes}
              onChange={(event) => setForm((prev) => ({ ...prev, progress_notes: event.target.value }))}
            />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
              <CalendarPlus className="h-4 w-4" />
              Registrar sessão
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Sessoes registradas</h3>
        <div className="mt-4 space-y-3">
          {ensureArray(sessions).map((session) => (
            <article key={session.id} className="rounded-lg border border-slate-100 p-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">{session.session_type}</p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {new Date(session.session_date).toLocaleDateString("pt-BR")} ? {session.duration_minutes} min
                </span>
              </header>
              <p className="mt-2 text-sm text-slate-600">{session.activities}</p>
              {session.behaviour_observations && <p className="mt-1 text-xs text-slate-500">{session.behaviour_observations}</p>}
            </article>
          ))}
          {ensureArray(sessions).length === 0 && <p className="text-sm text-slate-500">Nenhuma sessão cadastrada para este paciente.</p>}
        </div>
      </section>
    </div>
  );
}


