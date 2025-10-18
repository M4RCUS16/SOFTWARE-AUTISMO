from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from . import models, permissions as clinical_permissions, serializers, services
from .constants import DIAGNOSTIC_AXES

Professional = get_user_model()


def log_audit(professional, action, entity, entity_id, metadata=None, request=None):
    models.AuditLog.objects.create(
        professional=professional,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        metadata=metadata or {},
        ip_address=getattr(request, 'META', {}).get('REMOTE_ADDR') if request else None,
        user_agent=getattr(request, 'META', {}).get('HTTP_USER_AGENT', '') if request else '',
    )


class ProfessionalRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = serializers.ProfessionalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        professional = serializer.save()
        return Response(serializers.ProfessionalSerializer(professional).data, status=status.HTTP_201_CREATED)


class ProfessionalProfileView(APIView):
    def get(self, request, *args, **kwargs):
        serializer = serializers.ProfessionalSerializer(request.user)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        serializer = serializers.ProfessionalSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.PatientSerializer
    permission_classes = [clinical_permissions.IsOwnerProfessional]
    parser_classes = (parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser)

    def get_queryset(self):
        return models.Patient.objects.filter(professional=self.request.user)

    def perform_create(self, serializer):
        patient = serializer.save(professional=self.request.user)
        log_audit(self.request.user, 'create', 'Patient', patient.pk, metadata={'name': patient.full_name}, request=self.request)

    def perform_update(self, serializer):
        patient = serializer.save()
        log_audit(self.request.user, 'update', 'Patient', patient.pk, metadata={'name': patient.full_name}, request=self.request)

    def perform_destroy(self, instance):
        log_audit(self.request.user, 'archive', 'Patient', instance.pk, metadata={'name': instance.full_name}, request=self.request)
        instance.active = False
        instance.save()

    def retrieve(self, request, *args, **kwargs):
        patient = self.get_object()
        serializer = serializers.PatientDetailSerializer(patient)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        patient = self.get_object()
        data = {
            'assessments': serializers.AssessmentSerializer(patient.assessments.all(), many=True).data,
            'sessions': serializers.SessionSerializer(patient.sessions.all(), many=True).data,
            'reports': serializers.ReportSerializer(patient.reports.all(), many=True).data,
        }
        return Response(data)


class PatientChildBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [clinical_permissions.IsOwnerProfessional]
    patient_lookup_url_kwarg = 'patient_pk'

    def get_patient(self):
        return get_object_or_404(models.Patient, pk=self.kwargs[self.patient_lookup_url_kwarg], professional=self.request.user)

    def perform_create(self, serializer):
        patient = self.get_patient()
        instance = serializer.save(patient=patient, professional=self.request.user)
        log_audit(self.request.user, 'create', self.model.__name__, instance.pk, metadata={'patient': patient.full_name}, request=self.request)
        return instance

    def get_queryset(self):
        patient = self.get_patient()
        return self.model.objects.filter(patient=patient, professional=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit(self.request.user, 'update', self.model.__name__, instance.pk, metadata={'patient': instance.patient.full_name}, request=self.request)
        return instance

    def perform_destroy(self, instance):
        log_audit(self.request.user, 'delete', self.model.__name__, instance.pk, metadata={'patient': instance.patient.full_name}, request=self.request)
        instance.delete()


class AssessmentViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.AssessmentSerializer
    model = models.Assessment


class TherapeuticPlanViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.TherapeuticPlanSerializer
    model = models.TherapeuticPlan

    def get_queryset(self):
        patient = self.get_patient()
        return self.model.objects.filter(patient=patient, professional=self.request.user)


class SessionViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.SessionSerializer
    model = models.Session


class ReportViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.ReportSerializer
    model = models.Report

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, patient_pk=None, pk=None):
        report = self.get_object()
        buffer = services.generate_report_pdf(report)
        filename = f"relatorio-{report.report_type}-{report.generated_at:%Y%m%d}.pdf"
        log_audit(request.user, 'export', 'Report', report.pk, metadata={'patient': report.patient.full_name}, request=request)
        return FileResponse(buffer, as_attachment=True, filename=filename)


class SatisfactionSurveyViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.SatisfactionSurveySerializer
    model = models.SatisfactionSurvey


class FamilySessionViewSet(PatientChildBaseViewSet):
    serializer_class = serializers.FamilySessionSerializer
    model = models.FamilySession


class DiagnosticAssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.DiagnosticAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return models.DiagnosticAssessment.objects.filter(professional=self.request.user)

    def perform_create(self, serializer):
        assessment = serializer.save()
        log_audit(
            self.request.user,
            'create',
            'DiagnosticAssessment',
            assessment.pk,
            metadata={'patient': assessment.patient.full_name, 'functional_level': assessment.functional_level},
            request=self.request,
        )
        return assessment

    @action(detail=False, methods=['get'], url_path='questions')
    def questions(self, request):
        return Response(DIAGNOSTIC_AXES)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        assessment = self.get_object()
        buffer = services.generate_diagnostic_pdf(assessment)
        filename = f"laudo-diagnostico-tea-{assessment.patient.full_name.replace(' ', '-').lower()}.pdf"
        return FileResponse(buffer, as_attachment=True, filename=filename)


class DashboardView(APIView):
    def get(self, request, *args, **kwargs):
        indicators = services.build_dashboard_context(request.user)
        serializer = serializers.DashboardIndicatorSerializer(indicators)
        return Response(serializer.data)
