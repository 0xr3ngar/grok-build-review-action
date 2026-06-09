# grok-build-review-action

AI pull request reviews powered by your **Grok Build (SuperGrok) subscription** - no `XAI_API_KEY` required. 

The action installs the [grok CLI](https://x.ai/cli), authenticates with your personal login session, reviews the PR, and:

- posts a live status comment ("Grokking this sh*t right now, cooking it... :eyes:") that updates in place,
- leaves an **inline review comment on every issue it finds** (bug / warning / nit), validated against the diff so GitHub never rejects them,
- posts a "you're valid, ship it" comment when the PR is clean,
- can optionally fail the check when bugs are found (`fail_on`).

Re-runs update the same status comment instead of spamming the PR.

## Quick start

**1.** On a machine where you're logged in to the grok CLI (`grok login`), copy your session:

```bash
cat ~/.grok/auth.json | pbcopy
```

**2.** In the repo you want reviewed: *Settings → Secrets and variables → Actions → New repository secret*, name it `GROK_AUTH_JSON`, paste the JSON.

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

| Input             | Default               | Description |
|-------------------|-----------------------|-------------|
| `grok_auth_json`  | *(required)*          | Contents of `~/.grok/auth.json` from a logged-in machine. |
| `github_token`    | `${{ github.token }}` | Token used to read the PR and post comments. The default Actions token is enough (comments appear as `github-actions[bot]`). Pass a PAT if you want them under your own account. |
| `pr_number`       | event PR              | Review a specific PR (useful with `workflow_dispatch`). |
| `model`           | CLI default           | e.g. `grok-build`. |
| `effort`          | CLI default           | `low` \| `medium` \| `high` \| `xhigh` \| `max`. |
| `max_turns`       | `50`                  | Max agentic turns for the headless run. |
| `fail_on`         | `never`               | Fail the check on findings: `never` \| `bugs` \| `any`. |
| `roast_level`     | `playful`             | How spicy the review is: `professional` \| `playful` \| `savage` \| `diabolical`. |
| `status_comments` | `true`                | Post/update the live status comment. |
| `max_diff_kb`     | `300`                 | Diff size embedded in the prompt before truncation (grok can still read full files from the checkout). |

## Outputs

| Output        | Description |
|---------------|-------------|
| `verdict`     | `clean` \| `issues` \| `error` |
| `issue_count` | Total issues found. |
| `bug_count`   | Bug-severity issues found. |
| `review_url`  | URL of the posted review (empty when clean). |

## Roast levels

It's grok — it should be allowed to be funny. `roast_level` controls the personality of everything it posts: the status comments, the review summary, and a per-issue `quip` one-liner rendered under each finding. The technical content is identical at every level; only the delivery changes.

| Level          | Vibe |
|----------------|------|
| `professional` | No jokes, no commentary. Senior-engineer-at-a-bank energy. |
| `playful`      | *(default)* Dry humor, light teasing. Witty colleague. |
| `savage`       | Sarcasm at will, mild profanity, roasts every finding. Rival team's tech lead reviewing you live on stage. |
| `diabolical`   | Full theatrical-villain mode. Merciless, dramatic, profanity permitted. Treats each bug as a personal insult that must be avenged. |

```yaml
- uses: 0xr3ngar/grok-build-review-action@main
  with:
    grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}
    roast_level: diabolical   # you asked for this
```

Guardrails at every level: jokes ride on real technical findings, the code gets mocked — never the author — and an inaccurate roast is treated as the one unforgivable sin.

## How it works

1. **Install** — `curl -fsSL https://x.ai/cli/install.sh | bash` (skipped if `grok` is already on the runner).
2. **Auth** — your `GROK_AUTH_JSON` secret is written to `~/.grok/auth.json` (mode 600). It contains a short-lived access token **plus a refresh token**, so the CLI silently renews the session — this is what gives you your subscription's grok-build access without an API key.
3. **Context** — the PR metadata and diff are fetched with `gh`.
4. **Status comment** — the sticky "cooking" comment is posted (or updated on re-runs).
5. **Review** — grok runs headless (`--output-format json --yolo`) with **read-only tools** (`read_file`, `grep`, `list_dir`) and *no tokens in its environment*. It reads the diff plus the checked-out source for context, and must answer with a strict JSON block of findings (`file`, `line`, `severity`, `title`, `body`, `suggestion`).
6. **Post** — the findings are validated against the RIGHT side of the diff (so the GitHub API can't 422 them), posted as a submitted review with inline comments, and the status comment is updated with the verdict. Findings that reference lines outside the diff are promoted into the review body instead of being dropped.

### Why not the built-in `/review --pr` skill?

The grok CLI ships a first-class `/review` skill, but in PR mode it creates a **PENDING** GitHub review — and a pending review can only be submitted by the account that created it. In CI that's `github-actions[bot]`, so nobody could ever click "Submit review". This action instead has grok emit structured findings and posts them itself as an already-submitted `COMMENT` review, which is what you actually want from a bot.

## Development

The action's scripts are TypeScript executed directly by [Bun](https://bun.sh) (installed in the action via `oven-sh/setup-bun`) — no build step. Grok's output and all PR metadata are validated with [zod](https://zod.dev) schemas (`scripts/types.ts`).

```bash
bun install          # dev deps (typescript, @types/bun) + zod
bun run typecheck    # tsc --noEmit, strict
bun test             # unit tests for the diff walker and review parsing
```

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
    fail_on: bugs   # check goes red only for bug-severity findings
```

## Troubleshooting

- **"Grok CLI exited with code 1 and produced no output"** — your session expired beyond refresh. Re-run `grok login` locally and update the `GROK_AUTH_JSON` secret.
- **No inline comments, findings in the review body** — grok referenced lines outside the diff; they get promoted to the body rather than dropped.
- **Want reviews under your own account** — pass a PAT (with *Pull requests: write*) as `github_token`.
