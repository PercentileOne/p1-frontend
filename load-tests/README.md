# Load Tests

Quick reference — see `load-test-guide.html` for the full walkthrough (setup, running, reading results, safety notes).

## Files

- `interview-load-test.jmx` — JMeter test plan, 3 thread groups: `/api/ai-proxy`, `/api/ai/transcribe`, `/api/interviews/upload`.
- `azure-load-test-config.yaml` — Azure Load Testing config referencing the plan above.
- `sample-answer.wav` — small synthetic audio clip (4s, 16kHz mono tone) used as the transcription payload.
- `load-test-guide.html` — the full guide. Open it in a browser.

## Fastest path to a first run

```bash
az load test create \
  --name interview-load-test \
  --resource-group p1-core \
  --load-test-config-file load-tests/azure-load-test-config.yaml \
  --test-plan load-tests/interview-load-test.jmx
```

Then upload `sample-answer.wav` as an additional test file in the Azure Portal (Load Testing resource → your test → Test files), or via `az load test file upload`, before the first run — Thread Group 2 needs it on the engine, not just locally.

Start with `users: 20` (the committed default) before pushing toward 100–200 — see the guide for why.
