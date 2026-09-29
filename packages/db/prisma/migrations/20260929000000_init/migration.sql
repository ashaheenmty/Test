-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "records";

-- CreateEnum
CREATE TYPE "app"."TransportMode" AS ENUM ('HIGH_SPEED_RAIL', 'LONG_DISTANCE_RAIL', 'REGIONAL_RAIL', 'S_BAHN', 'U_BAHN', 'TRAM', 'STADTBAHN', 'BUS', 'COACH', 'FERRY', 'NIGHT_TRAIN', 'CAR_TRAIN', 'RACK_RAILWAY', 'FUNICULAR', 'HERITAGE_RAIL', 'SUSPENSION_RAILWAY', 'OTHER');

-- CreateEnum
CREATE TYPE "app"."OperatorSegment" AS ENUM ('LONG_DISTANCE', 'CROSS_BORDER', 'REGIONAL', 'CITY_TRANSIT', 'NIGHT', 'LONG_DISTANCE_BUS', 'HERITAGE');

-- CreateEnum
CREATE TYPE "app"."OrganisationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "app"."OrganisationRole" AS ENUM ('OPERATOR', 'TARIFF_ASSOCIATION', 'SALES_CHANNEL', 'DISTRIBUTOR', 'PAYMENT_PROVIDER', 'AGENT');

-- CreateEnum
CREATE TYPE "app"."RegionType" AS ENUM ('FEDERAL_STATE', 'CITY', 'COUNTRY', 'INTERNATIONAL_ROUTE');

-- CreateEnum
CREATE TYPE "app"."TariffKind" AS ENUM ('VERBUND', 'NATIONAL_TARIFF', 'NATIONAL_PASS', 'OPERATOR_TARIFF');

-- CreateEnum
CREATE TYPE "app"."SalesChannelKind" AS ENUM ('NATIONAL_RETAILER', 'OPERATOR_DIRECT', 'OSDM', 'WHOLESALE', 'OEPNV_API', 'CHECK_IN_CHECK_OUT', 'AGGREGATOR', 'TARIFF_BODY', 'DATA_SOURCE');

-- CreateEnum
CREATE TYPE "app"."MerchantOfRecord" AS ENUM ('AGENT_PLATFORM_SPLIT', 'OPERATOR', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "app"."ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "app"."CommissionKind" AS ENUM ('PERCENT', 'FIXED_PER_TICKET', 'FIXED_PER_LEG', 'TIERED');

-- CreateEnum
CREATE TYPE "app"."CommissionBasis" AS ENUM ('FARE_GROSS', 'FARE_NET');

-- CreateEnum
CREATE TYPE "app"."LegalDocumentType" AS ENUM ('CONDITIONS_OF_CARRIAGE', 'TARIFF_CONDITIONS', 'AGENT_TERMS', 'PRIVACY_POLICY', 'IMPRESSUM', 'DISPUTE_RESOLUTION_NOTICE');

-- CreateEnum
CREATE TYPE "app"."LegalDocumentOwner" AS ENUM ('AGENT', 'OPERATOR', 'TARIFF_ASSOCIATION', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "app"."UserStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "app"."ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "app"."AuthProvider" AS ENUM ('APPLE', 'GOOGLE');

-- CreateEnum
CREATE TYPE "app"."PrincipalType" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "app"."EmailTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "app"."DiscountCardType" AS ENUM ('BAHNCARD_25', 'BAHNCARD_50', 'BAHNCARD_100', 'BAHNCARD_BUSINESS_25', 'BAHNCARD_BUSINESS_50', 'DEUTSCHLAND_TICKET', 'OEBB_VORTEILSCARD', 'SBB_HALBTAX', 'OTHER');

-- CreateEnum
CREATE TYPE "app"."TravelClass" AS ENUM ('FIRST', 'SECOND', 'NONE');

-- CreateEnum
CREATE TYPE "app"."Psp" AS ENUM ('STRIPE', 'ADYEN', 'OPERATOR_HOSTED');

-- CreateEnum
CREATE TYPE "app"."ConsentPurpose" AS ENUM ('ANALYTICS', 'MARKETING_EMAIL', 'MARKETING_PUSH', 'CRASH_REPORTS');

-- CreateEnum
CREATE TYPE "app"."DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "app"."AdminRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT', 'FINANCE', 'CONTENT', 'OPS');

-- CreateEnum
CREATE TYPE "app"."ServiceFeeKind" AS ENUM ('ZERO', 'FIXED_PER_BOOKING', 'FIXED_PER_LEG', 'PERCENT');

-- CreateEnum
CREATE TYPE "app"."ItineraryItemKind" AS ENUM ('BOOKED_LEG', 'HOTEL_NOTE', 'NOTE', 'LINK');

-- CreateEnum
CREATE TYPE "app"."NotificationKind" AS ENUM ('DELAY', 'CANCELLATION', 'PLATFORM_CHANGE', 'ROUTE_CHANGE', 'MISSED_CONNECTION', 'BOARDING_REMINDER', 'BOOKING_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "app"."NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "app"."SupportRoute" AS ENUM ('AGENT', 'OPERATOR');

-- CreateEnum
CREATE TYPE "app"."SupportCategory" AS ENUM ('ACCOUNT', 'APP', 'SERVICE_FEE', 'DELAY', 'COMPENSATION', 'REFUND', 'LOST_PROPERTY', 'ASSISTANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "app"."SupportStatus" AS ENUM ('OPEN', 'FORWARDED_TO_OPERATOR', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "records"."BookingStatus" AS ENUM ('DRAFT', 'RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED', 'REFUNDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "records"."TicketContractKind" AS ENUM ('THROUGH', 'SEPARATE');

-- CreateEnum
CREATE TYPE "records"."TicketContractStatus" AS ENUM ('PENDING', 'RESERVED', 'CONFIRMED', 'FAILED', 'VOIDED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "records"."BarcodeFormat" AS ENUM ('QR', 'AZTEC', 'PDF417', 'NONE');

-- CreateEnum
CREATE TYPE "records"."AcknowledgementKind" AS ENUM ('AGENT_TERMS', 'PRIVACY_POLICY', 'CONDITIONS_OF_CARRIAGE', 'SEPARATE_TICKETS_NOTICE', 'TIGHT_CONNECTION_WARNING', 'DATA_TRANSFER_TO_OPERATOR');

-- CreateEnum
CREATE TYPE "records"."PaymentMode" AS ENUM ('PLATFORM_SPLIT', 'OPERATOR_HOSTED');

-- CreateEnum
CREATE TYPE "records"."PaymentStatus" AS ENUM ('REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "records"."TransferKind" AS ENUM ('FARE_TO_OPERATOR', 'FARE_TO_DISTRIBUTOR', 'SERVICE_FEE_TO_AGENT', 'COMMISSION_TO_AGENT');

-- CreateEnum
CREATE TYPE "records"."TransferStatus" AS ENUM ('PENDING', 'PAID', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "records"."RefundKind" AS ENUM ('OPERATOR_FARE', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "records"."RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "records"."CommissionStatus" AS ENUM ('EXPECTED', 'CONFIRMED', 'REVERSED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "records"."SettlementStatus" AS ENUM ('DRAFT', 'FINAL', 'SENT');

-- CreateEnum
CREATE TYPE "records"."OperatorDocumentKind" AS ENUM ('TICKET', 'INVOICE', 'RECEIPT', 'CONDITIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "records"."AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'ADAPTER');

-- CreateTable
CREATE TABLE "app"."Organisation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "groupName" TEXT,
    "vatId" TEXT,
    "website" TEXT,
    "roles" "app"."OrganisationRole"[],
    "status" "app"."OrganisationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "source" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Operator" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "brands" TEXT[],
    "modes" "app"."TransportMode"[],
    "segments" "app"."OperatorSegment"[],
    "serviceTypes" TEXT,
    "coverage" TEXT,
    "ownSalesChannel" TEXT,
    "supportUrl" TEXT,
    "claimsUrl" TEXT,
    "lostPropertyUrl" TEXT,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."OperatorRegion" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "regionType" "app"."RegionType" NOT NULL,
    "regionCode" TEXT NOT NULL,
    "description" TEXT,
    "validFrom" DATE,
    "validTo" DATE,

    CONSTRAINT "OperatorRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."TariffAssociation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "area" TEXT,
    "kind" "app"."TariffKind" NOT NULL,

    CONSTRAINT "TariffAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CityTransitArea" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "modes" TEXT NOT NULL,
    "tariffAssociationId" TEXT,
    "tariffNote" TEXT,

    CONSTRAINT "CityTransitArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CityTransitOperator" (
    "cityAreaId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "CityTransitOperator_pkey" PRIMARY KEY ("cityAreaId","operatorId")
);

-- CreateTable
CREATE TABLE "app"."SalesChannel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "app"."SalesChannelKind" NOT NULL,
    "organisationId" TEXT,
    "merchantOfRecord" "app"."MerchantOfRecord",
    "hostedPaymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "throughTicketSupport" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[],
    "refundPolicy" JSONB,
    "adapterKey" TEXT,
    "coverageDescription" TEXT,
    "relevance" TEXT,
    "status" "app"."OrganisationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "SalesChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ChannelCoverage" (
    "id" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "operatorId" TEXT,
    "tariffAssociationId" TEXT,
    "productScope" TEXT,
    "validFrom" DATE,
    "validTo" DATE,

    CONSTRAINT "ChannelCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Contract" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "counterpartyOrgId" TEXT NOT NULL,
    "salesChannelId" TEXT,
    "status" "app"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "notes" TEXT,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CommissionRule" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "productScope" TEXT,
    "kind" "app"."CommissionKind" NOT NULL,
    "basis" "app"."CommissionBasis" NOT NULL DEFAULT 'FARE_GROSS',
    "percentBp" INTEGER,
    "fixedMinor" INTEGER,
    "tiers" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "ownerKind" "app"."LegalDocumentOwner" NOT NULL,
    "organisationId" TEXT,
    "documentType" "app"."LegalDocumentType" NOT NULL,
    "locale" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "body" TEXT,
    "contentHash" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Station" (
    "id" TEXT NOT NULL,
    "uicCode" TEXT,
    "ibnr" TEXT,
    "gtfsStopIds" TEXT[],
    "name" TEXT NOT NULL,
    "names" JSONB,
    "countryCode" CHAR(2) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'de',
    "theme" "app"."ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "status" "app"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "app"."AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roles" "app"."AdminRole"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RefreshToken" (
    "id" TEXT NOT NULL,
    "principalType" "app"."PrincipalType" NOT NULL,
    "userId" TEXT,
    "adminUserId" TEXT,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "app"."EmailTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Passenger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirthEnc" TEXT,
    "email" TEXT,
    "isAccountHolder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."DiscountCard" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "type" "app"."DiscountCardType" NOT NULL,
    "travelClass" "app"."TravelClass",
    "numberEnc" TEXT,
    "validUntil" DATE,

    CONSTRAINT "DiscountCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."PaymentMethodRef" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "psp" "app"."Psp" NOT NULL,
    "pspCustomerId" TEXT NOT NULL,
    "pspMethodId" TEXT NOT NULL,
    "brand" TEXT,
    "last4" CHAR(4),
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethodRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CompanyInvoiceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vatId" TEXT,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CompanyInvoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "purpose" "app"."ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "textVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "app"."DevicePlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."SavedRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "toStationId" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ServiceFeeRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "app"."ServiceFeeKind" NOT NULL,
    "amountMinor" INTEGER,
    "percentBp" INTEGER,
    "minMinor" INTEGER,
    "maxMinor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "salesChannelId" TEXT,
    "productScope" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."TaxRule" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "rateBp" INTEGER NOT NULL,
    "textKey" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."TranslationOverride" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Itinerary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsOn" DATE,
    "endsOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ItineraryItem" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "kind" "app"."ItineraryItemKind" NOT NULL,
    "bookingLegId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" JSONB,
    "url" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ItineraryShare" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ItineraryShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RealtimeWatch" (
    "id" TEXT NOT NULL,
    "bookingLegId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalTripId" TEXT,
    "lastStatus" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RealtimeWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "kind" "app"."NotificationKind" NOT NULL,
    "channel" "app"."NotificationChannel" NOT NULL,
    "titleKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "params" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."SupportCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "route" "app"."SupportRoute" NOT NULL,
    "category" "app"."SupportCategory" NOT NULL,
    "operatorId" TEXT,
    "status" "app"."SupportStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "prefill" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CompensationClaim" (
    "id" TEXT NOT NULL,
    "supportCaseId" TEXT NOT NULL,
    "bookingLegId" TEXT,
    "delayMinutes" INTEGER,
    "claimFormUrl" TEXT,
    "preparedPayload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "operatorDecision" TEXT,

    CONSTRAINT "CompensationClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."OfferSnapshot" (
    "id" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "externalOfferId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT,
    "status" "records"."BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "locale" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "fareTotalMinor" INTEGER NOT NULL,
    "serviceFeeMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "travellerSnapshot" JSONB NOT NULL,
    "companySnapshot" JSONB,
    "agentTermsId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."TicketContract" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "records"."TicketContractKind" NOT NULL,
    "status" "records"."TicketContractStatus" NOT NULL DEFAULT 'PENDING',
    "salesChannelId" TEXT NOT NULL,
    "tariffAssociationId" TEXT,
    "issuerOrganisationId" TEXT NOT NULL,
    "merchantOfRecord" "app"."MerchantOfRecord" NOT NULL,
    "offerSnapshotId" TEXT NOT NULL,
    "conditionsId" TEXT,
    "externalBookingRef" TEXT,
    "fareMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "vatRateBp" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."BookingLeg" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketContractId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "carrierOperatorId" TEXT NOT NULL,
    "mode" "app"."TransportMode" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "originStationId" TEXT NOT NULL,
    "destinationStationId" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "travelClass" "app"."TravelClass" NOT NULL DEFAULT 'SECOND',
    "seat" JSONB,
    "platformDeparture" TEXT,
    "platformArrival" TEXT,

    CONSTRAINT "BookingLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."BookingPassenger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "passengerId" TEXT,
    "sequence" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Ticket" (
    "id" TEXT NOT NULL,
    "ticketContractId" TEXT NOT NULL,
    "bookingPassengerId" TEXT,
    "externalTicketId" TEXT,
    "barcodeFormat" "records"."BarcodeFormat" NOT NULL,
    "barcodePayload" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Acknowledgement" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketContractId" TEXT,
    "kind" "records"."AcknowledgementKind" NOT NULL,
    "legalDocumentId" TEXT,
    "textKey" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientIp" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Acknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "psp" "app"."Psp" NOT NULL,
    "mode" "records"."PaymentMode" NOT NULL,
    "pspPaymentId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "records"."PaymentStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Transfer" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "ticketContractId" TEXT,
    "kind" "records"."TransferKind" NOT NULL,
    "destinationOrgId" TEXT NOT NULL,
    "destinationAccountRef" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "pspTransferId" TEXT,
    "status" "records"."TransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Refund" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketContractId" TEXT,
    "paymentId" TEXT NOT NULL,
    "kind" "records"."RefundKind" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "records"."RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "operatorRef" TEXT,
    "pspRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Commission" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketContractId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "basisMinor" INTEGER NOT NULL,
    "expectedMinor" INTEGER NOT NULL,
    "confirmedMinor" INTEGER,
    "currency" CHAR(3) NOT NULL,
    "status" "records"."CommissionStatus" NOT NULL DEFAULT 'EXPECTED',
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."Settlement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "records"."SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totals" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalisedAt" TIMESTAMP(3),

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."SettlementLine" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "bookingId" TEXT,
    "commissionId" TEXT,
    "lineType" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "discrepancyNote" TEXT,

    CONSTRAINT "SettlementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."OperatorDocument" (
    "id" TEXT NOT NULL,
    "ticketContractId" TEXT NOT NULL,
    "kind" "records"."OperatorDocumentKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "locale" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."InvoiceSequence" (
    "series" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("series","year")
);

-- CreateTable
CREATE TABLE "records"."ServiceFeeInvoice" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient" JSONB NOT NULL,
    "netMinor" INTEGER NOT NULL,
    "vatMinor" INTEGER NOT NULL,
    "grossMinor" INTEGER NOT NULL,
    "vatRateBp" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "locale" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "storageKey" TEXT,
    "sha256" TEXT,
    "cancelsInvoiceId" TEXT,

    CONSTRAINT "ServiceFeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."TripSummary" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records"."AuditEvent" (
    "id" BIGSERIAL NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "records"."AuditActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "app"."Organisation"("slug");

-- CreateIndex
CREATE INDEX "Organisation_status_idx" ON "app"."Organisation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_organisationId_key" ON "app"."Operator"("organisationId");

-- CreateIndex
CREATE INDEX "OperatorRegion_regionType_regionCode_idx" ON "app"."OperatorRegion"("regionType", "regionCode");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorRegion_operatorId_regionType_regionCode_key" ON "app"."OperatorRegion"("operatorId", "regionType", "regionCode");

-- CreateIndex
CREATE UNIQUE INDEX "TariffAssociation_organisationId_key" ON "app"."TariffAssociation"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "TariffAssociation_shortName_key" ON "app"."TariffAssociation"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "CityTransitArea_city_key" ON "app"."CityTransitArea"("city");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannel_code_key" ON "app"."SalesChannel"("code");

-- CreateIndex
CREATE INDEX "ChannelCoverage_operatorId_idx" ON "app"."ChannelCoverage"("operatorId");

-- CreateIndex
CREATE INDEX "ChannelCoverage_tariffAssociationId_idx" ON "app"."ChannelCoverage"("tariffAssociationId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_reference_key" ON "app"."Contract"("reference");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentType_locale_effectiveFrom_idx" ON "app"."LegalDocumentVersion"("documentType", "locale", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_organisationId_documentType_locale_ver_key" ON "app"."LegalDocumentVersion"("organisationId", "documentType", "locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Station_uicCode_key" ON "app"."Station"("uicCode");

-- CreateIndex
CREATE UNIQUE INDEX "Station_ibnr_key" ON "app"."Station"("ibnr");

-- CreateIndex
CREATE INDEX "Station_name_idx" ON "app"."Station"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "app"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON "app"."AuthIdentity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "app"."AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "app"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "app"."RefreshToken"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "app"."EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Passenger_userId_idx" ON "app"."Passenger"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodRef_psp_pspMethodId_key" ON "app"."PaymentMethodRef"("psp", "pspMethodId");

-- CreateIndex
CREATE INDEX "Consent_userId_purpose_recordedAt_idx" ON "app"."Consent"("userId", "purpose", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "app"."DeviceToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SavedRoute_userId_fromStationId_toStationId_key" ON "app"."SavedRoute"("userId", "fromStationId", "toStationId");

-- CreateIndex
CREATE INDEX "TaxRule_scope_countryCode_validFrom_idx" ON "app"."TaxRule"("scope", "countryCode", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceTemplate_key_locale_version_key" ON "app"."InvoiceTemplate"("key", "locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationOverride_locale_key_key" ON "app"."TranslationOverride"("locale", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryShare_tokenHash_key" ON "app"."ItineraryShare"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RealtimeWatch_bookingLegId_key" ON "app"."RealtimeWatch"("bookingLegId");

-- CreateIndex
CREATE INDEX "RealtimeWatch_active_idx" ON "app"."RealtimeWatch"("active");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "app"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "records"."Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "records"."Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "records"."Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "records"."Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketContract_idempotencyKey_key" ON "records"."TicketContract"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TicketContract_bookingId_sequence_key" ON "records"."TicketContract"("bookingId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLeg_bookingId_sequence_key" ON "records"."BookingLeg"("bookingId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPassenger_bookingId_sequence_key" ON "records"."BookingPassenger"("bookingId", "sequence");

-- CreateIndex
CREATE INDEX "Acknowledgement_bookingId_idx" ON "records"."Acknowledgement"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_pspPaymentId_key" ON "records"."Payment"("pspPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "records"."Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_pspTransferId_key" ON "records"."Transfer"("pspTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_pspRefundId_key" ON "records"."Refund"("pspRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "records"."Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Commission_contractId_period_idx" ON "records"."Commission"("contractId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_contractId_period_key" ON "records"."Settlement"("contractId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorDocument_storageKey_key" ON "records"."OperatorDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeeInvoice_number_key" ON "records"."ServiceFeeInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeeInvoice_cancelsInvoiceId_key" ON "records"."ServiceFeeInvoice"("cancelsInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeeInvoice_series_year_sequence_key" ON "records"."ServiceFeeInvoice"("series", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TripSummary_storageKey_key" ON "records"."TripSummary"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "TripSummary_bookingId_version_locale_key" ON "records"."TripSummary"("bookingId", "version", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_hash_key" ON "records"."AuditEvent"("hash");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "records"."AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "records"."AuditEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "app"."Operator" ADD CONSTRAINT "Operator_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "app"."Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."OperatorRegion" ADD CONSTRAINT "OperatorRegion_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app"."Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."TariffAssociation" ADD CONSTRAINT "TariffAssociation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "app"."Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CityTransitArea" ADD CONSTRAINT "CityTransitArea_tariffAssociationId_fkey" FOREIGN KEY ("tariffAssociationId") REFERENCES "app"."TariffAssociation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CityTransitOperator" ADD CONSTRAINT "CityTransitOperator_cityAreaId_fkey" FOREIGN KEY ("cityAreaId") REFERENCES "app"."CityTransitArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CityTransitOperator" ADD CONSTRAINT "CityTransitOperator_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app"."Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SalesChannel" ADD CONSTRAINT "SalesChannel_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "app"."Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ChannelCoverage" ADD CONSTRAINT "ChannelCoverage_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "app"."SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ChannelCoverage" ADD CONSTRAINT "ChannelCoverage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app"."Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ChannelCoverage" ADD CONSTRAINT "ChannelCoverage_tariffAssociationId_fkey" FOREIGN KEY ("tariffAssociationId") REFERENCES "app"."TariffAssociation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Contract" ADD CONSTRAINT "Contract_counterpartyOrgId_fkey" FOREIGN KEY ("counterpartyOrgId") REFERENCES "app"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Contract" ADD CONSTRAINT "Contract_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "app"."SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CommissionRule" ADD CONSTRAINT "CommissionRule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "app"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "app"."Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RefreshToken" ADD CONSTRAINT "RefreshToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "app"."AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Passenger" ADD CONSTRAINT "Passenger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."DiscountCard" ADD CONSTRAINT "DiscountCard_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "app"."Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."PaymentMethodRef" ADD CONSTRAINT "PaymentMethodRef_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CompanyInvoiceProfile" ADD CONSTRAINT "CompanyInvoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SavedRoute" ADD CONSTRAINT "SavedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SavedRoute" ADD CONSTRAINT "SavedRoute_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "app"."Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SavedRoute" ADD CONSTRAINT "SavedRoute_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "app"."Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ServiceFeeRule" ADD CONSTRAINT "ServiceFeeRule_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "app"."SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Itinerary" ADD CONSTRAINT "Itinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ItineraryItem" ADD CONSTRAINT "ItineraryItem_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "app"."Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ItineraryItem" ADD CONSTRAINT "ItineraryItem_bookingLegId_fkey" FOREIGN KEY ("bookingLegId") REFERENCES "records"."BookingLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ItineraryShare" ADD CONSTRAINT "ItineraryShare_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "app"."Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RealtimeWatch" ADD CONSTRAINT "RealtimeWatch_bookingLegId_fkey" FOREIGN KEY ("bookingLegId") REFERENCES "records"."BookingLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SupportCase" ADD CONSTRAINT "SupportCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SupportCase" ADD CONSTRAINT "SupportCase_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SupportCase" ADD CONSTRAINT "SupportCase_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app"."Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CompensationClaim" ADD CONSTRAINT "CompensationClaim_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "app"."SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."CompensationClaim" ADD CONSTRAINT "CompensationClaim_bookingLegId_fkey" FOREIGN KEY ("bookingLegId") REFERENCES "records"."BookingLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."OfferSnapshot" ADD CONSTRAINT "OfferSnapshot_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "app"."SalesChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Booking" ADD CONSTRAINT "Booking_agentTermsId_fkey" FOREIGN KEY ("agentTermsId") REFERENCES "app"."LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TicketContract" ADD CONSTRAINT "TicketContract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TicketContract" ADD CONSTRAINT "TicketContract_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "app"."SalesChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TicketContract" ADD CONSTRAINT "TicketContract_tariffAssociationId_fkey" FOREIGN KEY ("tariffAssociationId") REFERENCES "app"."TariffAssociation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TicketContract" ADD CONSTRAINT "TicketContract_offerSnapshotId_fkey" FOREIGN KEY ("offerSnapshotId") REFERENCES "records"."OfferSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TicketContract" ADD CONSTRAINT "TicketContract_conditionsId_fkey" FOREIGN KEY ("conditionsId") REFERENCES "app"."LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingLeg" ADD CONSTRAINT "BookingLeg_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingLeg" ADD CONSTRAINT "BookingLeg_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingLeg" ADD CONSTRAINT "BookingLeg_carrierOperatorId_fkey" FOREIGN KEY ("carrierOperatorId") REFERENCES "app"."Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingLeg" ADD CONSTRAINT "BookingLeg_originStationId_fkey" FOREIGN KEY ("originStationId") REFERENCES "app"."Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingLeg" ADD CONSTRAINT "BookingLeg_destinationStationId_fkey" FOREIGN KEY ("destinationStationId") REFERENCES "app"."Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Ticket" ADD CONSTRAINT "Ticket_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Ticket" ADD CONSTRAINT "Ticket_bookingPassengerId_fkey" FOREIGN KEY ("bookingPassengerId") REFERENCES "records"."BookingPassenger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Acknowledgement" ADD CONSTRAINT "Acknowledgement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Acknowledgement" ADD CONSTRAINT "Acknowledgement_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Acknowledgement" ADD CONSTRAINT "Acknowledgement_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "app"."LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Transfer" ADD CONSTRAINT "Transfer_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "records"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Transfer" ADD CONSTRAINT "Transfer_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Refund" ADD CONSTRAINT "Refund_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "records"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Commission" ADD CONSTRAINT "Commission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Commission" ADD CONSTRAINT "Commission_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Commission" ADD CONSTRAINT "Commission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "app"."Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Commission" ADD CONSTRAINT "Commission_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "app"."CommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."Settlement" ADD CONSTRAINT "Settlement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "app"."Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."SettlementLine" ADD CONSTRAINT "SettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "records"."Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."SettlementLine" ADD CONSTRAINT "SettlementLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."SettlementLine" ADD CONSTRAINT "SettlementLine_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "records"."Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."OperatorDocument" ADD CONSTRAINT "OperatorDocument_ticketContractId_fkey" FOREIGN KEY ("ticketContractId") REFERENCES "records"."TicketContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."ServiceFeeInvoice" ADD CONSTRAINT "ServiceFeeInvoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."ServiceFeeInvoice" ADD CONSTRAINT "ServiceFeeInvoice_cancelsInvoiceId_fkey" FOREIGN KEY ("cancelsInvoiceId") REFERENCES "records"."ServiceFeeInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records"."TripSummary" ADD CONSTRAINT "TripSummary_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "records"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- Immutability guarantees for legally relevant records.
-- These rows may be inserted but never changed or removed by the application.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION records.forbid_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'records.% is append-only (% not allowed)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

-- Audit log: fully append-only.
CREATE TRIGGER "AuditEvent_append_only" BEFORE UPDATE OR DELETE ON records."AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION records.forbid_modification();
CREATE TRIGGER "AuditEvent_no_truncate" BEFORE TRUNCATE ON records."AuditEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION records.forbid_modification();

-- Evidence of acceptances, operator offers and operator documents: never altered.
CREATE TRIGGER "Acknowledgement_append_only" BEFORE UPDATE OR DELETE ON records."Acknowledgement"
  FOR EACH ROW EXECUTE FUNCTION records.forbid_modification();
CREATE TRIGGER "OfferSnapshot_append_only" BEFORE UPDATE OR DELETE ON records."OfferSnapshot"
  FOR EACH ROW EXECUTE FUNCTION records.forbid_modification();
CREATE TRIGGER "OperatorDocument_append_only" BEFORE UPDATE OR DELETE ON records."OperatorDocument"
  FOR EACH ROW EXECUTE FUNCTION records.forbid_modification();

-- Issued invoices are never deleted (corrections happen via cancellation invoices).
CREATE TRIGGER "ServiceFeeInvoice_no_delete" BEFORE DELETE ON records."ServiceFeeInvoice"
  FOR EACH ROW EXECUTE FUNCTION records.forbid_modification();

-- Invoice amounts and numbers are fixed once issued; only the rendered PDF reference may be attached later.
CREATE OR REPLACE FUNCTION records.service_fee_invoice_guard() RETURNS trigger AS $$
BEGIN
  IF (NEW.number, NEW.series, NEW.year, NEW.sequence, NEW."netMinor", NEW."vatMinor", NEW."grossMinor",
      NEW."vatRateBp", NEW.currency, NEW.recipient, NEW."issuedAt", NEW."bookingId")
     IS DISTINCT FROM
     (OLD.number, OLD.series, OLD.year, OLD.sequence, OLD."netMinor", OLD."vatMinor", OLD."grossMinor",
      OLD."vatRateBp", OLD.currency, OLD.recipient, OLD."issuedAt", OLD."bookingId") THEN
    RAISE EXCEPTION 'issued invoice % cannot be changed', OLD.number USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD."storageKey" IS NOT NULL AND NEW."storageKey" IS DISTINCT FROM OLD."storageKey" THEN
    RAISE EXCEPTION 'invoice % PDF already attached', OLD.number USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ServiceFeeInvoice_guard" BEFORE UPDATE ON records."ServiceFeeInvoice"
  FOR EACH ROW EXECUTE FUNCTION records.service_fee_invoice_guard();
