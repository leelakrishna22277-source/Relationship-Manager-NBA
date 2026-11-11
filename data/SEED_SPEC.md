# Seed data spec — BNK-10 · Relationship Manager Next-Best-Action Console
<!-- Generate SYNTHETIC data only. Commit the generator/seed script so the DB is reproducible. -->

## From the brief
2 RMs each with 15–25 clients with products/signals.

## What to produce
- Enough records to make the app and the AI feel real (not 3 rows).
- Where the brief needs **isolation**, generate **multiple users/tenants** so you can prove one
  cannot read another's data.
- Where the brief needs **evals**, generate labelled cases (link them to `evals/eval_set.json`).

## Entities to seed (from your data model)
- RM
- Client
- Product
- Signal
- NextBestAction
- Outreach

## Rules
- No real PII. Make up names, numbers, documents.
- Keep a `seed` script (SQL or code) in the repo; document how to run it in the README.
