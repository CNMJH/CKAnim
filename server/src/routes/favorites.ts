import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'

// JWT 验证中间件
async function authenticate(request: any, reply: any) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
  }
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET)
    request.user = decoded
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
  }
}

export const favoriteRoutes: FastifyPluginAsync = async (server) => {
  // ==================== 收藏夹管理 ====================

  // 获取用户所有收藏夹
  server.get(
    '/favorite-collections',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId

        const collections = await prisma.favoriteCollection.findMany({
          where: { userId },
          include: {
            _count: {
              select: { favorites: true }
            }
          },
          orderBy: { order: 'asc' }
        })

        // 格式化返回
        const formatted = collections.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isPublic: c.isPublic,
          isDefault: c.isDefault,
          cover: c.cover,
          count: c._count.favorites,
          order: c.order,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        }))

        reply.send({ collections: formatted })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取收藏夹失败',
        })
      }
    }
  )

  // 创建新收藏夹
  server.post(
    '/favorite-collections',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const { name, description } = request.body as {
          name: string
          description?: string
        }

        if (!name || name.trim().length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '收藏夹名称不能为空',
          })
        }

        // 检查名称是否重复
        const existing = await prisma.favoriteCollection.findFirst({
          where: { userId, name: name.trim() }
        })

        if (existing) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '收藏夹名称已存在',
          })
        }

        // 获取最大排序值
        const maxOrder = await prisma.favoriteCollection.aggregate({
          where: { userId },
          _max: { order: true }
        })

        const collection = await prisma.favoriteCollection.create({
          data: {
            userId,
            name: name.trim(),
            description: description?.trim() || null,
            isDefault: false,
            order: (maxOrder._max.order || 0) + 1
          }
        })

        reply.send({
          collection: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isDefault: collection.isDefault,
            cover: collection.cover,
            count: 0,
            order: collection.order,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt
          }
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '创建收藏夹失败',
        })
      }
    }
  )

  // 更新收藏夹（重命名、修改描述等）
  server.put(
    '/favorite-collections/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const collectionId = parseInt((request.params as any).id)
        const { name, description } = request.body as {
          name?: string
          description?: string
        }

        // 检查收藏夹是否存在且属于当前用户
        const collection = await prisma.favoriteCollection.findFirst({
          where: { id: collectionId, userId }
        })

        if (!collection) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '收藏夹不存在',
          })
        }

        // 默认收藏夹不可修改名称
        if (collection.isDefault && name !== undefined) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: '默认收藏夹不可重命名',
          })
        }

        // 检查名称是否重复（排除自己）
        if (name !== undefined) {
          const existing = await prisma.favoriteCollection.findFirst({
            where: {
              userId,
              name: name.trim(),
              id: { not: collectionId }
            }
          })

          if (existing) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: '收藏夹名称已存在',
            })
          }
        }

        const updated = await prisma.favoriteCollection.update({
          where: { id: collectionId },
          data: {
            name: name !== undefined ? name.trim() : undefined,
            description: description !== undefined ? description?.trim() || null : undefined
          }
        })

        reply.send({
          collection: {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            isDefault: updated.isDefault,
            cover: updated.cover,
            order: updated.order,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
          }
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '更新收藏夹失败',
        })
      }
    }
  )

  // 删除收藏夹
  server.delete(
    '/favorite-collections/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const collectionId = parseInt((request.params as any).id)

        // 检查收藏夹是否存在且属于当前用户
        const collection = await prisma.favoriteCollection.findFirst({
          where: { id: collectionId, userId }
        })

        if (!collection) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '收藏夹不存在',
          })
        }

        // 默认收藏夹不可删除
        if (collection.isDefault) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: '默认收藏夹不可删除',
          })
        }

        // 将收藏夹内的视频移动到默认收藏夹
        const defaultCollection = await prisma.favoriteCollection.findFirst({
          where: { userId, isDefault: true }
        })

        if (defaultCollection) {
          // 获取要移动的收藏项
          const favorites = await prisma.favorite.findMany({
            where: { collectionId }
          })

          // 批量添加到默认收藏夹（忽略重复）
          for (const fav of favorites) {
            await prisma.favorite.upsert({
              where: {
                userId_videoId_collectionId: {
                  userId,
                  videoId: fav.videoId,
                  collectionId: defaultCollection.id
                }
              },
              update: {},
              create: {
                userId,
                videoId: fav.videoId,
                collectionId: defaultCollection.id
              }
            })
          }
        }

        // 删除收藏夹（级联删除收藏项）
        await prisma.favoriteCollection.delete({
          where: { id: collectionId }
        })

        reply.send({ success: true, message: '删除成功' })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '删除收藏夹失败',
        })
      }
    }
  )

  // 调整收藏夹排序
  server.put(
    '/favorite-collections/:id/order',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const collectionId = parseInt((request.params as any).id)
        const { order } = request.body as { order: number }

        // 检查收藏夹是否存在且属于当前用户
        const collection = await prisma.favoriteCollection.findFirst({
          where: { id: collectionId, userId }
        })

        if (!collection) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '收藏夹不存在',
          })
        }

        // 默认收藏夹不可调整排序
        if (collection.isDefault) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: '默认收藏夹不可调整排序',
          })
        }

        const updated = await prisma.favoriteCollection.update({
          where: { id: collectionId },
          data: { order }
        })

        reply.send({
          collection: {
            id: updated.id,
            name: updated.name,
            order: updated.order
          }
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '调整排序失败',
        })
      }
    }
  )

  // ==================== 收藏视频管理 ====================

  // 获取收藏夹内的视频列表
  server.get(
    '/favorites',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const collectionId = request.query.collectionId ? parseInt(request.query.collectionId as string) : undefined

        // 如果没有指定收藏夹，返回默认收藏夹的内容
        let targetCollectionId = collectionId
        if (!targetCollectionId) {
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          targetCollectionId = defaultCollection?.id
        }

        if (!targetCollectionId) {
          return reply.send({ favorites: [], total: 0 })
        }

        const favorites = await prisma.favorite.findMany({
          where: {
            userId,
            collectionId: targetCollectionId
          },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
                duration: true,
                action: {
                  select: {
                    name: true,
                    code: true
                  }
                },
                character: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        const formatted = favorites.map(f => ({
          id: f.id,
          videoId: f.videoId,
          collectionId: f.collectionId,
          createdAt: f.createdAt,
          video: {
            id: f.video.id,
            title: f.video.title,
            coverUrl: f.video.coverUrl,
            duration: f.video.duration,
            actionName: f.video.action?.name,
            actionCode: f.video.action?.code,
            characterName: f.video.character?.name,
            characterAvatar: f.video.character?.avatar
          }
        }))

        reply.send({
          favorites: formatted,
          total: formatted.length,
          collectionId: targetCollectionId
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取收藏列表失败',
        })
      }
    }
  )

  // 添加视频到收藏夹
  server.post(
    '/favorites',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const { videoId, collectionId } = request.body as {
          videoId: number
          collectionId?: number
        }

        if (!videoId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '视频 ID 不能为空',
          })
        }

        // 确定收藏夹
        let targetCollectionId = collectionId
        if (!targetCollectionId) {
          // 使用默认收藏夹
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          targetCollectionId = defaultCollection?.id
        }

        if (!targetCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '未找到默认收藏夹',
          })
        }

        // 检查视频是否存在
        const video = await prisma.video.findUnique({
          where: { id: videoId }
        })

        if (!video) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '视频不存在',
          })
        }

        // 检查是否已收藏（同一收藏夹中）
        const existing = await prisma.favorite.findFirst({
          where: {
            userId,
            videoId,
            collectionId: targetCollectionId
          }
        })

        if (existing) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '该视频已在收藏夹中',
          })
        }

        // 创建收藏
        const favorite = await prisma.favorite.create({
          data: {
            userId,
            videoId,
            collectionId: targetCollectionId
          }
        })

        // 更新收藏夹封面和计数
        const collection = await prisma.favoriteCollection.findUnique({
          where: { id: targetCollectionId }
        })

        if (collection && !collection.cover) {
          await prisma.favoriteCollection.update({
            where: { id: targetCollectionId },
            data: {
              cover: video.coverUrl,
              count: { increment: 1 }
            }
          })
        } else if (collection) {
          await prisma.favoriteCollection.update({
            where: { id: targetCollectionId },
            data: { count: { increment: 1 } }
          })
        }

        reply.send({
          favorite: {
            id: favorite.id,
            videoId: favorite.videoId,
            collectionId: favorite.collectionId,
            createdAt: favorite.createdAt
          },
          message: '收藏成功'
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '收藏失败',
        })
      }
    }
  )

  // 从收藏夹移除视频
  server.delete(
    '/favorites/:videoId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const videoId = parseInt((request.params as any).videoId)
        const collectionId = request.query.collectionId ? parseInt(request.query.collectionId as string) : undefined

        // 确定收藏夹
        let targetCollectionId = collectionId
        if (!targetCollectionId) {
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          targetCollectionId = defaultCollection?.id
        }

        if (!targetCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '未找到收藏夹',
          })
        }

        // 删除收藏
        await prisma.favorite.deleteMany({
          where: {
            userId,
            videoId,
            collectionId: targetCollectionId
          }
        })

        // 更新收藏夹计数
        await prisma.favoriteCollection.update({
          where: { id: targetCollectionId },
          data: { count: { decrement: 1 } }
        })

        reply.send({ success: true, message: '取消收藏成功' })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '取消收藏失败',
        })
      }
    }
  )

  // 检查视频收藏状态
  server.get(
    '/favorites/check/:videoId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const videoId = parseInt((request.params as any).videoId)

        const favorites = await prisma.favorite.findMany({
          where: {
            userId,
            videoId
          },
          select: {
            collectionId: true,
            collection: {
              select: {
                id: true,
                name: true,
                isDefault: true
              }
            }
          }
        })

        const isFavorite = favorites.length > 0
        const collectionIds = favorites.map(f => f.collectionId)
        const collections = favorites.map(f => ({
          id: f.collection.id,
          name: f.collection.name,
          isDefault: f.collection.isDefault
        }))

        reply.send({
          isFavorite,
          collectionIds,
          collections
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '检查收藏状态失败',
        })
      }
    }
  )

  // 批量添加视频到收藏夹
  server.post(
    '/favorites/batch-add',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const { videoIds, collectionId } = request.body as {
          videoIds: number[]
          collectionId?: number
        }

        if (!videoIds || videoIds.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '视频 ID 列表不能为空',
          })
        }

        // 确定收藏夹
        let targetCollectionId = collectionId
        if (!targetCollectionId) {
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          targetCollectionId = defaultCollection?.id
        }

        if (!targetCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '未找到默认收藏夹',
          })
        }

        // 批量添加（忽略重复）
        const added: number[] = []
        const skipped: number[] = []

        for (const videoId of videoIds) {
          try {
            await prisma.favorite.upsert({
              where: {
                userId_videoId_collectionId: {
                  userId,
                  videoId,
                  collectionId: targetCollectionId
                }
              },
              update: {},
              create: {
                userId,
                videoId,
                collectionId: targetCollectionId
              }
            })
            added.push(videoId)
          } catch {
            skipped.push(videoId)
          }
        }

        // 更新收藏夹计数
        if (added.length > 0) {
          await prisma.favoriteCollection.update({
            where: { id: targetCollectionId },
            data: { count: { increment: added.length } }
          })
        }

        reply.send({
          success: true,
          added: added.length,
          skipped: skipped.length,
          message: `成功添加 ${added.length} 个视频${skipped.length > 0 ? `，跳过 ${skipped.length} 个已存在的视频` : ''}`
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '批量收藏失败',
        })
      }
    }
  )

  // 批量移动视频到另一个收藏夹
  server.post(
    '/favorites/batch-move',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const { videoIds, fromCollectionId, toCollectionId } = request.body as {
          videoIds: number[]
          fromCollectionId?: number
          toCollectionId: number
        }

        if (!videoIds || videoIds.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '视频 ID 列表不能为空',
          })
        }

        if (!toCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '目标收藏夹不能为空',
          })
        }

        // 确定源收藏夹
        let sourceCollectionId = fromCollectionId
        if (!sourceCollectionId) {
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          sourceCollectionId = defaultCollection?.id
        }

        if (!sourceCollectionId || !toCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '收藏夹不存在',
          })
        }

        // 批量移动
        let moved = 0
        let skipped = 0

        for (const videoId of videoIds) {
          try {
            // 检查目标收藏夹中是否已存在
            const existing = await prisma.favorite.findFirst({
              where: {
                userId,
                videoId,
                collectionId: toCollectionId
              }
            })

            if (existing) {
              skipped++
              continue
            }

            // 更新收藏项的收藏夹
            await prisma.favorite.updateMany({
              where: {
                userId,
                videoId,
                collectionId: sourceCollectionId
              },
              data: { collectionId: toCollectionId }
            })
            moved++
          } catch {
            skipped++
          }
        }

        // 更新收藏夹计数
        if (moved > 0) {
          await Promise.all([
            prisma.favoriteCollection.update({
              where: { id: sourceCollectionId },
              data: { count: { decrement: moved } }
            }),
            prisma.favoriteCollection.update({
              where: { id: toCollectionId },
              data: { count: { increment: moved } }
            })
          ])
        }

        reply.send({
          success: true,
          moved,
          skipped,
          message: `成功移动 ${moved} 个视频${skipped > 0 ? `，跳过 ${skipped} 个已存在的视频` : ''}`
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '批量移动失败',
        })
      }
    }
  )

  // 批量删除视频
  server.post(
    '/favorites/batch-remove',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.userId
        const { videoIds, collectionId } = request.body as {
          videoIds: number[]
          collectionId?: number
        }

        if (!videoIds || videoIds.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '视频 ID 列表不能为空',
          })
        }

        // 确定收藏夹
        let targetCollectionId = collectionId
        if (!targetCollectionId) {
          const defaultCollection = await prisma.favoriteCollection.findFirst({
            where: { userId, isDefault: true }
          })
          targetCollectionId = defaultCollection?.id
        }

        if (!targetCollectionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '未找到收藏夹',
          })
        }

        // 批量删除
        let deleted = 0

        for (const videoId of videoIds) {
          try {
            await prisma.favorite.deleteMany({
              where: {
                userId,
                videoId,
                collectionId: targetCollectionId
              }
            })
            deleted++
          } catch {
            // 忽略不存在的记录
          }
        }

        // 更新收藏夹计数
        if (deleted > 0) {
          await prisma.favoriteCollection.update({
            where: { id: targetCollectionId },
            data: { count: { decrement: deleted } }
          })
        }

        reply.send({
          success: true,
          deleted,
          message: `成功删除 ${deleted} 个视频`
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '批量删除失败',
        })
      }
    }
  )
}
