// import { SFieldInputType } from '@enums'

export interface SalesforceFieldFilter {
  nillable?: boolean
  name?: string
  type?: string
  unique?: boolean
  updateable?: boolean
}

export interface SalesforceArticle {
  id: string
  title: string
  url: string
  summary: string
}

export interface SalesforceCommunity {
  name: string
  siteUrl: string
}

export interface BaseSalesforceObject {
  Id: string
}

export interface BaseSalesforceMetadata {
  fullName: string
}

export interface SalesforceContact extends BaseSalesforceObject {
  AccountId: string
  Email: string
}
export const SalesforceContactKeys: (keyof SalesforceContact)[] = [
  'Id',
  'Email',
  'AccountId',
]

export interface SalesforceUser extends BaseSalesforceObject {
  Email: string
  Name: string
}
export const SalesforceUserKeys: (keyof SalesforceUser)[] = ['Id', 'Email', 'Name']

export interface SalesforceCase extends BaseSalesforceObject {
  Subject: string
}
export const SalesforceCaseKeys: (keyof SalesforceCase)[] = ['Id', 'Subject']

export interface SalesforcePermissionSet extends BaseSalesforceObject {
  Name: string
}
export const SalesforcePermissionSetKeys: (keyof SalesforcePermissionSet)[] = [
  'Id',
  'Name',
]

export interface SalesforcePermissionSetAssignment extends BaseSalesforceObject {
  AssigneeId: string
  PermissionSetId: string
}
export const SalesforcePermissionSetAssignmentKeys: (keyof SalesforcePermissionSetAssignment)[] =
  ['Id', 'AssigneeId', 'PermissionSetId']

export interface SalesforceCustomTabMeta extends BaseSalesforceMetadata {
  actionOverrides?: any[]
  customObject: boolean
  description: string
  motif: string
}

export interface SalesforcePermissionSetMeta extends BaseSalesforceMetadata {
  label: string
  description?: string
  fieldPermissions?: SalesforceFieldPermissionMeta[]
  objectPermissions?: SalesforceObjectPermissionMeta[]
  tabSettings?: SalesforceTabSetting[]
}

export interface SalesforceTabSetting {
  tab: string
  visibility: 'Available' | 'None' | 'Visible'
}

export interface SalesforceListViewMeta {
  fullName: string
  label: string
  booleanFilter?: string
  columns: string[]
  filterScope: 'Everything' | 'Mine'
  filters?: SalesforceListViewFilter[]
}

export type SalesforceFilterOperation =
  | 'equals'
  | 'notEqual'
  | 'lessThan'
  | 'greaterThan'
  | 'lessOrEqual'
  | 'greaterOrEqual'
  | 'contains'
  | 'notContain'
  | 'startsWith'
  | 'includes'
  | 'excludes'
  | 'within'

export interface SalesforceListViewFilter {
  field: string
  operation: SalesforceFilterOperation
  value: string
}

export interface SalesforceFieldPermissionMeta {
  field: string
  editable: boolean
  readable: boolean
}

export interface SalesforceObjectPermissionMeta {
  object: string
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  allowRead?: boolean
  modifyAllRecords?: boolean
  viewAllRecords?: boolean
}

export interface SalesforceFilterItem {
  field: string
  operation: SalesforceFilterOperation
  value: string
}

export interface SalesforceReportJoinMeta {
  relationship: string
  outerJoin: boolean
  join?: SalesforceReportJoinMeta
}

export interface SalesforceReportTypeMeta extends BaseSalesforceMetadata {
  label: string
  baseObject: string
  category: 'accounts' | 'opportunities' | 'leads' | 'cases' | 'activities'
  deployed: boolean
  description?: string
  join: SalesforceReportJoinMeta
  sections: {
    masterLabel: string
    columns: {
      field: string
      table: string
      checkedByDefault: boolean
    }[]
  }[]
}

export interface SalesforceProfileMeta extends BaseSalesforceMetadata {
  custom: boolean
  fieldPermissions: SalesforceFieldPermissionMeta[]
}

/* OAuth interfaces
 * These interfaces are being used for authentication with Salesforce
 */

export interface SalesforceOAuthTokenResponse {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_token: string
}

export interface HubspotAuthProfile {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  app_id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  hub_domain: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  hub_id: number

  token: string

  refresh: string
  user: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_id: number
}

export interface HubspotAuthInfo {
  profile: HubspotAuthProfile
  refreshToken: string
  accessToken: string
}

export interface HubspotState {
  networkId: string
  actorId: string
  redirectUrl: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      state?: HubspotState
      consumerKey?: string
      consumerSecret?: string
      user?: HubspotAuthInfo
    }
  }
}
