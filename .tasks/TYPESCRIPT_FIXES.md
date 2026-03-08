Fix all 14 TypeScript errors in the Omniscience codebase. The errors fall into 3 categories:

## Error Categories

### 1. ChangingStatesSimState doesn't satisfy Record<string, unknown> constraint (5 errors)
**Files affected**:
- `lib/types/changing-states.ts`
- `app/topics/changing-states/page.tsx`
- `components/simulations/ChangingStatesSimulation.tsx`
- `lib/topics/changing-states/config.ts`

**Fix**: Add index signature to `ChangingStatesSimState` interface:
```typescript
export interface ChangingStatesSimState {
  temperature: number;
  phase: Phase;
  particleSpeed: number;
  sliderActive: boolean;
  [key: string]: unknown; // Add this line
}
```

### 2. setState callbacks in TopicRunner don't handle undefined (6 errors)
**File**: `framework/TopicRunner.tsx`
**Lines**: 144, 176, 379, 396

**Fix**: Add undefined guards to setState callbacks:
```typescript
// Before:
setState((prev) => ({ ...prev, simulation: newState }))

// After:
setState((prev) => prev ? { ...prev, simulation: newState } : initialState)
```

### 3. Type casting issues (3 errors)
**File**: `framework/TopicRunner.tsx`
**Lines**: 295, 298, 376, 395, 405

**Fixes**:
- Line 295, 298: Cast `Message` to `unknown` first, then to `Record<string, unknown>`
- Line 376, 395, 405: Cast `window` to `unknown` first, then to `Record<string, unknown>`
- `components/companion/Companion.tsx` line 130: Fix Framer Motion `animate` prop type (likely needs to be a proper animation variant)

## Instructions
1. Read each affected file
2. Apply the fixes above
3. Run `npm run typecheck` to verify all errors are resolved
4. Commit with message: "fix: resolve 14 TypeScript type errors"

## Expected Result
`npm run typecheck` should pass with 0 errors.
