# brkpt-auth

Transparent, composable, portable, hexagonal authentication for NestJS.

---

## Philosophy

There are three common approaches to authentication:

**Managed services**: Provide an API. Auth logic and user data are fully hosted on the vendor's side. Low integration cost, but you give up data ownership and risk vendor lock-in. Core design decisions — database schema, auth state management approach (traditional session, stateless JWT, or stateful JWT), token transport (cookie or header), JWT payload structure — are all predetermined by the vendor. Your project has to be built around their design. Implementation details are completely opaque, leaving very little room for customization. Think of it as a black box in the cloud.

**Self-hosted libraries**: Provide an npm package. You deploy on your own infrastructure. Data ownership is preserved. But the same fundamental problem exists: the core design is fixed and heavily abstracted, and your project still has to be built around their conventions. Customization requires understanding their internal mental model first. Anything outside their internal structure is difficult or impossible to implement, and plugin-based solutions also have limited effect. The code exists locally in node_modules, but the internals are still complex and not practical to modify or maintain. Think of it as a black box on your own machine.

**Auth boilerplates**: Provide full source code. The code is yours, but it is opinionated. Written for a specific user model, database, and project structure, with strong design assumptions and a set of fixed configurations baked in. Anything that does not match your project needs to be reworked. Most boilerplates claim to be "out of the box, well-architected, easy to extend, fully production-ready". But in practice, the reality is often far from that: tight coupling, unclear architecture boundaries, redundant structure, poor readability, questionable practices, missing features, hard-to-debug issues, difficult to build on. And even after finishing a project on top of one, the next project goes through the same process all over again.

There is also the most common approach: not relying on any service or framework, and implementing everything yourself. Full control, but the cost is real: no shared conventions or standards, hard to evaluate whether your implementation follows best practices, logic tends to scatter across the codebase, some features are hard to implement, new requirements may trigger large-scale architectural changes, and every new project repeats the same work.

brkpt-auth takes a different approach:

- **Transparent** — full source code installed directly into your project, no compiled packages or hidden behavior, clear and readable structure, easy to modify.
- **Composable** — add only what you need, features are independent and communicate through an event emitter with loose coupling.
- **Non-invasive** — no assumptions about your database schema, user model, or JWT payload structure. Through the port-adapter pattern, implement the corresponding interfaces to plug brkpt-auth into your project, no changes to your existing code required.
- **Portable** — business logic and adapters are separate. When moving to a new project, the core logic comes with you, only the adapters need to be rewritten.
- **NestJS-native** — built for NestJS from the ground up, native modules, guards, decorators, and event emitter throughout, no compatibility shims.
- **Hexagonal architecture** — services hold the fixed business logic, ports define the interfaces, adapters are yours to implement, the boundary is always clear.

Getting started is simple: initialize with `brkpt-cli`, implement your adapters, register in your `AppModule`. Each adapter only requires implementing a few typed methods — usually a direct call into your existing implementation.

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

The demo uses an in-memory user store, but requires a local Redis instance. E2E tests use in-memory mocks for both Redis and email — no external services needed.

```bash
pnpm test        # unit tests
pnpm test:e2e    # e2e tests
```

## License

MIT
