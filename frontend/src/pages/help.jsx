import React from "react";
import { BookOpen, ClipboardCheck, FileText, HelpCircle, LifeBuoy, Users2 } from "lucide-react";

const tutorial = [
  {
    icon: HelpCircle,
    title: "Passo 1. Entrar e ajustar o perfil",
    duration: "5 minutos",
    steps: [
      "Acesse https://app.teacare.local e entre com o e-mail corporativo enviado pela coordenação.",
      "Defina uma senha segura com pelo menos 10 caracteres combinando letras e números.",
      "Abra a aba Configurações e confirme nome completo, registro profissional (CRP ou equivalente) e instituição."
    ]
  },
  {
    icon: Users2,
    title: "Passo 2. Criar os primeiros prontuários",
    duration: "10 minutos",
    steps: [
      "Clique em Novo paciente na aba Pacientes para iniciar o cadastro guiado de três etapas.",
      "Preencha dados básicos como nome, data de nascimento, contatos e avance para anexar o histórico escolar em PDF.",
      "Finalize registrando hipóteses clínicas e comorbidades. O prontuário fica disponível imediatamente."
    ]
  },
  {
    icon: ClipboardCheck,
    title: "Passo 3. Registrar avaliações padronizadas",
    duration: "15 minutos",
    steps: [
      "Na aba Avaliações, selecione o paciente desejado e escolha o instrumento (por exemplo M-CHAT ou ABC).",
      "Informe as respostas. O sistema valida itens obrigatórios, como as 20 questões do M-CHAT.",
      "Salve o registro para alimentar automaticamente os indicadores do Painel e do prontuário individual."
    ]
  },
  {
    icon: FileText,
    title: "Passo 4. Atualizar planos, sessões e relatórios",
    duration: "Rotina semanal",
    steps: [
      "Dentro do prontuário, revise o Plano Terapêutico Singular e ajuste objetivos específicos quando necessário.",
      "Registre sessões com observações comportamentais, anexos e encaminhamentos combinados com a família.",
      "Gere relatórios gerais em PDF e mantenha o histórico arquivado para consultas futuras."
    ]
  }
];

const dailyTips = [
  {
    icon: BookOpen,
    title: "Rotina diária sugerida",
    points: [
      "Consulte o Painel pela manhã para encontrar pacientes com reavaliação ou relatório pendente.",
      "Confirme materiais de apoio e roteiros na aba Recursos antes de cada sessão.",
      "Documente as sessões do dia antes de encerrar o expediente para manter os indicadores atualizados."
    ]
  },
  {
    icon: LifeBuoy,
    title: "Suporte e boas práticas",
    points: [
      "Use o campo de notas do prontuário para alinhar informações com outras profissionais responsáveis.",
      "Revise permissão e destino antes de exportar relatórios ou prontuários completos.",
      "Em caso de dúvidas técnicas, escreva para suporte@teacare.local ou avise a coordenação."
    ]
  }
];

const resourceLinks = [
  {
    label: "Guia rápido do protocolo estadual",
    url: "https://portal.saude.sp.gov.br/resources/te/guia-protocolo-tea.pdf"
  },
  {
    label: "Modelos de relatórios e comunicados",
    url: "https://portal.saude.sp.gov.br/resources/te/modelos-relatorios.zip"
  },
  {
    label: "Checklist de sessão terapêutica",
    url: "https://portal.saude.sp.gov.br/resources/te/checklist-sessão.pdf"
  }
];

export function HelpPage() {
  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">Centro de ajuda</h1>
            <p className="text-sm text-slate-500">
              Utilize este roteiro para dominar o NeuroAtlas TEA desde a configuração inicial até o acompanhamento completo dos pacientes.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="mailto:suporte@teacare.local"
              className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              Contatar suporte
            </a>
            <a
              href="https://portal.saude.sp.gov.br/resources/te/manual-clinico-tea.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark"
            >
              Baixar manual clínico
            </a>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        {tutorial.map(({ icon: Icon, title, duration, steps }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">Tempo estimado: {duration}</span>
                </div>
                <ol className="space-y-2 pl-4 text-sm text-slate-600">
                  {steps.map((step) => (
                    <li key={step} className="list-decimal">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {dailyTips.map(({ icon: Icon, title, points }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Recursos complementares</h3>
        <p className="mt-2 text-sm text-slate-600">
          Consulte materiais oficiais e modelos de apoio para padronizar protocolos clínicos, relatórios e comunicação com as famílias.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-primary">
          {resourceLinks.map((resource) => (
            <li key={resource.url}>
              <a href={resource.url} target="_blank" rel="noreferrer" className="hover:underline">
                {resource.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-slate-600">
        <h4 className="text-base font-semibold text-primary">Continuidade e feedback</h4>
        <p className="mt-2">
          Revise este tutorial sempre que houver atualizações na plataforma. Se notar informações desatualizadas ou tiver sugestões, avise a coordenação para mantermos o material alinhado com os protocolos da clínica.
        </p>
      </footer>
    </div>
  );
}
