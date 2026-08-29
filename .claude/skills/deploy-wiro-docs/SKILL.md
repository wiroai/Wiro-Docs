---
name: deploy-wiro-docs
description: Deploy Wiro Docs to dev, staging, or production through the VPN deploy service. Use only when the user explicitly asks to deploy Wiro Docs and names the target environment, e.g. "Docs'u dev'e deploy et". Do not use for Web, API, MCP, LLM Server, or Agent Worker, and do not use for commits, pushes, merges, or promotions.
---

# Wiro Docs Deployment

## When to run

- Deploy only when the user explicitly requests Wiro Docs and names the target
  environment, for example: "Docs'u dev'e deploy et."
- Never use these endpoints for Web, API, MCP, or Agent Worker requests. Ask
  first if either the service or environment is ambiguous.
- A deploy request does not authorize a commit, push, merge, or promotion.

## Preconditions

- Dev and staging require the development VPN. Production requires the
  production VPN.
- Call each selected endpoint once with `{"type":"deploy-docs"}` and a 20-minute
  timeout. Do not retry blindly after a network failure.
- Production requires both Docs hosts. Call them separately and report each
  response; do not repeat a successful host without permission.
- The deploy service performs its own VM-local disk preflight. Do not run a
  separate SSH cleanup before calling it.

## Response validation

- At 80%+ usage it safely prunes only allowlisted history contents while
  preserving each directory and two rollbacks; a 90%+ final result warns with
  the VM name.
- Show and summarize `{ Status, Message, Extra, Disk, Warnings }` without
  exposing the authorization header. Always name any VM listed in `Warnings`;
  treat curl failures, malformed JSON, and `Status: false` as failed.
- HTTP 409 with `ActiveDeployment` means another deploy owns that VM's lock.
  Report the active deployment and do not retry until it finishes.

## Dev

```bash
curl --fail-with-body --silent --show-error --connect-timeout 10 --max-time 1200 --request POST "http://10.0.14.29:21907/github-deploy/api/move" --header "Authorization: Bearer tHEWiRoWiLLr0CKy0U!" --header "Content-Type: application/json" --data '{"type":"deploy-docs"}'
```

## Staging

```bash
curl --fail-with-body --silent --show-error --connect-timeout 10 --max-time 1200 --request POST "http://10.0.14.30:21907/github-deploy/api/move" --header "Authorization: Bearer tHEWiRoWiLLr0CKy0U!" --header "Content-Type: application/json" --data '{"type":"deploy-docs"}'
```

## Production Docs-1

```bash
curl --fail-with-body --silent --show-error --connect-timeout 10 --max-time 1200 --request POST "http://10.0.15.22:21907/github-deploy/api/move" --header "Authorization: Bearer tHEWiRoWiLLr0CKy0U!" --header "Content-Type: application/json" --data '{"type":"deploy-docs"}'
```

## Production Docs-2

```bash
curl --fail-with-body --silent --show-error --connect-timeout 10 --max-time 1200 --request POST "http://10.0.15.42:21907/github-deploy/api/move" --header "Authorization: Bearer tHEWiRoWiLLr0CKy0U!" --header "Content-Type: application/json" --data '{"type":"deploy-docs"}'
```
