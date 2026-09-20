from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exceptions import RequestValidationError


class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: Optional[Dict[str, str]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message
        self.fields = fields


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    error_content: Dict[str, Any] = {
        "code": exc.code,
        "message": exc.message,
    }
    if exc.fields:
        error_content["fields"] = exc.fields
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_content},
        headers=exc.headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    fields: Dict[str, str] = {}
    for err in exc.errors():
        loc = err.get("loc", [])
        field_name = str(loc[-1]) if loc else "non_field_errors"
        fields[field_name] = err.get("msg", "Invalid value")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "validation_error",
                "message": "Validation failed for input fields",
                "fields": fields,
            }
        },
    )
