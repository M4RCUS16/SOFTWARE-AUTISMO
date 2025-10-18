from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Professional(AbstractUser):
    class Profession(models.TextChoices):
        PSYCHOLOGIST = 'psychologist', _('Psicóloga')
        PSYCHOPEDAGOGIST = 'psychopedagogist', _('Psicopedagoga')

    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(_('nome completo'), max_length=180)
    crp = models.CharField(_('CRP/registro profissional'), max_length=20)
    profession = models.CharField(_('área de atuação'), max_length=32, choices=Profession.choices, blank=True)
    institution = models.CharField(_('instituição'), max_length=180, blank=True)
    accepts_notifications = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name', 'crp']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        profession_display = self.get_profession_display() if self.profession else _('Profissional')
        return f'{self.full_name} ({profession_display})'


class Patient(TimeStampedModel):
    class Sex(models.TextChoices):
        FEMALE = 'F', _('Feminino')
        MALE = 'M', _('Masculino')
        OTHER = 'O', _('Outro')

    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='patients')
    full_name = models.CharField(max_length=180)
    birth_date = models.DateField()
    sex = models.CharField(max_length=1, choices=Sex.choices)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact = models.CharField(max_length=180, blank=True)
    address = models.CharField(max_length=255, blank=True)
    school_history = models.TextField(blank=True)
    school_history_file = models.FileField(upload_to='school_history/', blank=True, null=True)
    behavior_history = models.TextField(blank=True)
    family_history = models.TextField(blank=True)
    initial_diagnosis = models.TextField(blank=True)
    comorbidities = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.full_name


class Assessment(TimeStampedModel):
    class ScaleType(models.TextChoices):
        MCHAT = 'MCHAT', _('M-CHAT')
        ABC = 'ABC', _('Autism Behavior Checklist')
        VINELAND = 'VINELAND', _('Vineland')
        ATEC = 'ATEC', _('ATEC')
        CGAS = 'CGAS', _('C-GAS/AGF')

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='assessments')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='assessments')
    scale = models.CharField(max_length=20, choices=ScaleType.choices)
    application_date = models.DateField()
    score_total = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    responses = models.JSONField(default=dict, blank=True)
    interpretation = models.TextField(blank=True)
    comparison_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-application_date']
        unique_together = ('patient', 'scale', 'application_date')

    def __str__(self):
        return f'{self.patient.full_name} - {self.get_scale_display()} ({self.application_date})'


class DiagnosticAssessment(TimeStampedModel):
    class FunctionalLevel(models.TextChoices):
        SEVERE = 'severe', _('Grave')
        MODERATE = 'moderate', _('Moderado')
        MILD = 'mild', _('Leve')

    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='diagnostic_assessments')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='diagnostic_assessments')
    responses = models.JSONField(default=list)
    score_total = models.FloatField()
    functional_level = models.CharField(max_length=12, choices=FunctionalLevel.choices)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Avaliação Diagnóstica TEA - {self.patient.full_name} ({self.created_at:%d/%m/%Y})'


class TherapeuticPlan(TimeStampedModel):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='therapeutic_plan')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='therapeutic_plans')
    general_objectives = models.TextField()
    specific_objectives = models.TextField()
    strategies = models.TextField()
    start_date = models.DateField()
    next_review_date = models.DateField()
    monitoring_indicators = models.JSONField(default=dict, blank=True)
    pdf_storage_path = models.CharField(max_length=255, blank=True)
    review_reminder_sent_for = models.DateField(blank=True, null=True)

    def __str__(self):
        return f'PTS - {self.patient.full_name}'

    def save(self, *args, **kwargs):
        if self.pk:
            original = type(self).objects.filter(pk=self.pk).values('next_review_date', 'review_reminder_sent_for').first()
            if original and original['next_review_date'] != self.next_review_date:
                self.review_reminder_sent_for = None
        super().save(*args, **kwargs)


class Session(TimeStampedModel):
    class SessionType(models.TextChoices):
        PSYCHOLOGICAL = 'psychological', _('Psicológica')
        PSYCHOPEDAGOGICAL = 'psychopedagogical', _('Psicopedagógica')
        ASSESSMENT = 'assessment', _('Avaliação')
        REEVALUATION = 'reevaluation', _('Reavaliação')

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='sessions')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='sessions')
    session_type = models.CharField(max_length=24, choices=SessionType.choices)
    session_date = models.DateField()
    duration_minutes = models.PositiveIntegerField(default=50)
    activities = models.TextField()
    behaviour_observations = models.TextField(blank=True)
    progress_notes = models.TextField(blank=True)
    progress_scales = models.JSONField(default=dict, blank=True)
    attachments = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-session_date']

    def __str__(self):
        return f'{self.patient.full_name} - {self.get_session_type_display()} ({self.session_date})'


class Report(TimeStampedModel):
    class ReportType(models.TextChoices):
        TECHNICAL = 'technical', _('Geral')
        SEMIANNUAL_REVIEW = 'semiannual_review', _('Reavaliação Semestral')
        WEEKLY = 'weekly', _('Acompanhamento Semanal')
        MONTHLY = 'monthly', _('Acompanhamento Mensal')

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='reports')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=32, choices=ReportType.choices)
    generated_at = models.DateTimeField(auto_now_add=True)
    summary = models.CharField(max_length=255)
    content = models.TextField()
    exported_pdf_path = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f'{self.get_report_type_display()} - {self.patient.full_name}'


class SatisfactionSurvey(TimeStampedModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='surveys')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='surveys')
    responses = models.JSONField(default=dict)
    engagement_index = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_('Percentual de adesão familiar'),
    )
    conducted_at = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-conducted_at']

    def __str__(self):
        return f'Satisfação {self.patient.full_name} - {self.conducted_at}'


class FamilySession(TimeStampedModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='family_sessions')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='family_sessions')
    session_date = models.DateField()
    topic = models.CharField(max_length=180)
    activities = models.TextField()
    action_items = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    feedback = models.TextField(blank=True)

    class Meta:
        ordering = ['-session_date']

    def __str__(self):
        return f'Ação Psicoeducativa - {self.patient.full_name} ({self.session_date})'


class AuditLog(TimeStampedModel):
    professional = models.ForeignKey(Professional, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=180)
    entity = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} on {self.entity}#{self.entity_id}'
