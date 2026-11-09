-- Ratings must come only from verified reviews (NMC guidelines ban unverifiable/fake reviews).
-- Every rating stored before reviews existed was not from verified visits, so reset them.
UPDATE "Hospital" SET "rating" = 0, "reviewCount" = 0;
