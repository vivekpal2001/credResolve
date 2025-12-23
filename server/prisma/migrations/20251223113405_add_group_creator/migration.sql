/*
  Warnings:

  - Added the required column `creatorId` to the `Group` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add the column as nullable first
ALTER TABLE "Group" ADD COLUMN "creatorId" TEXT;

-- Step 2: Set existing groups' creator to the first member (oldest by joinedAt)
UPDATE "Group" g
SET "creatorId" = (
  SELECT "userId" 
  FROM "GroupMember" 
  WHERE "groupId" = g."id" 
  ORDER BY "joinedAt" ASC 
  LIMIT 1
);

-- Step 3: Make the column NOT NULL
ALTER TABLE "Group" ALTER COLUMN "creatorId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "Group" ADD CONSTRAINT "Group_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
