## What changes and why
<!-- One paragraph. Link the issue or incident. -->

## How it was tested
- [ ] CI is green
- [ ] Tried on staging, or not needed because: …

## Production risk
- [ ] **Docker / Compose:** no changes to docker-compose.yml or container config, or the change was tested outside production
- [ ] **Backend / Frontend:** no breaking changes to API contracts between frontend and Backend, or consumers were updated
- [ ] **Cost:** no new recurring cost (paid APIs, LLM calls, compute, scheduled jobs), or limits are stated
- [ ] **Secrets and data:** no credentials, hostnames or student/professor data in code, logs or tests

Add the `high-cost` label if any risk box needs explanation; it requires a second approval.
Add `hotfix` for urgent fixes; the review deadline is then shorter.

## Rollback
<!-- How to undo this if it misbehaves in production. -->
