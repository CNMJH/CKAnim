import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/db'

export const vipRoutes: FastifyPluginAsync = async (server) => {
  // ==================== 公开接口：获取所有 VIP 套餐 ====================
  server.get(
    '/vip-plans',
    async (request, reply) => {
      try {
        const plans = await prisma.vipPlan.findMany({
          where: { enabled: true },
          orderBy: { order: 'asc' },
        })

        // 解析 features JSON
        const parsedPlans = plans.map(plan => ({
          ...plan,
          features: JSON.parse(plan.features),
        }))

        reply.send({ plans: parsedPlans })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取 VIP 套餐失败',
        })
      }
    }
  )

  // ==================== 管理员接口：获取所有 VIP 套餐 ====================
  server.get(
    '/admin/vip-plans',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
          
          // 检查是否是管理员
          if (!['system_admin', 'content_admin'].includes(decoded.role)) {
            return reply.code(403).send({ error: 'Forbidden', message: '权限不足' })
          }
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const plans = await prisma.vipPlan.findMany({
          orderBy: { order: 'asc' },
        })

        // 解析 features JSON
        const parsedPlans = plans.map(plan => ({
          ...plan,
          features: JSON.parse(plan.features),
        }))

        reply.send({ plans: parsedPlans })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取 VIP 套餐失败',
        })
      }
    }
  )

  // ==================== 管理员接口：创建 VIP 套餐 ====================
  server.post(
    '/admin/vip-plans',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
          
          if (decoded.role !== 'system_admin') {
            return reply.code(403).send({ error: 'Forbidden', message: '仅系统管理员可操作' })
          }
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { name, level, price, originalPrice, features, badge, order, enabled } = request.body as {
          name: string
          level: string
          price: string
          originalPrice?: string
          features: string[]
          badge?: string
          order?: number
          enabled?: boolean
        }

        if (!name || !level || !price || !features) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '缺少必填字段',
          })
        }

        const plan = await prisma.vipPlan.create({
          data: {
            name,
            level,
            price,
            originalPrice: originalPrice || null,
            features: JSON.stringify(features),
            badge: badge || null,
            order: order || 0,
            enabled: enabled !== undefined ? enabled : true,
          },
        })

        reply.send({ plan })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '创建 VIP 套餐失败',
        })
      }
    }
  )

  // ==================== 管理员接口：更新 VIP 套餐 ====================
  server.put(
    '/admin/vip-plans/:id',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
          
          if (decoded.role !== 'system_admin') {
            return reply.code(403).send({ error: 'Forbidden', message: '仅系统管理员可操作' })
          }
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const { name, level, price, originalPrice, features, badge, order, enabled } = request.body as {
          name?: string
          level?: string
          price?: string
          originalPrice?: string
          features?: string[]
          badge?: string
          order?: number
          enabled?: boolean
        }

        const plan = await prisma.vipPlan.update({
          where: { id: parseInt(id) },
          data: {
            ...(name !== undefined && { name }),
            ...(level !== undefined && { level }),
            ...(price !== undefined && { price }),
            ...(originalPrice !== undefined && { originalPrice }),
            ...(features !== undefined && { features: JSON.stringify(features) }),
            ...(badge !== undefined && { badge }),
            ...(order !== undefined && { order }),
            ...(enabled !== undefined && { enabled }),
          },
        })

        reply.send({ 
          plan: {
            ...plan,
            features: JSON.parse(plan.features),
          }
        })
      } catch (error: any) {
        server.log.error(error)
        if (error.code === 'P2025') {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'VIP 套餐不存在',
          })
        }
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '更新 VIP 套餐失败',
        })
      }
    }
  )

  // ==================== 管理员接口：删除 VIP 套餐 ====================
  server.delete(
    '/admin/vip-plans/:id',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
          
          if (decoded.role !== 'system_admin') {
            return reply.code(403).send({ error: 'Forbidden', message: '仅系统管理员可操作' })
          }
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }

        await prisma.vipPlan.delete({
          where: { id: parseInt(id) },
        })

        reply.code(204).send()
      } catch (error: any) {
        server.log.error(error)
        if (error.code === 'P2025') {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'VIP 套餐不存在',
          })
        }
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '删除 VIP 套餐失败',
        })
      }
    }
  )

  // ==================== 管理员接口：初始化默认 VIP 套餐 ====================
  server.post(
    '/admin/vip-plans/init',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
          
          if (decoded.role !== 'system_admin') {
            return reply.code(403).send({ error: 'Forbidden', message: '仅系统管理员可操作' })
          }
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        // 检查是否已有数据
        const existing = await prisma.vipPlan.count()
        if (existing > 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '已有 VIP 套餐数据，无法初始化',
          })
        }

        // 创建默认套餐
        const defaultPlans = [
          {
            name: 'VIP1 月卡',
            level: 'vip1',
            price: '¥15/月',
            originalPrice: '¥180/年',
            features: ['高清画质', '去广告', '专属标识'],
            badge: '',
            order: 1,
            enabled: true,
          },
          {
            name: 'VIP2 年卡',
            level: 'vip2',
            price: '¥158/年',
            originalPrice: '¥180/年',
            features: ['高清画质', '去广告', '专属标识', '离线下载'],
            badge: '热销',
            order: 2,
            enabled: true,
          },
          {
            name: 'VIP3 永久',
            level: 'vip3',
            price: '¥398/永久',
            originalPrice: '',
            features: ['所有 VIP 权益', '优先客服', '终身有效'],
            badge: '推荐',
            order: 3,
            enabled: true,
          },
        ]

        const plans = await prisma.vipPlan.createMany({
          data: defaultPlans,
        })

        reply.send({ 
          message: '初始化成功',
          count: plans.count,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '初始化 VIP 套餐失败',
        })
      }
    }
  )
}
