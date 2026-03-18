import os

import jwt

JWT_SECRET = os.getenv('JWT_SECRET', 'dev-jwt-secret')
JWT_ALGORITHM = 'HS256'


def decode_access_token(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
