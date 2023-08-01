// import { SObject } from '@enums'

export const getHubspotUrl = () => {
  // const subDomain = instanceUrl.split('.')[0]
  return 'https://app-eu1.hubspot.com/oauth/authorize'
}

export const getNetworkUrl = ({
  domain,
  domainSubfolder,
}: {
  domain: string
  domainSubfolder?: string
}) => (domainSubfolder ? `https://${domainSubfolder}` : `https://${domain}`)

export const getSlackAppUrl = (url: string) =>
  `${url}/manage/apps/z4GCMU74ZR-F86nmadAyRBe`

export const getNetworkSearchUrl = (url: string) =>
  `${url}/search?query=example&type=external`
