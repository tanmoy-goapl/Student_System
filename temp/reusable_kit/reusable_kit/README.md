# Review enforcement kit

Files to copy into a repository to enforce code review on GitHub Free.
Instructions: [../REUSABLE_SETUP_GUIDE.md](../REUSABLE_SETUP_GUIDE.md).

| Path | Purpose |
|---|---|
| `scripts/review_policy.py` | The checker. Copy unchanged. Same as Protaigo `dev` after PR #86: approvals from people who wrote commits don't count, and only an intern's code may be approved by an engineer |
| `.github/review-roster.json` | Template. Replace every `REPLACE-…` login and set `enforce_from`; `high_risk_required_approvers` is optional |
| `.github/workflows/review-*.yml` | Reviewer assignment, per-PR status, scheduled audit. Adapt the two `ADAPT` lines in the audit |
| `.github/PULL_REQUEST_TEMPLATE.md` | Risk checklist. Adapt to your project |
| `tests/test_review_policy.py` | 46 tests, no network needed |
| `examples/` | Three ways to add the blocking deploy gate. Pick one |
