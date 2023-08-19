export enum SettingsBlockCallback {
  Save = 'save',
  ModalSave = 'modal-save',
  OpenModal = 'open-modal',
  OpenToast = 'open-toast',
  Redirect = 'redirect',
  AuthRedirect = 'auth-redirect',
  AuthRevoke = 'auth-revoke',
  OpenAuthRevokeModal = 'opem-auth-revoke-modal',

  SearchSlackChannel = 'search-slack-channel',
  // Slack specific
  OpenConnectionModal = 'open-connection-modal',
  OpenConnectionRemoveModal = 'open-connection-remove-modal',
  OpenConnectionEditModal = 'open-connection-edit-modal',

  RemoveConnection = 'remove-connection',
  UpsertConnection = 'upsert-channel',
}

export interface ChannelFieldOption {
  text: string
  value: string
}
export enum ChannelFieldType {
  Input = 'Input',
  Textarea = 'Textarea',
  Select = 'Select',
}
export interface ChannelField {
  id: string
  type: ChannelFieldType
  label: string
  defaultValue?: string
  options?: ChannelFieldOption[]
  maxLength?: number
  hidden?: boolean
  callbackId?: string
  dataCallbackId?: string
  isSearchable?: boolean
  appId?: string
  disabled?: boolean
  required?: boolean
}
