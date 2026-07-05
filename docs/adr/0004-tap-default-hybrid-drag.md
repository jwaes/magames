# 4. Tap-to-move default, hybrid drag optional

**Status:** Accepted (2026-07-05)

## Context

The primary player is 80 with limited fine-motor precision, for whom **dragging is the
hardest interaction**. Tap-to-move (tap a card → it flies to its best legal spot) removes
that difficulty and is the existing default. But other users (family) may prefer the
familiar drag feel, and the user explicitly asked for a selectable drag mode.

## Decision

Add a **"Bewegingsstijl"** setting: **Tikken** (default) or **Slepen**.
- **Tikken** = pure tap only; drag can never start (no accidental drags).
- **Slepen** = **hybrid** — drag *and* tap both work. A press moving >~10px is a drag;
  otherwise it's a tap.
- Draggable sources: waste top and face-up tableau cards (with their valid run). Stock stays
  tap-only. Drop resolution is **best-overlap, legal-first**; illegal → snap back. Legal
  targets highlight during a drag.

Considered and rejected: (a) always-on drag with no setting — risks confusing the primary
user with accidental drags; (b) drag-only "Slepen" — needlessly removes the easier tap.

## Consequences

- The safest, easiest mode stays the default and is fully locked down.
- Drag is purely additive in Slepen mode, so enabling it never removes the forgiving tap.
- Both styles call the same engine (`canMove`/`move`), so behaviour can't diverge.
- Tap is derived from "pointer-up without crossing the threshold", so existing click-based
  E2E tests (`.click()` dispatches pointerup) keep working.
- Added complexity: pointer-event bookkeeping, a drag ghost layer, and overlap hit-testing
  live in the board component.
