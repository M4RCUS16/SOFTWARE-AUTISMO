import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, ClipboardList, FileText, HeartPulse, User } from "lucide-react";

import api from "@/services/api";
import { ensureArray, formatDate } from "@/utils/data-helpers";

export function PatientDetailPage() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/patients/${patientId}/`);
        setPatient(data);
      } catch (error) {
        console.error("Erro ao carregar paciente", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  if (loading) {
    return <p className="text-primary">Carregando dados clínicos...</p>;
  }

  if (!patient) {
    return <p className="text-red-500">Paciente nao encontrado.</p>;
  }

  const noSchoolHistory = !patient.school_history && !patient.school_history_file;

  const handleToggleStatus = async () => {
    setUpdatingStatus(true);
    try {
      const { data } = await api.patch(`/patients/${patientId}/`, { active: !patient.active });
      const updatedStatus = typeof data?.active === "boolean" ? data.active : !patient.active;
      setPatient((prev) => ({ ...prev, active: updatedStatus }));
    } catch (error) {
      console.error("Erro ao alterar status do paciente", error);
      alert("Não foi possivel atualizar o status. Tente novamente.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">{patient.full_name}</h2>
            <p className="text-sm text-slate-500">{patient.notes || "Sem observações adicionais"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-500 md:items-end">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Nasc.: {formatDate(patient.birth_date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                patient.active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {patient.active ? "Em acompanhamento" : "Inativo"}
            </span>
            <button
              type="button"
              onClick={handleToggleStatus}
              className="text-xs font-medium text-primary hover:text-primary-dark disabled:opacity-60"
              disabled={updatingStatus}
            >
              {updatingStatus ? "Atualizando..." : patient.active ? "Arquivar paciente" : "Ativar paciente"}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Historico clínico e familiar</h3>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <dt className="font-medium text-slate-500">Contato</dt>
              <dd>{patient.contact_email || "Sem e-mail"} ? {patient.contact_phone || "Sem telefone"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Historico escolar</dt>
              <dd className="space-y-1">
                {patient.school_history && <p>{patient.school_history}</p>}
                {patient.school_history_file && (
                  <a
                    href={patient.school_history_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    Abrir historico escolar (PDF)
                  </a>
                )}
                {noSchoolHistory && "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Historico comportamental</dt>
              <dd>{patient.behavior_history || "Não informado"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Historico familiar</dt>
              <dd>{patient.family_history || "Não informado"}</dd>
            </div>
          </dl>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Projeto terapêutico singular</h3>
          {patient.therapeutic_plan ? (
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-500">Objetivos gerais:</span> {patient.therapeutic_plan.general_objectives}</p>
              <p><span className="font-medium text-slate-500">Objetivos especificos:</span> {patient.therapeutic_plan.specific_objectives}</p>
              <p><span className="font-medium text-slate-500">Estrategias:</span> {patient.therapeutic_plan.strategies}</p>
              <p className="text-xs text-slate-400">Revisar em {new Date(patient.therapeutic_plan.next_review_date).toLocaleDateString("pt-BR")}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Nenhum PTS cadastrado. Registre objetivos individualizados.</p>
          )}
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-slate-800">Avaliações aplicadas</h3>
          </header>
          <ul className="space-y-3 text-sm text-slate-600">
            {ensureArray(patient.assessments).map((assessment) => (
              <li key={assessment.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700">{assessment.scale}</p>
                <p className="text-xs text-slate-500">Aplicada em {formatDate(assessment.application_date)}</p>
                {assessment.score_total && <p>Pontuacao: {assessment.score_total}</p>}
              </li>
            ))}
            {ensureArray(patient.assessments).length === 0 && <p className="text-sm text-slate-500">Nenhuma avaliação registrada.</p>}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-slate-800">Sessoes recentes</h3>
          </header>
          <ul className="space-y-3 text-sm text-slate-600">
            {ensureArray(patient.sessions).map((session) => (
              <li key={session.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700">{session.session_type}</p>
                <p className="text-xs text-slate-500">{formatDate(session.session_date)} ? {session.duration_minutes ?? 0} min</p>
                <p>{session.activities}</p>
              </li>
            ))}
            {ensureArray(patient.sessions).length === 0 && <p className="text-sm text-slate-500">Nenhuma sessão registrada.</p>}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-800">Relatórios e psicoeducação</h3>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-600">Relatorios gerais</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {ensureArray(patient.reports).map((report) => (
                <li key={report.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold text-slate-700">{report.report_type_display}</p>
                  <span className="text-xs text-slate-400">Emitido em {formatDate(report.generated_at)}</span>
                </li>
              ))}
              {ensureArray(patient.reports).length === 0 && <p className="text-sm text-slate-500">Nenhum relatório emitido.</p>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-600">Acoes com famílias</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {ensureArray(patient.family_sessions).map((family) => (
                <li key={family.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold text-slate-700">{family.topic}</p>
                  <span className="text-xs text-slate-400">Realizada em {formatDate(family.session_date)}</span>
                </li>
              ))}
              {ensureArray(patient.family_sessions).length === 0 && <p className="text-sm text-slate-500">Nenhuma acao registrada.</p>}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}














