# T1: Slider Particle Disappear Issue - Diagnostic Investigation

## Status
Diagnostic logging added. Ready for manual testing.

## Diagnostic Logging Added

### useParticlePhysics.ts
1. **Render logging**: Tracks particle count, phase, temperature, and container dimensions on each render
2. **Container size change logging**: Monitors when container dimensions change and trigger particle re-initialization
3. **Physics tick logging**: Logs every animation frame with particle count, phase, temperature, dt values, and sample particle data
4. **NaN detection**: Checks for NaN values in particle positions/velocities after each physics step
5. **Invalid container dimension check**: Guards against invalid container dimensions in stepParticles

### ChangingStatesSimulation.tsx
1. **Temperature change logging**: Tracks temperature changes, phase transitions, and whether phase actually changed
2. **Slider DOWN logging**: Logs when slider is pressed with current phase, temperature, and particle count
3. **Slider UP/CANCEL logging**: Logs when slider is released or cancelled with current state
4. **Container measurement logging**: Tracks container dimension changes from ResizeObserver
5. **NaN particle render logging**: Enhanced error logging when NaN particles are filtered out during render

## Testing Instructions

Run the dev server and perform these actions while monitoring the browser console:

1. **Normal slider drag**: Drag slider slowly from left to right
2. **Rapid slider drag**: Quickly drag slider back and forth multiple times
3. **Hold at boundaries**: Hold slider at 0%, 33%, 67%, and 100% positions
4. **Release outside slider**: Drag slider and release pointer outside the slider element
5. **Phase transitions**: Cross phase boundaries (33° and 67°) multiple times

## Expected Console Output

The console will show:
- `[wt-fix/slider-particle-disappear]` prefixed logs for all tracked events
- Particle count should remain constant at 42
- Container dimensions should be stable during slider interaction
- NaN detection errors if particles disappear
- Phase transition events when crossing boundaries

## Next Steps

After manual testing:
1. Document exact reproduction steps
2. Identify console errors/warnings at moment of failure
3. Analyze state values when particles disappear
4. Write root cause hypothesis
5. Update this file with findings
6. Recommend fixes for T2 and T3

## Manual Verification Command

```bash
echo "Manual verification: hold slider and observe console for errors"
```
