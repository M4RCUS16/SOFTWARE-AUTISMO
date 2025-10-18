from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from . import models


@admin.register(models.Professional)
class ProfessionalAdmin(UserAdmin):
    model = models.Professional
    list_display = ('email', 'full_name', 'profession', 'is_active')
    list_filter = ('profession', 'is_active', 'is_staff')
    ordering = ('email',)
    search_fields = ('email', 'full_name', 'crp', 'institution')
    fieldsets = UserAdmin.fieldsets + (
        (
            'Informações Profissionais',
            {'fields': ('full_name', 'crp', 'profession', 'institution', 'accepts_notifications')},
        ),
    )


@admin.register(models.Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'professional', 'birth_date', 'active')
    search_fields = ('full_name', 'professional__full_name')
    list_filter = ('active', 'sex')


@admin.register(models.Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'scale', 'application_date', 'score_total')
    list_filter = ('scale', 'application_date')
    search_fields = ('patient__full_name',)


@admin.register(models.DiagnosticAssessment)
class DiagnosticAssessmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'functional_level', 'score_total', 'created_at')
    list_filter = ('functional_level', 'created_at')
    search_fields = ('patient__full_name', 'professional__full_name')


@admin.register(models.TherapeuticPlan)
class TherapeuticPlanAdmin(admin.ModelAdmin):
    list_display = ('patient', 'start_date', 'next_review_date')
    search_fields = ('patient__full_name',)


@admin.register(models.Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('patient', 'session_type', 'session_date', 'duration_minutes')
    list_filter = ('session_type', 'session_date')
    search_fields = ('patient__full_name',)


@admin.register(models.Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('patient', 'report_type', 'generated_at')
    list_filter = ('report_type', 'generated_at')
    search_fields = ('patient__full_name',)


@admin.register(models.SatisfactionSurvey)
class SatisfactionSurveyAdmin(admin.ModelAdmin):
    list_display = ('patient', 'conducted_at', 'engagement_index')
    list_filter = ('conducted_at',)
    search_fields = ('patient__full_name',)


@admin.register(models.FamilySession)
class FamilySessionAdmin(admin.ModelAdmin):
    list_display = ('patient', 'session_date', 'topic', 'follow_up_date')
    search_fields = ('patient__full_name', 'topic')


@admin.register(models.AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'entity', 'entity_id', 'created_at')
    search_fields = ('action', 'entity', 'entity_id')


admin.site.site_header = 'TEA Care • Painel Administrativo'
admin.site.site_title = 'NeuroAtlas TEA Admin'
admin.site.index_title = 'Gestão Clínica e Psicopedagógica'
