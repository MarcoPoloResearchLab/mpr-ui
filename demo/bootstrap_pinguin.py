"""Create or refresh the Pinguin tenant used by the local MPR UI demo."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from http.client import HTTPMessage
from typing import Any


TAUTH_LOGIN_URL = "http://tauth:8080/auth/password/login"
PINGUIN_TENANTS_URL = "http://pinguin:8081/api/tenants"
DEMO_ORIGIN = "http://localhost:4443"
DEMO_TENANT_NAME = "MPR UI Demo Delivery"
DEMO_ACCOUNT_EMAIL = "demo@mprlab.local"
DEMO_ACCOUNT_PASSWORD = "mpr-ui-demo"
SESSION_COOKIE_NAME = "app_session"
REQUEST_TIMEOUT_SECONDS = 10
STARTUP_ATTEMPTS = 30
STARTUP_RETRY_SECONDS = 1


def required_environment(name: str) -> str:
    """Return one required environment value."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"pinguin.bootstrap.environment_missing: {name}")
    return value


def json_request(
    url: str,
    method: str,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[dict[str, Any], HTTPMessage]:
    """Send one JSON request and return its decoded object and headers."""
    request_headers = {"Accept": "application/json", **(headers or {})}
    request_data: bytes | None = None
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
        request_data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=request_data, headers=request_headers, method=method)
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        response_data = response.read()
        decoded = json.loads(response_data) if response_data else {}
        if not isinstance(decoded, dict):
            raise ValueError("pinguin.bootstrap.response_invalid")
        return decoded, response.headers


def login_session_cookie() -> str:
    """Wait for TAuth and return the seeded demo account session cookie."""
    last_error: Exception | None = None
    for _attempt in range(STARTUP_ATTEMPTS):
        try:
            _payload, headers = json_request(
                TAUTH_LOGIN_URL,
                "POST",
                {"email": DEMO_ACCOUNT_EMAIL, "password": DEMO_ACCOUNT_PASSWORD},
                {"Origin": DEMO_ORIGIN},
            )
            for cookie_header in headers.get_all("Set-Cookie", []):
                cookie_value = cookie_header.split(";", 1)[0]
                if cookie_value.startswith(f"{SESSION_COOKIE_NAME}="):
                    return cookie_value
            raise ValueError("pinguin.bootstrap.session_cookie_missing")
        except (OSError, ValueError, urllib.error.HTTPError) as error:
            last_error = error
            time.sleep(STARTUP_RETRY_SECONDS)
    raise RuntimeError("pinguin.bootstrap.tauth_unavailable") from last_error


def email_profile() -> dict[str, Any]:
    """Build the real SMTP profile from the private Pinguin environment."""
    return {
        "host": required_environment("TENANT_LOCAL_SMTP_HOST"),
        "port": int(required_environment("TENANT_LOCAL_SMTP_PORT")),
        "username": required_environment("TENANT_LOCAL_SMTP_USERNAME"),
        "password": required_environment("TENANT_LOCAL_SMTP_PASSWORD"),
        "from_address": required_environment("TENANT_LOCAL_FROM_EMAIL"),
    }


def api_credential() -> dict[str, str]:
    """Build the generated local Pinguin API credential resource."""
    return {
        "id": required_environment("PINGUIN_DEMO_CREDENTIAL_ID"),
        "secret_digest": required_environment("PINGUIN_DEMO_CREDENTIAL_DIGEST"),
    }


def bootstrap() -> None:
    """Create the demo tenant or refresh its SMTP profile and API key."""
    session_cookie = login_session_cookie()
    authorization_headers = {"Cookie": session_cookie}
    listed, _headers = json_request(PINGUIN_TENANTS_URL, "GET", headers=authorization_headers)
    tenants = listed.get("tenants")
    if not isinstance(tenants, list):
        raise ValueError("pinguin.bootstrap.tenant_list_invalid")
    matching_tenants = [
        tenant
        for tenant in tenants
        if isinstance(tenant, dict) and tenant.get("display_name") == DEMO_TENANT_NAME
    ]
    if len(matching_tenants) > 1:
        raise ValueError("pinguin.bootstrap.tenant_duplicate")

    profile = email_profile()
    credential = api_credential()
    if not matching_tenants:
        json_request(
            PINGUIN_TENANTS_URL,
            "POST",
            {
                "display_name": DEMO_TENANT_NAME,
                "support_email": profile["from_address"],
                "email_profile": profile,
                "api_credential": credential,
            },
            {**authorization_headers, "Idempotency-Key": credential["id"]},
        )
        print("Pinguin demo tenant created")
        return

    tenant = matching_tenants[0]
    tenant_id = tenant.get("id")
    profile_resource = tenant.get("email_profile")
    credential_resource = tenant.get("api_credential")
    if (
        not isinstance(tenant_id, str)
        or not isinstance(profile_resource, dict)
        or not isinstance(credential_resource, dict)
    ):
        raise ValueError("pinguin.bootstrap.tenant_resource_invalid")
    profile_version = profile_resource.get("version")
    credential_version = credential_resource.get("version")
    if not isinstance(profile_version, int) or not isinstance(credential_version, int):
        raise ValueError("pinguin.bootstrap.resource_version_invalid")

    json_request(
        f"{PINGUIN_TENANTS_URL}/{tenant_id}/email-profile",
        "PUT",
        profile,
        {**authorization_headers, "If-Match": f'"{profile_version}"'},
    )
    json_request(
        f"{PINGUIN_TENANTS_URL}/{tenant_id}/api-credential",
        "PUT",
        credential,
        {**authorization_headers, "If-Match": f'"{credential_version}"'},
    )
    print("Pinguin demo tenant refreshed")


if __name__ == "__main__":
    bootstrap()
