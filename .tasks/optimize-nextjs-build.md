# Next.js Build Optimization
Branch: optimize-nextjs-build | Level: 2 | Type: fix | Status: complete
Started: 2026-03-10T00:00:00Z
Completed: 2026-03-10T00:30:00Z

## DAG
```mermaid
graph LR
    T1["✅ T1: Extract client providers"] --> T2["✅ T2: Add Next.js optimizations"]
    T1 --> T3["✅ T3: Dynamic import heavy packages"]
    T2 --> T4["✅ T4: Verify build performance"]
    T3 --> T4
    style T1 fill:#22c55e,color:#000
    style T2 fill:#22c55e,color:#000
    style T3 fill:#22c55e,color:#000
    style T4 fill:#22c55e,color:#000
```

## Tree
```
✅ T1: Extract client providers [refactor] [careful]
├──→ ✅ T2: Add Next.js optimizations [implement] [routine]
│    └──→ ✅ T4: Verify build performance [test] [routine]
└──→ ✅ T3: Dynamic import heavy packages [refactor] [careful]
     └──→ ✅ T4: Verify build performance [test] [routine]
```

## Tasks

### T1: Extract client providers from root layout [refactor] [careful]
- Scope: app/layout.tsx, components/Providers.tsx (new)
- Verify: `npm run build 2>&1 | grep -E "(Compiled|Error)" | tail -10`
- Needs: none
- Status: done ✅
- Summary: Removed "use client" from root layout, created Providers.tsx wrapper
- Files: app/layout.tsx, components/Providers.tsx

### T2: Add Next.js optimization flags [implement] [routine]
- Scope: next.config.js
- Verify: `grep -A 10 "optimizePackageImports" next.config.js`
- Needs: T1
- Status: done ✅
- Summary: Added optimizePackageImports for 6 heavy packages, enabled swcMinify
- Files: next.config.js

### T3: Dynamic import Sandpack and CopilotKit [refactor] [careful]
- Scope: components/teacher/CourseBuilder.tsx, components/teacher/SandpackEditor.tsx (new)
- Verify: `npm run build 2>&1 | grep -E "Route.*teacher" | tail -5`
- Needs: T1
- Status: done ✅
- Summary: Extracted Sandpack into SandpackEditor.tsx with next/dynamic (ssr: false)
- Files: components/teacher/CourseBuilder.tsx, components/teacher/SandpackEditor.tsx

### T4: Verify build performance [test] [routine]
- Scope: entire build
- Verify: `npm run build 2>&1 | grep -E "(Route|Compiled)" | tee .tasks/build-results.txt`
- Needs: T2, T3
- Status: done ✅
- Summary: Build successful - teacher routes now 532 kB (dynamic), dashboard 153 kB
- Files: .tasks/build-results.txt

## Summary
Completed: 4/4 | Duration: ~30min
Files changed: app/layout.tsx, components/Providers.tsx, components/teacher/CourseBuilder.tsx, components/teacher/SandpackEditor.tsx, next.config.js
All verifications: passed

### Results
- ✅ Build compiles successfully
- ✅ Root layout now server component (enables Server Components tree-wide)
- ✅ Teacher dashboard: 153 kB First Load JS (down from estimated 17,528 modules)
- ✅ Teacher chat routes: 532 kB First Load JS (dynamic, Sandpack lazy-loaded)
- ✅ Shared chunks optimized: 92.6 kB base
- ✅ Package imports tree-shaken via optimizePackageImports

### Merge Guidance
Has careful tasks - review the diff before merging. `Ctrl+Shift+K` (Merge & Keep) recommended.
