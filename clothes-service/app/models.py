from django.db import models


class Cloth(models.Model):
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=20)
    color = models.CharField(max_length=50, blank=True)
    material = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField()
    image_url = models.CharField(max_length=500, blank=True, default='')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
