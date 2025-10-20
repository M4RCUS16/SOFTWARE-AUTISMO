import React, { useEffect, useState } from "react";
import { FilePlus2 } from "lucide-react";

import api from "@/services/api";
import { extractArray, ensureArray, formatDate } from "@/utils/data-helpers";

const scales = [
  { value: "MCHAT", label: "M-CHAT" },
  { value: "ABC", label: "ABC" },
  { value: "VINELAND", label: "Vineland" },
  { value: "ATEC", label: "ATEC" },
  { value: "CGAS", label: "C-GAS / AGF" }
];

export function AssessmentsPage() {
  const [patients, setPatients] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [form, setForm] = useState({ scale: "MCHAT", application_date: "", score_total: "", interpretation: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      const { data } = await api.get("/patients/");
      const result = extractArray(data);
      setPatients(result);
      if (result.length) {
        setSelectedPatient(String(result[0].id));
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadAssessments() {
      if (!selectedPatient) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/patients/${selectedPatient}/assessments/`);
        setAssessments(extractArray(data));
      } catch (error) {
        console.error("Erro ao carregar avaliações", error);
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, [selectedPatient]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    try {
      const payload = { ...form, score_total: form.score_total ? parseFloat(form.score_total) : null };
      const { data } = await api.post(`/patients/${selectedPatient}/assessments/`, payload);
      setAssessments((prev) => [data, ...ensureArray(prev)]);
      setForm({ scale: "MCHAT", application_date: "", score_total: "", interpretation: "" });
    } catch (error) {
      console.error("Erro ao registrar avaliação", error);
      alert("Falha ao registrar avaliação. Verifique as informacoes.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-800">Avaliação diagnostica</h2>
        <p className="text-sm text-slate-500">Registre instrumentos oficiais e acompanhe comparativos evolutivos.</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="md:col-span-1">
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
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Escala</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.scale}
              onChange={(event) => setForm((prev) => ({ ...prev, scale: event.target.value }))}
            >
              {scales.map((scale) => (
                <option key={scale.value} value={scale.value}>
                  {scale.label}
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
              value={form.application_date}
              onChange={(event) => setForm((prev) => ({ ...prev, application_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Pontuação</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.score_total}
              onChange={(event) => setForm((prev) => ({ ...prev, score_total: event.target.value }))}
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-xs font-semibold uppercase text-slate-500">Interpretação</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.interpretation}
              onChange={(event) => setForm((prev) => ({ ...prev, interpretation: event.target.value }))}
              placeholder="Descreva a interpretacao clínica, recomenda??es e encaminhamentos"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              <FilePlus2 className="h-4 w-4" />
              Registrar Avaliação
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Histórico de Avaliações</h3>
          <p className="text-xs text-slate-500">Atualizado automaticamente pelos protocolos aplicados</p>
        </header>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando histórico...</p>
        ) : (
          <div className="space-y-3">
            {ensureArray(assessments).map((assessment) => (
              <article key={assessment.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{assessment.scale}</p>
                    <span className="text-xs text-slate-500">{formatDate(assessment.application_date)}</span>
                  </div>
                  {assessment.score_total && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Pontuacao {assessment.score_total}
                    </span>
                  )}
                </div>
                {assessment.interpretation && <p className="mt-2 text-sm text-slate-600">{assessment.interpretation}</p>}
              </article>
            ))}
            {ensureArray(assessments).length === 0 && <p className="text-sm text-slate-500">Nenhuma avaliação cadastrada para este paciente.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

