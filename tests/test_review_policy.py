from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts import review_policy as rp  # noqa: E402

IST = timezone(timedelta(hours=5, minutes=30))
HEAD = "a" * 40


def _roster(**overrides: Any) -> rp.Roster:
    data = {
        "enforce_from": "2026-10-05T00:00:00+05:30",
        "senior": ["sen1", "sen2"],
        "engineers": ["eng1", "eng2"],
        "interns": ["int1", "int2"],
        "never_auto_assign": ["caio"],
        "break_glass": ["caio", "sen1"],
        "high_risk_paths": ["alembic/*", ".github/*", "docker-compose*.yml"],
        "deadlines_working_hours": {"hotfix": 4, "default": 9},
        "working_hours": {"timezone_offset": "+05:30", "weekdays": [0, 1, 2, 3, 4], "start": "09:30", "end": "18:30"},
    }
    data.update(overrides)
    return rp.Roster.from_dict(data)


def _pr(author: str = "eng1", number: int = 1, merged: str | None = "2026-10-06T10:00:00Z") -> dict[str, Any]:
    return {"number": number, "user": {"login": author}, "head": {"sha": HEAD}, "labels": [], "merged_at": merged}


def _review(login: str, state: str = "APPROVED", commit: str = HEAD) -> dict[str, Any]:
    return {"user": {"login": login}, "state": state, "commit_id": commit}


# --------------------------------------------------------------------------- #
# Roster validation
# --------------------------------------------------------------------------- #


def test_repository_roster_is_valid() -> None:
    roster = rp.Roster.load(Path(".github/review-roster.json"))
    assert roster.senior and roster.engineers
    assert not roster.interns & roster.approvers
    assert "scripts/review_policy.py" in roster.high_risk_paths
    assert ".github/*" in roster.high_risk_paths
    assert not roster.high_risk_required_approvers & roster.interns


def test_roster_rejects_person_in_two_groups() -> None:
    with pytest.raises(rp.PolicyError, match="both"):
        _roster(interns=["eng1"])


def test_roster_rejects_intern_as_required_approver() -> None:
    with pytest.raises(rp.PolicyError, match="interns"):
        _roster(high_risk_required_approvers=["int1"])


def test_roster_requires_offset_on_enforce_from() -> None:
    with pytest.raises(rp.PolicyError, match="offset"):
        _roster(enforce_from="2026-10-05T00:00:00")


# --------------------------------------------------------------------------- #
# Approval rules
# --------------------------------------------------------------------------- #


def test_intern_code_can_be_approved_by_engineer_or_senior() -> None:
    for reviewer in ("eng1", "sen1"):
        assert rp.evaluate_pr(_pr("int1"), ["app/main.py"], [_review(reviewer)], set(), _roster()) == []
    problems = rp.evaluate_pr(_pr("int1"), ["app/main.py"], [_review("int2")], set(), _roster())
    assert problems and "an engineer or senior engineer" in problems[0]


def test_engineer_code_needs_senior_not_another_engineer() -> None:
    problems = rp.evaluate_pr(_pr("eng1"), ["app/main.py"], [_review("eng2")], set(), _roster())
    assert "a senior engineer" in problems[0]
    assert any("eng2 is not enough" in p for p in problems)
    assert rp.evaluate_pr(_pr("eng1"), ["app/main.py"], [_review("sen1")], set(), _roster()) == []


def test_senior_code_needs_a_different_senior() -> None:
    for reviewer in ("eng1", "sen1"):
        assert rp.evaluate_pr(_pr("sen1"), ["app/main.py"], [_review(reviewer)], set(), _roster())
    assert rp.evaluate_pr(_pr("sen1"), ["app/main.py"], [_review("sen2")], set(), _roster()) == []


def test_intern_pr_with_engineer_or_senior_commits_needs_senior() -> None:
    for writer in ("eng1", "sen1"):
        assert rp.evaluate_pr(_pr("int1"), ["app/main.py"], [_review("eng2")], set(), _roster(), {writer})
        assert rp.evaluate_pr(_pr("int1"), ["app/main.py"], [_review("sen2")], set(), _roster(), {writer}) == []
    assert rp.evaluate_pr(_pr("int1"), ["app/main.py"], [_review("eng2")], set(), _roster(), {"int2"}) == []


def test_missing_approval_fails() -> None:
    problems = rp.evaluate_pr(_pr(), ["app/main.py"], [], set(), _roster())
    assert problems and "needs 1 approval" in problems[0]


def test_author_cannot_approve_own_pull_request() -> None:
    assert rp.evaluate_pr(_pr("eng1"), ["app/main.py"], [_review("eng1")], set(), _roster())


def test_intern_approval_does_not_count() -> None:
    assert rp.evaluate_pr(_pr(), ["app/main.py"], [_review("int1")], set(), _roster())


def test_approval_on_older_commit_does_not_count() -> None:
    stale = _review("sen1", commit="b" * 40)
    assert rp.evaluate_pr(_pr(), ["app/main.py"], [stale], set(), _roster())


def test_later_changes_requested_overrides_approval() -> None:
    reviews = [_review("sen1"), _review("sen1", state="CHANGES_REQUESTED")]
    assert rp.evaluate_pr(_pr(), ["app/main.py"], reviews, set(), _roster())


def test_comment_after_approval_keeps_approval() -> None:
    reviews = [_review("sen1"), _review("sen1", state="COMMENTED")]
    assert rp.evaluate_pr(_pr(), ["app/main.py"], reviews, set(), _roster()) == []


def test_high_risk_path_needs_senior() -> None:
    # An engineer may approve an intern's ordinary change, but not a high-risk one.
    problems = rp.evaluate_pr(_pr("int1"), ["alembic/versions/x.py"], [_review("eng2")], set(), _roster())
    assert len(problems) == 1 and "high-risk" in problems[0] and "senior" in problems[0]
    assert rp.evaluate_pr(_pr("int1"), ["alembic/versions/x.py"], [_review("sen1")], set(), _roster()) == []


def test_high_risk_path_needs_every_required_approver() -> None:
    roster = _roster(high_risk_required_approvers=["caio"])
    files = ["alembic/versions/x.py"]
    problems = rp.evaluate_pr(_pr("eng1"), files, [_review("sen1")], set(), roster)
    assert len(problems) == 1 and "needs approval from caio" in problems[0]
    # The required approver is extra: a senior engineer must still approve.
    problems = rp.evaluate_pr(_pr("eng1"), files, [_review("caio")], set(), roster)
    assert problems and not any("needs approval from caio" in p for p in problems)
    assert rp.evaluate_pr(_pr("eng1"), files, [_review("sen1"), _review("caio")], set(), roster) == []


def test_required_approver_is_not_needed_outside_high_risk_paths() -> None:
    roster = _roster(high_risk_required_approvers=["caio"])
    assert rp.evaluate_pr(_pr("eng1"), ["app/x.py"], [_review("sen1")], set(), roster) == []


def test_required_approver_cannot_approve_own_high_risk_code() -> None:
    roster = _roster(high_risk_required_approvers=["caio"])
    files = ["alembic/versions/x.py"]
    assert rp.evaluate_pr(_pr("caio"), files, [_review("caio")], set(), roster)
    assert rp.evaluate_pr(_pr("caio"), files, [_review("sen1")], set(), roster) == []
    assert rp.evaluate_pr(_pr("eng1"), files, [_review("sen1")], set(), roster, {"caio"}) == []


def test_glob_matches_compose_files() -> None:
    assert rp.high_risk_files(["docker-compose.test.yml", "app/x.py"], _roster()) == ["docker-compose.test.yml"]


def test_high_cost_label_needs_two_engineers() -> None:
    labels = {"high-cost"}
    assert rp.evaluate_pr(_pr(), ["app/x.py"], [_review("eng2")], labels, _roster())
    assert rp.evaluate_pr(_pr(), ["app/x.py"], [_review("eng2"), _review("sen1")], labels, _roster()) == []


def test_commit_author_cannot_approve_pr_opened_by_someone_else() -> None:
    # eng1 opened the PR, eng2 wrote its commits and approved it: eng2 reviewed their own code.
    problems = rp.evaluate_pr(_pr("eng1"), ["app/x.py"], [_review("eng2")], set(), _roster(), {"eng2"})
    assert any("needs 1 approval" in p for p in problems)
    assert any("eng2" in p and "wrote commits" in p for p in problems)


def test_reviewer_who_wrote_no_commit_still_counts() -> None:
    reviews = [_review("eng2"), _review("sen1")]
    assert rp.evaluate_pr(_pr("eng1"), ["app/x.py"], reviews, set(), _roster(), {"eng2"}) == []


def test_senior_commit_author_cannot_be_the_senior_approval() -> None:
    files = ["alembic/versions/x.py"]
    problems = rp.evaluate_pr(_pr("eng1"), files, [_review("eng2"), _review("sen1")], set(), _roster(), {"sen1"})
    assert any("senior" in p for p in problems)
    assert rp.evaluate_pr(_pr("eng1"), files, [_review("sen2")], set(), _roster(), {"sen1"}) == []


def test_commit_authors_reduce_high_cost_approvals() -> None:
    reviews = [_review("eng2"), _review("sen1")]
    assert rp.evaluate_pr(_pr("eng1"), ["app/x.py"], reviews, {"high-cost"}, _roster(), {"sen1"})


def test_commit_logins_skip_web_flow_and_unlinked_authors() -> None:
    commits = [_commit("eng2", "web-flow"), _commit(None), _commit("eng1", "sen1")]
    assert rp.commit_logins(commits) == {"eng2", "eng1", "sen1"}


def test_author_outside_the_roster_needs_senior() -> None:
    files = ["requirements.lock.txt"]
    assert rp.evaluate_pr(_pr("dependabot[bot]"), files, [], set(), _roster())
    assert rp.evaluate_pr(_pr("dependabot[bot]"), files, [_review("eng1")], set(), _roster())
    assert rp.evaluate_pr(_pr("dependabot[bot]"), files, [_review("sen1")], set(), _roster()) == []


# --------------------------------------------------------------------------- #
# Reviewer assignment
# --------------------------------------------------------------------------- #


def test_assignment_never_picks_author_intern_or_excluded() -> None:
    roster = _roster()
    picked = set()
    for seed in range(50):
        chosen = rp.choose_reviewers("int1", ["app/x.py"], set(), set(), roster, random.Random(seed))
        assert len(chosen) == 1
        picked.add(chosen[0])
    assert picked == roster.approvers


def test_assignment_picks_a_senior_for_engineer_and_senior_code() -> None:
    roster = _roster()
    for seed in range(50):
        assert rp.choose_reviewers("eng1", ["app/x.py"], set(), set(), roster, random.Random(seed))[0] in roster.senior
        assert rp.choose_reviewers("sen1", ["app/x.py"], set(), set(), roster, random.Random(seed)) == ["sen2"]
        chosen = rp.choose_reviewers("int1", ["app/x.py"], set(), set(), roster, random.Random(seed), {"eng1"})
        assert chosen[0] in roster.senior


def test_assignment_adds_senior_for_high_risk_paths() -> None:
    roster = _roster()
    for seed in range(50):
        chosen = rp.choose_reviewers("eng1", ["alembic/x.py"], set(), set(), roster, random.Random(seed))
        assert set(chosen) & roster.senior


def test_assignment_never_picks_commit_authors() -> None:
    roster = _roster()
    for seed in range(50):
        chosen = rp.choose_reviewers(
            "eng1", ["alembic/x.py"], set(), set(), roster, random.Random(seed), {"eng2", "sen1"}
        )
        assert chosen and not set(chosen) & {"eng1", "eng2", "sen1"}
        assert "sen2" in chosen


def test_assignment_skips_when_reviewer_already_requested() -> None:
    assert rp.choose_reviewers("int1", ["app/x.py"], {"eng2"}, set(), _roster(), random.Random(0)) == []
    assert rp.choose_reviewers("eng1", ["app/x.py"], {"sen1"}, set(), _roster(), random.Random(0)) == []
    # An engineer already requested on an engineer's PR cannot approve it, so a senior is added.
    chosen = rp.choose_reviewers("eng1", ["app/x.py"], {"eng2"}, set(), _roster(), random.Random(0))
    assert len(chosen) == 1 and chosen[0] in {"sen1", "sen2"}


def test_assignment_requests_required_approver_only_for_high_risk_paths() -> None:
    roster = _roster(high_risk_required_approvers=["caio"])  # caio is also in never_auto_assign
    for seed in range(20):
        chosen = rp.choose_reviewers("eng1", ["alembic/x.py"], set(), set(), roster, random.Random(seed))
        assert len(chosen) == 2 and chosen[0] in roster.senior and chosen[1] == "caio"
        assert "caio" not in rp.choose_reviewers("eng1", ["app/x.py"], set(), set(), roster, random.Random(seed))
    assert rp.choose_reviewers("eng1", ["alembic/x.py"], {"sen1", "caio"}, set(), roster, random.Random(0)) == []
    assert rp.choose_reviewers("eng1", ["alembic/x.py"], {"sen1"}, {"caio"}, roster, random.Random(0)) == []
    assert rp.choose_reviewers("caio", ["alembic/x.py"], {"sen1"}, set(), roster, random.Random(0)) == []


# --------------------------------------------------------------------------- #
# Working hours
# --------------------------------------------------------------------------- #


def test_working_hours_skip_nights_and_weekends() -> None:
    hours = _roster().working_hours
    friday_5pm = datetime(2026, 10, 2, 17, 0, tzinfo=IST)
    monday_11am = datetime(2026, 10, 5, 11, 0, tzinfo=IST)
    assert rp.working_hours_between(friday_5pm, monday_11am, hours) == pytest.approx(3.0)


def test_working_hours_zero_when_end_before_start() -> None:
    now = datetime(2026, 10, 1, 12, 0, tzinfo=IST)
    assert rp.working_hours_between(now, now - timedelta(hours=1), _roster().working_hours) == 0.0


# --------------------------------------------------------------------------- #
# Range evaluation
# --------------------------------------------------------------------------- #


class FakeGitHub:
    def __init__(self, responses: dict[str, Any]):
        self.responses = responses

    def get(self, path: str) -> Any:
        return self.responses[path]


def _commit(author: str | None, committer: str | None = None) -> dict[str, Any]:
    def user(login: str | None) -> dict[str, str] | None:
        return {"login": login} if login else None

    return {"author": user(author), "committer": user(committer or author)}


def _facts(
    number: int,
    author: str,
    reviews: list[dict[str, Any]],
    files: list[str],
    commit_authors: list[str] | None = None,
) -> dict[str, Any]:
    return {
        f"pulls/{number}": _pr(author, number),
        f"pulls/{number}/files?per_page=100": [{"filename": f} for f in files],
        f"pulls/{number}/reviews?per_page=100": reviews,
        f"pulls/{number}/commits?per_page=100": [_commit(a) for a in (commit_authors or [author])],
    }


def test_range_flags_unreviewed_pr_and_direct_push() -> None:
    after = datetime(2026, 10, 6, 12, 0, tzinfo=IST)
    responses = {
        "commits/c1/pulls": [_pr("eng1", 10)],
        "commits/c2/pulls": [_pr("eng2", 11)],
        "commits/c3/pulls": [],
        **_facts(10, "eng1", [_review("sen1")], ["app/x.py"]),
        **_facts(11, "eng2", [], ["app/y.py"]),
    }
    result = rp.evaluate_range(FakeGitHub(responses), [("c1", after), ("c2", after), ("c3", after)], _roster())
    assert result.checked[10] == []
    assert result.checked[11]
    assert result.direct_pushes == ["c3"]
    assert result.failed


def test_range_rejects_self_review_by_commit_author() -> None:
    # Opened by one person, written by another, and approved by the person who wrote it.
    after = datetime(2026, 10, 6, 12, 0, tzinfo=IST)
    responses = {
        "commits/c1/pulls": [_pr("sen1", 13)],
        **_facts(13, "sen1", [_review("eng2")], ["app/x.py"], commit_authors=["eng2"]),
    }
    result = rp.evaluate_range(FakeGitHub(responses), [("c1", after)], _roster())
    assert result.checked[13]
    assert result.failed


def test_range_skips_history_before_enforcement() -> None:
    before = datetime(2026, 10, 1, 12, 0, tzinfo=IST)
    responses = {
        "commits/c1/pulls": [_pr("eng1", 9, merged="2026-10-01T06:00:00Z")],
        "commits/c2/pulls": [],
    }
    result = rp.evaluate_range(FakeGitHub(responses), [("c1", before), ("c2", before)], _roster(), observed_at=before)
    assert result.skipped_before_enforcement == [9]
    assert not result.direct_pushes
    assert not result.failed


def test_backdated_commit_cannot_bypass_post_enforcement_gate() -> None:
    before = datetime(2026, 10, 1, 12, 0, tzinfo=IST)
    after = datetime(2026, 10, 6, 12, 0, tzinfo=IST)
    result = rp.evaluate_range(FakeGitHub({"commits/old/pulls": []}), [("old", before)], _roster(), observed_at=after)
    assert result.direct_pushes == ["old"]
    assert result.failed


def test_range_ignores_unmerged_associated_pull_requests() -> None:
    after = datetime(2026, 10, 6, 12, 0, tzinfo=IST)
    responses = {"commits/c1/pulls": [_pr("eng1", 12, merged=None)]}
    result = rp.evaluate_range(FakeGitHub(responses), [("c1", after)], _roster())
    assert result.direct_pushes == ["c1"]


def test_warn_mode_and_break_glass_exit_codes(capsys: pytest.CaptureFixture[str]) -> None:
    roster = _roster()
    assert rp._finish(True, "enforce", "", "eng1", roster) == 1
    assert rp._finish(True, "warn", "", "eng1", roster) == 0
    assert rp._finish(True, "enforce", "outage fix", "sen1", roster) == 0
    assert rp._finish(True, "enforce", "outage fix", "eng1", roster) == 1
    assert rp._finish(False, "enforce", "", "eng1", roster) == 0


# --------------------------------------------------------------------------- #
# Workflow wiring
# --------------------------------------------------------------------------- #


WORKFLOWS = Path(".github/workflows")
CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"


@pytest.mark.parametrize("name", ["review-assign.yml", "review-status.yml", "review-audit.yml"])
def test_review_workflows_pin_actions_and_never_checkout_pr_head(name: str) -> None:
    text = (WORKFLOWS / name).read_text(encoding="utf-8")
    assert CHECKOUT in text
    assert "persist-credentials: false" in text
    assert "head.sha" not in text and "head.ref" not in text
    assert "scripts/review_policy.py" in text


def test_pull_request_template_lists_review_labels() -> None:
    text = Path(".github/PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8")
    assert "high-cost" in text and "hotfix" in text


def test_status_bootstrap_uses_only_trusted_base_and_does_not_claim_approval(tmp_path) -> None:
    import subprocess
    workflow = (WORKFLOWS / "review-status.yml").read_text(encoding="utf-8")
    assert "github.event.pull_request.base.sha" in workflow
    block = workflow.split("        run: |\n", 1)[1]
    program = "\n".join(line[10:] for line in block.splitlines())
    summary = tmp_path / "summary.md"
    result = subprocess.run(
        ["bash", "-c", program], cwd=tmp_path,
        env={"PR_NUMBER": "73", "GITHUB_STEP_SUMMARY": str(summary)},
        capture_output=True, text=True, timeout=10,
    )
    assert result.returncode == 0
    assert "human bootstrap review is required" in result.stdout
    assert "No automated approval check was performed" in summary.read_text(encoding="utf-8")


def test_roster_file_is_canonical_json() -> None:
    raw = Path(".github/review-roster.json").read_text(encoding="utf-8")
    assert json.loads(raw)["schema_version"] == 1
