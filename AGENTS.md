# AGENTS.md — Open Money

Personal (non-commercial) finance app: a 100% local mobile app. No backend, no cloud, no market data.

## Agreed architecture (do not change without asking the owner)
- **Mobile app**: React Native with Expo + TypeScript, Android first. Personal data 100% local in SQLite (expo-sqlite). No user accounts or cloud storage.
- Recurring payments: processed when the app opens (idempotent catch-up), not in the background.

## Conventions
- **Languages**:
  - Spec and UI: **Spanish**.
  - **Code: English** (identifiers, function/component names, and any string or message that lives in code).
  - **Comments: minimal and English-only.** Prefer self-documenting code; only comment non-obvious "why" decisions.
  - Commit messages: **English** (consistent with existing history).
- **Code quality**:
  - Reuse existing functions, components, hooks, utils and types whenever possible; extract shared logic instead of duplicating it.
  - Small, focused, single-responsibility functions and components; favor composition over duplication.
  - Use TypeScript strict typing; avoid `any` unless unavoidable and justified.
  - Follow the naming and structural conventions of the file/section you're editing.
  - Keep components presentational and business logic separated (custom hooks / utils), matching the project structure.
- Package manager: **pnpm** (never npm).
- Single branch `main`; personal project, no PRs or releases.

## Styles
- Follow the visual design system defined in **`DESIGN.md`** (colors, typography, spacing, components, sizing tokens). When a style decision is in doubt, refer to it instead of inventing values.

## Gotchas
- Everything runs on-device in SQLite; there is no backend or cloud of any kind.
