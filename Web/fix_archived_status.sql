-- Fix archived status for exam results
-- This will set all exam results to non-archived (is_archived = 0)

UPDATE exam_results 
SET is_archived = 0 
WHERE is_archived = 1;

-- Verify the update
SELECT 
    resultId,
    examineeId,
    finished_at,
    is_archived,
    remarks
FROM exam_results 
WHERE finished_at IS NOT NULL
ORDER BY finished_at DESC
LIMIT 10;
