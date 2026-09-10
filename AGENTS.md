# Contrátame! — Codex Project Instructions

## Project

Contrátame! is a Software Engineering bachelor's final project focused on Bolivia.

It is a mobile-first marketplace that connects customers with independent workers such as electricians, plumbers, cleaners, carpenters, construction workers, landscapers, painters, mechanics, and other manual-service professionals.

Initial target:
- Bolivia
- Android first
- Santa Cruz de la Sierra as the initial geographic focus

This repository must be treated as both:
1. A production-oriented software project.
2. An academically documented bachelor's final project.

---

## Source of truth

Do not treat this AGENTS.md file as the complete project specification.

The repository documentation under `docs/` is the technical source of truth.

Before implementing significant changes, consult the relevant documentation.

Documentation structure:

- `docs/00-project/`
  - Project scope, objectives, stakeholders, product definition.

- `docs/01-requirements/`
  - Functional requirements (`RF-*`).
  - Non-functional requirements (`RNF-*`).
  - Acceptance criteria.

- `docs/02-architecture/`
  - System architecture.
  - Application architecture.
  - Integration architecture.

- `docs/03-database/`
  - ERD.
  - Database schema.
  - Data dictionary.
  - Database rules.

- `docs/04-modules/`
  - Specifications and documentation for each application module.

- `docs/05-decisions/`
  - Architecture Decision Records (`ADR-*`).

- `docs/06-testing/`
  - Test plans, strategies, and evidence.

- `docs/07-implementation-log/`
  - Chronological implementation records (`IMP-*`).

If project documentation conflicts with assumptions, follow the documentation.

If a required business rule is not documented, do not invent it. Ask for clarification.

---

## Planned architecture

Use a modular-monolith architecture.

### Mobile
- React Native
- Expo
- TypeScript
- Expo Router

### Backend
- Supabase

### Database
- PostgreSQL
- PostGIS for geographic functionality

### Authentication
- Supabase Auth

### Storage
- Supabase Storage

### Realtime functionality
- Supabase Realtime

### Administration
- Next.js
- TypeScript

Do not introduce additional frameworks, backend servers, databases, or infrastructure unless there is a clear documented architectural reason.

Avoid unnecessary complexity such as:
- Microservices
- Kubernetes
- Duplicate APIs
- Duplicate databases
- Custom authentication systems
- Custom realtime servers when Supabase can satisfy the requirement

---

## Current business rules

### User types

The initial user types are:

- Customer
- Worker / Professional
- Administrator

### Worker profile approval

Creating a worker profile is free.

A worker may complete a professional profile, but the profile must not become publicly visible before administrative approval.

Expected lifecycle:

`draft`
→ `pending_approval`
→ `approved`

Possible rejection flow:

`pending_approval`
→ `rejected`
→ worker edits profile
→ `pending_approval`

Administrative approval is free.

### Certification

Administrative approval and certification are separate concepts.

Certification:
- Is optional.
- Is paid.
- Current planned price: Bs 50.
- Gives an approved worker a certified badge.

Do not assume the duration or renewal period of the certification until it has been explicitly defined.

A worker who has not been administratively approved must never appear publicly, even if a certification payment exists.

---

## Development rules

Every significant implementation must be connected to project documentation.

Before implementing a feature:

1. Identify the relevant module.
2. Identify the relevant requirement IDs.
3. Review the acceptance criteria.
4. Determine whether the database is affected.
5. Determine whether architecture or security is affected.

During implementation:

1. Follow the existing project structure.
2. Prefer reusable components.
3. Keep business logic outside presentational UI components where practical.
4. Maintain strict TypeScript typing.
5. Do not expose secrets in frontend code.
6. Do not bypass Supabase Row Level Security.
7. Create database changes through migrations.
8. Avoid undocumented breaking changes.

After implementation:

1. Run the relevant tests.
2. Run linting and type checking when configured.
3. Update relevant technical documentation.
4. Add or update an implementation record in:
   `docs/07-implementation-log/`
5. Document important architectural decisions in:
   `docs/05-decisions/`
6. Do not state that work is complete if validation is failing.

---

## IDs and traceability

Use these identifiers consistently:

- Functional requirement: `RF-001`
- Non-functional requirement: `RNF-001`
- Module: `MOD-01`
- Architecture decision: `ADR-001`
- Implementation record: `IMP-001`

When implementing a requirement, preserve traceability between:

Requirement
→ Module
→ Implementation
→ Database changes
→ Tests
→ Commit / Pull Request

---

## Database rules

PostgreSQL is the primary database.

Use UUIDs for application-level primary keys unless a documented reason requires otherwise.

Use:
- Foreign keys
- Appropriate constraints
- Indexes where justified
- Timestamps
- Row Level Security

Do not rely only on application code for critical authorization or data-integrity rules.

Geospatial functionality should use PostGIS rather than manual distance calculations when appropriate.

Database migrations must be reviewable and reproducible.

Never directly modify production database structures manually when migrations can represent the change.

---

## Security rules

Security is part of every module.

Never:
- Commit API secrets.
- Commit service-role or secret Supabase credentials.
- Put privileged credentials in the Expo application.
- Trust a user-supplied role or authorization flag.
- Expose exact worker private locations publicly.
- Disable security mechanisms just to make a feature work.

Use backend/database authorization for protected behavior.

Public location information for workers must respect privacy requirements defined by the project.

---

## UI/UX rules

Contrátame! must not use generic AI-generated-looking UI.

Avoid:
- Excessive gradients.
- Decorative loading bars.
- Random floating cards.
- Generic dashboard layouts without product purpose.
- Excessive shadows.
- Decorative content that does not help the user.
- Inconsistent icon containers.
- Unnecessary mascot usage.

Prefer:
- Intentional mobile layouts.
- Real Android interaction patterns.
- Clear visual hierarchy.
- Consistent spacing.
- Accessible touch targets.
- Reusable components.
- Restrained use of the brand palette.
- Functional empty states.
- Product-specific UX.

Brand colors:
- Primary blue.
- Green accent.

Mascot:
- Friendly cartoon bear.
- Blue shirt.
- Answering a phone.

Use the mascot selectively:
- Splash screen.
- Onboarding.
- Important empty states.
- Occasional brand moments.

Do not place the mascot everywhere.

---

## Git workflow

Primary branch:

`main`

Feature branches should generally follow:

`feature/MOD-XX-short-description`

Bug fixes:

`fix/short-description`

Do not make unrelated changes in the same implementation.

Prefer small, reviewable commits.

Commit messages should explain the change clearly.

Examples:

`feat: add worker profile approval flow`

`fix: respect Android navigation safe area`

`docs: define worker certification rules`

---

## Scope discipline

Contrátame! has a six-month academic delivery window.

Prioritize:
1. Correctness.
2. Maintainability.
3. Security.
4. Documentation.
5. MVP completion.

Do not add speculative features unless requested.

Do not redesign established architecture without discussing the consequences.

When there are multiple valid solutions, prefer the simplest solution that satisfies the documented requirements and remains maintainable.

---

## Before finishing a task

Confirm:

- Requirement satisfied.
- Acceptance criteria satisfied.
- Types valid.
- Relevant tests pass.
- Database migration validated if applicable.
- Documentation updated if applicable.
- No secrets introduced.
- No undocumented business rule invented.

If any item cannot be confirmed, explicitly state it.