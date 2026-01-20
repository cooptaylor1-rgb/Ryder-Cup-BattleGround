# Documentation Versioning Policy

This document consolidates versioning practices for all project documentation.

---

## Policy

1. **No per-file "Last Updated" dates** — These quickly become stale and misleading.
2. **Use Git history** — `git log --oneline <file>` shows accurate change history.
3. **Tie docs to releases** — Major doc updates align with version releases in [CHANGELOG.md](CHANGELOG.md).
4. **Status badges** — Use 🔴 Draft / 🟡 Reviewed / 🟢 Final instead of dates.

---

## How to Check Document History

```bash
# View recent changes to a doc
git log --oneline -10 Docs/Roadmap.md

# See full diff of last change
git show HEAD -- Docs/Roadmap.md

# Find when a line was added
git blame Docs/Roadmap.md
```

---

## Version Numbers

Documentation follows the app version:

| App Version | Doc Version | Notes |
|-------------|-------------|-------|
| v1.0.x | v1.0 | Initial release docs |
| v1.1.x | v1.1 | Captain's Toolkit docs |
| v1.2.x | v1.2 | Friction Killers docs |

---

## Migration Notes

If you encounter a doc with `Last Updated:` in the header:

1. Remove the date line
2. Ensure the doc is listed in [INDEX.md](INDEX.md)
3. Add appropriate status badge to the header
