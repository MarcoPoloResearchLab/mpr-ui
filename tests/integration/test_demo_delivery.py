"""Exercise local delivery administration through the real Compose services."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import subprocess
import uuid

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PASSWORD_HASH = "$2y$12$UihC9c7inwl90d3iKzlH3OPsrJn2OIGhgAT/TkOHbcueVdNrkf0zS"


def test_delivery_administration_rejects_demo_sessions(tmp_path: Path) -> None:
    """Bootstrap and refresh a private tenant, then reject demo authorization."""
    compose = json.loads(subprocess.check_output(
        ["node", "-e", "process.stdout.write(JSON.stringify(require('js-yaml').load(require('fs').readFileSync('docker-compose.yml','utf8'))))"],
        cwd=REPOSITORY_ROOT, text=True,
    ))
    services = compose["services"]
    unsafe_webroot = tmp_path / "website"
    (unsafe_webroot / "demo").mkdir(parents=True)
    (unsafe_webroot / "demo" / ".env.tauth").write_text("PRIVATE_FIXTURE=private-fixture\n", encoding="utf-8")
    (unsafe_webroot / "index.html").write_text("Public fixture", encoding="utf-8")
    public_key = base64.b64encode(os.urandom(48)).decode()
    private_key = base64.b64encode(os.urandom(48)).decode()
    environment = {
        "TAUTH_CONFIG_FILE": "/config.yaml",
        "TAUTH_LISTEN_ADDR": ":8080", "TAUTH_DATABASE_URL": "sqlite:///data/tauth.db",
        "TAUTH_ENABLE_CORS": "true", "TAUTH_CORS_EXCEPTION_1": "http://localhost:4443",
        "TAUTH_ENABLE_TENANT_HEADER_OVERRIDE": "false", "TAUTH_TENANT_ID_1": "review-demo",
        "TAUTH_GOOGLE_WEB_CLIENT_ID": "review.apps.googleusercontent.com",
        "TAUTH_JWT_SIGNING_KEY": public_key,
        "PINGUIN_BOOTSTRAP_SIGNING_KEY": private_key,
        "PINGUIN_BOOTSTRAP_PASSWORD": "mpr-ui-demo",
        "PINGUIN_BOOTSTRAP_PASSWORD_HASH": FIXTURE_PASSWORD_HASH,
        "PINGUIN_DEMO_CREDENTIAL_ID": str(uuid.uuid4()),
        "PINGUIN_DEMO_CREDENTIAL_DIGEST": base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip("="),
        "PINGUIN_DEMO_API_KEY": "test-api-key",
        "DATABASE_PATH": "/app/data/pinguin.db", "LOG_LEVEL": "error",
        "MAX_RETRIES": "1", "RETRY_INTERVAL_SEC": "1",
        "MASTER_ENCRYPTION_KEY": os.urandom(32).hex(),
        "CONNECTION_TIMEOUT_SEC": "5", "OPERATION_TIMEOUT_SEC": "5",
        "HTTP_LISTEN_ADDR": ":8081",
        "HTTP_ALLOWED_ORIGIN1": "http://localhost:4443",
        "HTTP_ALLOWED_ORIGIN2": "http://127.0.0.1:4443",
        "HTTP_ALLOWED_ORIGIN3": "http://pinguin-bootstrap",
        "HTTP_TRUSTED_PROXY1": "127.0.0.1", "HTTP_TRUSTED_PROXY2": "::1",
        "HTTP_TRUSTED_PROXY3": "172.16.0.0/12",
        "SMTP_SUBMISSION_ENABLED": "false", "SMTP_FORWARDING_ENABLED": "false",
        "SMTP_SUBMISSION_ALLOW_INSECURE_AUTH": "false",
        "SMTP_SUBMISSION_HOSTNAME": "smtp.invalid", "SMTP_SUBMISSION_LISTEN_ADDR": ":2525",
        "SMTP_SUBMISSION_TLS_LISTEN_ADDR": ":2465", "SMTP_SUBMISSION_TLS_CERT_PATH": "/unused/cert",
        "SMTP_SUBMISSION_TLS_KEY_PATH": "/unused/key", "SMTP_SUBMISSION_PUBLIC_PORT": "587",
        "SMTP_SUBMISSION_PUBLIC_SECURITY_MODE": "starttls", "SMTP_SUBMISSION_DELIVERY_MODE": "relay",
        "SMTP_SUBMISSION_MAX_MESSAGE_BYTES": "1048576", "SMTP_SUBMISSION_MAX_RECIPIENTS": "10",
        "SMTP_SUBMISSION_RELAY_HOST": "smtp.invalid", "SMTP_SUBMISSION_RELAY_PORT": "587",
        "SMTP_SUBMISSION_RELAY_USERNAME": "fixture", "SMTP_SUBMISSION_RELAY_PASSWORD": "fixture",
        "SMTP_FORWARDING_HOSTNAME": "smtp.invalid", "SMTP_FORWARDING_LISTEN_ADDR": ":2526",
        "SMTP_FORWARDING_MAX_MESSAGE_BYTES": "1048576", "SMTP_FORWARDING_MAX_RECIPIENTS": "10",
        "SMTP_FORWARDING_RELAY_HOST": "smtp.invalid", "SMTP_FORWARDING_RELAY_PORT": "587",
        "SMTP_FORWARDING_RELAY_USERNAME": "fixture", "SMTP_FORWARDING_RELAY_PASSWORD": "fixture",
        "TENANT_LOCAL_SMTP_HOST": "smtp.invalid", "TENANT_LOCAL_SMTP_PORT": "587",
        "TENANT_LOCAL_SMTP_USERNAME": "fixture", "TENANT_LOCAL_SMTP_PASSWORD": "fixture",
        "TENANT_LOCAL_FROM_EMAIL": "fixture@example.com",
    }
    for service in services.values():
        service.pop("ports", None)
        service.pop("env_file", None)
        service["environment"] = {**{
            key: value.replace("$", "$$") for key, value in environment.items()
        }, **service.get("environment", {})}
        if "build" in service:
            service["build"]["context"] = str((REPOSITORY_ROOT / service["build"]["context"]).resolve())
        service["volumes"] = [
            str(unsafe_webroot if mount.split(":")[0] == "./" else
                (REPOSITORY_ROOT / mount.split(":")[0]).resolve()) + ":" + ":".join(mount.split(":")[1:])
            if mount.startswith(".") else mount
            for mount in service.get("volumes", [])
        ]
    compose_path = tmp_path / "compose.json"
    compose_path.write_text(json.dumps(compose), encoding="utf-8")
    project = "mpr-ui-review-" + uuid.uuid4().hex[:12]
    command = ["docker", "compose", "-p", project, "-f", str(compose_path)]
    process_environment = {**os.environ, **environment}

    def run(*arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(command + list(arguments), env=process_environment,
                              text=True, capture_output=True, timeout=240, check=False)

    try:
        started = run("up", "-d", "--build", "--wait", "pinguin", "tauth")
        assert started.returncode == 0, started.stderr + run("logs", "--tail", "25").stdout
        for _attempt in range(2):
            bootstrapped = run("run", "--rm", "-T", "pinguin-bootstrap")
            assert bootstrapped.returncode == 0, bootstrapped.stderr
        frontend = run("up", "-d", "--wait", "frontend")
        assert frontend.returncode == 0, frontend.stderr
        probe = run("run", "--rm", "--no-deps", "-T", "pinguin-bootstrap", "python", "-c", """
import sys, urllib.error, urllib.request
sys.path.insert(0, '/app')
import bootstrap_pinguin as bootstrap
for path in ['/demo/.env.tauth', '/.git/config', '/demo/tauth-config.yaml', '/demo/bootstrap_pinguin.py']:
    try:
        with urllib.request.urlopen('http://frontend:8000' + path, timeout=10) as response:
            raise AssertionError('Private path is served: ' + path)
    except urllib.error.HTTPError as error:
        assert error.code == 404, (path, error.code)
for path in ['/', '/mpr-ui.js', '/mpr-ui-config.js', '/demo/config-ui.yaml', '/demo/tauth-demo.html']:
    with urllib.request.urlopen('http://frontend:8000' + path, timeout=10) as response:
        assert response.status == 200, path
_, headers = bootstrap.json_request('http://frontend:8000/auth/password/login', 'POST',
    {'email':'demo@mprlab.local','password':'mpr-ui-demo'}, {'Origin':'http://localhost:4443'})
cookie = next(value.split(';', 1)[0] for value in headers.get_all('Set-Cookie') if value.startswith('app_session='))
for presented_cookie in [cookie, 'mpr_ui_delivery_session=' + cookie.split('=', 1)[1]]:
    try:
        bootstrap.json_request(bootstrap.PINGUIN_TENANTS_URL, 'GET', headers={'Cookie':presented_cookie})
        raise AssertionError('Public demo session authorizes notification administration')
    except urllib.error.HTTPError as error:
        assert error.code == 401, error.code
owner_cookie = bootstrap.login_session_cookie()
tenants, _ = bootstrap.json_request(bootstrap.PINGUIN_TENANTS_URL, 'GET', headers={'Cookie':owner_cookie})
assert len(tenants['tenants']) == 1, 'Bootstrap must refresh the same private tenant'
print('Private owner accepted; public and renamed demo cookies rejected')
""")
        assert probe.returncode == 0, probe.stderr
    finally:
        stopped = run("down", "--volumes", "--remove-orphans")
        assert stopped.returncode == 0, stopped.stderr
