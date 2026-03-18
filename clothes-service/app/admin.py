from django.contrib import admin
from .models import Cloth


@admin.register(Cloth)
class ClothAdmin(admin.ModelAdmin):
	list_display = ('id', 'name', 'brand', 'size', 'color', 'price', 'stock', 'is_active')
	search_fields = ('name', 'brand', 'category', 'color', 'material')

