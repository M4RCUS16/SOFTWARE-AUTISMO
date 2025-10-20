import React, { useEffect, useState } from 'react';
import { FileText, Printer } from 'lucide-react';

import api from '@/services/api';
import { extractArray, ensureArray, formatDate } from '@/utils/data-helpers';

const reportTypes = [
  { value: 'technical', label: 'Relatorio Geral' },
  { value: 'semiannual_review', label: 'Reavaliacao Semestral' },
  { value: 'weekly', label: 'Resumo Semanal' },
  { value: 'monthly', label: 'Resumo Mensal' }
];

export function ReportsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ report_type: 'technical', summary: '', content: '' });

  useEffect(() => {
    async function loadPatients() {
      const { data } = await api.get('/patients/');
      const list = extractArray(data);
      setPatients(list);
      if (list.length) {
        setSelectedPatient(String(list[0].id));
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadReports() {
      if (!selectedPatient) return;
      const { data } = await api.get(`/patients/${selectedPatient}/reports/`);
      setReports(extractArray(data));
    }
    loadReports();
  }, [selectedPatient]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    try {
      const { data } = await api.post(`/patients/${selectedPatient}/reports/`, form);
      setReports((prev) => [data, ...ensureArray(prev)]);
      setForm({ report_type: 'technical', summary: '', content: '' });
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel gerar o relatorio.');
    }
  };

  return (
    <div className='space-y-6'>
      <header className='flex items-center gap-3'>
        <FileText className='h-8 w-8 text-primary' />
        <div>
          <h2 className='text-2xl font-semibold text-slate-800'>Relatorios e evidencias</h2>
          <p className='text-sm text-slate-500'>Centralize documentos clinicos e psicopedagogicos.</p>
        </div>
      </header>
      <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <form className='grid gap-4 md:grid-cols-4' onSubmit={handleSubmit}>
          <div>
            <label className='text-xs font-semibold uppercase text-slate-500'>Paciente</label>
            <select
              className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
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
            <label className='text-xs font-semibold uppercase text-slate-500'>Tipo</label>
            <select
              className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
              value={form.report_type}
              onChange={(event) => setForm((prev) => ({ ...prev, report_type: event.target.value }))}
            >
              {reportTypes.map((report) => (
                <option key={report.value} value={report.value}>
                  {report.label}
                </option>
              ))}
            </select>
          </div>
          <div className='md:col-span-2'>
            <label className='text-xs font-semibold uppercase text-slate-500'>Resumo</label>
            <input
              className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              placeholder='Resumo objetivo do relatorio'
            />
          </div>
          <div className='md:col-span-4'>
            <label className='text-xs font-semibold uppercase text-slate-500'>Conteudo tecnico</label>
            <textarea
              className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
              rows={6}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder='Descreva achados clinicos, evolucao por escala e encaminhamentos'
            />
          </div>
          <div className='md:col-span-4 flex justify-end'>
            <button type='submit' className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white'>
              <Printer className='h-4 w-4' />
              Emitir relatorio
            </button>
          </div>
        </form>
      </section>
      <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-slate-800'>Historico de documentos</h3>
        <div className='mt-3 space-y-3'>
          {ensureArray(reports).map((report) => (
            <article key={report.id} className='rounded-lg border border-slate-100 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-700'>{report.report_type_display}</p>
                <span className='text-xs text-slate-400'>{formatDate(report.generated_at)}</span>
                </div>
                <span className='text-xs text-slate-500'>{report.summary}</span>
              </div>
              <p className='mt-2 text-sm text-slate-600'>{report.content}</p>
            </article>
          ))}
          {(!Array.isArray(reports) || reports.length === 0) && (
            <p className='text-sm text-slate-500'>Ainda nao ha relatorios emitidos.</p>
          )}
        </div>
      </section>
    </div>
  );
}

