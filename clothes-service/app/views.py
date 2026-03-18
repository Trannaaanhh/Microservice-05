from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Cloth
from .serializers import ClothSerializer


class ClothListCreate(APIView):
    def get(self, request):
        cloths = Cloth.objects.all().order_by('id')

        search_query = request.GET.get('q', '').strip().lower()
        size_filter = request.GET.get('size', '').strip().lower()
        color_filter = request.GET.get('color', '').strip().lower()
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')

        if search_query:
            cloths = [
                cloth
                for cloth in cloths
                if search_query in cloth.name.lower() or search_query in cloth.brand.lower()
            ]

        if size_filter:
            cloths = [cloth for cloth in cloths if (cloth.size or '').lower() == size_filter]

        if color_filter:
            cloths = [cloth for cloth in cloths if color_filter in (cloth.color or '').lower()]

        if min_price not in [None, '']:
            try:
                min_price_value = float(min_price)
                cloths = [cloth for cloth in cloths if float(cloth.price) >= min_price_value]
            except ValueError:
                return Response({'min_price': 'Must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

        if max_price not in [None, '']:
            try:
                max_price_value = float(max_price)
                cloths = [cloth for cloth in cloths if float(cloth.price) <= max_price_value]
            except ValueError:
                return Response({'max_price': 'Must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ClothSerializer(cloths, many=True).data)

    def post(self, request):
        serializer = ClothSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ClothRetrieve(APIView):
    def get(self, request, pk):
        try:
            cloth = Cloth.objects.get(pk=pk)
        except Cloth.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClothSerializer(cloth).data)

    def put(self, request, pk):
        try:
            cloth = Cloth.objects.get(pk=pk)
        except Cloth.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClothSerializer(cloth, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            cloth = Cloth.objects.get(pk=pk)
        except Cloth.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        cloth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
