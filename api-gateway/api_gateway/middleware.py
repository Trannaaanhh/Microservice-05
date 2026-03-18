import json
import logging
import os
import time
from collections import defaultdict

import jwt
from django.http import JsonResponse
from django.shortcuts import redirect

from .auth import decode_access_token
from .metrics import record_request

LOGGER = logging.getLogger('api_gateway')
RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '120'))
_EXEMPT_PATH_PREFIXES = ('/login', '/logout', '/admin/', '/health/', '/metrics/', '/static/')
_RATE_BUCKETS = defaultdict(list)


def _is_exempt_path(path):
    return any(path.startswith(prefix) for prefix in _EXEMPT_PATH_PREFIXES)


def _unauthorized(request, detail):
    wants_json = 'application/json' in request.META.get('HTTP_ACCEPT', '')
    if wants_json or request.path.startswith('/api/'):
        return JsonResponse({'detail': detail}, status=401)
    return redirect('login')


class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if _is_exempt_path(request.path):
            response = self.get_response(request)
            return response

        header = request.META.get('HTTP_AUTHORIZATION', '')
        token = None
        if header.startswith('Bearer '):
            token = header[7:].strip()
        elif request.session.get('access_token'):
            token = request.session.get('access_token')

        if not token:
            response = _unauthorized(request, 'Missing access token')
            return response

        try:
            claims = decode_access_token(token)
            request.jwt_claims = claims
            request.jwt_role = claims.get('role', 'customer')
        except jwt.ExpiredSignatureError:
            request.session.pop('access_token', None)
            response = _unauthorized(request, 'Token expired')
            return response
        except jwt.InvalidTokenError:
            request.session.pop('access_token', None)
            response = _unauthorized(request, 'Invalid token')
            return response

        response = self.get_response(request)
        return response


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if _is_exempt_path(request.path):
            return self.get_response(request)

        now = time.time()
        key = request.META.get('REMOTE_ADDR', 'unknown')
        window_start = now - 60
        bucket = _RATE_BUCKETS[key]
        bucket[:] = [ts for ts in bucket if ts >= window_start]

        if len(bucket) >= RATE_LIMIT_PER_MINUTE:
            return JsonResponse({'detail': 'Rate limit exceeded'}, status=429)

        bucket.append(now)
        return self.get_response(request)


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.time()
        response = self.get_response(request)
        elapsed_ms = int((time.time() - started_at) * 1000)

        payload = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': elapsed_ms,
            'remote_addr': request.META.get('REMOTE_ADDR', ''),
        }
        LOGGER.info(json.dumps(payload))
        record_request(response.status_code)
        return response
