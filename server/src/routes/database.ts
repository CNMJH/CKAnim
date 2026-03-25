import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/db'
import { requireSystemAdmin } from '../middleware/auth.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execAsync = promisify(exec)

export const databaseRoutes: FastifyPluginAsync = async (server) => {
  // 获取所有表名
  server.get(
    '/database/tables',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        // SQLite 获取表名
        const tables = await prisma.$queryRaw`
          SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `
        
        reply.send({ tables: tables.map((t: any) => t.name) })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取表列表失败：' + error.message,
        })
      }
    }
  )

  // 获取表数据（支持分页、搜索）
  server.get(
    '/database/table/:tableName',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { tableName } = request.params as { tableName: string }
        const query = request.query as any
        const page = parseInt(query.page) || 1
        const limit = parseInt(query.limit) || 20
        const search = query.search as string
        const searchField = query.searchField as string

        // 白名单验证表名
        const allowedTables = [
          'User', 'Video', 'Action', 'Game', 'GameCategory', 'Character',
          'Favorite', 'FavoriteCollection', 'SiteSettings', 'VipPlan', 'AvatarReview'
        ]
        
        if (!allowedTables.includes(tableName)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '不支持的表名',
          })
        }

        const skip = (page - 1) * limit
        const where: any = search && searchField ? {
          [searchField]: {
            contains: search
          }
        } : {}

        // 获取数据
        const model = (prisma as any)[tableName]
        if (!model) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '表不存在',
          })
        }

        const [data, total] = await Promise.all([
          model.findMany({
            where,
            skip,
            take: limit,
            orderBy: { id: 'desc' }
          }),
          model.count({ where })
        ])

        // 从数据中推断字段名
        const fields = data.length > 0 
          ? Object.keys(data[0]).map(key => ({ name: key, type: 'TEXT' }))
          : []

        reply.send({
          data,
          total,
          page,
          limit,
          fields
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取表数据失败：' + error.message,
        })
      }
    }
  )

  // 更新表数据
  server.put(
    '/database/table/:tableName/:id',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { tableName, id } = request.params as { tableName: string; id: string }
        const updates = request.body as Record<string, any>

        // 白名单验证表名
        const allowedTables = [
          'User', 'Video', 'Action', 'Game', 'GameCategory', 'Character',
          'Favorite', 'FavoriteCollection', 'SiteSettings', 'VipPlan', 'AvatarReview'
        ]
        
        if (!allowedTables.includes(tableName)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '不支持的表名',
          })
        }

        const model = (prisma as any)[tableName]
        if (!model) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '表不存在',
          })
        }

        // 移除只读字段
        const { id: _, createdAt, updatedAt, ...validUpdates } = updates

        const updated = await model.update({
          where: { id: parseInt(id) },
          data: validUpdates
        })

        reply.send({
          success: true,
          data: updated,
          message: '更新成功'
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '更新失败：' + error.message,
        })
      }
    }
  )

  // 删除表数据
  server.delete(
    '/database/table/:tableName/:id',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { tableName, id } = request.params as { tableName: string; id: string }

        const allowedTables = [
          'User', 'Video', 'Action', 'Game', 'GameCategory', 'Character',
          'Favorite', 'FavoriteCollection', 'SiteSettings', 'VipPlan', 'AvatarReview'
        ]
        
        if (!allowedTables.includes(tableName)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '不支持的表名',
          })
        }

        const model = (prisma as any)[tableName]
        if (!model) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '表不存在',
          })
        }

        await model.delete({
          where: { id: parseInt(id) }
        })

        reply.send({
          success: true,
          message: '删除成功'
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '删除失败：' + error.message,
        })
      }
    }
  )

  // 恢复删除的记录
  server.post(
    '/database/table/:tableName/restore',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { tableName } = request.params as { tableName: string }
        const { id, data } = request.body as { id: number; data: any }

        const allowedTables = [
          'User', 'Video', 'Action', 'Game', 'GameCategory', 'Character',
          'Favorite', 'FavoriteCollection', 'SiteSettings', 'VipPlan', 'AvatarReview'
        ]
        
        if (!allowedTables.includes(tableName)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '不支持的表名',
          })
        }

        const model = (prisma as any)[tableName]
        if (!model) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '表不存在',
          })
        }

        // 检查 ID 是否已被使用
        const existing = await model.findUnique({
          where: { id: parseInt(id) }
        })

        if (existing) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '该 ID 已存在，无法恢复',
          })
        }

        // 创建记录（包含原始 ID）
        const restored = await model.create({
          data: {
            id: parseInt(id),
            ...data
          }
        })

        reply.send({
          success: true,
          data: restored,
          message: '恢复成功'
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '恢复失败：' + error.message,
        })
      }
    }
  )

  // 执行 SQL 查询（仅限 SELECT）
  server.post(
    '/database/query',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { sql } = request.body as { sql: string }

        // 安全验证：只允许 SELECT
        const upperSql = sql.trim().toUpperCase()
        if (!upperSql.startsWith('SELECT')) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: '只允许执行 SELECT 查询',
          })
        }

        // 禁止危险操作
        const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE']
        for (const keyword of dangerous) {
          if (upperSql.includes(keyword)) {
            return reply.code(403).send({
              error: 'Forbidden',
              message: `禁止使用 ${keyword} 操作`,
            })
          }
        }

        const result = await prisma.$queryRawUnsafe(sql)

        reply.send({
          success: true,
          data: result
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '查询失败：' + error.message,
        })
      }
    }
  )

  // 备份数据库到本地
  server.post(
    '/database/backup',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { backupPath } = request.body as { backupPath?: string }
        
        // 默认备份路径
        const dbPath = path.join(__dirname, '../../prisma/dev.db')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const defaultBackupPath = path.join(__dirname, `../../backups/dev.db.backup.${timestamp}`)
        
        const targetPath = backupPath || defaultBackupPath

        // 确保备份目录存在
        const backupDir = path.dirname(targetPath)
        await fs.promises.mkdir(backupDir, { recursive: true })

        // 复制数据库文件
        await fs.promises.copyFile(dbPath, targetPath)

        // 验证备份文件
        const stats = await fs.promises.stat(targetPath)
        
        server.log.info(`数据库备份成功：${targetPath}, 大小：${stats.size} bytes`)

        reply.send({
          success: true,
          message: '备份成功',
          backupPath: targetPath,
          size: stats.size,
          timestamp
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '备份失败：' + error.message,
        })
      }
    }
  )

  // 获取备份列表
  server.get(
    '/database/backups',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const backupDir = path.join(__dirname, '../../backups')
        
        // 检查目录是否存在
        if (!await fs.promises.access(backupDir).then(() => true).catch(() => false)) {
          return reply.send({ backups: [] })
        }

        const files = await fs.promises.readdir(backupDir)
        const backups = files
          .filter(f => f.startsWith('dev.db.backup.'))
          .map(f => {
            const filePath = path.join(backupDir, f)
            const stats = fs.statSync(filePath)
            return {
              filename: f,
              path: filePath,
              size: stats.size,
              createdAt: stats.birthtime
            }
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        reply.send({ backups })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取备份列表失败：' + error.message,
        })
      }
    }
  )

  // 恢复数据库从备份
  server.post(
    '/database/restore',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const { backupPath } = request.body as { backupPath: string }

        const dbPath = path.join(__dirname, '../../prisma/dev.db')
        const backupDir = path.join(__dirname, '../../backups')

        // 验证备份路径
        const resolvedPath = path.resolve(backupPath)
        if (!resolvedPath.startsWith(backupDir)) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: '只能从 backups 目录恢复',
          })
        }

        // 验证备份文件存在
        await fs.promises.access(resolvedPath)

        // 创建当前数据库的备份
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const currentBackup = path.join(backupDir, `dev.db.before-restore.${timestamp}`)
        await fs.promises.copyFile(dbPath, currentBackup)

        // 恢复备份
        await fs.promises.copyFile(resolvedPath, dbPath)

        server.log.info(`数据库恢复成功：从 ${resolvedPath} 恢复到 ${dbPath}`)

        reply.send({
          success: true,
          message: '恢复成功',
          backupCreated: currentBackup,
          note: '恢复后请重启 ckanim-server 服务'
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '恢复失败：' + error.message,
        })
      }
    }
  )

  // 获取数据库统计信息
  server.get(
    '/database/stats',
    { preHandler: [requireSystemAdmin] },
    async (request, reply) => {
      try {
        const stats = await Promise.all([
          prisma.user.count(),
          prisma.video.count(),
          prisma.action.count(),
          prisma.character.count(),
          prisma.game.count(),
          prisma.gameCategory.count(),
          prisma.favorite.count(),
          prisma.favoriteCollection.count(),
        ])

        reply.send({
          stats: {
            users: stats[0],
            videos: stats[1],
            actions: stats[2],
            characters: stats[3],
            games: stats[4],
            categories: stats[5],
            favorites: stats[6],
            collections: stats[7],
          }
        })
      } catch (error: any) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取统计失败：' + error.message,
        })
      }
    }
  )
}
