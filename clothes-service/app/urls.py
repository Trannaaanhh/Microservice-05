from django.urls import path
from .views import ClothListCreate, ClothRetrieve

urlpatterns = [
    path('clothes/', ClothListCreate.as_view()),
    path('clothes/<int:pk>/', ClothRetrieve.as_view()),
]


