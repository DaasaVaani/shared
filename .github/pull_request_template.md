## Summary

Explain the change, why it is needed and related issues or approved decisions.

## Contract and consumer compatibility

Identify normative/schema/catalog/fixture changes, affected consumers and
compatibility or migration impact. Explain conformance evidence and independent
consumer-pin adoption; do not require lockstep updates. Use "not applicable"
with a reason where appropriate. Do not decide UI catalog generator ownership here.

## Validation

List each exact command and its actual result, including
`python tools/check_repository.py` and `git diff --check`.
Explain checks not run and unavailable conformance tests; bootstrap hygiene is
not application testing or a security audit.

## Contributor checklist

- [ ] I kept this focused and cited approval for significant design choices.
- [ ] I updated directly related documentation and tests, or explained why not.
- [ ] I checked for secrets/private data and have rights to the contributed material.
- [ ] I preserved source attribution and reviewed content.
- [ ] I described material AI assistance, human review and remaining risks below.

## AI assistance and remaining gaps

Describe review, uncertainty and follow-up work, or explain why not applicable.
