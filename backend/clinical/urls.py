from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views


router = DefaultRouter()
router.register('patients', views.PatientViewSet, basename='patient')
router.register('assessment/diagnostic', views.DiagnosticAssessmentViewSet, basename='diagnostic-assessment')

patient_assessment_list = views.AssessmentViewSet.as_view({'get': 'list', 'post': 'create'})
patient_assessment_detail = views.AssessmentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

patient_pts_list = views.TherapeuticPlanViewSet.as_view({'get': 'list', 'post': 'create'})
patient_pts_detail = views.TherapeuticPlanViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

patient_session_list = views.SessionViewSet.as_view({'get': 'list', 'post': 'create'})
patient_session_detail = views.SessionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

patient_report_list = views.ReportViewSet.as_view({'get': 'list', 'post': 'create'})
patient_report_detail = views.ReportViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

patient_survey_list = views.SatisfactionSurveyViewSet.as_view({'get': 'list', 'post': 'create'})
patient_survey_detail = views.SatisfactionSurveyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

patient_family_list = views.FamilySessionViewSet.as_view({'get': 'list', 'post': 'create'})
patient_family_detail = views.FamilySessionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})


urlpatterns = [
    path('auth/register/', views.ProfessionalRegistrationView.as_view(), name='auth-register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.ProfessionalProfileView.as_view(), name='auth-profile'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
    path('patients/<int:patient_pk>/assessments/', patient_assessment_list, name='patient-assessment-list'),
    path('patients/<int:patient_pk>/assessments/<int:pk>/', patient_assessment_detail, name='patient-assessment-detail'),
    path('patients/<int:patient_pk>/pts/', patient_pts_list, name='patient-pts-list'),
    path('patients/<int:patient_pk>/pts/<int:pk>/', patient_pts_detail, name='patient-pts-detail'),
    path('patients/<int:patient_pk>/sessions/', patient_session_list, name='patient-session-list'),
    path('patients/<int:patient_pk>/sessions/<int:pk>/', patient_session_detail, name='patient-session-detail'),
    path('patients/<int:patient_pk>/reports/', patient_report_list, name='patient-report-list'),
    path('patients/<int:patient_pk>/reports/<int:pk>/', patient_report_detail, name='patient-report-detail'),
    path('patients/<int:patient_pk>/surveys/', patient_survey_list, name='patient-survey-list'),
    path('patients/<int:patient_pk>/surveys/<int:pk>/', patient_survey_detail, name='patient-survey-detail'),
    path('patients/<int:patient_pk>/family-sessions/', patient_family_list, name='patient-family-list'),
    path('patients/<int:patient_pk>/family-sessions/<int:pk>/', patient_family_detail, name='patient-family-detail'),
]
