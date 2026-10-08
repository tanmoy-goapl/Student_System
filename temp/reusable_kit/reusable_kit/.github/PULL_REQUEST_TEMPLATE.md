## What changes and why
<!-- One paragraph. Link the issue or incident. -->

## How it was tested
- [ ] CI is green
- [ ] Tried on staging, or not needed because: …

## Production risk
- [ ] **Database:** no migration, or the migration is backward compatible and was tested on a copy
- [ ] **Infrastructure and deploy:** no change to deploy scripts, containers or CI, or the change was tested outside production
- [ ] **Cost:** no new recurring cost (paid APIs, LLM calls, compute, scheduled jobs), or limits are stated
- [ ] **API contract:** response shapes unchanged, or consumers were told
- [ ] **Secrets and data:** no credentials, hostnames or customer data in code, logs or tests

Add the `high-cost` label if any risk box needs explanation; it requires a second approval.
Add `hotfix` for urgent fixes; the review deadline is then shorter.

## Rollback
<!-- How to undo this if it misbehaves in production. -->
