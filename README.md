# brkpt-auth

English | [简体中文](./README.zh.md)

Transparent, composable, portable, hexagonal authentication for NestJS.

---

## Philosophy

There are four common ways to add authentication to a project, and each has a real cost.

**Managed services** run authentication as a hosted API. Integration is fast, but the vendor controls your database schema, your session model (traditional session, stateless JWT, or stateful JWT), your token transport (cookie or header), and your JWT payload shape, and none of it is visible from your side. You also give up data ownership and take on vendor lock-in.

**Self-hosted libraries** ship as an npm package that runs on your own infrastructure, so your data stays with you. The core design is still fixed and heavily abstracted: customizing anything means first learning the library's internal model, and requirements that fall outside that model are difficult or impossible to meet, even with plugins. The code lives locally in `node_modules`, but that doesn't make the internals any easier to read or change.

**Auth boilerplates** give you the full source code, written for one specific user model, database, and project structure. Anything that doesn't match your project has to be reworked. Boilerplates are often advertised as production-ready and easy to extend, but building on one commonly surfaces tight coupling, unclear architectural boundaries, redundant structure, poor readability, and missing features, and problems like these are harder to debug because the code wasn't designed by you. The next project repeats the same evaluation and rework.

**Rolling your own** gives you full control, at a real cost: there's no shared convention to check your implementation against, logic tends to spread across the codebase, some capabilities are hard to implement cleanly, and a new requirement can force a large architectural change instead of a small addition. Every new project starts from the same foundation.

## Why brkpt-auth

brkpt-auth keeps the full source code in your project and separates business logic from infrastructure through ports and adapters, so your database schema, user model, and JWT payload stay under your control:

- **Transparent** — full source code installed directly into your project. No compiled packages, no hidden behavior, and a structure that's easy to inspect and modify.
- **Composable** — add only what you need. Independent features communicate through events with loose coupling.
- **Non-invasive** — no assumptions about your database schema, user model, or JWT payload. Implement the required ports and integrate without restructuring your application.
- **Portable** — business logic stays independent from adapters. Move the authentication logic into another project and replace only the adapters.
- **NestJS-native** — built around NestJS modules, dependency injection, guards, decorators, and providers from the beginning.
- **Hexagonal architecture** — services contain business logic, ports define contracts, and adapters remain fully under your control.

Getting started is simple: `brkpt-cli` installs the source code into your project. You implement the adapters and list them in `features.ts`; `BrkptAuthModule`, registered once in your `AppModule`, picks them up automatically. Most adapter methods are simple field mappings or direct calls into your existing code.

## Features

| Feature           | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `core`            | Stateless JWT dual-token auth. **Required**.                                |
| `credentials`     | Password-based sign-up and sign-in                                          |
| `oauth`           | Social authentication                                                       |
| `otp`             | One-time password authentication and verification                           |
| `magic-link`      | Magic link authentication and verification                                  |
| `session`         | Session management layered on top of stateless JWT                          |
| `blacklist`       | Real-time access token revocation                                           |
| `verify-email`    | Email verification gate — unverified accounts are restricted until verified |
| `change-password` | Authenticated password change                                               |
| `reset-password`  | Password reset via proof-of-identity                                        |
| `audit`           | User-defined handlers for key auth events                                   |

## Repository structure

```plain
brkpt-auth/
 ┣ demo/     # Fully working NestJS demo project
 ┗ lib/      # Source templates distributed by brkpt-cli
```

### Running the demo

Copy `.env.example` to `.env` and fill in your values, then:

```bash
cd demo
pnpm install
pnpm start:dev
```

The demo uses an in-memory user store but requires a local Redis instance. E2E tests mock both Redis and email in memory, so no external services are required.

```bash
pnpm test        # unit tests
pnpm test:e2e    # e2e tests
```

## License

MIT
