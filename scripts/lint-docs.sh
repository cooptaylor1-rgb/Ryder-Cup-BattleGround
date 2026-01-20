#!/bin/bash
# Documentation Linting Script
# Checks markdown files for style consistency, broken links, and structure

set -e

DOCS_DIR="Docs"
ERRORS=0

echo "🔍 Linting documentation in $DOCS_DIR..."
echo ""

# Check 1: All docs have a top-level heading
echo "📋 Checking for top-level headings..."
for file in "$DOCS_DIR"/*.md; do
  if [ -f "$file" ]; then
    first_line=$(head -n 1 "$file")
    if [[ ! "$first_line" =~ ^#\  ]]; then
      echo "  ❌ $file: Missing top-level heading"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done
echo ""

# Check 2: No broken internal links
echo "🔗 Checking for broken internal links..."
for file in "$DOCS_DIR"/*.md; do
  if [ -f "$file" ]; then
    # Extract markdown links to .md files
    links=$(grep -oE '\[.*?\]\([^)]+\.md\)' "$file" 2>/dev/null || true)
    while IFS= read -r link; do
      if [ -n "$link" ]; then
        target=$(echo "$link" | sed -E 's/.*\(([^)]+)\).*/\1/')
        # Check if target exists (relative to Docs dir)
        if [ ! -f "$DOCS_DIR/$target" ] && [ ! -f "$target" ]; then
          echo "  ❌ $file: Broken link to $target"
          ERRORS=$((ERRORS + 1))
        fi
      fi
    done <<< "$links"
  fi
done
echo ""

# Check 3: Docs are listed in INDEX.md
echo "📑 Checking INDEX.md coverage..."
if [ -f "$DOCS_DIR/INDEX.md" ]; then
  for file in "$DOCS_DIR"/*.md; do
    basename=$(basename "$file")
    # Skip meta files
    if [[ "$basename" != "INDEX.md" && "$basename" != "CHANGELOG.md" && "$basename" != "VERSIONING.md" ]]; then
      if ! grep -q "$basename" "$DOCS_DIR/INDEX.md"; then
        echo "  ⚠️  $basename: Not listed in INDEX.md"
      fi
    fi
  done
else
  echo "  ❌ INDEX.md not found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: No "Last Updated" lines (per versioning policy)
echo "📅 Checking for deprecated 'Last Updated' lines..."
for file in "$DOCS_DIR"/*.md; do
  if [ -f "$file" ]; then
    if grep -qi "Last Updated:" "$file"; then
      echo "  ⚠️  $file: Contains 'Last Updated' (see VERSIONING.md)"
    fi
  fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo "✅ Documentation lint passed!"
  exit 0
else
  echo "❌ Documentation lint failed with $ERRORS error(s)"
  exit 1
fi
