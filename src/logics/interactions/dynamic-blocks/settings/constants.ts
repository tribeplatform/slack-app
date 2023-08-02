export enum SettingsBlockCallback {
  Save = 'save',
  ModalSave = 'modal-save',
  OpenModal = 'open-modal',
  OpenToast = 'open-toast',
  Redirect = 'redirect',
  AuthRedirect = 'auth-redirect',
  AuthRevoke = 'auth-revoke',
  ActivateTicketIntegration = 'activate-ticket-integration',
  ActivateActivityIntegration = 'activate-activity-integration',
  ActivateContactIntegration = 'activate-contact-integration',
  UpdateContactCreationIntegration = 'disable-contact-creation-integration',
  ActivateFederatedSearchIntegration = 'activate-federated-search-integration',

  // Slack specific
  OpenChannelModal = 'open-channel-modal',
  UpsertChannel = 'upsert-channel',
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
  isSearchable?: boolean
  appId?: string
  disabled?: boolean
  required?: boolean
}
