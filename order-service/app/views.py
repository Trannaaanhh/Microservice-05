from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Order
from .serializers import OrderSerializer
from .event_bus import publish_event, rpc_call


class OrderListCreate(APIView):
    def get(self, request):
        orders = Order.objects.all()
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request):
        serializer = OrderSerializer(data={"customer_id": request.data.get("customer_id")})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        order = serializer.save(status='PENDING', saga_state='ORDER_PENDING')

        payment_payload = {
            "order_id": order.id,
            "customer_id": order.customer_id,
            "simulate_failure": request.data.get("simulate_failure_step") == "payment",
        }
        payment_result = rpc_call("payment.reserve", payment_payload)

        if not payment_result or not payment_result.get("ok"):
            order.status = 'FAILED'
            order.saga_state = 'PAYMENT_RESERVE_FAILED'
            order.fail_reason = (payment_result or {}).get("error", "payment reserve timeout")
            order.save()
            publish_event("order.failed", {"order_id": order.id, "step": "payment.reserve", "reason": order.fail_reason})
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

        shipping_payload = {
            "order_id": order.id,
            "customer_id": order.customer_id,
            "simulate_failure": request.data.get("simulate_failure_step") == "shipping",
        }
        shipping_result = rpc_call("shipping.reserve", shipping_payload)

        if not shipping_result or not shipping_result.get("ok"):
            rpc_call("payment.release", {"order_id": order.id, "reason": "shipping_reserve_failed"})
            order.status = 'FAILED'
            order.saga_state = 'SHIPPING_RESERVE_FAILED_COMPENSATED'
            order.fail_reason = (shipping_result or {}).get("error", "shipping reserve timeout")
            order.save()
            publish_event("order.compensated", {"order_id": order.id, "step": "shipping.reserve", "reason": order.fail_reason})
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

        order.status = 'CONFIRMED'
        order.saga_state = 'CONFIRMED'
        order.fail_reason = ''
        order.save()
        publish_event("order.confirmed", {"order_id": order.id, "customer_id": order.customer_id})
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetail(APIView):
    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(OrderSerializer(order).data)


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "order-service"})


class MetricsView(APIView):
    def get(self, request):
        return Response(
            {
                "service": "order-service",
                "orders_total": Order.objects.count(),
                "orders_confirmed": Order.objects.filter(status='CONFIRMED').count(),
                "orders_failed": Order.objects.filter(status='FAILED').count(),
            }
        )
