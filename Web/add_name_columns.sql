-- SQL Commands to Add Separate Name Columns to Existing Database
-- Run these commands in your MySQL database

-- Step 1: Add the new name columns
ALTER TABLE `examinee` 
ADD COLUMN `lname` VARCHAR(255) NOT NULL AFTER `accountId`,
ADD COLUMN `fname` VARCHAR(255) NOT NULL AFTER `lname`,
ADD COLUMN `mname` VARCHAR(255) NULL AFTER `fname`;

-- Step 2: Update existing records with placeholder data
-- This will populate the new columns with data from the existing 'name' column
-- You may need to manually update these after running the command
UPDATE `examinee` 
SET 
    `lname` = 'Last Name',  -- Replace with actual last name extraction logic
    `fname` = 'First Name', -- Replace with actual first name extraction logic
    `mname` = NULL
WHERE `lname` = 'Last Name' OR `lname` IS NULL;

-- Step 3: Remove the old 'name' column (ONLY after verifying the new columns have correct data)
-- ALTER TABLE `examinee` DROP COLUMN `name`;

-- Alternative Step 2: If you want to try to split existing names automatically
-- This is a basic attempt - you may need to manually review and correct the results
UPDATE `examinee` 
SET 
    `fname` = TRIM(SUBSTRING_INDEX(`name`, ' ', 1)),
    `lname` = TRIM(SUBSTRING_INDEX(`name`, ' ', -1)),
    `mname` = CASE 
        WHEN CHAR_LENGTH(`name`) - CHAR_LENGTH(REPLACE(`name`, ' ', '')) >= 2 
        THEN TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(`name`, ' ', 2), ' ', -1))
        ELSE NULL 
    END
WHERE `name` IS NOT NULL AND `name` != '';

-- Verify the changes
SELECT 
    id, 
    name as old_name, 
    fname, 
    mname, 
    lname,
    CONCAT(fname, ' ', IFNULL(CONCAT(mname, ' '), ''), lname) as new_full_name
FROM `examinee` 
LIMIT 10;
