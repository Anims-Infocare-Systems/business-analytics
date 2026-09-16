"""
Quality Timeline / End-to-End Traceability Views.

Endpoints:
  GET /api/quality-timeline/invoices/
  GET /api/quality-timeline/invoices/search/?q=<query>
  GET /api/quality-timeline/<invoice_no>/
  GET /api/quality-timeline/<invoice_no>/stage/<stage_no>/
"""

import logging
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .views import get_tenant_connection
from .services_qualitytimeline import (
    get_invoice_list,
    search_invoices,
    get_invoice_details,
    get_dc_details,
    get_inspection_details,
    get_production_details,
    get_grn_details,
    get_supplier_details,
    build_quality_timeline,
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def quality_timeline_invoices_view(request):
    """
    Returns recent invoices with customer name, parts count, and total value
    for the Quality Timeline invoice selector.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Tenant connection error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to connect to tenant database"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        limit_param = request.GET.get('limit', '50').strip()
        limit = int(limit_param) if limit_param.isdigit() else 50
        limit = max(1, min(limit, 200))

        invoices = get_invoice_list(conn, limit=limit)
        return Response({
            "success": True,
            "message": "Invoices retrieved successfully",
            "count": len(invoices),
            "data": invoices
        }, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Invoices list error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to load invoices list"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def quality_timeline_search_view(request):
    """
    Search invoices across:
    Invoice No, Part No, Customer, DC No, Route Card No, GRN No, Supplier.
    """
    query = request.GET.get('q', '').strip()
    if not query:
        return Response({
            "success": True,
            "message": "Empty search query",
            "count": 0,
            "data": []
        }, status=status.HTTP_200_OK)

    try:
        conn, tenant = get_tenant_connection(request)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Tenant connection error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to connect to tenant database"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        limit_param = request.GET.get('limit', '50').strip()
        limit = int(limit_param) if limit_param.isdigit() else 50
        limit = max(1, min(limit, 200))

        results = search_invoices(conn, query, limit=limit)
        return Response({
            "success": True,
            "message": f"Found {len(results)} matching invoices",
            "count": len(results),
            "data": results
        }, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Invoice search error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to execute invoice search"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def quality_timeline_detail_view(request, invoice_no: str):
    """
    Main End-to-End Quality Traceability Timeline API.
    Returns complete 6-stage lineage:
      Stage 1: Customer Invoice
      Stage 2: Delivery Challan
      Stage 3: Final / Intermediate Inspection
      Stage 4: Production / Job Order
      Stage 5: GRN Tracking
      Stage 6: Supplier / Mill Details
    """
    clean_invno = (invoice_no or "").strip()
    if not clean_invno:
        return Response(
            {"success": False, "message": "Invoice number is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        conn, tenant = get_tenant_connection(request)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Tenant connection error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to connect to tenant database"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        timeline_data = build_quality_timeline(conn, clean_invno)
        if not timeline_data:
            return Response({
                "success": False,
                "message": "Invoice not found",
                "invoice_no": clean_invno
            }, status=status.HTTP_404_NOT_FOUND)

        # Structure matches requirements in Sections 6 and 23 of prompt
        response_payload = {
            "success": True,
            "message": "Quality timeline loaded successfully",
            "invoice": timeline_data["invoice"],
            "parts": timeline_data["parts"],
            "stages": timeline_data["stages"],
            "data": timeline_data
        }
        return Response(response_payload, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Timeline build error for {clean_invno}: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to load quality timeline"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def quality_timeline_stage_view(request, invoice_no: str, stage_no: int):
    """
    Detailed Modal / Page data for an individual stage (1 to 6).
    """
    clean_invno = (invoice_no or "").strip()
    if not clean_invno:
        return Response(
            {"success": False, "message": "Invoice number is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if stage_no not in [1, 2, 3, 4, 5, 6]:
        return Response(
            {"success": False, "message": f"Invalid stage number: {stage_no}. Must be between 1 and 6."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        conn, tenant = get_tenant_connection(request)
    except Exception as exc:
        logger.error(f"[Quality Timeline] Tenant connection error: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": "Unable to connect to tenant database"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        # STAGE 1: Invoice details
        if stage_no == 1:
            stage_data = get_invoice_details(conn, clean_invno)
            if not stage_data:
                return Response({
                    "success": False,
                    "message": "Invoice not found",
                    "invoice_no": clean_invno
                }, status=status.HTTP_404_NOT_FOUND)

            return Response({
                "success": True,
                "message": "Stage 1 invoice details retrieved",
                "stage_no": 1,
                "data": stage_data,
                **stage_data
            }, status=status.HTTP_200_OK)

        # STAGE 2: DC details
        dc_data = get_dc_details(conn, clean_invno)
        all_rcs = dc_data.get("all_route_cards", [])

        if stage_no == 2:
            return Response({
                "success": True,
                "message": "Stage 2 delivery challan details retrieved",
                "stage_no": 2,
                "data": dc_data,
                **dc_data
            }, status=status.HTTP_200_OK)

        # STAGE 3: Inspection details
        if stage_no == 3:
            insp_data = get_inspection_details(conn, all_rcs)
            return Response({
                "success": True,
                "message": "Stage 3 inspection details retrieved",
                "stage_no": 3,
                "data": insp_data,
                **insp_data
            }, status=status.HTTP_200_OK)

        # STAGE 4: Production details
        if stage_no == 4:
            prod_data = get_production_details(conn, all_rcs)
            return Response({
                "success": True,
                "message": "Stage 4 production details retrieved",
                "stage_no": 4,
                "data": prod_data,
                **prod_data
            }, status=status.HTTP_200_OK)

        # STAGE 5: GRN Tracking
        grn_data = get_grn_details(conn, all_rcs)
        all_grn_numbers = grn_data.get("all_grn_numbers", [])

        if stage_no == 5:
            return Response({
                "success": True,
                "message": "Stage 5 GRN tracking details retrieved",
                "stage_no": 5,
                "data": grn_data,
                **grn_data
            }, status=status.HTTP_200_OK)

        # STAGE 6: Supplier & PO
        if stage_no == 6:
            sup_data = get_supplier_details(conn, all_grn_numbers)
            return Response({
                "success": True,
                "message": "Stage 6 supplier details retrieved",
                "stage_no": 6,
                "data": sup_data,
                **sup_data
            }, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.error(f"[Quality Timeline] Stage {stage_no} load error for {clean_invno}: {exc}", exc_info=True)
        return Response(
            {"success": False, "message": f"Unable to load details for stage {stage_no}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass
