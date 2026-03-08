# Testing Strategy

## Test Pyramid

```
        /\
       /  \  E2E (slow, brittle)
      /____\
     /      \
    / Integ. \ (medium, workhorse)
   /__________\
  /            \
 /     Unit     \ (fast, many)
/________________\
```

## Current Test Suite

### ✅ Unit Tests (Fast, Deterministic, Many)

**Python: `agent/tests/test_course_builder.py`**
- Format detection logic
- State handling
- Tool executor operations
- System prompt construction
- **13 tests, ~2.2s**

**TypeScript: `tests/unit/CourseBuilder.test.tsx`**
- Phase transitions
- Message handling
- File state detection
- Template selection
- **13 tests, ~0.7s**

### ✅ Integration Tests (Medium, Workhorse)

**`tests/integration/course-builder-api.test.ts`**
- API route health checks
- Request/response handling
- Agent registration
- State shape validation
- **6 tests, ~0.6s**

### 🚧 E2E Tests (Slow, Use Sparingly)

**`tests/e2e/course-builder.spec.ts`**
- Full user flows with browser
- Requires auth, backend, frontend all running
- Use only for critical happy paths
- **Currently needs auth setup**

## Running Tests

```bash
# Fast unit tests (run these constantly)
cd agent && python -m pytest tests/test_course_builder.py -v
npm test -- tests/unit/CourseBuilder.test.tsx

# Integration tests (run before commits)
npm test -- tests/integration/course-builder-api.test.ts

# All fast tests together
npm test -- tests/unit tests/integration

# E2E tests (run before releases, requires server running)
npm run test:e2e
```

## What Each Layer Catches

### Unit Tests Catch:
- Logic errors in format detection
- State transition bugs
- Tool operation failures
- Incorrect prompt construction

### Integration Tests Catch:
- API route configuration issues
- State shape mismatches between frontend/backend
- Serialization problems
- Agent registration errors

### E2E Tests Catch:
- Full user flow breakage
- Auth integration issues
- Real browser rendering problems
- Actual network communication failures

## Test Development Workflow

1. **Write unit tests first** - Test logic in isolation
2. **Add integration tests** - Test component boundaries
3. **Add E2E sparingly** - Only for critical user journeys

## Current Status

✅ **32 tests passing in ~3.5 seconds**
- Python unit: 13 tests
- TypeScript unit: 13 tests
- Integration: 6 tests

These fast tests catch 80% of bugs without slow browser automation.
