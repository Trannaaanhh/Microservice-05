import os
import time

import jwt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

JWT_SECRET = os.getenv('JWT_SECRET', 'dev-jwt-secret')
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_SECONDS = int(os.getenv('JWT_ACCESS_TOKEN_SECONDS', '3600'))

REQUEST_COUNTER = 0
TOKEN_ISSUED_COUNTER = 0


class TokenView(APIView):
    def post(self, request):
        global REQUEST_COUNTER, TOKEN_ISSUED_COUNTER
        REQUEST_COUNTER += 1

        username = str(request.data.get('username', '')).strip()
        role = str(request.data.get('role', 'customer')).strip().lower()

        if not username:
            return Response({'detail': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)
        if role not in {'customer', 'staff'}:
            return Response({'detail': 'role must be customer or staff'}, status=status.HTTP_400_BAD_REQUEST)

        now = int(time.time())
        payload = {
            'sub': username,
            'role': role,
            'iat': now,
            'exp': now + ACCESS_TOKEN_SECONDS,
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        TOKEN_ISSUED_COUNTER += 1

        return Response(
            {
                'access_token': token,
                'token_type': 'Bearer',
                'expires_in': ACCESS_TOKEN_SECONDS,
                'role': role,
            },
            status=status.HTTP_200_OK,
        )


class VerifyTokenView(APIView):
    def post(self, request):
        global REQUEST_COUNTER
        REQUEST_COUNTER += 1

        token = request.data.get('token')
        if not token:
            return Response({'detail': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return Response({'valid': True, 'claims': claims}, status=status.HTTP_200_OK)
        except jwt.ExpiredSignatureError:
            return Response({'valid': False, 'detail': 'token expired'}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({'valid': False, 'detail': 'invalid token'}, status=status.HTTP_401_UNAUTHORIZED)


class HealthView(APIView):
    def get(self, request):
        global REQUEST_COUNTER
        REQUEST_COUNTER += 1
        return Response({'status': 'ok', 'service': 'auth-service'}, status=status.HTTP_200_OK)


class MetricsView(APIView):
    def get(self, request):
        global REQUEST_COUNTER
        REQUEST_COUNTER += 1
        return Response(
            {
                'service': 'auth-service',
                'requests_total': REQUEST_COUNTER,
                'tokens_issued_total': TOKEN_ISSUED_COUNTER,
            },
            status=status.HTTP_200_OK,
        )
