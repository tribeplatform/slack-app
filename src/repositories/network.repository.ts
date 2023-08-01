import { NetworkSettings, Prisma, PrismaClient } from '@prisma/client'

const client = new PrismaClient()

export const NetworkSettingsRepository = {
  create: (data: Prisma.NetworkSettingsCreateArgs['data']): Promise<NetworkSettings> => {
    return client.networkSettings.create({ data })
  },
  update: (
    networkId: string,
    data: Prisma.NetworkSettingsUpdateArgs['data'],
  ): Promise<NetworkSettings> => {
    return client.networkSettings.update({ where: { networkId }, data })
  },
  upsert: (
    networkId: string,
    data: Omit<Prisma.NetworkSettingsCreateArgs['data'], 'networkId'>,
  ): Promise<NetworkSettings> => {
    return client.networkSettings.upsert({
      create: { networkId, ...data },
      update: data,
      where: { networkId },
    })
  },
  delete: (networkId: string): Promise<NetworkSettings> => {
    return client.networkSettings.delete({ where: { networkId } })
  },
  findMany: (args?: Prisma.NetworkSettingsFindManyArgs): Promise<NetworkSettings[]> => {
    return client.networkSettings.findMany(args)
  },
  findUniqueOrThrow: (networkId: string): Promise<NetworkSettings> => {
    return client.networkSettings.findUniqueOrThrow({ where: { networkId } })
  },
  findUnique: (networkId: string): Promise<NetworkSettings> => {
    return client.networkSettings.findUnique({ where: { networkId } })
  },
}
