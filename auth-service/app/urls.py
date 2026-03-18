from django.urls import path
from .views import HealthView, MetricsView, TokenView, VerifyTokenView

urlpatterns = [
    path('auth/token/', TokenView.as_view()),
    path('auth/verify/', VerifyTokenView.as_view()),
    path('health/', HealthView.as_view()),
    path('metrics/', MetricsView.as_view()),
]
