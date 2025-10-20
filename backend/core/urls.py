"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Painel administrativo
    path('admin/', admin.site.urls),

    # Documentação da API
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # Endpoints da API principal
    path('api/', include('clinical.urls')),

    # 🔹 Catch-all: qualquer rota não capturada acima serve o React
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
