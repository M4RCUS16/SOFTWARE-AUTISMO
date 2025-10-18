from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from clinical.models import AuditLog, TherapeuticPlan


class Command(BaseCommand):
    help = "Envia lembretes por e-mail para pacientes com reavaliacao marcada para daqui a tres dias."

    def handle(self, *args, **options):
        today = timezone.now().date()
        reminder_date = today + timedelta(days=3)

        plans = (
            TherapeuticPlan.objects.select_related('patient', 'professional')
            .filter(next_review_date=reminder_date, patient__active=True)
            .exclude(review_reminder_sent_for=reminder_date)
        )

        plans = [plan for plan in plans if (plan.patient.contact_email or '').strip()]

        if not plans:
            self.stdout.write("Nenhum lembrete de reavaliacao para enviar hoje.")
            return

        sent_count = 0
        default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@teacare.local')

        for plan in plans:
            patient = plan.patient
            professional = plan.professional
            email = (patient.contact_email or '').strip()
            if not email:
                continue

            subject = f"Lembrete de reavaliacao - {patient.full_name}"
            review_date_str = plan.next_review_date.strftime('%d/%m/%Y')
            profession_display = (
                professional.get_profession_display()
                if getattr(professional, 'profession', None)
                else 'Profissional responsavel'
            )
            message = "\n".join(
                [
                    f"Prezados responsaveis por {patient.full_name},",
                    "",
                    "Este e um lembrete automatico da equipe NeuroAtlas TEA.",
                    f"A reavaliacao do plano terapeutico esta agendada para {review_date_str}.",
                    "",
                    f"Profissional responsavel: {professional.full_name} ({profession_display})",
                    f"Instituição de referência: {professional.institution or 'Não informada'}",
                    "",
                    "Por gentileza, confirme a disponibilidade ou sinalize ajustes diretamente com a profissional responsavel.",
                    "",
                    "Atenciosamente,",
                    "Equipe NeuroAtlas TEA",
                ]
            )

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=default_from,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as exc:
                self.stderr.write(f"Falha ao enviar lembrete para {patient.full_name}: {exc}")
                continue

            plan.review_reminder_sent_for = plan.next_review_date
            plan.save(update_fields=['review_reminder_sent_for', 'updated_at'])

            AuditLog.objects.create(
                professional=professional,
                action='email_reminder',
                entity='TherapeuticPlan',
                entity_id=str(plan.pk),
                metadata={
                    'patient': patient.full_name,
                    'next_review_date': review_date_str,
                    'recipient': email,
                    'reminder_type': 'review_due_in_3_days',
                },
            )

            sent_count += 1
            self.stdout.write(f"Lembrete enviado para {patient.full_name} ({email}).")

        summary = f"{sent_count} lembrete(s) enviados para reavaliacoes em {reminder_date.strftime('%d/%m/%Y')}."
        self.stdout.write(self.style.SUCCESS(summary))

