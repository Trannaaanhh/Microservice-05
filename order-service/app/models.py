from django.db import models


class Order(models.Model):
    customer_id = models.IntegerField()
    status = models.CharField(max_length=50, default='PENDING')
    saga_state = models.CharField(max_length=50, default='PENDING')
    fail_reason = models.TextField(blank=True, default='')
