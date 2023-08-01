import {
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_EVENT_TEMPLATE_ID,
} from '@config'
import { Client } from '@hubspot/api-client'
import { PublicSearchResults } from '@hubspot/api-client/lib/codegen/cms/site_search'
import { SimplePublicObject } from '@hubspot/api-client/lib/codegen/crm/contacts'
import { PublicOwner } from '@hubspot/api-client/lib/codegen/crm/owners'
import { Pipeline } from '@hubspot/api-client/lib/codegen/crm/pipelines'
import { Property, PropertyGroup } from '@hubspot/api-client/lib/codegen/crm/properties'
import { SimplePublicObjectInputForCreate } from '@hubspot/api-client/lib/codegen/crm/tickets'
import { NetworkSettings } from '@prisma/client'
import { getFieldLabel, getFieldName, globalLogger, slugify } from '@utils'
import axios from 'axios'

const logger = globalLogger.setContext('HubspotClient')

export class HubspotClient {
  private refreshToken: string
  private accessToken?: string
  private client?: Client

  constructor(options: { refreshToken: string }) {
    const { refreshToken } = options
    this.refreshToken = refreshToken
  }

  public async initialize() {
    if (this.client) return
    try {
      const { accessToken } = await this.getAccessToken({
        refreshToken: this.refreshToken,
      })
      if (!accessToken) {
        throw new Error('No access token received.')
      }
      this.accessToken = accessToken
      this.client = new Client({ accessToken })
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  public async createPropertyGroup(name: string): Promise<PropertyGroup> {
    return this.client.crm.properties.groupsApi.create('contacts', {
      name: slugify(name),
      label: name,
    })
  }

  public async createProperties(
    group: string,
    names: string[],
    mapping: { [key: string]: string },
  ): Promise<Property[]> {
    return this.client.crm.properties.batchApi
      .create('contacts', {
        inputs: names.map(name => ({
          name: getFieldName(group, name),
          label: getFieldLabel(group, name, mapping),
          type: 'string',
          fieldType: 'text',
          groupName: slugify(group),
        })),
      })
      .then(response => {
        logger.debug(JSON.stringify(response))
        return response.results
      })
  }

  public async updateContact(
    id: string,
    properties: { [key: string]: string },
  ): Promise<SimplePublicObject> {
    return this.client.crm.contacts.basicApi.update(id, {
      properties,
    })
  }

  public async createContact(properties: {
    [key: string]: string
  }): Promise<SimplePublicObject> {
    return this.client.crm.contacts.basicApi.create({
      properties,
      associations: [],
    })
  }

  public async getPropertyGroupByName(name: string): Promise<PropertyGroup> {
    try {
      const response = await this.client.crm.properties.groupsApi.getByName(
        'contacts',
        slugify(name),
      )
      return response
    } catch (err) {
      logger.error(err)
    }
    return null
  }

  public async getProperties(group: string, names: string[]): Promise<Property[]> {
    try {
      const response = await this.client.crm.properties.batchApi.read('contacts', {
        inputs: names.map(name => ({
          name: `${slugify(group)}_${slugify(name)}`,
        })),
        archived: false,
      })
      return response.results || []
    } catch (err) {
      logger.error(err)
    }
    return []
  }

  public async getContactByEmail(email: string): Promise<SimplePublicObject> {
    const contacts = await this.client.crm.contacts.searchApi
      .doSearch({
        filterGroups: [
          { filters: [{ value: email, propertyName: 'email', operator: 'EQ' }] },
          {
            filters: [
              { value: email, propertyName: 'hs_additional_emails', operator: 'EQ' },
            ],
          },
        ],
        sorts: ['email'],
        properties: ['email', 'id'],
        limit: 1,
        after: 0,
      })
      .then(response => {
        return response?.results
      })
    return contacts?.length ? contacts[0] : null
  }

  public async createEvent(
    email: string,
    input: { timestamp: Date; title: string; summary: string; extraData: any },
  ) {
    const tokens = {
      summary: input.summary,
      title: input.title,
    }
    const event = {
      eventTemplateId: HUBSPOT_EVENT_TEMPLATE_ID,
      email,
      tokens,
      timestamp: input.timestamp,
      extraData: input.extraData,
    }
    return this.client.crm.timeline.eventsApi.create(event)
  }

  public async findArticles(query: string): Promise<PublicSearchResults> {
    //
    logger.debug(`Searching for articles with query: ${query}`, {
      query,
      token: this.accessToken,
    })
    const data = await axios.get('https://api.hubapi.com/cms/v3/site-search/search', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: encodeURIComponent(query),
        limit: 10,
        type: 'KNOWLEDGE_ARTICLE',
      },
    })
    // logger.debug('request', { response: data.data })
    return data.data
  }

  public async getPipelines(objectType: 'tickets' | 'deals'): Promise<Pipeline[]> {
    const pipelines = await this.client.crm.pipelines.pipelinesApi.getAll(objectType)
    return pipelines.results
  }

  public async getOwners(): Promise<PublicOwner[]> {
    const email = undefined
    const after = undefined
    const limit = 50
    const archived = false
    const owners = await this.client.crm.owners.ownersApi.getPage(
      email,
      after,
      limit,
      archived,
    )
    return owners.results
  }

  public async getObjectTypeProperties(
    objectType: 'tickets' | 'deals',
  ): Promise<Property[]> {
    // const pipelines = await this.client.crm.pipelines.pipelinesApi.getAll(objectType)
    const archived = false
    const properties = await this.client.crm.properties.coreApi.getAll(
      objectType,
      archived,
    )
    return properties.results || []
  }

  public async createTicket(
    input: SimplePublicObjectInputForCreate,
  ): Promise<SimplePublicObject> {
    return this.client.crm.tickets.basicApi.create(input)
  }

  private async getAccessToken(options: {
    refreshToken: string
  }): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const { refreshToken } = options
    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', HUBSPOT_CLIENT_ID)
    params.set('client_secret', HUBSPOT_CLIENT_SECRET)
    params.set('refresh_token', refreshToken)

    const data = await axios.post('https://api.hubapi.com/oauth/v1/token', params, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    console.debug(`accessToken ${data?.data?.access_token}`)
    return {
      accessToken: data?.data?.access_token,
      expiresIn: data?.data?.expires_in,
      refreshToken: data?.data?.refresh_token,
    }
  }
}

export const getHubspotClient = async (
  settings: NetworkSettings,
): Promise<HubspotClient> => {
  const client = new HubspotClient({
    refreshToken: settings?.refresh,
  })
  await client.initialize()
  return client
}
