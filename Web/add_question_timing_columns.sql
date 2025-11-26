-- Add timing columns to examinee_answer table for question difficulty analysis
-- Run this SQL command to add the new columns to your existing database

ALTER TABLE examinee_answer 
ADD COLUMN time_spent_seconds INT DEFAULT NULL COMMENT 'Time spent on this question in seconds',
ADD COLUMN question_start_time TIMESTAMP NULL COMMENT 'When examinee started this question',
ADD COLUMN question_end_time TIMESTAMP NULL COMMENT 'When examinee submitted this question';

-- Add indexes for better query performance on timing analysis
CREATE INDEX idx_examinee_answer_time_spent ON examinee_answer(time_spent_seconds);
CREATE INDEX idx_examinee_answer_question_timing ON examinee_answer(questionId, time_spent_seconds);
CREATE INDEX idx_examinee_answer_exam_timing ON examinee_answer(examId, time_spent_seconds);

-- Verify the changes
DESCRIBE examinee_answer;
