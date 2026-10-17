#!/usr/bin/env python3
"""Check specification artifacts using only the Python standard library."""

import copy
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
SPECS = ROOT / "docs/specs"
UC_IDS = {f"UC-{number:02}" for number in range(1, 12)}


def heading_anchor(heading):
    text = "".join(
        char for char in heading.lower()
        if char.isalnum() or char in "_- "
        or unicodedata.category(char).startswith("M")
    )
    return text.replace(" ", "-")


def check_links(path):
    errors = []
    text = path.read_text(encoding="utf-8")
    if text.count("\x60\x60\x60") % 2:
        errors.append(f"{path.name}: unclosed code fence")
    for link in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if re.match(r"^[a-z]+://", link):
            continue
        target, _, anchor = unquote(link).partition("#")
        destination = (path.parent / target).resolve() if target else path
        if not destination.exists():
            errors.append(f"{path.name}: missing target {link}")
        elif anchor and destination.suffix == ".md":
            headings = re.findall(r"^#{1,6} (.+)$", destination.read_text(encoding="utf-8"), re.M)
            if anchor not in {heading_anchor(heading) for heading in headings}:
                errors.append(f"{path.name}: missing anchor {link}")
    return errors


def check_examples(data):
    errors = []
    if data.get("synthetic") is not True:
        errors.append("examples must be explicitly synthetic")
    scenarios = data.get("scenarios", [])
    identifiers = [item["id"] for item in scenarios]
    if len(identifiers) != len(set(identifiers)):
        errors.append("duplicate scenario IDs")
    for item in scenarios:
        name = item["id"]
        if item["uc"] not in UC_IDS:
            errors.append(f"{name}: unknown UC")
        if item["decisionStatus"] != "NOT_DECIDED" and item["submissionStatus"] != "SUBMITTED":
            errors.append(f"{name}: decision without confirmed submission")
        if item["receiptConfirmed"] and (
            item["decisionStatus"] != "APPROVED"
            or item["documentAvailability"] == "MISSING"
        ):
            errors.append(f"{name}: receipt without approved available document")
        if item["certificateVerified"] and (
            item["entryResult"] != "ALLOWED" or item["resultStatus"] != "COMPLETE"
        ):
            errors.append(f"{name}: certificate without completed allowed-entry path")
        if item["expected"]["canStartMedical"] and item["entryResult"] != "ALLOWED":
            errors.append(f"{name}: medical opened before allowed entry")
    return errors


def check_sources(manifest):
    errors = []
    checked = 0
    missing = 0
    base = ROOT / manifest["externalRootFromRepository"]
    for item in manifest["files"]:
        source = base / item["path"]
        if not source.is_file():
            missing += 1
            continue
        checked += 1
        if hashlib.sha256(source.read_bytes()).hexdigest() != item["sha256"]:
            errors.append(f"source changed: {item['path']}")
    print(f"Source fingerprints: {checked} checked, {missing} unavailable (not bundled)")
    return errors


def check_backend(coverage, examples):
    errors = []
    classes = [name for group in coverage["classes"].values() for name in group]
    operations = coverage["operations"]
    rows = coverage["ucCoverage"]
    review = (SPECS / "backend/class-diagram-review.md").read_text()
    contracts = "\n".join(
        (SPECS / "backend" / name).read_text()
        for name in ("operations.md", "infrastructure.md")
    )
    verification = (SPECS / "backend/verification.md").read_text()
    if len(classes) != 35 or len(set(classes)) != 35:
        errors.append("backend: expected 35 distinct reviewed class names")
    for name in classes:
        if name not in review:
            errors.append(f"backend: class missing from review: {name}")
    if len(operations) != len(set(operations)):
        errors.append("backend: duplicate operation names")
    for operation in operations:
        if operation not in contracts:
            errors.append(f"backend: missing operation contract: {operation}")
    if {row["uc"] for row in rows} != UC_IDS or len(rows) != 11:
        errors.append("backend: expected exactly 11 UC mappings")
    for row in rows:
        if row["controller"] not in coverage["classes"]["control"]:
            errors.append(f"backend: unknown controller for {row['uc']}")
        if row["view"] not in coverage["classes"]["boundary"]:
            errors.append(f"backend: unknown view for {row['uc']}")
        if row["acceptanceId"] not in verification:
            errors.append(f"backend: missing acceptance ID for {row['uc']}")
        if not row["operations"] or not set(row["operations"]) <= set(operations):
            errors.append(f"backend: unknown or absent operations for {row['uc']}")
    if not set(coverage["commonOperations"]) <= set(operations):
        errors.append("backend: unknown common operation")
    if examples.get("synthetic") is not True:
        errors.append("backend: examples must be synthetic")
    case_ids = [case["id"] for case in examples["cases"]]
    if len(case_ids) != len(set(case_ids)):
        errors.append("backend: duplicate example IDs")
    for case in examples["cases"]:
        response = case["response"]
        if case["operation"] not in operations:
            errors.append(f"backend: unknown example operation: {case['id']}")
        if response.get("ok") is True:
            valid = "data" in response and "error" not in response
        elif response.get("ok") is False:
            valid = "error" in response and "data" not in response
        else:
            valid = False
        if not valid or not response.get("requestId"):
            errors.append(f"backend: invalid response envelope: {case['id']}")
    return errors


def self_check(examples):
    assert heading_anchor("Sources of Truth") == "sources-of-truth"
    assert heading_anchor("กฎเปลี่ยนสถานะ") == "กฎเปลี่ยนสถานะ"
    assert not check_examples(examples)
    invalid = copy.deepcopy(examples)
    invalid["scenarios"][0]["receiptConfirmed"] = True
    assert check_examples(invalid), "checker must reject an impossible receipt"
    duplicate = copy.deepcopy(examples)
    duplicate["scenarios"].append(copy.deepcopy(duplicate["scenarios"][0]))
    assert check_examples(duplicate), "checker must reject duplicate scenario IDs"


def main():
    examples = json.loads((SPECS / "examples.json").read_text(encoding="utf-8"))
    self_check(examples)
    errors = check_examples(examples)
    markdown_files = sorted(SPECS.rglob("*.md")) + [ROOT / "README.md", ROOT / "AGENTS.md", ROOT / "docs/data-model.md"]
    for path in markdown_files:
        errors.extend(check_links(path))
    for name in ("workflows.md", "acceptance.md"):
        text = (SPECS / name).read_text(encoding="utf-8")
        for uc in sorted(UC_IDS):
            if uc not in text:
                errors.append(f"{name}: missing {uc}")
    acceptance = (SPECS / "acceptance.md").read_text(encoding="utf-8")
    for uc in sorted(UC_IDS):
        if f"AC-UC{uc[-2:]}" not in acceptance:
            errors.append(f"acceptance.md: missing acceptance ID for {uc}")
    manifest = json.loads((SPECS / "source-manifest.json").read_text(encoding="utf-8"))
    errors.extend(check_sources(manifest))
    coverage = json.loads((SPECS / "backend/coverage.json").read_text())
    backend_examples = json.loads((SPECS / "backend/contract-examples.json").read_text())
    errors.extend(check_backend(coverage, backend_examples))
    unknown = copy.deepcopy(coverage)
    unknown["ucCoverage"][0]["operations"] = ["notAnOperation"]
    assert check_backend(unknown, backend_examples), "reject unknown operation mapping"
    missing = copy.deepcopy(coverage)
    missing["ucCoverage"].pop()
    assert check_backend(missing, backend_examples), "reject missing UC coverage"
    malformed = copy.deepcopy(backend_examples)
    malformed["cases"][0]["response"]["error"] = {"code": "SAVE_FAILED"}
    assert check_backend(coverage, malformed), "reject mixed success/error envelope"
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"PASS: {len(markdown_files)} Markdown files, 11 UC acceptance IDs, "
          f"{len(examples['scenarios'])} synthetic scenarios; checker self-checks passed")
    print(f"Backend references: 35 classes, {len(coverage['operations'])} operations, "
          f"11 UC mappings, {len(backend_examples['cases'])} contract examples")
    print("Document checks only; runtime, Figma visuals, SQL and authorization are untested.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
