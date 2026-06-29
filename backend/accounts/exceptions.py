from rest_framework.response import Response
from rest_framework.views import exception_handler

from .utils.db import ERP_UNAVAILABLE_MSG, ErpConnectionError


def drf_exception_handler(exc, context):
    if isinstance(exc, ErpConnectionError):
        return Response(
            {"error": str(exc) or ERP_UNAVAILABLE_MSG, "code": "erp_unavailable"},
            status=503,
        )
    return exception_handler(exc, context)
