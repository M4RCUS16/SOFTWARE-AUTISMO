import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import api from "@/services/api";
import { extractArray, ensureArray } from "@/utils/data-helpers";

const initialForm = {
  full_name: "",
  birth_date: "",
  sex: "M",
  contact_email: "",
  contact_phone: "",
  emergency_contact: "",
  address: "",
  school_history: "",
  behavior_history: "",
  family_history: "",
  initial_diagnosis: "",
  comorbidities: ""
};

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [schoolHistoryFile, setSchoolHistoryFile] = useState(null);
  const schoolHistoryInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const steps = [
    {
      title: "Dados principais",
      description: "Informações obrigatorias para identificar e contatar o paciente."
    },
    {
      title: "Contexto familiar e escolar",
      description: "Dados complementares e anexos importantes do prontuario."
    },
    {
      title: "Hipoteses clinicas",
      description: "Registre diagnosticos iniciais e comorbidades observadas."
    }
  ];

  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/patients/");
        setPatients(extractArray(data));
      } catch (error) {
        console.error("Erro ao carregar pacientes", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPatients = ensureArray(patients)
    .filter((patient) => patient.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const handleToggleStatus = async (patientId, currentStatus) => {
    setUpdatingStatusId(patientId);
    try {
      const { data } = await api.patch(`/patients/${patientId}/`, { active: !currentStatus });
      const updatedStatus = typeof data?.active === "boolean" ? data.active : !currentStatus;
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId ? { ...patient, active: updatedStatus } : patient
        )
      );
    } catch (error) {
      console.error("Erro ao alterar status do paciente", error);
      alert("Não foi possivel atualizar o status. Tente novamente.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setForm(initialForm);
    setSchoolHistoryFile(null);
    if (schoolHistoryInputRef.current) {
      schoolHistoryInputRef.current.value = "";
    }
    setCurrentStep(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isLastStep) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, value || "");
      });
      if (schoolHistoryFile) {
        payload.append("school_history_file", schoolHistoryFile);
      }
      const { data } = await api.post("/patients/", payload);
      setPatients((prev) => [data, ...ensureArray(prev)]);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao cadastrar paciente", error);
      alert("Não foi possivel cadastrar o paciente. Verifique os dados.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Pacientes</h2>
          <p className="text-sm text-slate-500">Cadastre e acompanhe o prontuario clinico individualizado.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setSchoolHistoryFile(null);
            if (schoolHistoryInputRef.current) {
              schoolHistoryInputRef.current.value = "";
            }
            setCurrentStep(0);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Novo paciente
        </button>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por nome"
            className="w-full border-0 text-sm focus:outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando pacientes...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-neutral">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Paciente</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Contato</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="transition hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{patient.full_name}</p>
                      <span className="text-xs text-slate-500">{new Date(patient.birth_date).toLocaleDateString("pt-BR")}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {patient.contact_phone || "Sem telefone"}<br />
                      {patient.contact_email || "Sem e-mail"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          patient.active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {patient.active ? "Em acompanhamento" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Ver detalhes
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-60"
                        onClick={() => handleToggleStatus(patient.id, patient.active)}
                        disabled={updatingStatusId === patient.id}
                      >
                        {updatingStatusId === patient.id
                          ? "Atualizando..."
                          : patient.active
                          ? "Arquivar"
                          : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredPatients.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                      Nenhum paciente encontrado. Ajuste os filtros ou cadastre um novo paciente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl sm:max-w-2xl lg:max-w-3xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Novo paciente</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={handleCloseModal}>
                Fechar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
              <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Passo {currentStep + 1} de {steps.length}
                </p>
                <h4 className="mt-1 text-base font-semibold text-slate-800">{steps[currentStep].title}</h4>
                <p className="text-sm text-slate-500">{steps[currentStep].description}</p>
              </div>
              <form className="grid gap-5" onSubmit={handleSubmit}>
                {currentStep === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Nome completo</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-slate-500">Data de nascimento</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="birth_date"
                        value={form.birth_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-slate-500">Sexo</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="sex"
                        value={form.sex}
                        onChange={(e) => setForm((prev) => ({ ...prev, sex: e.target.value }))}
                      >
                        <option value="F">Feminino</option>
                        <option value="M">Masculino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-slate-500">Telefone</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="contact_phone"
                        value={form.contact_phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-slate-500">E-mail</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="contact_email"
                        value={form.contact_email}
                        onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase text-slate-500">Contato de emergencia</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="emergency_contact"
                        value={form.emergency_contact}
                        onChange={(e) => setForm((prev) => ({ ...prev, emergency_contact: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Endereco</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="address"
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Historico escolar (PDF)</label>
                      <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        <input
                          ref={schoolHistoryInputRef}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                            setSchoolHistoryFile(file);
                          }}
                        />
                        {schoolHistoryFile ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{schoolHistoryFile.name}</span>
                            <button
                              type="button"
                              className="text-xs font-medium text-primary hover:text-primary-dark"
                              onClick={() => {
                                setSchoolHistoryFile(null);
                                if (schoolHistoryInputRef.current) {
                                  schoolHistoryInputRef.current.value = "";
                                }
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                            onClick={() => schoolHistoryInputRef.current?.click()}
                          >
                            Selecionar PDF
                          </button>
                        )}
                        <p className="mt-2 text-xs text-slate-400">Anexe o historico escolar em PDF (ate 10 MB).</p>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Historico comportamental</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="behavior_history"
                        rows={3}
                        value={form.behavior_history}
                        onChange={(e) => setForm((prev) => ({ ...prev, behavior_history: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Historico familiar</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="family_history"
                        rows={3}
                        value={form.family_history}
                        onChange={(e) => setForm((prev) => ({ ...prev, family_history: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Diagnostico inicial</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="initial_diagnosis"
                        rows={3}
                        value={form.initial_diagnosis}
                        onChange={(e) => setForm((prev) => ({ ...prev, initial_diagnosis: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium uppercase text-slate-500">Comorbidades</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        name="comorbidities"
                        rows={3}
                        value={form.comorbidities}
                        onChange={(e) => setForm((prev) => ({ ...prev, comorbidities: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:border-slate-300 hover:text-slate-700 disabled:opacity-60"
                    onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                    disabled={currentStep === 0}
                  >
                    Voltar
                  </button>
                  {isLastStep ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:border-slate-300 hover:text-slate-700"
                        onClick={handleCloseModal}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                        disabled={saving}
                      >
                        {saving ? "Salvando..." : "Salvar paciente"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                      onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                    >
                      Proximo
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
