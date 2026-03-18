from django.urls import path
from .views import HealthView, MetricsView, ShipmentListCreate

urlpatterns = [
    path('shipments/', ShipmentListCreate.as_view()),
    path('health/', HealthView.as_view()),
    path('metrics/', MetricsView.as_view()),
]
