#!/usr/bin/env python3
"""Evaluate the pull-request review policy for this repository.

GitHub Free cannot block merges on a private repository, so this script is
the policy. It runs at four points: a status check on each PR (signal only),
reviewer assignment, an hourly audit, and the promotion and release gates
(blocking). The roster and high-risk paths live in .github/review-roster.json.

Who may approve depends on who wrote the code: an intern's code needs an
engineer or a senior engineer, and anyone else's code needs a senior engineer
who did not write it. A change to a high-risk path also needs every login in
high_risk_required_approvers.

Standard library only, so it runs unchanged on GitHub runners and on hosts.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from fnmatch import fnmatch
from pathlib import Path
from typing import Any, Callable, Iterable

API_ROOT = "https://api.github.com"
DEFAULT_ROSTER = Path(".github/review-roster.json")
AUDIT_ISSUE_TITLE = "Review policy violations"
OVERDUE_MARKER = "<!-- review-policy:overdue -->"
REVIEW_STATES = {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}


class PolicyError(RuntimeError):
    """Raised when the roster or inputs are invalid."""


# --------------------------------------------------------------------------- #
# Roster
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class WorkingHours:
    offset: timezone
    weekdays: frozenset[int]
    start: time
    end: time


@dataclass(frozen=True)
class Roster:
    senior: frozenset[str]
    engineers: frozenset[str]
    interns: frozenset[str]
    never_auto_assign: frozenset[str]
    break_glass: frozenset[str]
    high_risk_required_approvers: frozenset[str]
    high_risk_paths: tuple[str, ...]
    enforce_from: datetime
    deadlines: dict[str, float]
    working_hours: WorkingHours

    @property
    def approvers(self) -> frozenset[str]:
        return self.senior | self.engineers

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Roster":
        def logins(key: str) -> frozenset[str]:
            values = data.get(key, [])
            if not isinstance(values, list) or not all(isinstance(v, str) and v for v in values):
                raise PolicyError(f"roster field {key!r} must be a list of GitHub logins")
            return frozenset(values)

        senior, engineers, interns = logins("senior"), logins("engineers"), logins("interns")
        for left, right in (("senior", "engineers"), ("senior", "interns"), ("engineers", "interns")):
            overlap = logins(left) & logins(right)
            if overlap:
                raise PolicyError(f"{sorted(overlap)} listed in both {left} and {right}")
        if not senior:
            raise PolicyError("roster needs at least one senior engineer")
        required = logins("high_risk_required_approvers")
        if required & interns:
            raise PolicyError(f"{sorted(required & interns)} are interns and cannot be required approvers")

        paths = data.get("high_risk_paths", [])
        if not isinstance(paths, list) or not all(isinstance(p, str) and p for p in paths):
            raise PolicyError("high_risk_paths must be a list of glob patterns")

        try:
            enforce_from = datetime.fromisoformat(data["enforce_from"])
        except (KeyError, TypeError, ValueError) as exc:
            raise PolicyError("enforce_from must be an ISO 8601 timestamp with offset") from exc
        if enforce_from.tzinfo is None:
            raise PolicyError("enforce_from must include a UTC offset")

        deadlines = data.get("deadlines_working_hours", {"hotfix": 4, "default": 9})
        if "default" not in deadlines:
            raise PolicyError("deadlines_working_hours needs a 'default' entry")

        hours = data.get("working_hours", {})
        match = re.fullmatch(r"([+-])(\d{2}):(\d{2})", hours.get("timezone_offset", "+05:30"))
        if not match:
            raise PolicyError("working_hours.timezone_offset must look like +05:30")
        sign = 1 if match.group(1) == "+" else -1
        offset = timezone(sign * timedelta(hours=int(match.group(2)), minutes=int(match.group(3))))
        working_hours = WorkingHours(
            offset=offset,
            weekdays=frozenset(hours.get("weekdays", [0, 1, 2, 3, 4])),
            start=time.fromisoformat(hours.get("start", "09:30")),
            end=time.fromisoformat(hours.get("end", "18:30")),
        )
        if working_hours.end <= working_hours.start:
            raise PolicyError("working_hours.end must be after start")

        return cls(
            senior=senior,
            engineers=engineers,
            interns=interns,
            never_auto_assign=logins("never_auto_assign"),
            break_glass=logins("break_glass"),
            high_risk_required_approvers=required,
            high_risk_paths=tuple(paths),
            enforce_from=enforce_from,
            deadlines={str(k): float(v) for k, v in deadlines.items()},
            working_hours=working_hours,
        )

    @classmethod
    def load(cls, path: Path) -> "Roster":
        try:
            return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError) as exc:
            raise PolicyError(f"cannot read roster {path}: {exc}") from exc


# --------------------------------------------------------------------------- #
# Policy rules
# --------------------------------------------------------------------------- #


def high_risk_files(filenames: Iterable[str], roster: Roster) -> list[str]:
    return [name for name in filenames if any(fnmatch(name, p) for p in roster.high_risk_paths)]


def needs_senior_review(writers: Iterable[str], roster: Roster) -> bool:
    """Only code written entirely by interns may be approved by an engineer.

    Anyone outside the roster is held to the stricter rule.
    """
    return bool(set(writers) - roster.interns)


def current_approvers(
    reviews: list[dict[str, Any]],
    author: str,
    final_sha: str,
    excluded: Iterable[str] = (),
) -> set[str]:
    """Logins whose latest verdict approves the exact final commit.

    The PR author and anyone in ``excluded`` (people who wrote commits in the
    PR) never count: approving your own code is not a review.
    """
    excluded = set(excluded)
    latest: dict[str, dict[str, Any]] = {}
    for review in reviews:  # GitHub returns reviews oldest first
        user = (review.get("user") or {}).get("login")
        if user and review.get("state") in REVIEW_STATES:
            latest[user] = review
    return {
        login
        for login, review in latest.items()
        if review["state"] == "APPROVED"
        and review.get("commit_id") == final_sha
        and login != author
        and login not in excluded
    }


def evaluate_pr(
    pr: dict[str, Any],
    filenames: list[str],
    reviews: list[dict[str, Any]],
    labels: set[str],
    roster: Roster,
    commit_authors: Iterable[str] = (),
) -> list[str]:
    """Return the unmet review requirements for one pull request."""
    author = pr["user"]["login"]
    final_sha = pr["head"]["sha"]
    writers = set(commit_authors) - {author}
    approvers = current_approvers(reviews, author, final_sha, excluded=writers)
    qualified = approvers & roster.approvers
    senior_only = needs_senior_review(writers | {author}, roster)
    problems: list[str] = []
    if not (approvers & roster.senior if senior_only else qualified):
        level = "a senior engineer" if senior_only else "an engineer or senior engineer"
        problems.append(
            f"needs 1 approval on the final commit from {level} who did not open the PR or write its commits"
        )
        if senior_only and qualified:
            problems.append(
                f"approval from {', '.join(sorted(qualified))} is not enough: "
                "only an intern's code can be approved by an engineer"
            )
    risky = high_risk_files(filenames, roster)
    if risky:
        shown = ", ".join(risky[:3]) + (" …" if len(risky) > 3 else "")
        if not approvers & roster.senior:
            problems.append(f"touches high-risk paths ({shown}): needs a senior approval")
        # A required approver cannot review their own code; the senior rule still applies to it.
        missing = roster.high_risk_required_approvers - approvers - writers - {author}
        if missing:
            problems.append(f"touches high-risk paths ({shown}): needs approval from {', '.join(sorted(missing))}")
    if "high-cost" in labels and len(qualified) < 2:
        problems.append("labelled high-cost: needs 2 engineer approvals")
    if problems:
        self_approved = current_approvers(reviews, author, final_sha) & writers
        if self_approved:
            problems.append(
                f"approval from {', '.join(sorted(self_approved))} does not count: they wrote commits in this PR"
            )
    return problems


def choose_reviewers(
    author: str,
    filenames: list[str],
    already_requested: set[str],
    approved_by: set[str],
    roster: Roster,
    rng: random.Random,
    commit_authors: Iterable[str] = (),
) -> list[str]:
    """Pick reviewers to request: one person allowed to approve this author's code,
    plus a senior and every required approver for high-risk paths.

    never_auto_assign keeps a login out of the random picks; a required approver
    is still requested, because the PR cannot pass without them.
    """
    writers = {author} | set(commit_authors)
    excluded = writers | roster.never_auto_assign
    involved = already_requested | approved_by
    chosen: list[str] = []
    allowed = roster.senior if needs_senior_review(writers, roster) else roster.approvers
    if not involved & allowed:
        pool = sorted(allowed - excluded)
        if pool:
            chosen.append(rng.choice(pool))
    if high_risk_files(filenames, roster):
        if not (involved | set(chosen)) & roster.senior:
            pool = sorted(roster.senior - excluded - set(chosen))
            if pool:
                chosen.append(rng.choice(pool))
        chosen.extend(sorted(roster.high_risk_required_approvers - writers - involved - set(chosen)))
    return chosen


def working_hours_between(start: datetime, end: datetime, hours: WorkingHours) -> float:
    """Working hours elapsed between two aware datetimes."""
    if end <= start:
        return 0.0
    start, end = start.astimezone(hours.offset), end.astimezone(hours.offset)
    total = timedelta()
    day = start.date()
    while day <= end.date():
        if day.weekday() in hours.weekdays:
            window_start = datetime.combine(day, hours.start, hours.offset)
            window_end = datetime.combine(day, hours.end, hours.offset)
            lo, hi = max(start, window_start), min(end, window_end)
            if hi > lo:
                total += hi - lo
        day += timedelta(days=1)
    return total.total_seconds() / 3600


# --------------------------------------------------------------------------- #
# GitHub access
# --------------------------------------------------------------------------- #


class GitHub:
    def __init__(self, repo: str, token: str, opener: Callable[..., Any] = urllib.request.urlopen):
        if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
            raise PolicyError(f"invalid repository name: {repo!r}")
        self.repo = repo
        self._token = token
        self._open = opener

    def _request(self, method: str, url: str, payload: Any = None) -> tuple[Any, str]:
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(url, data=data, method=method)
        request.add_header("Accept", "application/vnd.github+json")
        request.add_header("X-GitHub-Api-Version", "2022-11-28")
        request.add_header("Authorization", f"Bearer {self._token}")
        if data is not None:
            request.add_header("Content-Type", "application/json")
        try:
            with self._open(request, timeout=30) as response:
                body = response.read()
                link = response.headers.get("Link", "") if response.headers else ""
        except urllib.error.HTTPError as exc:
            raise PolicyError(f"GitHub API {method} {url} failed: HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise PolicyError(f"GitHub API {method} {url} unreachable: {exc.reason}") from exc
        return (json.loads(body) if body else None), link

    def get(self, path: str) -> Any:
        url = f"{API_ROOT}/repos/{self.repo}/{path}"
        result, link = self._request("GET", url)
        if not isinstance(result, list):
            return result
        items = list(result)
        while True:
            match = re.search(r'<([^>]+)>;\s*rel="next"', link or "")
            if not match:
                return items
            page, link = self._request("GET", match.group(1))
            items.extend(page or [])

    def post(self, path: str, payload: Any) -> Any:
        return self._request("POST", f"{API_ROOT}/repos/{self.repo}/{path}", payload)[0]

    def patch(self, path: str, payload: Any) -> Any:
        return self._request("PATCH", f"{API_ROOT}/repos/{self.repo}/{path}", payload)[0]


@dataclass
class PullFacts:
    pr: dict[str, Any]
    filenames: list[str]
    reviews: list[dict[str, Any]]
    labels: set[str]
    commit_authors: set[str]


# GitHub's own account for commits made in the web UI; never a person.
NON_PERSON_COMMITTERS = {"web-flow"}


def commit_logins(commits: list[dict[str, Any]]) -> set[str]:
    """GitHub logins that authored or committed any of the given PR commits."""
    logins: set[str] = set()
    for commit in commits:
        for role in ("author", "committer"):
            login = (commit.get(role) or {}).get("login")
            if login and login not in NON_PERSON_COMMITTERS:
                logins.add(login)
    return logins


def pull_facts(gh: GitHub, number: int) -> PullFacts:
    pr = gh.get(f"pulls/{number}")
    files = gh.get(f"pulls/{number}/files?per_page=100")
    reviews = gh.get(f"pulls/{number}/reviews?per_page=100")
    commits = gh.get(f"pulls/{number}/commits?per_page=100")
    return PullFacts(
        pr=pr,
        filenames=[f["filename"] for f in files],
        reviews=reviews,
        labels={label["name"] for label in pr.get("labels", [])},
        commit_authors=commit_logins(commits),
    )


def merged_at(pr: dict[str, Any]) -> datetime | None:
    value = pr.get("merged_at")
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


# --------------------------------------------------------------------------- #
# Range evaluation (promotion and release gates, audit)
# --------------------------------------------------------------------------- #


@dataclass
class RangeResult:
    checked: dict[int, list[str]]
    skipped_before_enforcement: list[int]
    direct_pushes: list[str]

    @property
    def failed(self) -> bool:
        return bool(self.direct_pushes) or any(self.checked.values())


def git_commits(base: str, head: str, repository: Path) -> list[tuple[str, datetime]]:
    result = subprocess.run(
        ["git", "-C", str(repository), "log", "--format=%H %cI", f"{base}..{head}"],
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise PolicyError(f"git log {base}..{head} failed: {result.stderr.strip()}")
    commits = []
    for line in result.stdout.splitlines():
        sha, stamp = line.split(" ", 1)
        commits.append((sha, datetime.fromisoformat(stamp)))
    return commits


def evaluate_range(
    gh: GitHub,
    commits: list[tuple[str, datetime]],
    roster: Roster,
    *,
    observed_at: datetime | None = None,
) -> RangeResult:
    observed_at = observed_at or datetime.now(timezone.utc)
    result = RangeResult(checked={}, skipped_before_enforcement=[], direct_pushes=[])
    seen: set[int] = set()
    for sha, committed_at in commits:
        pulls = [p for p in gh.get(f"commits/{sha}/pulls") if merged_at(p)]
        if not pulls:
            # Commit timestamps are caller-controlled: an old timestamp cannot
            # exempt an unreviewed commit introduced after enforcement starts.
            if committed_at >= roster.enforce_from or observed_at >= roster.enforce_from:
                result.direct_pushes.append(sha)
            continue
        for pull in pulls:
            number = pull["number"]
            if number in seen:
                continue
            seen.add(number)
            if merged_at(pull) < roster.enforce_from:
                result.skipped_before_enforcement.append(number)
                continue
            facts = pull_facts(gh, number)
            result.checked[number] = evaluate_pr(
                facts.pr, facts.filenames, facts.reviews, facts.labels, roster, facts.commit_authors
            )
    return result


def range_report(result: RangeResult) -> str:
    lines = ["## Review policy", ""]
    if not result.checked and not result.direct_pushes:
        lines.append("No pull requests in this range need checking.")
    for number, problems in sorted(result.checked.items()):
        status = "✅ reviewed" if not problems else "❌ " + "; ".join(problems)
        lines.append(f"- #{number}: {status}")
    for sha in result.direct_pushes:
        lines.append(f"- `{sha[:12]}`: ❌ commit is not part of any merged pull request")
    if result.skipped_before_enforcement:
        merged = ", ".join(f"#{n}" for n in sorted(result.skipped_before_enforcement))
        lines.append(f"- Merged before the policy started, not checked: {merged}")
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #


def _write_summary(path: str | None, text: str) -> None:
    print(text, end="")
    if path:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(text)


def _finish(failed: bool, mode: str, break_glass: str, actor: str, roster: Roster) -> int:
    if not failed:
        return 0
    if break_glass:
        if actor not in roster.break_glass:
            print(f"break-glass refused: {actor or 'unknown user'} is not listed in break_glass", file=sys.stderr)
            return 1
        print(f"BREAK-GLASS by {actor}: {break_glass}", file=sys.stderr)
        return 0
    if mode == "warn":
        print("review policy: problems found (warn mode, not blocking)", file=sys.stderr)
        return 0
    print("review policy: blocking because of the problems above", file=sys.stderr)
    return 1


def cmd_pr(args: argparse.Namespace, gh: GitHub, roster: Roster) -> int:
    facts = pull_facts(gh, args.pr)
    problems = evaluate_pr(facts.pr, facts.filenames, facts.reviews, facts.labels, roster, facts.commit_authors)
    text = "## Review policy\n\n" + (
        "✅ All review requirements are met.\n" if not problems else "".join(f"- ❌ {p}\n" for p in problems)
    )
    _write_summary(args.summary, text)
    return 1 if problems else 0


def cmd_range(args: argparse.Namespace, gh: GitHub, roster: Roster) -> int:
    commits = git_commits(args.base, args.head, Path(args.repository))
    result = evaluate_range(gh, commits, roster)
    _write_summary(args.summary, range_report(result))
    return _finish(result.failed, args.mode, args.break_glass, args.actor, roster)


def cmd_assign(args: argparse.Namespace, gh: GitHub, roster: Roster) -> int:
    facts = pull_facts(gh, args.pr)
    pr = facts.pr
    if pr.get("draft") or pr.get("state") != "open":
        print("skipping: pull request is a draft or not open")
        return 0
    requested = {u["login"] for u in pr.get("requested_reviewers", [])}
    author = pr["user"]["login"]
    approved = current_approvers(facts.reviews, author, pr["head"]["sha"], excluded=facts.commit_authors)
    chosen = choose_reviewers(
        author, facts.filenames, requested, approved, roster, random.Random(), facts.commit_authors
    )
    if not chosen:
        print("no reviewer needed")
        return 0
    gh.post(f"pulls/{args.pr}/requested_reviewers", {"reviewers": chosen})
    print("requested review from: " + ", ".join(chosen))
    return 0


def _overdue_prs(gh: GitHub, roster: Roster, now: datetime) -> list[tuple[dict[str, Any], float, float]]:
    overdue = []
    for pr in gh.get("pulls?state=open&per_page=100"):
        if pr.get("draft") or not pr.get("requested_reviewers"):
            continue
        labels = {label["name"] for label in pr.get("labels", [])}
        limit = roster.deadlines.get("hotfix", 4) if "hotfix" in labels else roster.deadlines["default"]
        opened = datetime.fromisoformat(pr["created_at"].replace("Z", "+00:00"))
        waited = working_hours_between(opened, now, roster.working_hours)
        if waited > limit:
            overdue.append((pr, waited, limit))
    return overdue


def cmd_audit(args: argparse.Namespace, gh: GitHub, roster: Roster) -> int:
    now = datetime.now(timezone.utc)
    since = (now - timedelta(hours=args.since_hours)).isoformat()
    sections: list[str] = []
    for branch in args.branches:
        log = subprocess.run(
            ["git", "-C", args.repository, "log", f"--since={since}", "--format=%H %cI", f"origin/{branch}"],
            check=False, capture_output=True, text=True, timeout=60,
        )
        if log.returncode != 0:
            raise PolicyError(f"git log origin/{branch} failed: {log.stderr.strip()}")
        commits = [
            (sha, datetime.fromisoformat(stamp))
            for sha, stamp in (line.split(" ", 1) for line in log.stdout.splitlines())
        ]
        result = evaluate_range(gh, commits, roster, observed_at=now)
        if result.failed:
            sections.append(f"### `{branch}`\n\n" + range_report(result).split("\n", 2)[2])

    for pr, waited, limit in _overdue_prs(gh, roster, now):
        comments = gh.get(f"issues/{pr['number']}/comments?per_page=100")
        if any(OVERDUE_MARKER in (c.get("body") or "") for c in comments):
            continue
        reviewers = " ".join(f"@{u['login']}" for u in pr["requested_reviewers"])
        gh.post(
            f"issues/{pr['number']}/comments",
            {"body": f"{OVERDUE_MARKER}\n{reviewers} this pull request has waited {waited:.1f} working hours "
                     f"for review (deadline {limit:g}). If you can't review it, say so and the author "
                     f"will ask the team for another reviewer."},
        )
        print(f"reminded reviewers of #{pr['number']}")

    issues = gh.get(f"issues?state=open&labels={args.issue_label}&per_page=100")
    existing = next((i for i in issues if i.get("title") == AUDIT_ISSUE_TITLE), None)
    if sections:
        body = ("Unreviewed changes found by the hourly review audit. Each needs the missing approval "
                "on the merged PR (approving after merge is fine) before it can be promoted.\n\n" + "\n".join(sections))
        if existing:
            gh.patch(f"issues/{existing['number']}", {"body": body})
        else:
            gh.post("issues", {"title": AUDIT_ISSUE_TITLE, "body": body, "labels": [args.issue_label]})
        print("audit: violations recorded")
    elif existing:
        gh.patch(f"issues/{existing['number']}", {"state": "closed", "body": "No open violations."})
        print("audit: clean, closed the violations issue")
    else:
        print("audit: clean")
    return 0


def _token(args: argparse.Namespace) -> str:
    if args.token_file:
        return Path(args.token_file).read_text(encoding="utf-8").strip()
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        raise PolicyError("no GitHub token: set GH_TOKEN or pass --token-file")
    return token


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--roster", type=Path, default=DEFAULT_ROSTER)
    parser.add_argument("--token-file")
    parser.add_argument("--repository", default=".", help="local git checkout")
    sub = parser.add_subparsers(dest="command", required=True)

    pr = sub.add_parser("pr", help="check one pull request (status signal)")
    pr.add_argument("--pr", type=int, required=True)
    pr.add_argument("--summary")

    rng = sub.add_parser("range", help="check every PR in BASE..HEAD (promotion and release gates)")
    rng.add_argument("--base", required=True)
    rng.add_argument("--head", required=True)
    rng.add_argument("--summary")
    rng.add_argument("--mode", choices=["warn", "enforce"], default=os.environ.get("REVIEW_POLICY_MODE", "enforce"))
    rng.add_argument("--break-glass", default="", help="reason for releasing without review")
    rng.add_argument("--actor", default=os.environ.get("GITHUB_ACTOR", ""))

    assign = sub.add_parser("assign", help="request reviewers for a pull request")
    assign.add_argument("--pr", type=int, required=True)

    audit = sub.add_parser("audit", help="flag unreviewed merges and overdue reviews")
    audit.add_argument("--branches", nargs="+", default=["dev", "prod"])
    audit.add_argument("--since-hours", type=float, default=48)
    audit.add_argument("--issue-label", default="review-violation")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        roster = Roster.load(args.roster)
        if not args.repo:
            raise PolicyError("repository unknown: set GITHUB_REPOSITORY or pass --repo")
        gh = GitHub(args.repo, _token(args))
        handler = {"pr": cmd_pr, "range": cmd_range, "assign": cmd_assign, "audit": cmd_audit}[args.command]
        return handler(args, gh, roster)
    except PolicyError as exc:
        print(f"review policy error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
