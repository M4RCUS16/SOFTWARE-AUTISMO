import React, { useEffect, useMemo, useState } from "react";
import { Download, FileCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";

import api from "@/services/api";
import { extractArray, ensureArray } from "@/utils/data-helpers";

const SCORE_OPTIONS = [
  { value: 1, label: "Sim" },
  { value: 0, label: "Não" }
];

export function DiagnosticAssessmentPage() {
  const [questionAxes, setQuestionAxes] = useState([]);
  const flatQuestions = useMemo(() => {
    return ensureArray(questionAxes).flatMap((axis) =>
      ensureArray(axis?.questions).map((question) => ({
        ...question,
        axis: axis?.label || axis?.title || axis?.id
      }))
    );
  }, [questionAxes]);
  const emptyResponses = useMemo(() => {
    return Object.fromEntries(flatQuestions.map((question) => [question.id, { score: null, observation: "" }]));
  }, [flatQuestions]);

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [responses, setResponses] = useState(emptyResponses);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    async function loadPatients() {
        try {
          const { data } = await api.get("/patients/");
          const patientList = extractArray(data);
          setPatients(patientList);
          setSelectedPatient((patientList[0] && String(patientList[0].id)) || "");
      } catch (err) {
        console.error(err);
      } finally {
        setPatientsLoading(false);
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadQuestions() {
        try {
          const { data } = await api.get("/assessment/diagnostic/questions/");
          setQuestionAxes(extractArray(data));
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar as questões do M-CHAT.");
      } finally {
        setQuestionsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  useEffect(() => {
    setResponses(emptyResponses);
  }, [emptyResponses]);

  const answeredCount = useMemo(
    () => flatQuestions.filter((question) => responses[question.id]?.score !== null).length,
    [flatQuestions, responses]
  );
  const progress = flatQuestions.length ? Math.round((answeredCount / flatQuestions.length) * 100) : 0;
  const totalQuestions = flatQuestions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  useEffect(() => {
    if (flatQuestions.length) {
      setCurrentQuestionIndex(0);
      setShowSummary(false);
    }
  }, [flatQuestions.length]);
  const currentQuestion = flatQuestions[currentQuestionIndex] || null;
  const answeredAll = answeredCount === totalQuestions;

  const scoreLabel = (value) => SCORE_OPTIONS.find((option) => option.value === value)?.label || "Não respondido";

  const handleScoreChange = (questionId, score) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { score: null, observation: "" }), score }
    }));

  };

  const handleObservationChange = (questionId, observation) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { score: null, observation: "" }), observation }
    }));
  };

  const resetForm = () => {
    setResponses(emptyResponses);
    setSelectedPatient("");
    setResult(null);
    setCurrentQuestionIndex(0);
    setShowSummary(false);
  };

  const handlePreviousQuestion = () => {
    if (showSummary) {
      setShowSummary(false);
      setCurrentQuestionIndex(totalQuestions - 1);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleJumpToQuestion = (index) => {
    setShowSummary(false);
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("Selecione um paciente antes de iniciar a avaliação.");
      return;
    }
    if (answeredCount < flatQuestions.length) {
      setError("Responda todas as questões para gerar o laudo.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        patient: selectedPatient,
        responses: flatQuestions.map((question) => ({
          question_id: question.id,
          score: (responses[question.id] || {}).score,
          observation: (responses[question.id] || {}).observation
        }))
      };
      const { data } = await api.post("/assessment/diagnostic/", payload);
      setResult(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar a avaliação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const response = await api.get(`/assessment/diagnostic/${result.id}/pdf/`, {
        responseType: "blob"
      });
      const filename = `laudo-diagnostico-${result.patient?.name?.replace(/\s+/g, "-") || "paciente"}.pdf`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Não foi possível gerar o PDF no momento.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-800">Avaliação Diagnóstica TEA</h2>
        <p className="text-sm text-slate-500">
          Aplique o protocolo estruturado para definir o nível funcional e gerar o laudo automático.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Paciente</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={selectedPatient}
                onChange={(event) => setSelectedPatient(event.target.value)}
                disabled={patientsLoading || saving}
                required
              >
                <option value="">Selecione um paciente</option>
                {ensureArray(patients).map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Progresso</label>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
                <p className="mt-1 text-xs text-slate-500">
                  {answeredCount} de {flatQuestions.length} questões respondidas ({progress}% completo)
                </p>
            </div>
          </div>

            <div className="rounded-xl border border-slate-200 p-4">
              {questionsLoading ? (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando questões do M-CHAT...
                </div>
              ) : showSummary ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Resumo das respostas</h3>
                      <p className="text-sm text-slate-500">
                      Revise as pontuações antes de gerar o laudo. Clique em "Revisar" para editar alguma pergunta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSummary(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Voltar ao questionário
                  </button>
                </div>
                  <div className="space-y-4">
                    {questionAxes.map((axis) => (
                      <article key={axis.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                        <h4 className="text-md font-semibold text-slate-700">{axis.label || axis.title}</h4>
                        <div className="space-y-3">
                          {(axis.questions || []).map((question) => {
                          const answer = responses[question.id];
                          const questionIndex = flatQuestions.findIndex((item) => item.id === question.id);
                          return (
                            <div key={question.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{question.text}</p>
                                  <p className="text-xs text-slate-500">Resposta: {scoreLabel(answer?.score)}</p>
                                  {answer?.observation && (
                                    <p className="text-xs text-slate-500">Obs.: {answer.observation}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-primary hover:text-primary-dark"
                                  onClick={() => handleJumpToQuestion(questionIndex)}
                                >
                                  Revisar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              ) : currentQuestion ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Pergunta {currentQuestionIndex + 1} de {totalQuestions}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-800">{currentQuestion.text}</h3>
                    <p className="text-xs text-slate-500">Eixo: {currentQuestion.axis}</p>
                  </div>
                  <div className="sm:text-right">
                    <label className="text-xs font-semibold uppercase text-slate-500">Ir para</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={currentQuestionIndex}
                      onChange={(event) => handleJumpToQuestion(Number(event.target.value))}
                    >
                      {flatQuestions.map((question, index) => (
                        <option key={question.id} value={index}>
                          {index + 1}. {question.text.slice(0, 50)}
                          {question.text.length > 50 ? "..." : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {SCORE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="radio"
                          name={`score-${currentQuestion.id}`}
                          value={option.value}
                          checked={responses[currentQuestion.id]?.score === option.value}
                          onChange={() => handleScoreChange(currentQuestion.id, option.value)}
                          className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Observações</label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={responses[currentQuestion.id]?.observation || ""}
                      onChange={(event) => handleObservationChange(currentQuestion.id, event.target.value)}
                      placeholder="Descreva complementações relevantes para esta questão."
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handlePreviousQuestion}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    disabled={currentQuestionIndex === 0}
                  >
                    Pergunta anterior
                  </button>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSummary(true)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      disabled={!answeredAll}
                    >
                      Ver resumo
                    </button>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={responses[currentQuestion.id]?.score === null}
                    >
                      {currentQuestionIndex === totalQuestions - 1 ? "Finalizar questionário" : "Próxima pergunta"}
                    </button>
                  </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Não há questões do M-CHAT disponíveis. Atualize a página ou tente novamente mais tarde.
                </p>
              )}
            </div>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              disabled={saving}
            >
              Limpar formulário
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando laudo...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Gerar Laudo PDF
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {result && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Resumo da avaliação</h3>
              <p className="text-sm text-slate-500">
                Realizada em {format(new Date(result.created_at), "dd/MM/yyyy")} para {result.patient?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={pdfLoading}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDF
            </button>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Total de itens reprovados</p>
              <p className="text-2xl font-semibold text-slate-800">{result.total_failed ?? result.score_total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Itens críticos reprovados</p>
              <p className="text-2xl font-semibold text-slate-800">{result.critical_failed ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Status da triagem</p>
              <p
                className={`text-lg font-semibold ${
                  result.positive_screen ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {result.positive_screen ? "Positivo" : "Negativo"}
              </p>
              <p className="text-xs text-slate-500">Nível funcional: {result.functional_level_display}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Recomendações iniciais</p>
            <p className="text-sm text-slate-600">{result.recommendations}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Questão</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Resposta</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Falha</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Crítica</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.responses?.map((response) => (
                  <tr key={response.question_id}>
                    <td className="px-4 py-2 text-slate-700">
                      <span className="block text-xs font-semibold uppercase text-slate-400">{response.axis}</span>
                      {response.question}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{response.answer_label ?? scoreLabel(response.score)}</td>
                    <td className="px-4 py-2 text-slate-700">{response.failed ? "Sim" : "Não"}</td>
                    <td className="px-4 py-2 text-slate-700">{response.critical ? "Sim" : "Não"}</td>
                    <td className="px-4 py-2 text-slate-600">{response.observation || "Sem observações"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}




