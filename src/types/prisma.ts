import type { Prisma } from "@prisma/client"

/**
 * 事务上下文客户端类型。
 *
 * Prisma 7 未导出稳定的 $transaction 回调参数类型。
 * 这里定义仅包含当前 repository 实际使用的 CRUD 方法的接口，
 * 与 PrismaClient 及事务客户端的结构兼容。
 */
export interface PrismaTransactionClient {
  save: {
    findUnique(args: Prisma.SaveFindUniqueArgs): Promise<{
      id: string
      slot: number
      data: string
      createdAt: Date
      updatedAt: Date
    } | null>
    upsert(args: Prisma.SaveUpsertArgs): Promise<{
      id: string
      slot: number
      data: string
      createdAt: Date
      updatedAt: Date
    }>
  }
}
