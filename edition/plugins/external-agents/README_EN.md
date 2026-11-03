# External-agent trial plugin

[中文](README.md)

An optional trial for EduWork-ECNU 0.4.9 / DSH 0.2.1-rc.3. Discover local Codex and Cursor, add ACP executables manually, and delegate through official DSH providers and observe external tasks in the current conversation header. The entry is hidden when no external tasks exist.

## Install and use

Requires Node.js 24, native Codex authentication and a model for the parent conversation. Campus authentication is separate from Codex authentication; credentials are not copied or forwarded.

1. In this directory run `npm install --legacy-peer-deps --package-lock=false`, `npm run build` and `npm test`. The desktop Host supplies DSH peers; use the specified Host version.
2. Install this local directory through EduWork's Plugins page, then restart. Disable a separately enabled official Codex bundle first to avoid duplicate tool registration. This plugin uses that same official implementation.
3. Open Settings → External agents, check the connection, then enable it. Discovery only inspects PATH and known installation directories. Codex uses the pinned DSH runtime and existing local login. Cursor requires Agent CLI; an installed editor alone is insufficient.
4. Ask the parent: “Use subagent_codex to analyze this text without reading or writing files: …”. This version is inherently asynchronous; it has no `run_in_background` argument.
5. Open “External tasks” in the conversation header for labels, providers, state and elapsed time. Results return to the main chat through DSH. Click outside or press Escape to dismiss.

This plugin is not added to the edition's default composition and does not change the main model, workspace or permissions. Uninstall through the official plugin manager.

## Contracts and limitations

- Official `@deepseek-ai/dsh-subagent-codex@0.2.1-rc.3` and `dsh-tool-subagent` own delegation, process disposal and notifications. `permissionMode: never` disables interactive approvals while preserving native Codex sandbox policy; it does not force read-only access or filesystem isolation. Use a dedicated test workspace.
- Observe public `subagent/start` and `subagent/end` events. Never infer outcomes from model prose or parent inactivity.
- Use official header slots, locale and Session projections. Optional experimental `appendPluginRecord` stores complete parent-owned observation snapshots containing IDs, provider, timestamps, stop reason and Host epoch, never prompts, outputs or credentials. Readers without the plugin retain and skip these records. This introduces no core event contract. Prefer an official durable status projection if one becomes available.
- Unfinished observations from a previous Host epoch and tasks predating plugin installation display Unknown, not Running or Cancelled. Fork-inherited records are excluded from the new parent's observations.
- This version is observational: no new cancel API, scheduler or console. The official subagent list remains. Unknown stop reasons never count as success.
- Cursor uses `agent acp`. For other ACP agents enter a name, absolute executable path and JSON argument array, e.g. `["acp"]`. Saving does not execute it. Checking sends only ACP initialize: no tasks, authentication or permission grants. A successful handshake does not verify login or real model access. Never put secrets in arguments; use the agent’s own login flow.
- Connection definitions and enabled states use a DSH storage domain and survive restart. Probe results are ephemeral. New connections default to disabled. ACP permissions default to `reject`, using the official one-shot session semantics. Installation does not imply ACP support. Disable is rejected while tasks are running; disabled manual entries can be removed.
- Remote machines, detailed tool traces and continuation are out of scope. Discuss any required DSH interface extension before implementing it.

## Validation

`npm test` covers passive discovery, executable paths, ACP handshake/timeout/invalid responses, process cleanup and terminal states, Host restart, duplicate events, fork isolation, malformed records and sensitive-field exclusion. Real delegation, visible running-to-completed changes, main-chat result delivery, reload and session switching require separate desktop acceptance; unit tests are not real-model acceptance.
