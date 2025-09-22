# Implementation Plan

This implementation roadmap breaks down the work into ten sequential phases. Each phase lists the expected file or component additions/updates along with the relevant testing focus to validate progress.

## Phase 1 – Project Setup & Baseline Review
- **Planned Work:**
  - Initialize the frontend with Vite configured for React, TypeScript, and `react-router-dom`, ensuring the build tooling is ready for multipage routing.
  - Define the four initial routes within the router configuration (e.g., `src/main.tsx` or a dedicated routes module) to establish navigation scaffolding.
  - Establish and maintain hard-coded configuration constants in `src/config.ts` so the frontend continues to rely exclusively on those values, including a `GENAI_ENDPOINT` that points to the backend without using environment variables.
- **Testing Notes:**
  - Run `npm install` and `npm run lint` to confirm the project installs and lints cleanly.
  - Execute `npm test -- --watch=false` to verify existing unit tests pass.

## Phase 2 – API Integration Layer
- **Planned Work:**
  - Implement `src/lib/api.ts`'s `apiRequest()` helper to inject `Authorization: Bearer`, `Content-Type`, and `Prefer` headers.
  - Merge the authenticated `{ username }` payload into outgoing requests and construct PostgREST-style query strings for list/detail operations.
  - Define TypeScript interfaces in `src/types/` for API responses.
- **Testing Notes:**
  - Add unit tests for the API client using mocked fetch responses (`src/services/__tests__/apiClient.test.ts`).
  - Verify types compile with `npm run lint` or `tsc --noEmit` if available.

## Phase 3 – Global State Management
- **Planned Work:**
  - Introduce global state (e.g., React Context or Redux) within `src/state/` to manage shared data.
  - Update `src/App.tsx` to provide the global state context.
- **Testing Notes:**
  - Extend component/unit tests to validate state transitions.
  - Use React Testing Library to ensure providers wrap components correctly.

## Phase 4 – Core UI Components
- **Planned Work:**
  - Implement foundational UI components in `src/components/` such as `Header`, `Footer`, and reusable form inputs.
  - Add associated styling files in `src/components/*.module.css` or `src/styles/`.
- **Testing Notes:**
  - Add snapshot and interaction tests for new components (`src/components/__tests__/`).
  - Validate visual consistency manually or via Storybook if configured.

## Phase 5 – Feature Screens
- **Planned Work:**
  - Build main feature pages within `src/pages/`, wiring them to state and API services.
  - Update routing configuration (e.g., `src/routes.tsx`) to include new screens.
- **Testing Notes:**
  - Write integration tests covering user flows across the new screens.
  - Perform exploratory testing in the browser to ensure navigation works as expected.

## Phase 6 – Forms & Validation
- **Planned Work:**
  - Implement media capture flows using the `MediaRecorder` API to collect interview audio/video inputs.
  - Integrate Transformers.js Whisper models for automatic speech recognition, capturing transcripts during submissions.
  - Provide a graceful fallback to placeholder transcription text whenever Whisper processing fails or is unavailable.
- **Testing Notes:**
  - Add unit tests for validation utilities and edge cases.
  - Use end-to-end or component tests to verify form submission behavior.
  - Explicitly verify that backtracking is blocked after an interview section is submitted.
  - Confirm that users cannot re-record once submission has occurred.
  - Ensure the interview flow completes successfully even when ASR falls back to placeholder transcription text.

## Phase 7 – Accessibility & Responsiveness
- **Planned Work:**
  - Audit components for accessibility improvements (ARIA attributes, semantic HTML) and responsive design updates in CSS files.
  - Update `src/styles/` or component-specific styles to ensure mobile responsiveness.
- **Testing Notes:**
  - Run accessibility tooling (e.g., `npm run lint:a11y` or axe browser extension) if available.
  - Perform responsive checks using browser dev tools or automated tests.

## Phase 7a – No-ENV Backend Enablement
- **Planned Work:**
  - Scaffold the backend service under `llm-service/**`, ensuring the project structure supports future expansion.
  - Retain `config.sample.json` for committed defaults and add developer-only overrides via an ignored `config.local.json`.
  - Implement the POST `/api/summarize-applicant` route that validates payloads with a Zod `SummarySchema` before processing.
  - Configure CORS policies to allow the frontend to call the backend using the constants defined in `src/config.ts`.
- **Testing Notes:**
  - Add request/response tests for `/api/summarize-applicant`, covering both valid submissions and schema validation failures.
  - Verify that local configuration loading respects the `config.sample.json` defaults when `config.local.json` is absent.
  - Exercise CORS behavior through integration or supertest-based coverage to confirm frontend compatibility.

## Phase 8 – Performance Optimizations
- **Planned Work:**
  - Analyze bundle size and apply code-splitting in routing modules.
  - Memoize expensive components/hooks in `src/components/` and `src/hooks/`.
- **Testing Notes:**
  - Use performance profiling tools (React Profiler, Lighthouse) to ensure improvements.
  - Re-run unit/integration tests to confirm no regressions.

## Phase 9 – Documentation & Developer Experience
- **Planned Work:**
  - Update `README.md` and add developer guides under `docs/` (e.g., `docs/Architecture.md`).
  - Provide scripts or tooling notes in `package.json` to streamline workflows.
- **Testing Notes:**
  - Verify documentation commands/scripts by running them locally.
  - Ensure linting and tests still pass after any script adjustments.

## Phase 10 – Final QA & Deployment Preparation
- **Planned Work:**
  - Prepare deployment configuration (e.g., `.env.production`, CI/CD workflows) and final polish.
  - Conduct code review and resolve outstanding issues or TODOs.
- **Testing Notes:**
  - Run the full test suite and linting as part of release candidate validation.
  - Execute production build (`npm run build`) and smoke test the output.
