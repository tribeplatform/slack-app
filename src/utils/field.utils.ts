import { concat, fromPairs, lowerFirst, startCase } from 'lodash'

import { slugify } from './object.utils'

export const DEFAULT_FIELDS = [
  { name: 'id', label: 'Member ID' },
  { name: 'name', label: 'Name' },
  { name: 'username', label: 'Username' },
  { name: 'tagline', label: 'Tagline' },
  { name: 'createdAt', label: 'Membership date' },
  { name: 'verifiedAt', label: 'Membership verification date' },
  { name: 'url', label: 'Profile URL' },
  { name: 'email', label: 'Email' },
  { name: 'emailStatus', label: 'Email Status' },
  { name: 'externalId', label: 'External ID' },
  { name: 'lastSeenAt', label: 'Last Seen' },
  { name: 'locale', label: 'Locale' },
  { name: 'role.type', label: 'Role' },
  { name: 'updatedAt', label: 'Last Updated' },
]
export const COMPUTED_FIELDS = [
  { name: 'spaces', label: 'Spaces' },
  { name: 'badges', label: 'Badges' },
]

export const DEFAULT_FIELDS_KEYS = DEFAULT_FIELDS.map(field => field.name)
export const COMPUTED_FIELDS_KEYS = COMPUTED_FIELDS.map(field => field.name)
export const BASIC_FIELDS_KEYS = concat(DEFAULT_FIELDS, COMPUTED_FIELDS).map(
  field => field.name,
)
export const BASIC_FIELDS_MAPPING = fromPairs(
  concat(DEFAULT_FIELDS, COMPUTED_FIELDS).map(
    (field: { name: string; label: string }) => [field.name, field.label],
  ),
)

export const getFieldName = (group: string, name: string): string =>
  `${slugify(group)}_${slugify(startCase(name))}`

export const getFieldLabel = (
  group: string,
  name: string,
  mapping: { [key: string]: string },
): string => `${group} ${lowerFirst(mapping[name])}`
