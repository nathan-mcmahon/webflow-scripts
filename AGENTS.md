# Agent Instructions For This Repo

Whenever scripts in this repository change, keep `README.md` up to date in the same commit.

## Required Documentation Updates

For every added/changed/removed script, update the matching README section with:
- Purpose and behavior summary
- Dependencies (libraries, browser APIs, Webflow runtime assumptions)
- Required Webflow classes/selectors
- Expected HTML structure
- Where the script should be loaded (head/footer/page scope/order)
- Setup or migration notes

## Assumptions Policy

If behavior is inferred from code (not explicitly documented), mark it as an `Assumption` in README.
When assumptions are later confirmed or disproven, replace or remove them.

## Change Checklist

Before finishing script-related work:
1. Confirm README includes all current scripts in the repo.
2. Confirm each script section reflects actual selectors/classes in code.
3. Confirm dependency and load-order notes match implementation.
4. Confirm new caveats are captured under setup notes or assumptions.
