-- Nullable fields preserve legacy applications without inventing personal data.
ALTER TABLE `Application`
  ADD COLUMN `currentAddress` TEXT NULL,
  ADD COLUMN `employmentType` VARCHAR(191) NULL,
  ADD COLUMN `employerName` VARCHAR(191) NULL,
  ADD COLUMN `monthlyIncome` DECIMAL(14,2) NULL,
  ADD COLUMN `incomeSource` VARCHAR(191) NULL,
  ADD COLUMN `incomeDocumentId` VARCHAR(191) NULL,
  ADD COLUMN `householdType` VARCHAR(191) NULL,
  ADD COLUMN `adultCount` INTEGER NULL,
  ADD COLUMN `childCount` INTEGER NULL,
  ADD COLUMN `elderlyCount` INTEGER NULL,
  ADD COLUMN `petCount` INTEGER NULL,
  ADD COLUMN `petTypes` JSON NULL,
  ADD COLUMN `petNotes` TEXT NULL;
