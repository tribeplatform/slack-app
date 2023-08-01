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
}
