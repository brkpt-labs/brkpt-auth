# brkpt-auth

Transparent, composable, portable, hexagonal authentication for NestJS.

---

## Philosophy

Most auth solutions fall into two camps:

**Black-box libraries** give you a polished API but hide the implementation. They impose their own conventions, and when something doesn't fit your use case, you're stuck waiting for a plugin or a workaround — if one ever comes.

**Auth boilerplates** claim you "own the code", but in practice they're monolithic, opinionated, and tightly coupled. Migrating or reusing them across projects is painful. Modifying them breaks things you didn't expect.

brkpt-auth takes a different approach:

- **Transparent** — the entire codebase is readable source code installed directly into your project. No compiled packages, no hidden behavior.
- **Composable** — add only what you need. Features are independent and have no knowledge of each other.
- **Non-invasive** — brkpt-auth never assumes your database schema, your user model, or your JWT payload structure. You define the adapter, you stay in control.
- **Portable** — migrating to a new project or reusing across codebases is trivial. Your business logic travels with you.
- **NestJS-native** — built from the ground up for NestJS. Native modules, guards, decorators, and event emitter throughout. No compatibility shims.
- **Hexagonal architecture** — services hold fixed business logic. Ports define interfaces. Adapters are yours to implement. The boundary is always clear.

Getting started is straightforward: initialize with `brkpt-cli`, implement your adapters, register in your `AppModule`. Each adapter is a handful of typed methods — typically a direct call to your existing repository or service.

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

The demo uses an in-memory user store and requires a local Redis instance. E2E tests use in-memory mocks for both Redis and email — no external services needed.

```bash
pnpm test        # unit tests
pnpm test:e2e    # e2e tests
```

## License

MIT
