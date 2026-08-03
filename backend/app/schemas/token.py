from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    requires_verification: bool = False


class TokenPayload(BaseModel):
    sub: str | None = None
