from django.urls import path
from .views import get_recommendation, rebuild_recommendation_model

urlpatterns = [
    path('recommendations/<int:customer_id>/', get_recommendation),
    path('rebuild/', rebuild_recommendation_model),
]
