#!/usr/bin/env bash
# Review gate for a deploy script that runs on your own server.
#
# Usage, inside the git checkout you deploy from:
#   source deploy-script-gate.sh
#   REVIEW_REPO=my-org/my-repo review_gate "<deployed commit>" "<candidate commit>" || exit 1
#
# Needs: git, python3, and a GitHub token (GH_TOKEN, GITHUB_TOKEN, or a logged-in gh)
# that can read the repository's contents and pull requests.
#
# Optional environment:
#   REVIEW_POLICY_MODE=warn      report problems but do not block (trial period)
#   REVIEW_BREAK_GLASS="reason"  emergency override; REVIEW_ACTOR must be listed
#   REVIEW_ACTOR=github-login    in the roster's break_glass list
#   REVIEW_EVIDENCE_DIR=/path    keep the roster, checker and decision log here

review_gate() {
  local deployed="$1" candidate="$2"
  local repo="${REVIEW_REPO:?set REVIEW_REPO=owner/name}"
  local work="${REVIEW_EVIDENCE_DIR:-$(mktemp -d)}"
  mkdir -p "${work}"

  # Both must be full commit IDs: a branch name could move while we check.
  if [[ ! "${deployed}" =~ ^[0-9a-f]{40}$ || ! "${candidate}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "review gate: need the exact deployed and candidate commit IDs" >&2
    return 1
  fi
  if ! git merge-base --is-ancestor "${deployed}" "${candidate}"; then
    echo "review gate: the candidate does not contain what is deployed now" >&2
    return 1
  fi

  # Trusted copy: use the roster and checker from what is already deployed.
  # The first gated release has none yet and uses the candidate's copy.
  local policy_ref="${deployed}"
  if ! git cat-file -e "${deployed}:.github/review-roster.json" 2>/dev/null; then
    policy_ref="${candidate}"
    echo "review gate: bootstrapping the policy from the candidate" >&2
  fi
  git show "${policy_ref}:.github/review-roster.json" > "${work}/review-roster.json" || return 1
  git show "${policy_ref}:scripts/review_policy.py" > "${work}/review_policy.py" || return 1

  local token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if [[ -z "${token}" ]]; then
    token="$(gh auth token --hostname github.com)" || {
      echo "review gate: needs GH_TOKEN, GITHUB_TOKEN, or a logged-in gh" >&2
      return 1
    }
  fi

  local -a extra=()
  if [[ -n "${REVIEW_BREAK_GLASS:-}" ]]; then
    extra+=(--break-glass "${REVIEW_BREAK_GLASS}" --actor "${REVIEW_ACTOR:-}")
  fi

  # The token is passed in the environment only; it is never printed or saved.
  GH_TOKEN="${token}" python3 "${work}/review_policy.py" \
    --repo "${repo}" --repository "$(git rev-parse --show-toplevel)" \
    --roster "${work}/review-roster.json" \
    range --base "${deployed}" --head "${candidate}" \
    --mode "${REVIEW_POLICY_MODE:-enforce}" "${extra[@]}" \
    2>&1 | tee "${work}/review-policy.log"
  return "${PIPESTATUS[0]}"
}
