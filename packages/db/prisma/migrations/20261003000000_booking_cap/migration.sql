-- The fee cap now applies to every booking, not only multi-operator bookings.
ALTER TYPE "app"."ServiceFeeKind" RENAME VALUE 'MULTI_OPERATOR_BOOKING_CAP' TO 'BOOKING_CAP';
