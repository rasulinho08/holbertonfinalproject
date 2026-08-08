# Contributing

Sprint 1 requires the repository to be managed professionally: a defined branch
structure, work done on the right branch, and merges that go through review.
This document is that process.

---

## 1. Branch structure

Three long-lived branches, exactly as the sprint requires:

| Branch | Purpose | Who works here |
|---|---|---|
| `main` | Stable, always runnable. Every commit must build. | Nobody directly — merges only |
| `frontend` | React Native app development | Frontend team |
| `backend` | API integration work touching this repo | Backend team |

```
main
├── frontend
│   ├── feat/quote-composer
│   ├── feat/checkout-flow
│   └── fix/shelf-picker-offline
└── backend
    └── feat/api-integration
```

**Never commit directly to `main`.** Work happens on a short-lived branch cut
from `frontend` or `backend`, and reaches `main` through a pull request.

### Creating the long-lived branches

```bash
git checkout -b frontend main
git push -u origin frontend

git checkout -b backend main
git push -u origin backend
```

### Feature branches

```bash
git checkout frontend
git pull
git checkout -b feat/reading-streak
```

Naming: `<type>/<short-kebab-description>` where `type` is one of
`feat` · `fix` · `refactor` · `docs` · `chore` · `test`.

---

## 2. Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject in the imperative>

[optional body explaining WHY, not what]
```

Types: `feat` · `fix` · `refactor` · `style` · `docs` · `test` · `chore` · `perf`

Good:

```
feat(quotes): add OCR text extraction to the composer
fix(cart): keep delivery fee per publisher instead of per order
refactor(api): move endpoint paths into a single registry
docs(backend-guide): document the multi-vendor order split
```

Not useful:

```
update
fix bug
asdf
final version 2 FINAL
```

The subject line says *what changed*. The body, when present, says *why* — that
is the part nobody can reconstruct from the diff six months later.

---

## 3. Pull requests

Every merge into `frontend`, `backend` or `main` goes through a PR.

### Before opening one

```bash
npm run typecheck    # must be clean
npm run lint
npm run e2e          # if the change touches a user flow
```

### PR description template

```markdown
## What
One or two sentences on what this changes.

## Why
The problem it solves, or the spec requirement it satisfies.

## How to test
1. npm run web
2. Navigate to …
3. Expect …

## Screenshots
(for anything visual — before/after)

## Checklist
- [ ] `npm run typecheck` is clean
- [ ] Works in both light and dark mode
- [ ] Works in both AZ and EN
- [ ] New strings added to `src/i18n/az.ts` *and* `en.ts`
- [ ] No hardcoded colours — everything from `useTheme()`
```

### Review

- At least one approval before merge.
- The reviewer runs the branch locally for anything user-facing.
- Squash-merge feature branches; keep merge commits for `frontend → main`.

---

## 4. Frontend conventions

These are the rules that keep the codebase coherent. They are not style
preferences — each one prevents a specific class of bug.

### Never call HTTP from a screen

```ts
// ✅
const { data: book } = useBook(id);

// ❌ — breaks the mock/live switch and bypasses caching
const book = await fetch(`${API_URL}/books/${id}`).then(r => r.json());
```

Screens import from `@/api/hooks` only. A new endpoint means: add the path to
`src/api/endpoints.ts`, implement it in `src/api/mock/handlers.ts`, expose a hook
in `src/api/hooks/`, and document it in `backend-guide/ENDPOINTS.md`.

### Never hardcode a colour

```tsx
// ✅
const theme = useTheme();
<View style={{ backgroundColor: theme.colors.card }} />

// ❌ — breaks dark mode silently
<View style={{ backgroundColor: '#FFFFFF' }} />
```

All visual values come from `src/theme/tokens.ts`.

### Never hardcode user-visible text

```tsx
// ✅
const { t } = useI18n();
<Text>{t('book.addToShelf')}</Text>

// ❌
<Text>Rəfə əlavə et</Text>
```

Add the key to `src/i18n/az.ts` first — `en.ts` is typed against it, so a missing
English translation is a compile error rather than a runtime surprise.

### Every list needs three states

Loading (skeletons, not a spinner), empty (`<EmptyState />`, never a blank
screen), and error. If you write a `FlatList`, you write all three.

### Accessibility is not optional

Every pressable needs `accessibilityRole` and, when it has no visible text,
`accessibilityLabel`. `IconButton` requires `label` for exactly this reason.

---

## 5. Adding a feature end to end

Worked example — adding "reading challenges":

1. **Types** — add the model to `src/types/index.ts`.
2. **Endpoint** — add the path to `src/api/endpoints.ts`.
3. **Mock** — implement it in `src/api/mock/handlers.ts` so the app works today.
4. **Hook** — add `useChallenges()` in `src/api/hooks/`.
5. **Screen** — build it in `app/`, using only the hook.
6. **i18n** — add strings to `az.ts` and `en.ts`.
7. **Contract** — document it in `backend-guide/ENDPOINTS.md` and, if it needs
   storage, in `DATABASE.md`.
8. **Verify** — `npm run typecheck`, then exercise the screen in the browser.

Step 7 is the one people skip. Don't — it is what keeps the backend team
unblocked.

---

## 6. Working with the backend team

The frontend is already written against a fixed contract, which means the two
teams do not need to be in sync day to day:

- **The contract is `backend-guide/`.** If the backend needs a different shape,
  change the guide *and* the mock in the same PR, so the two never diverge.
- **The mock is a reference implementation.** When a response shape is unclear,
  read `src/api/mock/handlers.ts` — it is deliberately short and readable.
- **Integrate incrementally.** `backend-guide/ROADMAP.md` orders the work so each
  milestone unblocks a specific set of screens. There is no big-bang cutover.
- **Frontend supports the backend team.** Per the sprint requirements, the
  backend team should not work in isolation — API integration questions and
  contract changes are a shared responsibility.

---

## 7. Definition of done

A task is finished when:

- [ ] It works against the running backend (`npm run dev` in the API repository)
- [ ] `npm run typecheck` passes
- [ ] It renders correctly in light **and** dark mode
- [ ] It renders correctly in AZ **and** EN
- [ ] Loading, empty and error states are handled
- [ ] Interactive elements have accessibility labels
- [ ] The contract docs are updated if an endpoint changed
- [ ] A teammate has reviewed and run it
