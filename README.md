# <picture><source media="(prefers-color-scheme: dark)" srcset="assets/grok-dark.png"><img src="assets/grok-light.png" width="32" height="32" align="center" alt="Grok"></picture> grok-build-review-action

PR reviews from your **Grok Build (SuperGrok) subscription**. No `XAI_API_KEY`, no extra bill.

Installs the [grok CLI](https://x.ai/cli), logs in with your session, reviews the diff, then:

- drops an **inline comment on every finding** (bug / warning / nit), validated against the diff
- keeps one live status comment updated in place, no PR spam
- tells you to ship it when the code is clean
- optionally fails the check (`fail_on: bugs`)

## Quick start

1. On a machine where `grok login` works: `cat ~/.grok/auth.json | pbcopy`
2. Save it as a repo secret named `GROK_AUTH_JSON`
3. _(Optional, recommended)_ Add a second secret `GROK_SECRET_SYNC_TOKEN` — a fine-grained PAT with **Actions secrets: Read and write** — and pass it as `secret_sync_token` with `sync_auth_secret: true`. The action refreshes OAuth tokens before each review and writes the rotated `refresh_token` back to `GROK_AUTH_JSON`, so you rarely need to re-upload manually.

Add `.github/workflows/grok-pr-review.yml`:

```yaml
name: Grok PR Review

on:
    pull_request:
        types: [opened, synchronize, reopened, ready_for_review]

permissions:
    contents: read
    pull-requests: write

concurrency:
    group: grok-review-${{ github.event.pull_request.number }}
    cancel-in-progress: true

jobs:
    review:
        if: ${{ !github.event.pull_request.draft }}
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with:
                  ref: ${{ github.event.pull_request.head.sha }}

            - uses: 0xr3ngar/grok-build-review-action@v1
              with:
                  grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
                  sync_auth_secret: true
                  secret_sync_token: ${{ secrets.GROK_SECRET_SYNC_TOKEN }}
```

> **Recommended**: Use `@v1` to get the latest release in the v1 series (including future patch/minor updates).  
> Use `@v1.0.0` (or any specific tag) if you want to pin exactly.

Open a PR and watch it cook.

## Roast levels

The technical findings are identical at every level. The delivery is not.

| Level          | Vibe                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `professional` | No jokes, no feelings, just findings. HR-approved.                                               |
| `playful`      | The default. Dry wit and light elbow jabs from your funniest coworker.                           |
| `savage`       | Sarcasm with citations, mild profanity. A rival tech lead reviewing you live on stage.           |
| `diabolical`   | Maximum brutality. Takes every bug personally and asks if you have ever met an array. Good luck. |

Guardrails at every level: the roast rides on real findings, the code gets mocked and never the author, and an inaccurate roast is the one unforgivable sin.

## Inputs

| Input                 | Default               | Description                                                                 |
| --------------------- | --------------------- | --------------------------------------------------------------------------- |
| `grok_auth_json`      | _(required)_          | Contents of `~/.grok/auth.json`.                                            |
| `sync_auth_secret`    | `false`               | Write refreshed tokens back to `GROK_AUTH_JSON` after OAuth refresh.        |
| `secret_sync_token`   | _(empty)_             | PAT with secrets write; required when `sync_auth_secret` is true.           |
| `github_token`        | `${{ github.token }}` | Default token posts as `github-actions[bot]`. Pass a PAT for your own name. |
| `pr_number`           | event PR              | Review a specific PR (for `workflow_dispatch`).                             |
| `model`               | CLI default           | e.g. `grok-build`.                                                          |
| `effort`              | CLI default           | `low` to `max`.                                                             |
| `max_turns`           | `50`                  | Max agentic turns.                                                          |
| `fail_on`             | `never`               | `never` \| `bugs` \| `any`.                                                 |
| `roast_level`         | `playful`             | See above.                                                                  |
| `custom_instructions` | _(empty)_             | Extra review rules, injected into the prompt.                               |
| `status_comments`     | `true`                | Live status comment on/off.                                                 |
| `max_diff_kb`         | `300`                 | Diff size in the prompt before truncation.                                  |

## Outputs

| Output        | Description                                  |
| ------------- | -------------------------------------------- |
| `verdict`     | `clean` \| `issues` \| `error`               |
| `issue_count` | Total findings.                              |
| `bug_count`   | Bug-severity findings.                       |
| `review_url`  | URL of the posted review (empty when clean). |

## Steering the review

- `custom_instructions`: inline rules in the workflow ("we use Effect-TS, skip try/catch suggestions").
- `AGENTS.md` / `CLAUDE.md` at the repo root are picked up automatically, so the reviewer follows the same conventions as your coding agents.

## Security

- `auth.json` is a refreshable OAuth credential for your xAI account. The action refreshes expired access tokens automatically before each run.
- OAuth `refresh_token` values rotate on use. If you also use `grok` locally with the same account, enable `sync_auth_secret` so CI keeps the repository secret current — otherwise the secret can fall behind and reviews start failing until you re-upload.
- It is wiped from the runner in an `always()` cleanup step.
- Grok runs with read-only tools, no shell, and never sees your GitHub token.
- Fork PRs do not get secrets on plain `pull_request`, so the action simply skips them. Do not use `pull_request_target`.

## Troubleshooting

- **CLI exits with no output**: session expired or the refresh token was rotated elsewhere. `grok login` again, update the secret, or enable `sync_auth_secret`.
- **Findings in the review body instead of inline**: grok pointed at lines outside the diff. They get promoted, not dropped.
