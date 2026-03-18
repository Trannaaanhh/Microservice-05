from rest_framework import serializers
from .models import Cloth


class ClothSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cloth
        fields = '__all__'

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than 0.')
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return value
