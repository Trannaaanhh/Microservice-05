from django.urls import path
from .views import HealthView, MetricsView, OrderDetail, OrderListCreate

urlpatterns = [
    path('orders/', OrderListCreate.as_view()),
    path('orders/<int:pk>/', OrderDetail.as_view()),
    path('health/', HealthView.as_view()),
    path('metrics/', MetricsView.as_view()),
]
