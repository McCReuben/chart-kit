#!/usr/bin/env python3
"""Screenshot every Storybook story in light and dark themes.

Serves storybook-static/ (run `npm run build-storybook` first), reads
index.json, and captures each story with `globals=theme:light` and
`globals=theme:dark`. Page errors and console errors/warnings are recorded;
Highcharts trial/licence messages are listed separately from real errors.

Usage:
    python3 scripts/screenshot.py [--run NAME] [--filter SUBSTR ...] [--width 1100] [--static DIR]

Output: screenshots/<run>/<story-id>--<theme>.png plus report.json.
Exits 1 if any story has real (non-licence) errors.
"""

import argparse
import functools
import http.server
import json
import re
import socketserver
import sys
import threading
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / 'storybook-static'
THEMES = ('light', 'dark')
LICENCE_RE = re.compile(r'highcharts', re.I)
# Browser noise that is not caused by the stories themselves.
IGNORE_RE = re.compile(r'fonts\.(googleapis|gstatic)\.com|favicon\.ico|Download the React DevTools', re.I)
SETTLE_MS = 1800  # longest original animation is the 1.4 s LineChart sweep


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(static):
    handler = functools.partial(QuietHandler, directory=str(static))
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--run', default=datetime.now().strftime('%Y%m%d-%H%M%S'))
    ap.add_argument('--filter', nargs='*', default=[], help='only story ids containing one of these substrings')
    ap.add_argument('--width', type=int, default=1100)
    # Tall default: Chromium drops clip-path content in full_page shots below the fold.
    ap.add_argument('--height', type=int, default=1400)
    ap.add_argument('--static', default=str(STATIC), help='built Storybook dir (default storybook-static)')
    args = ap.parse_args()
    static = Path(args.static).resolve()

    index_path = static / 'index.json'
    if not index_path.exists():
        sys.exit(f'{index_path} not found; run `npm run build-storybook` first')
    entries = json.loads(index_path.read_text())['entries'].values()
    stories = sorted(e['id'] for e in entries if e.get('type') == 'story')
    if args.filter:
        stories = [s for s in stories if any(f in s for f in args.filter)]

    out = ROOT / 'screenshots' / args.run
    out.mkdir(parents=True, exist_ok=True)
    httpd, port = serve(static)
    report = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for story in stories:
            for theme in THEMES:
                page = browser.new_page(viewport={'width': args.width, 'height': args.height})
                errors, licence = [], []

                def on_console(msg, errors=errors, licence=licence):
                    if msg.type not in ('error', 'warning'):
                        return
                    text = f'{msg.type}: {msg.text}'
                    if IGNORE_RE.search(text):
                        return
                    (licence if LICENCE_RE.search(text) else errors).append(text)

                page.on('console', on_console)
                page.on('pageerror', lambda exc, errors=errors: errors.append(f'pageerror: {exc}'))
                url = f'http://127.0.0.1:{port}/iframe.html?id={story}&viewMode=story&globals=theme:{theme}'
                try:
                    page.goto(url, wait_until='networkidle', timeout=30000)
                    page.wait_for_selector('#storybook-root > *', timeout=15000)
                except Exception as exc:  # noqa: BLE001 - record and move on
                    errors.append(f'load: {exc}')
                page.wait_for_timeout(SETTLE_MS)
                if page.locator('.sb-show-errordisplay').count() and page.locator('.sb-show-errordisplay').first.is_visible():
                    errors.append('storybook error display: ' + page.locator('#error-message').inner_text()[:500])
                shot = out / f'{story}--{theme}.png'
                page.screenshot(path=str(shot), full_page=True)
                page.close()
                report.append({'story': story, 'theme': theme, 'file': shot.name, 'errors': errors, 'licence': licence})
                flag = 'ERR' if errors else ('lic' if licence else 'ok ')
                print(f'[{flag}] {story} ({theme})')
        browser.close()
    httpd.shutdown()

    (out / 'report.json').write_text(json.dumps(report, indent=2))
    bad = [r for r in report if r['errors']]
    lic = sorted({m for r in report for m in r['licence']})
    print(f'\n{len(report)} screenshots -> {out.relative_to(ROOT)}')
    print(f'Highcharts messages (trial/licence/advisory) ({len(lic)} distinct):')
    for m in lic:
        print(f'  {m[:200]}')
    print(f'Stories with real errors: {len(bad)}')
    for r in bad:
        print(f"  {r['story']} ({r['theme']}):")
        for e in r['errors']:
            print(f'    {e[:300]}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
