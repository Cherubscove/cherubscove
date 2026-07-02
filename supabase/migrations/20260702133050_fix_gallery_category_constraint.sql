-- Drop the overly restrictive gallery_category_check constraint
-- The old constraint only allowed the literal value 'conference',
-- which prevented using gallery IDs/names as categories.
ALTER TABLE gallery DROP CONSTRAINT IF EXISTS gallery_category_check;

-- Add a replacement constraint: category must be null, non-empty, or a reasonable string.
-- This allows gallery IDs (e.g. 'quivers-arrows-2023'), names, or other labels,
-- while still preventing truly blank/whitespace-only values.
ALTER TABLE gallery ADD CONSTRAINT gallery_category_check
  CHECK (category IS NULL OR (length(category) >= 1 AND category !~ '^\s+$'));
