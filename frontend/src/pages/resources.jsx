import React, { useEffect, useState } from "react";
import { BookOpen, Users } from "lucide-react";

import api from "@/services/api";

export function ResourcesPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [familySessions, setFamilySessions] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [familyForm, setFamilyForm] = useState({ session_date: "", topic: "", activities: "", action_items: "", follow_up_date: "", feedback: "" });
  const [surveyForm, setSurveyForm] = useState({ conducted_at: "", engagement_index: 80, notes: "" });

  useEffect(() => {
    async function loadPatients() {
      const { data } = await api.get("/patients/");
      const list = data.results || data;
      setPatients(list);
      if (list.length) {
        setSelectedPatient(String(list[0].id));
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadRelated() {
      if (!selectedPatient) return;
      const [familyResponse, surveyResponse] = await Promise.all([
        api.get(`/patients/${selectedPatient}/family-sessions/`),
        api.get(`/patients/${selectedPatient}/surveys/`)
      ]);
      setFamilySessions(familyResponse.data.results || familyResponse.data);
      setSurveys(surveyResponse.data.results || surveyResponse.data);
    }
    loadRelated();
  }, [selectedPatient]);

  const handleFamilySubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    try {
      const { data } = await api.post(`/patients/${selectedPatient}/family-sessions/`, familyForm);
      setFamilySessions((prev) => [data, ...prev]);
      setFamilyForm({ session_date: "", topic: "", activities: "", action_items: "", follow_up_date: "", feedback: "" });
    } catch (error) {
      console.error(error);
      alert("Falha ao registrar acao psicoeducativa.");
    }
  };

  const handleSurveySubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    try {
      const payload = { ...surveyForm, responses: { satisfacao: surveyForm.notes } };
      const { data } = await api.post(`/patients/${selectedPatient}/surveys/`, payload);
      setSurveys((prev) => [data, ...prev]);
      setSurveyForm({ conducted_at: "", engagement_index: 80, notes: "" });
    } catch (error) {
      console.error(error);
      alert("Não foi possivel registrar a pesquisa de satisfacao.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Psicoeducação e apoio familiar</h2>
          <p className="text-sm text-slate-500">Documente estrategias com a familia e monitore engajamento.</p>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selectedPatient}
            onChange={(event) => setSelectedPatient(event.target.value)}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <form className="space-y-3" onSubmit={handleFamilySubmit}>
            <h3 className="text-lg font-semibold text-slate-700">Registro de ações psicoeducativas</h3>
            <input
              type="date"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={familyForm.session_date}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, session_date: event.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Tema abordado"
              value={familyForm.topic}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, topic: event.target.value }))}
            />
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Atividades e orientações"
              value={familyForm.activities}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, activities: event.target.value }))}
            />
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Acoes combinadas"
              value={familyForm.action_items}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, action_items: event.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={familyForm.follow_up_date}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, follow_up_date: event.target.value }))}
            />
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Feedback da familia"
              value={familyForm.feedback}
              onChange={(event) => setFamilyForm((prev) => ({ ...prev, feedback: event.target.value }))}
            />
            <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
              Registrar acao
            </button>
          </form>
          <form className="space-y-3" onSubmit={handleSurveySubmit}>
            <h3 className="text-lg font-semibold text-slate-700">Pesquisa de satisfacao (Anexo E)</h3>
            <input
              type="date"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={surveyForm.conducted_at}
              onChange={(event) => setSurveyForm((prev) => ({ ...prev, conducted_at: event.target.value }))}
            />
            <label className="block text-sm text-slate-600">
              Indice de adesão (%)
              <input
                type="number"
                min="0"
                max="100"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={surveyForm.engagement_index}
                onChange={(event) => setSurveyForm((prev) => ({ ...prev, engagement_index: Number(event.target.value) }))}
              />
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Comentarios e percepcoes da familia"
              value={surveyForm.notes}
              onChange={(event) => setSurveyForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <button type="submit" className="w-full rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary">
              Registrar pesquisa
            </button>
          </form>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Historico de ações</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            {familySessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700">{session.topic}</p>
                <span className="text-xs text-slate-400">{new Date(session.session_date).toLocaleDateString("pt-BR")}</span>
                <p className="mt-2">{session.activities}</p>
              </div>
            ))}
            {!familySessions.length && <p className="text-sm text-slate-500">Sem registros psicoeducativos para este paciente.</p>}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Pesquisas de satisfacao</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            {surveys.map((survey) => (
              <div key={survey.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700">Indice de adesão {survey.engagement_index}%</p>
                <span className="text-xs text-slate-400">{new Date(survey.conducted_at).toLocaleDateString("pt-BR")}</span>
                <p className="mt-2">{survey.notes}</p>
              </div>
            ))}
            {!surveys.length && <p className="text-sm text-slate-500">Nenhuma pesquisa aplicada ainda.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
