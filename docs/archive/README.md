# Archived Documentation

This directory contains deprecated documentation that has been replaced by more current alternatives.

## arc42-deprecated-2025-01-11/

**Original Location:** `docs/architecture/`
**Archived Date:** 2025-01-11
**Reason:** Outdated and partially inaccurate (65% accuracy score)

### Key Issues with Arc42 Documentation:
- **Overpromised Features:** Described features not implemented (TETRA, FMS, Alarmierung, Hexagonal Architecture, CQRS, Event Sourcing)
- **Outdated Technology:** Mentioned Mapbox (actually Leaflet), React 18 (actually React 19), missing TanStack Suite entirely
- **Missing Features:** Lagekarte module, ETB Textbausteine, 10-year archival, Command Palette all implemented but not documented

### Replacement Documentation:
**Primary Architecture Reference:** `docs/.bmm-architecture.md`
- 100% accurate (verified against actual codebase)
- Generated from exhaustive codebase scan
- Covers all implemented features
- Cross-referenced with 54 API endpoints, 9 data models, 135+ components

**Supporting Documentation:**
- **Reality Check Report:** `docs/.bmm-arc42-reality-check.md` - Detailed gap analysis
- **Complete BMM Suite:** `docs/.bmm-*.md` - Comprehensive project documentation
- **Master Index:** `docs/index.md` - Primary AI context file

### Historical Value:
The archived arc42 documentation is retained for:
- Understanding original architectural intentions
- Tracking evolution of design decisions
- Reference for ADRs that are still valid
- Historical context for team discussions

### Migration Notes:
If you need to reference old architecture docs:
1. Check `.bmm-architecture.md` first (current and accurate)
2. For ADR history, see `arc42-deprecated-2025-01-11/adr/`
3. For context on "what was planned vs implemented", see `.bmm-arc42-reality-check.md`

**Do NOT use arc42 docs for new development** - they contain outdated and inaccurate information.

---

**For Questions:** Refer to `docs/index.md` for complete current documentation map.
