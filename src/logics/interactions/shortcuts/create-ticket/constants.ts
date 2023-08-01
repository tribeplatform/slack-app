export enum CreateTicketState {
  Create = 'create',
}

export enum CreateTicketCallback {
  Create = 'create-ticket',
  SearchContacts = 'search-contacts',
  ChangePipeline = 'change-pipeline',
}

export enum HubspotTicketPropertyName {
  Pipeline = 'hs_pipeline',
  Subject = 'subject',
  Description = 'content',
  Owner = 'hubspot_owner_id',
  Stage = 'hs_pipeline_stage',
}
