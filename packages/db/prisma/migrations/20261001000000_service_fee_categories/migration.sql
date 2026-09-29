-- CreateEnum
CREATE TYPE "app"."ServiceFeeCategory" AS ENUM ('LONG_DISTANCE_RAIL', 'INTERCITY_REGIONAL', 'LOCAL_AND_BUS');

-- AlterEnum
ALTER TYPE "app"."ServiceFeeKind" ADD VALUE 'FIXED_PER_TICKET';

-- AlterTable
ALTER TABLE "app"."ServiceFeeRule" ADD COLUMN     "category" "app"."ServiceFeeCategory";

