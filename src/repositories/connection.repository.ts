import { Connection, Prisma, PrismaClient } from '@prisma/client'

const client = new PrismaClient()

export const ConnectionRepository = {
  create: (data: Prisma.ConnectionCreateArgs['data']): Promise<Connection> => {
    return client.connection.create({ data })
  },
  update: (
    id: string,
    data: Prisma.ConnectionUpdateArgs['data'],
  ): Promise<Connection> => {
    return client.connection.update({ where: { id }, data })
  },
  upsert: (
    id: string,
    data: Omit<Prisma.ConnectionCreateArgs['data'], 'interactionId'>,
  ): Promise<Connection> => {
    return client.connection.upsert({
      create: { id, ...data },
      update: data,
      where: { id },
    })
  },
  delete: (id: string): Promise<Connection> => {
    return client.connection.delete({ where: { id } })
  },
  findMany: (args?: Prisma.ConnectionFindManyArgs): Promise<Connection[]> => {
    return client.connection.findMany(args)
  },
  findUniqueOrThrow: (id: string): Promise<Connection> => {
    return client.connection.findUniqueOrThrow({ where: { id } })
  },
  findUnique: (id: string): Promise<Connection> => {
    return client.connection.findUnique({ where: { id } })
  },
}
