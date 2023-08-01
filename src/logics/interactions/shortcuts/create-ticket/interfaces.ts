export interface TicketFieldOption {
  text: string
  value: string
}
export enum TicketFieldType {
  Input = 'Input',
  Textarea = 'Textarea',
  Select = 'Select',
}
export interface TicketField {
  id: string
  type: TicketFieldType
  label: string
  defaultValue?: string
  options?: TicketFieldOption[]
  maxLength?: number
  hidden?: boolean
  callbackId?: string
  isSearchable?: boolean
  appId?: string
  disabled?: boolean
  required?: boolean
}
