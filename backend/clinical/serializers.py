from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from . import models
from .constants import DIAGNOSTIC_QUESTIONS, DIAGNOSTIC_RECOMMENDATIONS


Professional = get_user_model()


class ProfessionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professional
        fields = (
            'id',
            'email',
            'full_name',
            'crp',
            'profession',
            'institution',
            'accepts_notifications',
            'password',
        )
        read_only_fields = ('id',)
        extra_kwargs = {'password': {'write_only': True, 'min_length': 10, 'required': False}}

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Professional(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': _('Senha é obrigatória.')})
        return super().validate(attrs)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    school_history_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = models.Patient
        fields = (
            'id',
            'full_name',
            'birth_date',
            'sex',
            'contact_email',
            'contact_phone',
            'emergency_contact',
            'address',
            'school_history',
            'school_history_file',
            'behavior_history',
            'family_history',
            'initial_diagnosis',
            'comorbidities',
            'notes',
            'active',
            'created_at',
            'updated_at',
            'age',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'age')

    def get_age(self, obj):
        if not obj.birth_date:
            return None
        delta = date.today() - obj.birth_date
        return int(delta.days / 365.25)


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Assessment
        fields = (
            'id',
            'scale',
            'application_date',
            'score_total',
            'responses',
            'interpretation',
            'comparison_notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        scale = attrs.get('scale')
        responses = attrs.get('responses', {})
        if scale == models.Assessment.ScaleType.MCHAT and responses and len(responses) != len(DIAGNOSTIC_QUESTIONS):
            raise serializers.ValidationError(_('M-CHAT exige %(total)d respostas.') % {'total': len(DIAGNOSTIC_QUESTIONS)})
        return attrs


class DiagnosticAssessmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=models.Patient.objects.all())
    pdf_url = serializers.SerializerMethodField(read_only=True)
    recommendations = serializers.SerializerMethodField(read_only=True)
    functional_level_display = serializers.SerializerMethodField(read_only=True)
    professional = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = models.DiagnosticAssessment
        fields = (
            'id',
            'patient',
            'professional',
            'responses',
            'score_total',
            'functional_level',
            'functional_level_display',
            'recommendations',
            'created_at',
            'pdf_url',
        )
        read_only_fields = (
            'id',
            'score_total',
            'functional_level',
            'functional_level_display',
            'recommendations',
            'created_at',
            'pdf_url',
        )

    YES_VALUES = {'yes', 'sim', 'y', 's', 'true', '1'}
    NO_VALUES = {'no', 'nao', 'não', 'n', 'false', '0'}

    def _normalize_answer(self, answer):
        if isinstance(answer, bool):
            return 'yes' if answer else 'no'
        if isinstance(answer, (int, float)):
            if int(answer) == 1:
                return 'yes'
            if int(answer) == 0:
                return 'no'
        if isinstance(answer, str):
            normalized = answer.strip().lower()
            if normalized in self.YES_VALUES:
                return 'yes'
            if normalized in self.NO_VALUES:
                return 'no'
        raise serializers.ValidationError(_('Resposta inválida. Utilize valores equivalentes a Sim ou Não.'))

    def validate_responses(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(_('As respostas devem ser uma lista.'))
        question_map = {item['id']: item for item in DIAGNOSTIC_QUESTIONS}
        expected_ids = set(question_map.keys())
        provided_ids = {item.get('question_id') for item in value if item.get('question_id')}
        if expected_ids != provided_ids:
            missing = expected_ids - provided_ids
            extra = provided_ids - expected_ids
            message_parts = []
            if missing:
                message_parts.append(_('Questões ausentes: %(ids)s') % {'ids': ', '.join(sorted(missing))})
            if extra:
                message_parts.append(_('Questões inválidas: %(ids)s') % {'ids': ', '.join(sorted(extra))})
            raise serializers.ValidationError(' '.join(message_parts))
        for item in value:
            question_id = item.get('question_id')
            try:
                self._normalize_answer(item.get('score'))
            except serializers.ValidationError as error:
                error_detail = error.detail
                if isinstance(error_detail, (list, tuple)):
                    error_text = ' '.join(str(part) for part in error_detail)
                else:
                    error_text = str(error_detail)
                raise serializers.ValidationError(
                    _('Resposta inválida para a questão %(id)s: %(erro)s') % {'id': question_id, 'erro': error_text}
                )
        return value

    def validate_patient(self, value):
        request = self.context.get('request')
        if request and value.professional != request.user:
            raise serializers.ValidationError(_('O paciente selecionado não pertence à profissional autenticada.'))
        return value

    def create(self, validated_data):
        raw_responses = validated_data.pop('responses', [])
        question_map = {item['id']: item for item in DIAGNOSTIC_QUESTIONS}
        structured_responses = []
        total_failures = 0
        critical_failures = 0
        for entry in raw_responses:
            question_id = entry['question_id']
            observation = entry.get('observation', '')
            question_info = question_map[question_id]
            normalized_answer = self._normalize_answer(entry.get('score'))
            answer_label = 'Sim' if normalized_answer == 'yes' else 'Não'
            score_value = 1 if normalized_answer == 'yes' else 0
            risk_answer = question_info.get('risk_answer', 'no')
            failed = normalized_answer == risk_answer
            is_critical = question_info.get('critical', False)
            if failed:
                total_failures += 1
                if is_critical:
                    critical_failures += 1
            structured_responses.append(
                {
                    'question_id': question_id,
                    'question': question_info['text'],
                    'axis': question_info['axis'],
                    'score': score_value,
                    'answer': normalized_answer,
                    'answer_label': answer_label,
                    'failed': failed,
                    'critical': is_critical,
                    'observation': observation,
                }
            )
        if total_failures >= 8:
            level = models.DiagnosticAssessment.FunctionalLevel.SEVERE
        elif total_failures >= 3 or critical_failures >= 2:
            level = models.DiagnosticAssessment.FunctionalLevel.MODERATE
        else:
            level = models.DiagnosticAssessment.FunctionalLevel.MILD

        assessment = models.DiagnosticAssessment.objects.create(
            responses=structured_responses,
            score_total=total_failures,
            functional_level=level,
            **validated_data,
        )
        return assessment

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        responses = instance.responses or []
        question_map = {item['id']: item for item in DIAGNOSTIC_QUESTIONS}

        standardized_responses = []
        for response in responses:
            question_id = response.get('question_id')
            question_info = question_map.get(question_id, {})
            raw_answer = response.get('answer', response.get('answer_label', response.get('score')))
            try:
                normalized_answer = self._normalize_answer(raw_answer)
            except serializers.ValidationError:
                normalized_answer = 'yes' if response.get('score') == 1 else 'no'
            answer_label = response.get('answer_label') or ('Sim' if normalized_answer == 'yes' else 'Não')
            risk_answer = question_info.get('risk_answer', 'no')
            failed = response.get('failed')
            if failed is None:
                failed = normalized_answer == risk_answer
            standardized_responses.append(
                {
                    **response,
                    'answer': normalized_answer,
                    'answer_label': answer_label,
                    'failed': bool(failed),
                    'critical': bool(response.get('critical') or question_info.get('critical', False)),
                }
            )

        responses = standardized_responses
        critical_failed = sum(1 for response in responses if response['failed'] and response['critical'])

        total_failed = instance.score_total or 0
        representation['responses'] = responses
        representation['score_total'] = int(total_failed)
        representation['score_average'] = float(total_failed)
        representation['total_failed'] = int(total_failed)
        representation['critical_failed'] = int(critical_failed)
        representation['positive_screen'] = total_failed >= 3 or critical_failed >= 2
        representation['high_risk'] = total_failed >= 8
        representation['patient'] = {
            'id': instance.patient_id,
            'name': instance.patient.full_name,
        }
        representation['professional'] = {
            'id': instance.professional_id,
            'name': instance.professional.full_name,
            'crp': instance.professional.crp,
            'institution': instance.professional.institution,
        }
        return representation

    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return request.build_absolute_uri(
            reverse('diagnostic-assessment-pdf', kwargs={'pk': obj.pk})
        )

    def get_recommendations(self, obj):
        return DIAGNOSTIC_RECOMMENDATIONS.get(obj.functional_level)

    def get_functional_level_display(self, obj):
        return obj.get_functional_level_display()


class TherapeuticPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TherapeuticPlan
        fields = (
            'id',
            'general_objectives',
            'specific_objectives',
            'strategies',
            'start_date',
            'next_review_date',
            'monitoring_indicators',
            'pdf_storage_path',
            'review_reminder_sent_for',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'pdf_storage_path', 'review_reminder_sent_for')


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Session
        fields = (
            'id',
            'session_type',
            'session_date',
            'duration_minutes',
            'activities',
            'behaviour_observations',
            'progress_notes',
            'progress_scales',
            'attachments',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)

    class Meta:
        model = models.Report
        fields = (
            'id',
            'report_type',
            'report_type_display',
            'generated_at',
            'summary',
            'content',
            'exported_pdf_path',
        )
        read_only_fields = ('id', 'generated_at', 'exported_pdf_path', 'report_type_display')


class SatisfactionSurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SatisfactionSurvey
        fields = (
            'id',
            'responses',
            'engagement_index',
            'conducted_at',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class FamilySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.FamilySession
        fields = (
            'id',
            'session_date',
            'topic',
            'activities',
            'action_items',
            'follow_up_date',
            'feedback',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PatientDetailSerializer(serializers.ModelSerializer):
    assessments = AssessmentSerializer(many=True, read_only=True)
    therapeutic_plan = TherapeuticPlanSerializer(read_only=True)
    sessions = SessionSerializer(many=True, read_only=True)
    reports = ReportSerializer(many=True, read_only=True)
    surveys = SatisfactionSurveySerializer(many=True, read_only=True)
    family_sessions = FamilySessionSerializer(many=True, read_only=True)
    school_history_file = serializers.FileField(read_only=True)

    class Meta:
        model = models.Patient
        fields = (
            'id',
            'full_name',
            'birth_date',
            'sex',
            'contact_email',
            'contact_phone',
            'emergency_contact',
            'address',
            'school_history',
            'school_history_file',
            'behavior_history',
            'family_history',
            'initial_diagnosis',
            'comorbidities',
            'notes',
            'active',
            'created_at',
            'updated_at',
            'assessments',
            'therapeutic_plan',
            'sessions',
            'reports',
            'surveys',
            'family_sessions',
        )
        read_only_fields = (
            'id',
            'created_at',
            'updated_at',
            'school_history_file',
            'assessments',
            'therapeutic_plan',
            'sessions',
            'reports',
            'surveys',
            'family_sessions',
        )


class DashboardIndicatorSerializer(serializers.Serializer):
    total_active_patients = serializers.IntegerField()
    scales_applied_this_month = serializers.IntegerField()
    average_progress = serializers.FloatField()
    pending_revaluations = serializers.IntegerField()
    therapeutic_adherence_rate = serializers.FloatField()
    last_update = serializers.DateTimeField()
    progress_series = serializers.ListField(child=serializers.DictField(), default=list)
