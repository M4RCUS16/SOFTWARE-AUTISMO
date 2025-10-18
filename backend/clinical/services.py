from html import escape
from datetime import timedelta
from io import BytesIO

from django.db.models import F
from django.utils import timezone
from django.utils.formats import date_format
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from .constants import DIAGNOSTIC_RECOMMENDATIONS, DIAGNOSTIC_QUESTIONS
from .models import Assessment, Patient, Session, Report, DiagnosticAssessment


def build_dashboard_context(professional):
    today = timezone.now().date()
    first_of_month = today.replace(day=1)
    six_months_ago = today - timedelta(days=180)

    patients = Patient.objects.filter(professional=professional, active=True)
    assessments = Assessment.objects.filter(professional=professional)
    sessions = Session.objects.filter(professional=professional)

    total_active_patients = patients.count()
    scales_applied_this_month = assessments.filter(application_date__gte=first_of_month).count()

    progress_series = []
    for session in sessions.select_related('patient').order_by('-session_date')[:12]:
        progress_value = 0
        if isinstance(session.progress_scales, dict):
            progress_value = session.progress_scales.get('progress') or 0
        adherence_value = min(100, round((session.duration_minutes / 50) * 100))
        progress_series.append(
            {
                'patient': session.patient.full_name,
                'session_date': session.session_date,
                'progress': float(progress_value),
                'adherence': float(adherence_value),
            }
        )

    scores = [
        item.get('progress')
        for item in sessions.values_list('progress_scales', flat=True)
        if isinstance(item, dict) and item.get('progress') is not None
    ]
    average_progress = sum(scores) / len(scores) if scores else 0

    pending_revaluations = patients.filter(
        therapeutic_plan__next_review_date__lt=today,
    ).count()

    adherence_sessions = sessions.filter(session_date__gte=six_months_ago).count()
    expected_sessions = total_active_patients * 24 if total_active_patients else 1
    therapeutic_adherence_rate = min(100, round((adherence_sessions / expected_sessions) * 100, 2))

    return {
        'total_active_patients': total_active_patients,
        'scales_applied_this_month': scales_applied_this_month,
        'average_progress': float(average_progress or 0),
        'pending_revaluations': pending_revaluations,
        'therapeutic_adherence_rate': float(therapeutic_adherence_rate),
        'last_update': timezone.now(),
        'progress_series': list(reversed(progress_series)),
    }




def _letterhead_draw_fn(section_title):
    def draw(canvas, doc_template):
        canvas.saveState()
        width, height = A4

        canvas.setFillColor(colors.HexColor('#f0f5ff'))
        canvas.rect(0, height - 130, width, 130, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor('#1d4ed8'))
        canvas.rect(0, height - 130, width, 4, fill=1, stroke=0)

        canvas.saveState()
        canvas.translate(45, height - 88)
        canvas.setLineWidth(3)
        canvas.setStrokeColor(colors.HexColor('#63a3ff'))
        heart = canvas.beginPath()
        heart.moveTo(0, 20)
        heart.curveTo(-30, 45, -55, 5, 0, -30)
        heart.curveTo(55, 5, 30, 45, 0, 20)
        canvas.drawPath(heart, stroke=1, fill=0)
        canvas.setStrokeColor(colors.HexColor('#1d4ed8'))
        canvas.setLineWidth(2.5)
        canvas.lines(
            [
                (-22, 4, -10, 4),
                (-10, 4, -4, -8),
                (-4, -8, 2, 12),
                (2, 12, 8, 4),
                (8, 4, 20, 4),
            ]
        )
        canvas.restoreState()

        canvas.setFillColor(colors.HexColor('#1d4ed8'))
        canvas.setFont('Helvetica-Bold', 22)
        canvas.drawString(120, height - 58, 'NeuroAtlas TEA')
        canvas.setFont('Helvetica', 11)
        canvas.drawString(120, height - 78, 'Clinica Psicopedagogica Integrada')

        canvas.setFont('Helvetica', 9)
        contact_lines = [
            'Email: contato@neuroatlastea.com.br  |  Fone: (11) 4000-0000',
            'www.neuroatlastea.com.br',
        ]
        for index, line in enumerate(contact_lines):
            canvas.drawRightString(width - 30, height - 60 - (index * 12), line)

        canvas.setFont('Helvetica-Bold', 13)
        canvas.drawString(120, height - 102, section_title)

        watermark = 'NeuroAtlas TEA'
        canvas.setFillColor(colors.HexColor('#e5edff'))
        canvas.setFont('Helvetica-Bold', 72)
        canvas.saveState()
        canvas.translate(width / 2, height / 2)
        canvas.rotate(30)
        canvas.drawCentredString(0, 0, watermark)
        canvas.restoreState()

        canvas.setFillColor(colors.HexColor('#1d4ed8'))
        canvas.rect(0, 0, width, 55, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica', 9)
        footer = 'Rua Bom Jardim, 01 - Sao Paulo/SP | CNPJ: 00.000.000/0000-00 | NeuroAtlas TEA'
        canvas.drawCentredString(width / 2, 24, footer)

        canvas.restoreState()

    return draw


_QUESTION_MAP = {question['id']: question for question in DIAGNOSTIC_QUESTIONS}


def _resolve_response_details(response):
    question_id = response.get('question_id')
    question_info = _QUESTION_MAP.get(question_id, {})

    answer = response.get('answer')
    if isinstance(answer, str):
        normalized_answer = answer.strip().lower()
    else:
        normalized_answer = 'yes' if response.get('score') == 1 else 'no'
    if normalized_answer not in {'yes', 'no'}:
        normalized_answer = 'yes' if response.get('score') == 1 else 'no'

    answer_label = response.get('answer_label') or ('Sim' if normalized_answer == 'yes' else 'Não')
    risk_answer = question_info.get('risk_answer', 'no')
    failed = response.get('failed')
    if failed is None:
        failed = normalized_answer == risk_answer
    critical = bool(response.get('critical') or question_info.get('critical'))

    return answer_label, bool(failed), critical


def _build_diagnostic_table(assessment, normal_style, question_style, observation_style):
    header_row = [
        Paragraph('<b>#</b>', normal_style),
        Paragraph('<b>Pergunta</b>', normal_style),
        Paragraph('<b>Resposta</b>', normal_style),
        Paragraph('<b>Falha</b>', normal_style),
        Paragraph('<b>Observacoes</b>', normal_style),
    ]
    table_data = [header_row]
    for index, response in enumerate(assessment.responses, start=1):
        axis_text = escape(response['axis'])
        question_text = escape(response['question'])
        observation_text = escape(response.get('observation', '').strip() or '-')
        answer_label, failed, _critical = _resolve_response_details(response)
        fail_display = 'Sim' if failed else 'Não'
        table_data.append(
            [
                str(index),
                Paragraph(f"<b>{axis_text}</b>: {question_text}", question_style),
                Paragraph(answer_label, normal_style),
                Paragraph(fail_display, normal_style),
                Paragraph(observation_text, observation_style),
            ]
        )

    table = Table(table_data, colWidths=[12 * mm, 80 * mm, 28 * mm, 18 * mm, 52 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0f2fe')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (3, -1), 'CENTER'),
                ('ALIGN', (4, 0), (4, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('LEADING', (0, 1), (-1, -1), 12),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#93c5fd')),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#bfdbfe')),
            ]
        )
    )
    return table


def generate_diagnostic_pdf(assessment):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        title='Laudo diagnostico TEA',
    )

    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1f2937'), spaceAfter=6)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#111827'))
    question_style = ParagraphStyle('Question', parent=normal_style, leading=13, wordWrap='CJK')
    observation_style = ParagraphStyle('Observation', parent=normal_style, leading=13, wordWrap='CJK')

    draw_letterhead = _letterhead_draw_fn('Laudo Diagnostico TEA')

    elements = [Spacer(1, 130)]

    professional = assessment.professional
    patient = assessment.patient
    assessment_date = date_format(assessment.created_at, 'DATE_FORMAT')
    responses = assessment.responses or []
    response_flags = [_resolve_response_details(response) for response in responses]
    critical_failures = sum(1 for _answer, failed, critical in response_flags if failed and critical)
    total_failures = int(assessment.score_total or 0)
    positive_screen = total_failures >= 3 or critical_failures >= 2

    profissional_text = (
        f"<b>Profissional:</b> {professional.full_name} "
        f"(CRP: {professional.crp or '---'})<br/>"
        f"<b>Instituição:</b> {professional.institution or 'Não informado'}"
    )
    paciente_text = (
        f"<b>Paciente:</b> {patient.full_name}<br/>"
        f"<b>Data da avaliacao:</b> {assessment_date}"
    )

    elements.append(Paragraph(profissional_text, normal_style))
    elements.append(Paragraph(paciente_text, normal_style))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph('Resumo das respostas', heading_style))
    elements.append(_build_diagnostic_table(assessment, normal_style, question_style, observation_style))
    elements.append(Spacer(1, 14))

    level_display = assessment.get_functional_level_display()
    recommendations = DIAGNOSTIC_RECOMMENDATIONS.get(assessment.functional_level, '')
    summary_html = (
        f"<b>Total de itens reprovados:</b> {total_failures}<br/>"
        f"<b>Itens críticos reprovados:</b> {critical_failures}<br/>"
        f"<b>Status da triagem:</b> {'Positivo' if positive_screen else 'Negativo'}<br/>"
        f"<b>Nivel funcional:</b> {level_display}<br/>"
        f"<b>Recomendacoes iniciais:</b> {recommendations}"
    )
    elements.append(Paragraph('Resultado da avaliacao', heading_style))
    elements.append(Paragraph(summary_html, normal_style))
    compliance_html = (
        "Instrumento aplicado: <b>M-CHAT (Modified Checklist for Autism in Toddlers)</b>. "
        "Interpretação baseada no protocolo original (23 itens) com análise de itens críticos."
    )
    elements.append(Paragraph(compliance_html, normal_style))
    elements.append(Spacer(1, 18))

    elements.append(Paragraph('Observacoes adicionais', heading_style))
    observations_text = ' '.join(
        f"{resp['question']}: {resp.get('observation', '').strip()}."
        for resp in assessment.responses
        if resp.get('observation')
    ) or 'Sem observacoes adicionais registradas.'
    elements.append(Paragraph(observations_text, normal_style))
    elements.append(Spacer(1, 36))

    elements.append(Paragraph('_______________________________________________', normal_style))
    elements.append(Paragraph(f"{professional.full_name}", normal_style))
    elements.append(Paragraph(f"CRP: {professional.crp or '--------'}", normal_style))

    doc.build(elements, onFirstPage=draw_letterhead, onLaterPages=draw_letterhead)
    buffer.seek(0)
    return buffer


def generate_report_pdf(report):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        title='Relatorio Geral',
    )

    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1f2937'), spaceAfter=6)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#111827'))
    question_style = ParagraphStyle('Question', parent=normal_style, leading=13, wordWrap='CJK')
    observation_style = ParagraphStyle('Observation', parent=normal_style, leading=13, wordWrap='CJK')

    report_title = f"Relatorio {report.get_report_type_display()}"
    draw_letterhead = _letterhead_draw_fn(report_title)

    elements = [Spacer(1, 130)]

    patient = report.patient
    professional = report.professional
    report_date = date_format(report.generated_at, 'DATE_FORMAT')

    elements.append(Paragraph(f"<b>Paciente:</b> {patient.full_name}", normal_style))
    elements.append(Paragraph(f"<b>Profissional responsavel:</b> {professional.full_name}", normal_style))
    elements.append(Paragraph(f"<b>Data do relatorio:</b> {report_date}", normal_style))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph('Resumo do relatorio', heading_style))
    summary_text = escape(report.summary or 'Não informado')
    content_html = '<br/>'.join(escape(line) for line in (report.content or '').splitlines()) or 'Sem conteudo registrado.'
    elements.append(Paragraph(summary_text, normal_style))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(content_html, normal_style))
    elements.append(Spacer(1, 18))

    latest_assessment = DiagnosticAssessment.objects.filter(patient=patient, professional=professional).order_by('-created_at').first()
    elements.append(Paragraph('Resumo da avaliacao diagnostica recente', heading_style))
    if latest_assessment:
        level_display = latest_assessment.get_functional_level_display()
        recommendations = DIAGNOSTIC_RECOMMENDATIONS.get(latest_assessment.functional_level, '')
        assessment_responses = latest_assessment.responses or []
        response_flags = [_resolve_response_details(response) for response in assessment_responses]
        critical_failures = sum(1 for _answer, failed, critical in response_flags if failed and critical)
        total_failures = int(latest_assessment.score_total or 0)
        positive_screen = total_failures >= 3 or critical_failures >= 2
        summary_html = (
            f"<b>Data:</b> {date_format(latest_assessment.created_at, 'DATE_FORMAT')}<br/>"
            f"<b>Total de itens reprovados:</b> {total_failures}<br/>"
            f"<b>Itens críticos reprovados:</b> {critical_failures}<br/>"
            f"<b>Status da triagem:</b> {'Positivo' if positive_screen else 'Negativo'}<br/>"
            f"<b>Nivel funcional:</b> {level_display}<br/>"
            f"<b>Recomendacoes:</b> {recommendations}"
        )
        elements.append(Paragraph(summary_html, normal_style))
        elements.append(Spacer(1, 10))
        elements.append(_build_diagnostic_table(latest_assessment, normal_style, question_style, observation_style))
    else:
        elements.append(Paragraph('Não há avaliação diagnóstica registrada para este paciente.', normal_style))

    elements.append(Spacer(1, 36))
    elements.append(Paragraph('_______________________________________________', normal_style))
    elements.append(Paragraph(f"{professional.full_name}", normal_style))
    elements.append(Paragraph(f"CRP: {professional.crp or '--------'}", normal_style))

    doc.build(elements, onFirstPage=draw_letterhead, onLaterPages=draw_letterhead)
    buffer.seek(0)
    return buffer


