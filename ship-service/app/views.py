from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Shipment
from .serializers import ShipmentSerializer


class ShipmentListCreate(APIView):
    def get(self, request):
        shipments = Shipment.objects.all()
        return Response(ShipmentSerializer(shipments, many=True).data)

    def post(self, request):
        serializer = ShipmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ShipmentDetail(APIView):
    def _get_shipment(self, pk):
        try:
            return Shipment.objects.get(pk=pk)
        except Shipment.DoesNotExist:
            return None

    def get(self, request, pk):
        shipment = self._get_shipment(pk)
        if not shipment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShipmentSerializer(shipment).data)

    def put(self, request, pk):
        shipment = self._get_shipment(pk)
        if not shipment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ShipmentSerializer(shipment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        shipment = self._get_shipment(pk)
        if not shipment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        shipment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "ship-service"})


class MetricsView(APIView):
    def get(self, request):
        return Response(
            {
                "service": "ship-service",
                "shipments_total": Shipment.objects.count(),
                "shipments_reserved": Shipment.objects.filter(status='RESERVED').count(),
                "shipments_released": Shipment.objects.filter(status='RELEASED').count(),
            }
        )
