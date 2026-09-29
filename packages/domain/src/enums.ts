/**
 * Enumerations shared by API, web, admin and mobile.
 * These MUST stay identical to the enums in packages/db/prisma/schema.prisma —
 * a test in @tb/db enforces this.
 */
const e = <T extends string>(...values: [T, ...T[]]): [T, ...T[]] => values;

export const TransportMode = e(
  'HIGH_SPEED_RAIL',
  'LONG_DISTANCE_RAIL',
  'REGIONAL_RAIL',
  'S_BAHN',
  'U_BAHN',
  'TRAM',
  'STADTBAHN',
  'BUS',
  'COACH',
  'FERRY',
  'NIGHT_TRAIN',
  'CAR_TRAIN',
  'RACK_RAILWAY',
  'FUNICULAR',
  'HERITAGE_RAIL',
  'SUSPENSION_RAILWAY',
  'OTHER',
);
export type TransportMode = (typeof TransportMode)[number];

export const OperatorSegment = e(
  'LONG_DISTANCE',
  'CROSS_BORDER',
  'REGIONAL',
  'CITY_TRANSIT',
  'NIGHT',
  'LONG_DISTANCE_BUS',
  'HERITAGE',
);
export type OperatorSegment = (typeof OperatorSegment)[number];

export const OrganisationStatus = e('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'NEEDS_REVIEW');
export type OrganisationStatus = (typeof OrganisationStatus)[number];

export const SalesChannelKind = e(
  'NATIONAL_RETAILER',
  'OPERATOR_DIRECT',
  'OSDM',
  'WHOLESALE',
  'OEPNV_API',
  'CHECK_IN_CHECK_OUT',
  'AGGREGATOR',
  'TARIFF_BODY',
  'DATA_SOURCE',
);
export type SalesChannelKind = (typeof SalesChannelKind)[number];

/** Who collects the customer's money for the fare. The agent never does in its own name. */
export const MerchantOfRecord = e('AGENT_PLATFORM_SPLIT', 'OPERATOR', 'DISTRIBUTOR');
export type MerchantOfRecord = (typeof MerchantOfRecord)[number];

/** EU Regulation 2021/782: one contract across legs, or independent contracts. */
export const TicketContractKind = e('THROUGH', 'SEPARATE');
export type TicketContractKind = (typeof TicketContractKind)[number];

export const BookingStatus = e(
  'DRAFT',
  'RESERVED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PARTIALLY_FAILED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'COMPLETED',
);
export type BookingStatus = (typeof BookingStatus)[number];

export const TravelClass = e('FIRST', 'SECOND', 'NONE');
export type TravelClass = (typeof TravelClass)[number];

export const ThemePreference = e('SYSTEM', 'LIGHT', 'DARK');
export type ThemePreference = (typeof ThemePreference)[number];

export const AdminRole = e('SUPER_ADMIN', 'SUPPORT', 'FINANCE', 'CONTENT', 'OPS');
export type AdminRole = (typeof AdminRole)[number];

export const LegalDocumentType = e(
  'CONDITIONS_OF_CARRIAGE',
  'TARIFF_CONDITIONS',
  'AGENT_TERMS',
  'PRIVACY_POLICY',
  'IMPRESSUM',
  'DISPUTE_RESOLUTION_NOTICE',
);
export type LegalDocumentType = (typeof LegalDocumentType)[number];

export const DiscountCardType = e(
  'BAHNCARD_25',
  'BAHNCARD_50',
  'BAHNCARD_100',
  'BAHNCARD_BUSINESS_25',
  'BAHNCARD_BUSINESS_50',
  'DEUTSCHLAND_TICKET',
  'OEBB_VORTEILSCARD',
  'SBB_HALBTAX',
  'OTHER',
);
export type DiscountCardType = (typeof DiscountCardType)[number];

export const ConsentPurpose = e('ANALYTICS', 'MARKETING_EMAIL', 'MARKETING_PUSH', 'CRASH_REPORTS');
export type ConsentPurpose = (typeof ConsentPurpose)[number];

export const ServiceFeeKind = e(
  'ZERO',
  'FIXED_PER_BOOKING',
  'FIXED_PER_TICKET',
  'FIXED_PER_LEG',
  'PERCENT',
  'MULTI_OPERATOR_BOOKING_CAP',
);
export type ServiceFeeKind = (typeof ServiceFeeKind)[number];

export const ServiceFeeCategory = e('LONG_DISTANCE_RAIL', 'INTERCITY_REGIONAL', 'LOCAL_AND_BUS');
export type ServiceFeeCategory = (typeof ServiceFeeCategory)[number];
