import ipaddress
import json
import re
import socket
from urllib.parse import urlsplit


class NoEvidence(ValueError):
    pass


def identity(body):
    if not isinstance(body, dict) or set(body) != {"manufacturer", "model", "confirmed"}:
        raise ValueError("Only confirmed manufacturer and model are accepted.")
    if body["confirmed"] is not True:
        raise ValueError("Confirm the label first.")
    for key in ("manufacturer", "model"):
        value = body[key]
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= 150 or re.search(r"[\x00-\x1f\x7f]", value):
            raise ValueError("Invalid equipment identity.")
    return {key: body[key].strip() for key in ("manufacturer", "model")} | {"confirmed": True}


def public_addresses(host):
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("Non-public destination.")
    return addresses


def safe_url(url, hosts):
    try:
        parsed = urlsplit(url)
        return (parsed.scheme == "https" and parsed.hostname in hosts and parsed.port in (None, 443)
                and not parsed.username and not parsed.password and not re.search(r"[\x00-\x20\\]", url))
    except (ValueError, TypeError):
        return False


def load_policy(path, manufacturer):
    policies = json.loads(path.read_text())
    policy = policies.get(manufacturer.casefold())
    if not isinstance(policy, dict):
        raise ValueError("Manufacturer is not configured for browser research; use Claude research.")
    hosts = policy.get("hosts", [])
    sources = policy.get("source_hosts", [])
    if not hosts or not sources or not set(sources) <= set(hosts):
        raise ValueError("Invalid manufacturer policy.")
    for host in hosts:
        if not isinstance(host, str) or not re.fullmatch(r"[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}", host):
            raise ValueError("Use exact public DNS hostnames, without wildcards.")
        # DNS is validated and pinned at connect time by the proxy. Avoid
        # blocking the HTTP request on unused hosts before the job timeout.
    if not safe_url(policy.get("start_url"), sources):
        raise ValueError("Invalid manufacturer start URL.")
    return policy


def findings_from_page(page, request, policy):
    """Evidence is read from the browser, never an LLM's claimed final answer.

    Quotes remain candidates: a page may cover multiple models. The existing
    inspector approval checks the relationship between the quote and exact unit.
    """
    if not isinstance(page, dict) or not safe_url(page.get("url"), policy["source_hosts"]):
        raise NoEvidence("No approved manufacturer source was reached.")
    model = request["model"]
    match = re.compile(r"(?<![\w+\-/])" + re.escape(model) + r"(?![\w+\-/])", re.I)
    if not match.search(str(page.get("text", ""))):
        raise NoEvidence("The exact model was not found in the documentation.")
    specification = re.compile(r"\b(capacity|refrigerant|voltage|volt|btu|mbh|gallons?|dimensions?|amps?|amperage|watts?|weight|SEER2?|HSPF2?|AFUE)\b", re.I)
    rows = page.get("rows", [])
    if not isinstance(rows, list):
        raise NoEvidence("No specification evidence.")
    findings = []
    for row in rows:
        if not isinstance(row, str):
            continue
        quote = " ".join(row.split())
        if not 5 <= len(quote) <= 400 or not specification.search(quote) or not re.search(r"\d", quote):
            continue
        if any(f["evidence"] == quote for f in findings):
            continue
        findings.append({
            "text": f'{model} — manufacturer page specification excerpt: “{quote}” '
                    'The page contains the exact model; confirm this specification applies to that model and suffix.',
            "evidence": quote,
            "sources": [{"url": page["url"], "title": str(page.get("title") or "Manufacturer documentation")[:250]}],
        })
        if len(findings) == 6:
            break
    if not findings:
        raise NoEvidence("No readable HTML specification excerpts; PDF-only or inaccessible documents need manual review.")
    return findings
