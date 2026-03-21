from django.urls import path
from .views import HealthView, MetricsView, ShipmentDetail, ShipmentListCreate

urlpatterns = [
    path('shipments/', ShipmentListCreate.as_view()),
    path('shipments/<int:pk>/', ShipmentDetail.as_view()),
    path('health/', HealthView.as_view()),
    path('metrics/', MetricsView.as_view()),
]
