# grok-build-review-action

AI pull request reviews powered by your **Grok Build (SuperGrok) subscription** - no `XAI_API_KEY` required.

The action installs the [grok CLI](https://x.ai/cli), authenticates with your personal login session, reviews the PR, and:

- posts a live status comment ("Grokking this sh\*t right now, cooking it... :eyes:") that updates in place,
- leaves an **inline review comment on every issue it finds** (bug / warning / nit), validated against the diff so GitHub never rejects them,
- posts a "you're valid, ship it" comment when the PR is clean,
- can optionally fail the check when bugs are found (`fail_on`).

Re-runs update the same status comment instead of spamming the PR.

## Quick start

**1.** On a machine where you're logged in to the grok CLI (`grok login`), copy your session:

```bash
cat ~/.grok/auth.json | pbcopy
```

**2.** In the repo you want reviewed: _Settings → Secrets and variables → Actions → New repository secret_, name it `GROK_AUTH_JSON`, paste the JSON.

**3.** Add `.github/workflows/grok-pr-review.yml`:

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

            - uses: 0xr3ngar/grok-build-review-action@main
              with:
                  grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
```

That's it. Open a PR and watch it cook.

## Inputs

| Input                 | Default               | Description                                                                                                                                                                      |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grok_auth_json`      | _(required)_          | Contents of `~/.grok/auth.json` from a logged-in machine.                                                                                                                        |
| `github_token`        | `${{ github.token }}` | Token used to read the PR and post comments. The default Actions token is enough (comments appear as `github-actions[bot]`). Pass a PAT if you want them under your own account. |
| `pr_number`           | event PR              | Review a specific PR (useful with `workflow_dispatch`).                                                                                                                          |
| `model`               | CLI default           | e.g. `grok-build`.                                                                                                                                                               |
| `effort`              | CLI default           | `low` \| `medium` \| `high` \| `xhigh` \| `max`.                                                                                                                                 |
| `max_turns`           | `50`                  | Max agentic turns for the headless run.                                                                                                                                          |
| `fail_on`             | `never`               | Fail the check on findings: `never` \| `bugs` \| `any`.                                                                                                                          |
| `roast_level`         | `playful`             | How spicy the review is: `professional` \| `playful` \| `savage` \| `diabolical`.                                                                                                |
| `custom_instructions` | _(empty)_             | Extra review instructions injected into the prompt. `AGENTS.md` / `CLAUDE.md` at the repo root are picked up automatically.                                                      |
| `status_comments`     | `true`                | Post/update the live status comment.                                                                                                                                             |
| `max_diff_kb`         | `300`                 | Diff size embedded in the prompt before truncation (grok can still read full files from the checkout).                                                                           |

## Outputs

| Output        | Description                                  |
| ------------- | -------------------------------------------- |
| `verdict`     | `clean` \| `issues` \| `error`               |
| `issue_count` | Total issues found.                          |
| `bug_count`   | Bug-severity issues found.                   |
| `review_url`  | URL of the posted review (empty when clean). |

## Roast levels

It's grok — it should be allowed to be funny. `roast_level` controls the personality of the ENTIRE review: the status comments, the summary, every finding's title and body, plus a per-issue `quip` punchline rendered under each finding. The technical content is identical at every level; only the delivery changes.

| Level          | Vibe                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `professional` | No jokes, no commentary. Senior-engineer-at-a-bank energy.                                                                                       |
| `playful`      | _(default)_ Dry humor, light teasing. Witty colleague.                                                                                           |
| `savage`       | Sarcasm at will, mild profanity, roasts every finding. Rival team's tech lead reviewing you live on stage.                                       |
| `diabolical`   | Maximum brutality. Merciless, dramatic, profanity permitted. Head-chef-finding-expired-ingredients energy; treats each bug as a personal insult. |

```yaml
- uses: 0xr3ngar/grok-build-review-action@main
  with:
      grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
      roast_level: diabolical
```

Guardrails at every level: jokes ride on real technical findings, the code gets mocked - never the author — and an inaccurate roast is treated as the one unforgivable sin.

## Custom instructions & repo conventions

Two ways to steer the review, both injected into the prompt as a "Repository instructions" section that overrides the generic review guidance (but never the output contract):

1. **`custom_instructions` input** — inline in the workflow:

```yaml
- uses: 0xr3ngar/grok-build-review-action@main
  with:
      grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
      custom_instructions: |
          We use Effect-TS; don't suggest try/catch.
          Ignore anything under src/generated/.
          Be extra picky about SQL queries.
```

2. **`AGENTS.md` / `CLAUDE.md`** — if either exists at the repo root, its content is embedded automatically (capped at 8KB each), so the reviewer follows the same conventions as your coding agents.

## Security notes

- `auth.json` is a **refreshable credential for your xAI account**. Treat the secret accordingly and rotate it periodically (`grok logout && grok login`, then update the secret).
- The credential file is deleted from the runner in an `always()` cleanup step.
- The grok process runs with read-only tools, no shell, and no GitHub token in its environment — it can read the checkout, nothing else.
- Don't run this on `pull_request_target` with untrusted forks. Fork PRs on plain `pull_request` don't get secrets, so the action simply won't run for them — that's the safe default.

## Failing CI on findings

```yaml
- uses: 0xr3ngar/grok-build-review-action@main
  with:
      grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
      fail_on: bugs # check goes red only for bug-severity findings
```

## Troubleshooting

- **"Grok CLI exited with code 1 and produced no output"** — your session expired beyond refresh. Re-run `grok login` locally and update the `GROK_AUTH_JSON` secret.
- **No inline comments, findings in the review body** — grok referenced lines outside the diff; they get promoted to the body rather than dropped.
- **Want reviews under your own account** — pass a PAT (with _Pull requests: write_) as `github_token`.
