# GenAI Interview Summary API Contract

This document defines the ReadySetHire contract for the `POST /api/summarize-applicant` endpoint. The
endpoint generates a natural-language summary for a single applicant by combining structured
interview data with GenAI output. All consumers **must** conform to this contract to ensure the
frontend, API wrapper, and GenAI integration remain interoperable.

## Endpoint

```
POST /api/summarize-applicant
```

- **Headers**
  - `Authorization: Bearer <jwt>` – required; the PostgREST gateway enforces row-level security.
  - `Content-Type: application/json`
  - `Prefer: return=representation` – required when the caller needs the echoed payload and summary.
- **Authentication** – requests are authenticated with the same JWT used for the PostgREST tables.

## Request Payload

The request payload merges the authenticated username with the applicant, interview, and answer
context that the GenAI model needs to generate the summary. The API wrapper is responsible for
injecting `{ username }` from the current auth session before forwarding the request.

```json
{
  "username": "s1234567",
  "applicantId": 42,
  "interviewId": 17,
  "applicantName": {
    "title": "Ms",
    "first": "Asha",
    "last": "Singh"
  },
  "jobRole": "Front-end Developer",
  "answers": [
    {
      "questionId": 301,
      "question": "Explain event delegation in React.",
      "answer": "I described how React wraps DOM events...",
      "transcript": "React uses synthetic events ...",
      "durationSeconds": 118
    },
    {
      "questionId": 302,
      "question": "How do you ensure accessibility in forms?",
      "answer": null,
      "transcript": "I ensure descriptive labels...",
      "durationSeconds": 96
    }
  ],
  "skillsSummary": "5 years React, 2 years accessibility audits"
}
```

### Username merge expectations

- The caller **must** omit `username` when building the payload. The shared `apiRequest()` helper
  automatically merges the authenticated `{ username }` into the JSON body immediately before the
  request is sent.
- The API rejects requests where the injected username does not match the JWT subject.

### Field notes

- `answers[].answer` is nullable; voice-only responses can rely on the Whisper transcript.
- `answers[].transcript` should contain the auto-generated transcription when available. When
  transcription fails, pass `null` and allow the model to rely on written answers.
- `durationSeconds` is optional telemetry for the GenAI prompt. Supply integer seconds when known.
- `skillsSummary` is an optional pre-computed highlight string captured during the application flow.

## Successful Response

A successful call returns the canonical summary envelope that downstream consumers render in the
ReadySetHire UI.

```json
{
  "summary": {
    "applicantId": 42,
    "interviewId": 17,
    "generatedAt": "2024-05-13T08:44:19.422Z",
    "overview": "Asha communicated clearly and demonstrated strong knowledge of React state.",
    "strengths": [
      "Explained event delegation trade-offs with concrete examples",
      "Consistent emphasis on accessibility best practices"
    ],
    "risks": [
      "Limited experience with automated testing frameworks"
    ],
    "recommendation": "Advance to final panel interview to probe testing strategy depth.",
    "isPlaceholder": false
  }
}
```

- Timestamps are ISO-8601 strings in UTC.
- `strengths` and `risks` are ordered lists in priority order as produced by the model.
- `isPlaceholder` allows the UI to display a configuration warning when the summary was not generated
  by GenAI (see below).

## Error Responses

Errors follow a consistent envelope with machine-readable codes and human-friendly messages. Any
additional validation issues are included in the optional `details` array.

| HTTP Status | `code`                | Description                                                   |
|-------------|----------------------|---------------------------------------------------------------|
| 400         | `VALIDATION_ERROR`   | Payload failed schema validation (missing fields, wrong type) |
| 401         | `UNAUTHENTICATED`    | Authorization header missing/invalid                          |
| 403         | `FORBIDDEN`          | Username does not match the JWT or lacks access               |
| 429         | `RATE_LIMITED`       | Caller exceeded GenAI rate limits                             |
| 500         | `GENAI_UPSTREAM`     | GenAI provider error                                          |
| 503         | `SERVICE_UNAVAILABLE`| GenAI subsystem temporarily offline                           |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "answers[1].durationSeconds must be a positive integer",
    "details": [
      {
        "path": ["answers", 1, "durationSeconds"],
        "message": "Expected integer >= 0"
      }
    ]
  }
}
```

The `message` field is always safe to surface directly to developers. `details` is optional and may
be omitted for generic errors.

## Zod SummarySchema

The API and frontend share a Zod schema to validate summaries flowing through the system.

```ts
import { z } from 'zod';

export const SummarySchema = z.object({
  applicantId: z.number().int().positive(),
  interviewId: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  overview: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).default([]),
  recommendation: z.string().min(1),
  isPlaceholder: z.boolean().default(false),
});

export type Summary = z.infer<typeof SummarySchema>;
```

Consumers should extend this schema locally if additional display metadata is required, while keeping
these base fields intact for compatibility.

## Placeholder behaviour without `GENAI_API_KEY`

When `GENAI_API_KEY` is unset or empty, the service falls back to a deterministic placeholder
response:

- The `summary` payload is generated from static copy templates and tagged with
  `isPlaceholder: true` so the UI can show a configuration callout.
- The `overview` and `recommendation` strings explicitly mention that real GenAI output could not be
  produced because the key is missing.
- The HTTP status remains `200 OK` to keep downstream retry logic simple.
- Placeholder responses include a synthetic `generatedAt` timestamp so that caching and auditing
  continue to function.

Once a valid `GENAI_API_KEY` is configured, the service switches to live GenAI calls and removes the
placeholder indicators.
