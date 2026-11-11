"""Capture SMTP mail inside the isolated delivery test project."""

from __future__ import annotations

import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import socketserver
import ssl
import threading


MESSAGES: list[dict[str, object]] = []
MESSAGE_LOCK = threading.Lock()


class SMTPHandler(socketserver.StreamRequestHandler):
    """Accept the SMTP commands used by the actual notification sender."""

    def handle(self) -> None:
        recipients: list[str] = []
        self.wfile.write(b"220 isolated SMTP fixture\r\n")
        while line := self.rfile.readline():
            command = line.decode("ascii").strip()
            verb = command.split(" ", 1)[0].upper()
            if verb == "EHLO":
                self.wfile.write(b"250-isolated fixture\r\n250 AUTH PLAIN\r\n")
            elif verb in {"HELO", "NOOP"}:
                self.wfile.write(b"250 isolated fixture\r\n")
            elif verb == "AUTH":
                credentials = base64.b64decode(command.split(" ", 2)[2])
                self.wfile.write(b"235 authenticated fixture\r\n" if credentials == b"\x00fixture\x00fixture" else b"535 invalid fixture credentials\r\n")
            elif verb in {"MAIL", "RSET"}:
                recipients = []
                self.wfile.write(b"250 accepted\r\n")
            elif verb == "RCPT":
                recipients.append(command.split("<", 1)[1].split(">", 1)[0])
                self.wfile.write(b"250 accepted\r\n")
            elif verb == "DATA":
                self.wfile.write(b"354 send message\r\n")
                data: list[bytes] = []
                while payload := self.rfile.readline():
                    if payload == b".\r\n":
                        break
                    data.append(payload[1:] if payload.startswith(b"..") else payload)
                with MESSAGE_LOCK:
                    MESSAGES.append({"recipients": recipients, "data": b"".join(data).decode("utf-8")})
                self.wfile.write(b"250 stored\r\n")
            elif verb == "QUIT":
                self.wfile.write(b"221 goodbye\r\n")
                return
            else:
                self.wfile.write(b"502 unsupported fixture command\r\n")


class MailboxHandler(BaseHTTPRequestHandler):
    """Expose captured messages and fixture readiness through HTTP."""

    def do_GET(self) -> None:
        if self.path not in {"/messages", "/healthz"}:
            self.send_error(404)
            return
        with MESSAGE_LOCK:
            payload = json.dumps(MESSAGES if self.path == "/messages" else {"status": "ok"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, _format: str, *_arguments: object) -> None:
        return


if __name__ == "__main__":
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.load_cert_chain("/tls/certificate.pem", "/tls/key.pem")
    smtp = socketserver.ThreadingTCPServer(("0.0.0.0", 465), SMTPHandler)
    smtp.socket = tls.wrap_socket(smtp.socket, server_side=True)
    threading.Thread(target=smtp.serve_forever, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", 8025), MailboxHandler).serve_forever()
