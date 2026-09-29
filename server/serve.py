#!/usr/bin/env python3
"""
serve.py - Liefert "Punsch & Lichterglanz" im lokalen Netzwerk aus.

    python3 server/serve.py            # nur starten
    python3 server/serve.py --open     # starten und Browser oeffnen

Bequemer geht es per Doppelklick auf Start.command im Projektordner.

Der Server bindet auf 0.0.0.0 und ist damit vom Handy im gleichen WLAN
erreichbar - genau dafuer ist er da. Die passende Adresse wird beim Start
ausgegeben. Auf dem Handy NICHT localhost eingeben, sondern die
angezeigte IP.

Kein Node, kein npm, keine Build-Tools. Der Server rechnet nichts mit.
"""

import argparse
import http.server
import os
import socket
import socketserver
import sys
import webbrowser
from functools import partial
from pathlib import Path

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
DEFAULT_PORT = 8060


class Handler(http.server.SimpleHTTPRequestHandler):
    """Statischer Handler mit MIME-Typen fuer ES-Module."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        # Ohne diesen Eintrag liefert der Server das Manifest als
        # "application/octet-stream" aus, und der Browser ignoriert es
        # kommentarlos - die PWA ist dann einfach keine.
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        # Waehrend der Entwicklung nichts cachen - sonst sieht man
        # Aenderungen am Code erst nach einem harten Reload. Der Service
        # Worker bekommt no-cache (ablegen, aber vor Benutzung nachfragen).
        if self.path.startswith("/sw.js"):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Normal nur Fehler - sonst rauscht jede Seite mit ~15 Zeilen
        # durch. Mit LOG_ALLES=1 wird JEDE Anfrage protokolliert; das ist
        # der einzige verlaessliche Weg zu sehen, was der Browser
        # wirklich neu holt und was er aus dem Cache nimmt (der
        # Netzwerk-Log des Browsers verschweigt den Unterschied).
        if os.environ.get("LOG_ALLES"):
            sys.stderr.write("  %s %s\n" % (args[0], args[1]))
            return
        if args and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("  %s %s\n" % (args[0], args[1]))


def local_ip() -> str:
    """IP im lokalen Netz, ohne echten Verbindungsaufbau."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Server(socketserver.ThreadingTCPServer):
    # Auf Windows erlaubt SO_REUSEADDR einem ZWEITEN Server, sich an
    # denselben Port zu haengen - ein zweiter Doppelklick auf den Starter
    # soll dort sauber "Port belegt" melden. Auf Unix bleibt die Option
    # an, sonst ist der Port nach dem Beenden ~1 Minute gesperrt.
    allow_reuse_address = (os.name != "nt")
    daemon_threads = True
    # Die Warteschlange für neue Verbindungen ist ab Werk nur 5 lang. Der
    # Browser holt die elf Module aber gleichzeitig - der Rest bekam
    # ERR_CONNECTION_RESET, und das Spiel blieb ab und zu schwarz.
    request_queue_size = 64


def main() -> int:
    ap = argparse.ArgumentParser(description="Punsch & Lichterglanz - Spielserver")
    # Ohne -p gilt die Umgebungsvariable PORT, sonst 8060. Das brauchen
    # Werkzeuge, die sich selbst einen freien Port suchen; von Hand
    # gestartet bleibt es bei 8060 wie in README und CLAUDE.md.
    ap.add_argument("-p", "--port", type=int,
                    default=int(os.environ.get("PORT") or DEFAULT_PORT))
    ap.add_argument("--open", action="store_true",
                    help="Browser nach dem Start automatisch oeffnen")
    args = ap.parse_args()

    if not (WEB_DIR / "index.html").exists():
        print(f"FEHLER: {WEB_DIR}/index.html nicht gefunden.", file=sys.stderr)
        return 1

    handler = partial(Handler, directory=str(WEB_DIR))

    try:
        httpd = Server(("0.0.0.0", args.port), handler)
    except OSError as e:
        print(f"FEHLER: Port {args.port} belegt ({e}).", file=sys.stderr)
        print(f"Versuche es mit: python3 server/serve.py -p {args.port + 1}", file=sys.stderr)
        return 1

    ip = local_ip()
    line = "=" * 52
    print(f"\n{line}")
    print("  MEIN ADVENTSHAUS  -  Clicker im Pixel-Look")
    print(line)
    print(f"  Auf diesem Rechner:  http://localhost:{args.port}")
    print(f"  Auf dem Handy:       http://{ip}:{args.port}")
    print(line)
    print("  Handy: hochkant halten. Spielstand liegt im Browser.")
    print("  Beenden mit STRG+C\n")

    if args.open:
        webbrowser.open(f"http://localhost:{args.port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
