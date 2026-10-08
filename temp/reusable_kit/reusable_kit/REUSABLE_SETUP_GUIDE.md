# Enforced Code Review on GitHub Free: Setup Guide for Any Repository

How to make code review mandatory for a private repository on a free GitHub plan, where GitHub itself can't require approvals. It comes with a ready-to-copy kit in [`reusable_kit/`](reusable_kit/).

## How to read this guide

| If you are… | Read |
|---|---|
| New to GitHub | Parts 1 and 2, then follow Part 5 one step at a time |
| Setting it up on your repo | Parts 3, 4 and 5 |
| Reviewing the design or security | Parts 2, 6 and 8 |
| Running it after setup | Parts 7 and 10 |

Paragraphs marked **Expert note** can be skipped on a first read. Lines marked **ADAPT** are the ones you must change for your repo.

**Contents**

1. [Is this the right approach for you?](#part-1-is-this-the-right-approach-for-you)
2. [The idea in five minutes](#part-2-the-idea-in-five-minutes)
3. [What is in the kit](#part-3-what-is-in-the-kit)
4. [Decisions to make before you start](#part-4-decisions-to-make-before-you-start)
5. [Setup, step by step](#part-5-setup-step-by-step)
6. [How the checker works](#part-6-how-the-checker-works)
7. [Using it day to day](#part-7-using-it-day-to-day)
8. [Security notes](#part-8-security-notes)
9. [Adapting it](#part-9-adapting-it)
10. [Troubleshooting](#part-10-troubleshooting)
11. [What it cannot stop](#part-11-what-it-cannot-stop)
12. [One-page checklist](#part-12-one-page-checklist)

---

## Part 1: Is this the right approach for you?

GitHub has built-in ways to require reviews: **branch protection**, **rulesets** and **CODEOWNERS**. For private repositories they need a paid plan.

| Your situation | What to do |
|---|---|
| Public repo, or a paid plan (Pro, Team, Enterprise) | Use GitHub's built-in rulesets. They block the merge button directly and need no custom code. You can still add this kit's deploy gate as a second check |
| **Private repo on GitHub Free** | **Use this guide** |

How to check:

```bash
gh api repos/<ORG>/<REPO> --jq '{private, default_branch}'
gh api repos/<ORG>/<REPO>/branches/<BRANCH>/protection
# "Upgrade to GitHub Pro or make this repository public" (HTTP 403) means: use this guide
```

You also need one thing this guide can't give you: **a single, controlled path to production**. That means a workflow or a script that everyone uses to deploy. The blocking check lives on that path. If people can deploy by hand in other ways, close those first.

---

## Part 2: The idea in five minutes

### Terms

| Term | Meaning |
|---|---|
| **Pull request (PR)** | A request to merge a branch. It is where a change is reviewed |
| **Review** | A teammate submits **Approve**, **Request changes** or **Comment** on a PR. GitHub records who, and on which commit |
| **Workflow** | A YAML file in `.github/workflows/` that GitHub Actions runs on an event, such as "PR opened" |
| **Check** | A workflow's result on a PR: green, red or running |
| **Team** | A named group of org members that you grant repo access to |
| **Base permission** | The access every org member gets on every repo by default |
| **Commit ID (SHA)** | The 40-character ID of one exact version of the code |

### The design

GitHub Free can't block the **merge button**. So this design doesn't try to. It blocks unreviewed code at the point it must pass to reach production, which you control.

| Lock | Where | Blocks? |
|---|---|---|
| 1. Access | GitHub teams and org settings: who can push and merge | Yes |
| 2. Deploy gate | Your promotion workflow or deploy script: is every change in this release reviewed? | **Yes** |

Three helpers make it usable day to day. None of them blocks anything.

| Helper | What it does |
|---|---|
| Review Assign | Requests a reviewer when a PR opens |
| Review Status | Shows a red or green check on each PR |
| Review Audit | On a schedule: lists unreviewed merges and reminds late reviewers |

```
PR opened ──► Review Assign (requests reviewers)
     ├──────► your CI (tests)
     ├──────► Review Status (signal: approvals complete?)
     ▼
merged ─────► Review Audit (flags unreviewed merges)
     ▼
deploy gate ─► every PR in this release reviewed? ── no ──► release stops
     ▼ yes
production
```

Everything runs **one script** (`scripts/review_policy.py`) that reads **one file** (`.github/review-roster.json`).

> **Machine review is separate.** The org's central [automated-code-review](https://github.com/Galaxy-Office-Automation/automated-code-review) action checks each PR with ruff and Semgrep (an in-house AI reviewer comes later). You can add it alongside this kit, but it **never approves a PR and never counts as a review**. Only the people in the roster do.

### The default rules

| Rule | Requirement |
|---|---|
| Intern code | 1 approval from an engineer or a senior |
| Engineer code | 1 approval from a senior. Another engineer's approval doesn't count |
| Senior code | 1 approval from a **different** senior |
| Everyone | The approval must be **on the final commit**, from someone who **didn't open the PR and didn't write any of its commits** |
| Senior review | PRs touching a high-risk path need a senior approval, whoever wrote them |
| Required approvers | PRs touching a high-risk path also need every login in `high_risk_required_approvers` (optional; empty means none) |
| High-cost review | PRs labelled `high-cost` need 2 approvals from engineers or seniors |
| Intern approvals | Recorded, never counted |
| No self-review | Approvals from anyone who authored or committed code in the PR don't count, even if someone else opened it |
| No direct pushes | Every commit in a release must belong to a merged PR |
| Deadlines | Reviewers are reminded after a set number of working hours |
| Start date | Only PRs merged on or after `enforce_from` are checked |

"Who wrote the code" means the person who opened the PR **and** everyone who authored or committed code in it. One engineer commit in an intern's PR means the PR needs a senior. Anyone outside the roster (a bot such as Dependabot, a manager) is treated like an engineer: a senior must approve.

---

## Part 3: What is in the kit

| File in `reusable_kit/` | Copy to your repo as | Change needed |
|---|---|---|
| `scripts/review_policy.py` | same path | None. Python 3.11 or later, standard library only |
| `.github/review-roster.json` | same path | **Fill in** (Part 5, step 4) |
| `.github/workflows/review-assign.yml` | same path | None |
| `.github/workflows/review-status.yml` | same path | None |
| `.github/workflows/review-audit.yml` | same path | **ADAPT:** branch names and schedule |
| `.github/PULL_REQUEST_TEMPLATE.md` | same path | Adapt the risk checklist |
| `tests/test_review_policy.py` | same path | None |
| `examples/promote-workflow.yml` | `.github/workflows/promote.yml` | **ADAPT:** branch names. Gate pattern A |
| `examples/deploy-workflow-step.yml` | paste into your deploy workflow | **ADAPT:** how the deployed commit is found. Gate pattern B |
| `examples/deploy-script-gate.sh` | next to your deploy script | None. Gate pattern C |

How each file was verified:

| File | Verification |
|---|---|
| `review_policy.py`, the three `review-*.yml` workflows | Identical to the checker on Protaigo's `dev` branch, where the commit-author rule, the hierarchy and required approvers went live on 2026-10-07 (PRs #82 and #86) |
| `tests/test_review_policy.py` | 46 tests pass when run from the kit alone |
| `deploy-script-gate.sh` | Run against a real repository: passed a valid range, and refused a branch name and a non-descendant candidate |
| `promote-workflow.yml`, `deploy-workflow-step.yml` | Adapted from a working promotion workflow. They parse as valid YAML, but **haven't been run as written**. Test them with `REVIEW_POLICY_MODE: warn` first |

---

## Part 4: Decisions to make before you start

Write these down first. Most of them go into the roster file.

| # | Decision | Guidance |
|---|---|---|
| 1 | **Seniors:** who approves engineers' and seniors' code, and every high-risk change? | At least 3, and enough of them for the volume: every PR not written only by interns lands on them. With fewer than 3, one absence leaves a senior's own PRs with no approver |
| 2 | **Engineers:** who approves interns' code? | Engineers can approve only interns' code. If you want engineers to approve each other, put them in `senior` instead (Part 9) |
| 3 | **Interns / trainees:** who reviews but doesn't count? | Leave empty if you have none |
| 4 | **Never auto-assigned:** who should Review Assign skip? | Managers, people on long leave |
| 5 | **Break-glass:** who may release without review in an emergency? | 2 people. Not everyone |
| 6 | **High-risk paths:** which files need a senior? | CI and deploy files, database migrations, security config, infrastructure, anything that runs commands on servers. Always include `.github/*` and `scripts/review_policy.py` |
| 6b | **Required approvers:** must one named person (for example a CTO) approve every high-risk change? | Optional. Each one becomes a single point of failure: if they are away, no high-risk change can be released except through break-glass. Wire break-glass in first |
| 7 | **Deadlines and working hours** | For example 4 working hours for `hotfix`, 1 working day otherwise |
| 8 | **Start date** (`enforce_from`) | 1 to 2 weeks ahead. Check that enough approvers are available on that date |
| 9 | **Where is the deploy gate?** | Pattern A, B or C in step 6 |
| 10 | **How do you know which commit is deployed now?** | A production branch, a tag, an image label, or a version file |

---

## Part 5: Setup, step by step

Replace `<ORG>` and `<REPO>` throughout.

### Step 1: Look at what you have

```bash
R=<ORG>/<REPO>
gh api repos/$R --jq '{private, default_branch}'
gh api repos/$R/collaborators --jq '.[] | "\(.login) \(.role_name)"'      # who has what access
gh pr list -R $R --state merged --limit 40 --json reviews \
  -q '[.[] | select(.reviews | length > 0)] | length'                      # how many of the last 40 PRs were reviewed
```

If almost everyone shows `admin`, the org's base permission is probably Admin. Step 2 deals with it.

### Step 2: Set up access (lock 1)

**2a. Create teams and grant them the repo.** Any org member can create a team and becomes its maintainer. Granting a repo needs admin on that repo.

```bash
ORG=<ORG>; REPO=<REPO>

for t in myapp-admins myapp-engineers myapp-interns; do
  gh api -X POST "orgs/$ORG/teams" -f name="$t" -f privacy=closed
done

add() { gh api -X PUT "orgs/$ORG/teams/$1/memberships/$2" -f role=member; }
add myapp-engineers <login>          # one line per person; do NOT add yourself

gh api -X PUT "orgs/$ORG/teams/myapp-admins/repos/$ORG/$REPO"    -f permission=admin
gh api -X PUT "orgs/$ORG/teams/myapp-engineers/repos/$ORG/$REPO" -f permission=push
gh api -X PUT "orgs/$ORG/teams/myapp-interns/repos/$ORG/$REPO"   -f permission=pull

gh api "orgs/$ORG/teams/myapp-engineers/members" --jq '.[].login'         # verify
```

> **Warning: don't re-add yourself with `role=member`.** As the creator you are already the team's maintainer. Adding yourself again as a plain member removes that role, and you can no longer manage the team without an org owner.

Suggested access:

| Group | Permission | Why |
|---|---|---|
| 2 admins | Admin | Settings and emergencies |
| Engineers and seniors | Write | Push branches and merge |
| Interns | Read, working from forks | They can't push to shared branches or merge |

**2b. Lower the org base permission (org owner only).** A person's access is the **highest** of everything they have. Teams can't reduce access while the base permission is high.

> Organization → Settings → Member privileges → **Base permissions** → Read (or No permission)
> Same page, if interns use forks: **Allow forking of private repositories**

Before the change, grant write access to everyone who needs it on **other** repos, or they drop to read-only there. After the change, verify:

```bash
gh api repos/$ORG/$REPO/collaborators/<login>/permission --jq .role_name
```

### Step 3: Copy the kit files

From the root of a new branch in your repo:

```bash
KIT=/path/to/reusable_kit
mkdir -p scripts tests .github/workflows
cp $KIT/scripts/review_policy.py            scripts/
cp $KIT/tests/test_review_policy.py         tests/
cp $KIT/.github/review-roster.json          .github/
cp $KIT/.github/PULL_REQUEST_TEMPLATE.md    .github/
cp $KIT/.github/workflows/review-*.yml      .github/workflows/
```

### Step 4: Fill in the roster

Edit `.github/review-roster.json`:

```json
{
  "schema_version": 1,
  "enforce_from": "2099-01-01T00:00:00+00:00",
  "senior": ["REPLACE-senior-login-1", "REPLACE-senior-login-2"],
  "engineers": ["REPLACE-engineer-login-1", "REPLACE-engineer-login-2"],
  "interns": ["REPLACE-intern-login-1"],
  "never_auto_assign": [],
  "break_glass": ["REPLACE-senior-login-1"],
  "high_risk_required_approvers": [],
  "high_risk_paths": [
    ".github/*",
    "scripts/review_policy.py",
    "Dockerfile",
    "docker-compose*.yml",
    "migrations/*",
    "deploy/*"
  ],
  "deadlines_working_hours": {"hotfix": 4, "default": 8},
  "working_hours": {
    "timezone_offset": "+00:00",
    "weekdays": [0, 1, 2, 3, 4],
    "start": "09:00",
    "end": "17:00"
  }
}
```

| Field | Meaning and rules |
|---|---|
| `enforce_from` | PRs merged before this moment aren't checked. ISO 8601 **with a UTC offset**. The template's far-future date means nothing blocks until you set it |
| `senior`, `engineers`, `interns` | Exact GitHub logins. A login may appear in only one group. At least one senior is required |
| `never_auto_assign` | Skipped by Review Assign's random picks. They can still approve if they are in a group |
| `break_glass` | Who may use the emergency override |
| `high_risk_required_approvers` | Optional. Logins that must **all** approve every high-risk change, on top of the senior approval. They needn't be in a group, but can't be interns. Review Assign requests them on high-risk PRs even if they are in `never_auto_assign`. Their own high-risk PRs need only the senior |
| `high_risk_paths` | Glob patterns matched against each changed file's full path. `*` also matches `/`, so `migrations/*` covers everything under `migrations/` |
| `deadlines_working_hours` | Hours before a reminder. `default` is required |
| `working_hours` | `weekdays`: 0 = Monday … 6 = Sunday. `timezone_offset` like `+05:30` |

Check the file loads:

```bash
python3 -c "
import sys; sys.path.insert(0, '.')
from pathlib import Path
from scripts.review_policy import Roster
r = Roster.load(Path('.github/review-roster.json'))
print('seniors:', sorted(r.senior)); print('starts:', r.enforce_from)"
```

### Step 5: Adapt the audit workflow

In `.github/workflows/review-audit.yml`, change the two **ADAPT** lines:

```yaml
on:
  schedule:
    # ADAPT: cron is in UTC. This is hourly, 04:00-13:00 UTC, Monday to Friday.
    - cron: "0 4-13 * * 1-5"
# ...
        # ADAPT: list your long-lived branches (for example: main, or dev prod).
        run: python3 scripts/review_policy.py audit --branches dev prod --issue-label review-violation
```

The other two workflows need no changes. For reference, Review Assign:

```yaml
name: Review Assign

# Runs from the base branch, so it also works for pull requests from forks.
# The pull request's own code is never checked out or executed.
on:
  pull_request_target:
    types: [opened, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  assign:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          persist-credentials: false
      - name: Request a random engineer, plus a senior for high-risk paths
        env:
          GH_TOKEN: ${{ github.token }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: python3 scripts/review_policy.py assign --pr "$PR_NUMBER"
```

And Review Status (shortened):

```yaml
on:
  pull_request_target:
    types: [opened, reopened, synchronize, labeled, unlabeled, ready_for_review]
  pull_request_review:
    types: [submitted, dismissed]

permissions:
  contents: read
  pull-requests: read
# ...
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          ref: ${{ github.event.pull_request.base.sha }}     # the base, never the PR's code
          persist-credentials: false
      - name: Evaluate the review policy for this pull request
        run: python3 scripts/review_policy.py pr --pr "$PR_NUMBER" --summary "$GITHUB_STEP_SUMMARY"
```

### Step 6: Add the deploy gate (lock 2)

This is the step that makes review mandatory. Pick the pattern that matches how you deploy. All three do the same thing:

1. Find the commit **deployed now** and the **candidate** commit.
2. Take the roster and the checker from the **deployed** version (the "trusted copy").
3. Run `review_policy.py range --base <deployed> --head <candidate>`.
4. Stop if it exits non-zero.

| Pattern | Use when | Kit file |
|---|---|---|
| **A. Promotion workflow** | You have a production branch (for example `dev` → `prod`) | `examples/promote-workflow.yml` |
| **B. Step in a deploy workflow** | GitHub Actions deploys for you | `examples/deploy-workflow-step.yml` |
| **C. Function in a deploy script** | A script on your own server deploys | `examples/deploy-script-gate.sh` |

**Pattern A.** The gate step from `promote-workflow.yml`:

```yaml
      - name: Verify every pull request in this promotion was reviewed
        env:
          GH_TOKEN: ${{ github.token }}
          CANDIDATE_SHA: ${{ inputs.candidate_sha }}
          BREAK_GLASS_REASON: ${{ inputs.break_glass_reason }}
          REVIEW_POLICY_MODE: enforce # use "warn" for a trial period
        run: |
          set -euo pipefail
          # Trusted copy: take the roster and the checker from what is already in
          # production, so a promotion cannot approve itself by editing them.
          ref="origin/$TARGET_BRANCH"
          if ! git cat-file -e "$ref:.github/review-roster.json" 2>/dev/null; then
            echo "No roster in production yet; using the candidate's copy for this promotion"
            ref="$CANDIDATE_SHA"
          fi
          git show "$ref:.github/review-roster.json" > "$RUNNER_TEMP/review-roster.json"
          git show "$ref:scripts/review_policy.py" > "$RUNNER_TEMP/review_policy.py"
          python3 "$RUNNER_TEMP/review_policy.py" \
            --repository "$GITHUB_WORKSPACE" --roster "$RUNNER_TEMP/review-roster.json" \
            range --base "origin/$TARGET_BRANCH" --head "$CANDIDATE_SHA" \
            --break-glass "$BREAK_GLASS_REASON" --actor "$GITHUB_ACTOR" \
            --summary "$GITHUB_STEP_SUMMARY"
```

The workflow needs `fetch-depth: 0` on checkout and these permissions: `contents: write` (to move the production branch) and `pull-requests: read`. Place this step **before** the step that pushes.

**Pattern B.** Paste the step from `deploy-workflow-step.yml` before your deploy step. The one line to adapt is how the deployed commit is found:

```bash
DEPLOYED_SHA="$(git rev-parse 'refs/tags/deployed-prod^{commit}')"    # a tag you move after each deploy
# or: DEPLOYED_SHA="$(git rev-parse origin/prod)"                     # a production branch
# or: read it from an endpoint or file that reports the running version
```

**Pattern C.** In your deploy script:

```bash
source ./deploy-script-gate.sh

DEPLOYED_SHA="$(cat /opt/myapp/REVISION)"       # ADAPT: however you record what is running
CANDIDATE_SHA="$(git rev-parse HEAD)"

REVIEW_REPO=<ORG>/<REPO> review_gate "$DEPLOYED_SHA" "$CANDIDATE_SHA" || {
  echo "Deployment stopped: review policy failed" >&2
  exit 1
}

# ...build and deploy...
echo "$CANDIDATE_SHA" > /opt/myapp/REVISION     # record the new running version
```

The function refuses branch names (it needs exact commit IDs) and refuses a candidate that doesn't contain the deployed commit. Call it **twice** if your script takes a long time: once at the start, and again just before it changes anything.

The server needs a GitHub token that can read contents and pull requests. Use a dedicated read-only token, not a person's login (see Part 8).

**How to record the deployed commit.** Pick one and use it every time:

| Method | How |
|---|---|
| Production branch | The branch is only moved by your promotion workflow |
| Tag | `git tag -f deployed-prod <sha> && git push -f origin deployed-prod` after each deploy |
| Container image label | Build with `--label org.opencontainers.image.revision=<sha>`, read it with `docker inspect` |
| Version file | Write the commit ID to a file on the server after each deploy |

### Step 7: Labels and the PR template

```bash
gh label create high-cost -R <ORG>/<REPO> --description "Needs two approvals"
gh label create hotfix    -R <ORG>/<REPO> --description "Urgent: shorter review deadline"
gh label create review-violation -R <ORG>/<REPO> --description "Opened by the review audit"
```

Edit `.github/PULL_REQUEST_TEMPLATE.md` so the risk checklist names your project's real risks. Keep the two lines about `high-cost` and `hotfix`.

### Step 8: Run the tests, and add them to CI

```bash
python3 -m pytest -q tests/test_review_policy.py
```

They need no network. They cover the rules, reviewer assignment, working-hours maths, range checks and the workflow wiring. If your repo's `pytest` configuration uses strict markers, the tests work as they are.

### Step 9: If AI coding agents work on the repo

Add a rule to your agent instructions (for example `AGENTS.md` or `CLAUDE.md`):

> An agent's review is a pre-review. Record its findings in the PR, but it never replaces a human approval. Agents never approve PRs, never use break-glass and never impersonate a reviewer.

**Identities matter, because the checker uses them.** Approvals from anyone whose GitHub login authored or committed code in the PR don't count. So:

- Each person commits under **their own** identity: `git -c user.name=<login> -c user.email=<id>+<login>@users.noreply.github.com commit …`. On a shared server or shared Unix account, never commit or push with someone else's `gh` login, SSH key or git config: the work is attributed to them, and they can no longer approve it.
- If agents open PRs under a person's account, that person can never approve them. Consider a separate bot account for agents.
- Make sure each person's commit email is linked to their GitHub account (the `noreply` address always is). Commits from an unlinked email can't be attributed, and then only the PR opener is excluded.

To keep tool attribution lines ("Co-Authored-By", "Generated with") out of commits and PR descriptions for everyone using Claude Code in the repository, add `.claude/settings.json`:

```json
{
  "attribution": { "commit": "", "pr": "", "sessionUrl": false }
}
```

Track only that file: add `.claude/*` and `!.claude/settings.json` to `.gitignore`, so personal `settings.local.json` files stay out.

### Step 10: Merge, then test each piece

Open one PR with everything from steps 3 to 9. **Review Assign and Review Status only start working after this PR is merged**, because they run from the base branch. The audit only runs from the default branch.

Then verify, in this order:

| # | Test | Expected |
|---|---|---|
| 1 | Open a small test PR as an intern | `assign` requests an engineer or senior. `review-status` is **red**: "needs 1 approval…" |
| 2 | An engineer approves it | `review-status` turns green |
| 2b | An engineer opens a PR; another engineer approves | Stays red: "approval from … is not enough: only an intern's code can be approved by an engineer". A senior approves: green |
| 2c | A senior opens a PR | `assign` requests a different senior; only that kind of approval turns it green |
| 3 | The author pushes one more commit | `review-status` turns red again (the approval was for the older commit) |
| 4 | An intern approves a PR | Stays red |
| 5 | The author approves their own PR | GitHub refuses, and the script wouldn't count it |
| 5b | Person A opens a PR containing commits written by person B; B approves | Stays red: "approval from B does not count: they wrote commits in this PR" |
| 6 | An intern opens a PR that changes a high-risk path; an engineer approves | Still red: "needs a senior approval". A senior was requested |
| 6b | If you set `high_risk_required_approvers`: a senior approves a high-risk PR | Still red: "needs approval from <login>" until that person approves too. They were requested |
| 7 | Add the `high-cost` label to an approved PR | Red until a second approval |
| 8 | Run the audit by hand: Actions → Review Audit → Run workflow | Succeeds and prints `audit: clean` or records violations |
| 9 | Run the checker on a range from your machine | Lists each PR as reviewed, failing or pre-enforcement |
| 10 | Run the deploy gate with `REVIEW_POLICY_MODE=warn` | Reports problems, exits 0 |

Test 9, read-only:

```bash
export GH_TOKEN=$(gh auth token)
python3 scripts/review_policy.py --repo <ORG>/<REPO> pr --pr <NUMBER>
python3 scripts/review_policy.py --repo <ORG>/<REPO> range --base origin/<PROD_BRANCH> --head origin/<DEV_BRANCH>
```

### Step 11: Go live

1. Tell the team the rules, the start date and what a red `review-status` means.
2. Set `enforce_from` to the start date in a PR (a senior approves it, plus any required approvers, since it is under `.github/`). If you bring the date **forward**, pick a moment just after the last merge, never in the past: every PR merged after `enforce_from` is judged, including ones merged before the date change.
3. Make sure the deploy gate runs with `REVIEW_POLICY_MODE: enforce`.
4. Release once, so the roster with the real date becomes the **trusted copy**.

**A roster or checker change takes effect one release later**, because the gate reads the deployed copy. Plan date changes with that in mind.

---

## Part 6: How the checker works

### The core rule

```python
def current_approvers(reviews, author, final_sha, excluded=()):
    """Logins whose latest verdict approves the exact final commit."""
    latest = {}
    for review in reviews:  # GitHub returns reviews oldest first
        user = (review.get("user") or {}).get("login")
        if user and review.get("state") in REVIEW_STATES:   # APPROVED, CHANGES_REQUESTED, DISMISSED
            latest[user] = review
    return {
        login
        for login, review in latest.items()
        if review["state"] == "APPROVED"
        and review.get("commit_id") == final_sha
        and login != author
        and login not in excluded                          # people who wrote commits in the PR
    }


def needs_senior_review(writers, roster):
    """Only code written entirely by interns may be approved by an engineer."""
    return bool(set(writers) - roster.interns)


def evaluate_pr(pr, filenames, reviews, labels, roster, commit_authors=()):
    """Return the unmet review requirements for one pull request."""
    author = pr["user"]["login"]
    writers = set(commit_authors) - {author}
    approvers = current_approvers(reviews, author, pr["head"]["sha"], excluded=writers)
    qualified = approvers & roster.approvers            # seniors + engineers
    senior_only = needs_senior_review(writers | {author}, roster)
    problems = []
    if not (approvers & roster.senior if senior_only else qualified):
        problems.append("needs 1 approval on the final commit from a senior engineer (or, for an "
                        "intern's code, an engineer or senior engineer) who did not open the PR or write its commits")
    risky = high_risk_files(filenames, roster)
    if risky:
        if not approvers & roster.senior:
            problems.append(f"touches high-risk paths ({', '.join(risky[:3])}): needs a senior approval")
        missing = roster.high_risk_required_approvers - approvers - writers - {author}
        if missing:
            problems.append(f"touches high-risk paths (...): needs approval from {', '.join(sorted(missing))}")
    if "high-cost" in labels and len(qualified) < 2:
        problems.append("labelled high-cost: needs 2 engineer approvals")
    # (when something is missing, it also names discounted approvals: an engineer's on a
    #  non-intern PR, or one from someone who wrote commits)
    return problems
```

(Shortened. The real messages name the level that was needed: "a senior engineer" or "an engineer or senior engineer".)

- Only each reviewer's **latest** verdict counts. A later "Request changes" cancels an approval. A later plain comment doesn't.
- `commit_id == final_sha` enforces "approval on the final commit". GitHub Free can't dismiss stale approvals, so the script does the comparison itself.
- **Commit authors** come from the PR's commit list (`GET pulls/N/commits`): the GitHub login of each commit's author and committer. GitHub's own `web-flow` account (commits made in the web UI) is ignored. A commit whose email isn't linked to any GitHub account has no login, so nobody can be excluded for it.
- **Who wrote the code** is the PR opener plus every commit author. Only if all of them are interns may an engineer approve. Anyone outside the roster counts as "not an intern".
- **Required approvers** are checked only when a high-risk file changed. One who wrote the code is skipped, because nobody can approve their own work; the senior rule still applies.
- An empty list means the PR passes.

### Checking a release

`range --base A --head B` lists the commits in `A..B` and, for each one, asks GitHub which merged PR it belongs to.

| Case | Result |
|---|---|
| Commit belongs to a PR merged on or after `enforce_from` | The PR is evaluated once with `evaluate_pr` |
| Commit belongs to a PR merged before `enforce_from` | Reported as "merged before the policy started" |
| Commit belongs to no merged PR | **Direct push: fails** (once the policy has started) |

### Commands

| Command | Used by | Exit code |
|---|---|---|
| `pr --pr N [--summary FILE]` | Review Status | 1 if requirements are unmet |
| `range --base A --head B [--mode warn\|enforce] [--break-glass REASON --actor LOGIN]` | Deploy gate | 1 if anything fails in `enforce` mode |
| `assign --pr N` | Review Assign | 0 |
| `audit [--branches …] [--since-hours 48] [--issue-label …]` | Review Audit | 0 |

Global options go **before** the command: `--repo owner/name` (defaults to `$GITHUB_REPOSITORY`), `--roster PATH`, `--repository PATH` (the local git checkout), `--token-file PATH`. The token comes from `GH_TOKEN` or `GITHUB_TOKEN`. Exit code 2 means a configuration or API error.

### What the helpers do

| Helper | Behaviour |
|---|---|
| **assign** | Skips drafts and closed PRs. If nobody allowed to approve this PR is already requested or has approved, picks one at random: an engineer or senior for interns' code, a senior otherwise. Never the PR's author, anyone who wrote its commits, or anyone in `never_auto_assign`. If high-risk files changed, adds a random senior when none is involved, and requests every required approver who isn't involved yet |
| **audit** | Checks the last 48 hours of each listed branch. Keeps one open issue titled "Review policy violations" and closes it when clean. Comments once on each open PR that has waited past its deadline |
| **break-glass** | On a failing `range`, a reason plus an `--actor` listed in `break_glass` turns the result into a pass and prints `BREAK-GLASS by <login>: <reason>` |

### Permissions each piece needs

| Piece | Token permissions |
|---|---|
| Review Assign | `contents: read`, `pull-requests: write` |
| Review Status | `contents: read`, `pull-requests: read` |
| Review Audit | `contents: read`, `issues: write`, `pull-requests: write` |
| Deploy gate in a workflow | `contents: read` (or `write` if it moves a branch), `pull-requests: read` |
| Deploy gate on a server | A fine-grained token: Contents read, Pull requests read, Metadata read, on this repo only |

---

## Part 7: Using it day to day

### Authors

1. Branch from the latest shared branch, make the change, open a PR.
2. Fill in the template. Add `high-cost` or `hotfix` if they apply.
3. `review-status` is **red until the approvals are complete**. That is not a failure of your code. Open the run's **Summary** to see what is missing.
4. If you push again after an approval, ask the reviewer to approve again.

### Reviewers

1. PR → **Files changed** → read the change and the risk checklist.
2. **Review changes** → **Approve** or **Request changes** → **Submit review**.
3. If you can't review in time, say so on the PR so the author can ask someone else.

### Whoever releases

1. Run the promotion or deploy as usual.
2. If the gate stops it, read the Summary or log. It names each PR and what is missing.
3. Get those PRs approved. **Approving after the merge is allowed**: GitHub accepts reviews on merged PRs. Then run it again.
4. In a real emergency, a person listed in `break_glass` can give a reason to override. The PR should still be reviewed afterwards.

### Maintainers

| Task | How |
|---|---|
| Add or remove a person | Edit the roster in a PR, and update the GitHub team |
| Someone is away for weeks | Add them to `never_auto_assign` |
| Add a high-risk path | Add a glob to `high_risk_paths` |
| Require one person on every high-risk change | Add their login to `high_risk_required_approvers` |
| Change a rule | Edit `evaluate_pr`, add a test |
| Run the audit now | Actions → Review Audit → Run workflow |

---

## Part 8: Security notes

| Topic | What the design does | What you must keep true |
|---|---|---|
| **A change must not judge itself** | The deploy gate reads the roster and checker from the deployed version | Never point the gate at the candidate's copy, except for the first release |
| **Fork PRs** | Assign and Status use `pull_request_target`, which has a usable token, and check out only the base | Never check out or run PR code in these workflows. A test asserts `head.sha` and `head.ref` don't appear in them |
| **Stale approvals** | Approvals count only on the final commit | Don't remove the `commit_id` comparison |
| **Self-review via a second account** | Approvals from commit authors and committers don't count, not just the PR opener's | Keep the `commit_authors` exclusion. Make sure everyone's commit email is linked to their GitHub account |
| **Shared machines and accounts** | Identities come from GitHub logins and commit metadata | Never push or call the API with another person's credentials; it attributes the work to them and removes their right to approve it |
| **Backdated commits** | A direct push fails if either its timestamp or the current time is past `enforce_from` | Leave `observed_at` in `evaluate_range` |
| **Third-party actions** | Only `actions/checkout`, pinned to a full commit SHA | Pin any action you add. Update the pin deliberately |
| **Tokens** | Passed through the environment, never printed or saved | On servers, use a dedicated read-only token. A personal login breaks releases when that person leaves |
| **The roster itself** | `.github/*` and `scripts/review_policy.py` are high-risk paths | Keep both in `high_risk_paths` |
| **Seniority by proxy** | A senior can't get an engineer to approve their code by having an intern open the PR: every commit author counts as a writer | Keep commit authors in `needs_senior_review` |
| **Break-glass on a server** | `--actor` is whatever the caller passes | Treat it as a recorded statement, not proof of identity. Limit who can run the deploy script |

> **Expert note.** For `pull_request_review` events on fork PRs, GitHub runs the workflow file from the PR itself, so a fork author could alter Review Status on their own PR. That affects only the signal. The deploy gate always runs trusted code.

---

## Part 9: Adapting it

| Your situation | Change |
|---|---|
| One branch (`main`) and deploys from it | Use gate pattern B or C with a `deployed-prod` tag. Set the audit to `--branches main` |
| No interns | `"interns": []` |
| Everyone is equally senior, or engineers should approve each other | Put them all in `senior`, leave `engineers` empty |
| No mandatory individual approver | `"high_risk_required_approvers": []` (the default) |
| Different deadlines or time zone | Edit `deadlines_working_hours` and `working_hours` |
| Six-day week | `"weekdays": [0, 1, 2, 3, 4, 5]` |
| Monorepo with several teams | Start with one roster. For per-directory approvers, extend `evaluate_pr` and add tests |
| GitHub Enterprise Server | Change `API_ROOT` at the top of `review_policy.py` to your API address |
| More than 2 approvals for some label | Add a rule next to the `high-cost` one in `evaluate_pr`, and a test |
| Several repos | Copy the kit into each. Keep one roster per repo, since approvers differ |
| Squash or rebase merges | Supported: the script asks GitHub which PR each commit belongs to |

---

## Part 10: Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Review Assign and Review Status never run | The workflows aren't on the base branch yet | Merge the setup PR first |
| Review Audit never runs | It isn't on the **default** branch, or GitHub is delaying scheduled runs | Check the default branch. Start it by hand to test. Delays of hours are normal |
| `review-status` is red on every PR | No approvals yet | Expected. Read the run's Summary |
| Approved, but still red | Author pushed after the approval; or the approver is an intern, the author, or not in the roster | Approve again on the latest commit, or use a qualified reviewer |
| "approval from X is not enough: only an intern's code can be approved by an engineer" | An engineer approved code written by an engineer, a senior or someone outside the roster | Ask a senior who didn't write it |
| "needs approval from <login>" | High-risk change, and that login is in `high_risk_required_approvers` | Ask them. If they are away, only break-glass gets it released |
| A reviewer requested together with others doesn't appear | Seen on Protaigo: requesting two reviewers in one call silently dropped one of them (cause unknown) | Check the PR's reviewer list; request the missing person on their own |
| Engineer approved a high-risk PR, still red | It needs a senior | Ask a senior |
| "approval from X does not count: they wrote commits in this PR" | X authored or committed code in the PR, even though someone else opened it | Ask a qualified reviewer who didn't write any of the PR's code |
| The PR shows one red and one green `review-status` | Each event (PR opened, review submitted) leaves its own run. The red one is from before the approval | Ignore it, or open the red run and choose **Re-run jobs**; it turns green |
| Review Assign requested nobody | Someone qualified was already requested, or the pool is empty after excluding the author | Check the roster |
| `review policy error: … HTTP 403` or `404` | Token lacks access, or `--repo` is wrong | Check workflow `permissions:` or the server token |
| `repository unknown` | `GITHUB_REPOSITORY` isn't set outside Actions | Pass `--repo owner/name` before the command |
| `git log A..B failed` in the gate | Shallow checkout | `fetch-depth: 0` |
| Gate says "commit is not part of any merged pull request" | A direct push | Open a PR containing that commit and get it approved, or revert it |
| Roster change has no effect at the gate | The gate uses the deployed copy | It applies from the next release |
| `gh` fails on a server behind a proxy | The proxy blocks GitHub's API | Run with the proxy variables unset |
| A team membership change returns 403 | You aren't that team's maintainer | Ask an owner, or use a team you created |
| Someone removed from all teams still has admin | The org base permission is still Admin, and access is the **highest** of all sources | An org owner lowers the base permission (step 2b). The API can't show the base permission to non-owners; check a person with `collaborators/<login>/permission` |

---

## Part 11: What it cannot stop

| Gap | Why | What limits the damage |
|---|---|---|
| Merging without approval | GitHub Free can't block the merge button | The audit flags it, and the deploy gate blocks the release until someone approves |
| An admin pushing straight to the production branch | No branch protection | The deploy gate fails on commits with no PR. Keep admins to 2 |
| Deploying outside the gated path | The gate only exists on that path | Restrict who can deploy by hand. Record and check the running version |
| Two people approving each other without reading | Policy can't measure care | Random assignment, and occasional sampling by a lead |
| A required approver is away | The rule has no stand-in | Break-glass at the deploy gate; or remove them from `high_risk_required_approvers` in a reviewed PR |
| Commits under an email not linked to GitHub | No login can be attributed to them | Ask everyone to commit with their `noreply` address or a linked email; spot-check commit authors on high-risk PRs |
| One person using another's credentials | The checker trusts GitHub's record of who did what | Personal credentials only; dedicated tokens for servers and bots |
| Changes made directly on a server | They never become commits | Deploy only from the repo. Compare running code with the release |

---

## Part 12: One-page checklist

**Before**

- [ ] Private repo on GitHub Free confirmed (otherwise use built-in rulesets)
- [ ] One controlled path to production exists
- [ ] Roster agreed: at least 3 seniors, engineers, interns, break-glass people
- [ ] Seniors know they review all engineers' and seniors' code
- [ ] High-risk paths agreed, and any required approvers (each one is a single point of failure)
- [ ] Start date chosen, with enough approvers available

**Access**

- [ ] Teams created and granted the repo (admin / write / read)
- [ ] Your own maintainer role kept
- [ ] Org owner lowered the base permission
- [ ] Private forking turned on, if interns use forks
- [ ] Access verified for one person in each group

**Files**

- [ ] `scripts/review_policy.py` copied
- [ ] `.github/review-roster.json` filled in and loads without error
- [ ] Three `review-*.yml` workflows copied; audit branches and schedule adapted
- [ ] PR template adapted
- [ ] Tests copied and passing, and running in CI
- [ ] Deploy gate added (pattern A, B or C), before anything is changed
- [ ] The gate reads the roster and checker from the deployed version
- [ ] Labels created: `high-cost`, `hotfix`, `review-violation`
- [ ] Agent rule added, if agents work on the repo
- [ ] Everyone commits under their own identity, with an email linked to GitHub
- [ ] Optional: `.claude/settings.json` turns off tool attribution lines
- [ ] Optional: machine review (automated-code-review) added; it never counts as a review

**Verify (after merging the setup PR)**

- [ ] Reviewer is requested on a new PR
- [ ] `review-status` is red, then green after approval
- [ ] A new push after approval turns it red again
- [ ] An engineer's approval on an engineer's PR doesn't count; a senior's does
- [ ] High-risk change needs a senior (and every required approver)
- [ ] An approval from someone who wrote commits in the PR doesn't count
- [ ] Audit runs when started by hand
- [ ] Deploy gate tried in `warn` mode

**Go live**

- [ ] Team told the rules and the date
- [ ] `enforce_from` set, and released once so it becomes the trusted copy
- [ ] Gate in `enforce` mode
- [ ] Server token is dedicated and read-only
- [ ] Break-glass tried once in a test
