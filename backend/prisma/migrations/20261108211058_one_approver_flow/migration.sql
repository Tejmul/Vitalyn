-- One approver per doctor (auto-confirm by default) replaces doctor-then-desk approval.

-- Live bookings that were half-way through the old two-step flow go back to the approval inbox.
UPDATE "Appointment" SET "status" = 'PENDING' WHERE "status" = 'DOCTOR_APPROVED';

-- Keep each doctor's existing choice; new doctors default to auto-confirm.
ALTER TABLE "Doctor" RENAME COLUMN "autoApprove" TO "autoConfirm";
ALTER TABLE "Doctor" ALTER COLUMN "autoConfirm" SET DEFAULT true;
