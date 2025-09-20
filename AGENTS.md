# Repository Guidelines

## Project Structure & Module Organization
- `src/main.tsx` boots the React + MUI app; `App.tsx` wires the upload, document, chat, stats, and admin tabs.
- Feature blocks stay in `src/components/` and `src/pages/`, while `src/services/` centralises Axios clients for the RAG API.
- Shared hooks, utilities, and types live in `src/hooks/`, `src/utils/`, and `src/types/`; static assets remain in `public/`. Update operational notes under `docs/`.

## Build, Test, and Development Commands
- `npm install` keeps dependencies aligned with `package-lock.json`.
- `npm run dev` launches the Vite dev server on `http://localhost:5173` with hot reload.
- `npm run lint` enforces the shared ESLint rules; add `-- --fix` to auto-correct.
- `npm run build` creates the production bundle in `dist/`; `npm run preview` serves that bundle locally.
- `npm run build:railway` lints, builds, and injects runtime config for the Railway deployment.

## Coding Style & Naming Conventions
- ESLint (TypeScript + React Hooks presets) expects 2-space indents, single quotes, and trailing commas where applicable.
- Components use PascalCase, hooks use camelCase with a `use` prefix, and service modules use descriptive nouns (e.g. `promptService`).
- Keep network calls in `src/services/` so UI files stay declarative and rely on MUI `sx` props for layout.

## Testing Guidelines
- No automated suite exists yet; manually verify upload, document management, chat, and admin dashboards for regressions.
- When adding Vitest + React Testing Library coverage, colocate specs as `*.test.tsx` beside the source and document the new npm script.
- Before review, run `npm run lint` and ensure the dev server starts without warnings.

## Commit & Pull Request Guidelines
- History uses concise, category-prefixed Korean subjects (e.g. `개선: 채팅 대화 높이 조정`); keep the first line under 72 characters.
- Link issues in PR descriptions, describe behavioural changes, and attach screenshots or terminal output for UI or DX updates.
- List manual verification steps (upload, delete, chat, dashboard) and call out environment variable changes reviewers must mirror.

## Configuration Tips
- Define env vars in `.env` (e.g. `VITE_API_BASE_URL=http://localhost:3000`) and consume them through shared service wrappers.
- `generate-config.js` writes `dist/config.js` during deploy; update both the script and `src/services/api.ts` if new runtime flags are introduced.
