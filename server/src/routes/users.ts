import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/db'
import { getUploadToken, getFileUrl, generateFileKey, deleteFile, censorImage } from '../lib/qiniu'

const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'

export const userRoutes: FastifyPluginAsync = async (server) => {
  // ==================== 用户注册 ====================
  server.post(
    '/auth/register',
    async (request, reply) => {
      try {
        const { username, email, password } = request.body as {
          username: string
          email: string
          password: string
        }

        // 验证输入
        if (!username || !email || !password) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '用户名、邮箱和密码不能为空',
          })
        }

        if (password.length < 6) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '密码长度至少为 6 位',
          })
        }

        // 检查用户名是否已存在
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email }],
          },
        })

        if (existingUser) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: existingUser.username === username ? '用户名已被注册' : '邮箱已被注册',
          })
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 创建用户
        const user = await prisma.user.create({
          data: {
            username,
            email,
            password: hashedPassword,
            role: 'user',
            vipLevel: 'none',
          },
        })

        // 生成 JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            vipLevel: user.vipLevel,
          },
          token,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '注册失败',
        })
      }
    }
  )

  // ==================== 用户登录 ====================
  server.post(
    '/auth/login',
    async (request, reply) => {
      try {
        const { username, password } = request.body as {
          username: string
          password: string
        }

        if (!username || !password) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '用户名和密码不能为空',
          })
        }

        // 查找用户（支持用户名或邮箱登录）
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email: username }],
          },
        })

        if (!user) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '用户名或密码错误',
          })
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '用户名或密码错误',
          })
        }

        // 生成 JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            vipLevel: user.vipLevel,
            vipExpires: user.vipExpires,
          },
          token,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '登录失败',
        })
      }
    }
  )

  // ==================== 获取当前用户信息 ====================
  server.get(
    '/auth/me',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: (request.user as any).userId },
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            avatarStatus: true,
            avatarRejectReason: true,
            phone: true,
            role: true,
            vipLevel: true,
            vipExpires: true,
            createdAt: true,
          },
        })

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '用户不存在',
          })
        }

        reply.send({ user })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取用户信息失败',
        })
      }
    }
  )

  // ==================== 更新用户信息 ====================
  server.put(
    '/auth/me',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { avatar, phone } = request.body as {
          avatar?: string
          phone?: string
        }

        const user = await prisma.user.update({
          where: { id: (request.user as any).userId },
          data: {
            ...(avatar !== undefined && { avatar }),
            ...(phone !== undefined && { phone }),
          },
        })

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            phone: user.phone,
            role: user.role,
            vipLevel: user.vipLevel,
          },
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '更新用户信息失败',
        })
      }
    }
  )

  // ==================== 修改密码 ====================
  server.put(
    '/auth/me/password',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string
          newPassword: string
        }

        if (!currentPassword || !newPassword) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '当前密码和新密码不能为空',
          })
        }

        if (newPassword.length < 6) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '新密码长度至少为 6 位',
          })
        }

        const user = await prisma.user.findUnique({
          where: { id: (request.user as any).userId },
        })

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '用户不存在',
          })
        }

        // 验证当前密码
        const validPassword = await bcrypt.compare(currentPassword, user.password)

        if (!validPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '当前密码错误',
          })
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })

        reply.send({ message: '密码修改成功' })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '修改密码失败',
        })
      }
    }
  )

  // ==================== 获取头像上传凭证 ====================
  server.get(
    '/avatar/upload-token',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { filename } = request.query as { filename: string }
        
        if (!filename) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '文件名不能为空',
          })
        }

        // 生成文件 key：avatars/user-{userId}-{timestamp}.{ext}
        const userId = (request.user as any).userId
        const ext = filename.split('.').pop() || 'jpg'
        const key = `avatars/user-${userId}-${Date.now()}.${ext}`
        
        // 获取上传凭证
        const token = getUploadToken(key)

        reply.send({
          token,
          key,
          uploadUrl: 'https://up-z2.qiniup.com/',
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取上传凭证失败',
        })
      }
    }
  )

  // ==================== 提交头像审核 ====================
  server.post(
    '/avatar/submit',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { avatarUrl, avatarKey } = request.body as {
          avatarUrl: string
          avatarKey: string
        }

        if (!avatarUrl || !avatarKey) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '头像 URL 和 key 不能为空',
          })
        }

        const userId = (request.user as any).userId

        // 调用七牛云图片审核 API
        server.log.info(`[Avatar Censor] Starting auto-censor for user ${userId}, image: ${avatarUrl}`)
        
        let censorResult: any = null
        try {
          censorResult = await censorImage(avatarUrl)
          server.log.info(`[Avatar Censor] Result:`, censorResult)
        } catch (censorError: any) {
          // 审核 API 调用失败，转为人工审核
          server.log.error(`[Avatar Censor] API call failed, fallback to manual review:`, censorError.message)
        }

        // 根据审核结果设置状态
        let avatarStatus = 'pending' // 默认人工审核
        let avatarRejectReason = null

        if (censorResult) {
          if (censorResult.suggestion === 'pass') {
            // 自动通过
            avatarStatus = 'approved'
            server.log.info(`[Avatar Censor] Auto-approved for user ${userId}`)
          } else if (censorResult.suggestion === 'block') {
            // 自动拒绝
            avatarStatus = 'rejected'
            // 生成拒绝原因
            const blockDetails = censorResult.details.filter((d: any) => d.suggestion === 'block')
            const reasons = blockDetails.map((d: any) => {
              const sceneName = getSceneName(d.scene)
              return `${sceneName}（置信度：${(d.score * 100).toFixed(1)}%）`
            })
            avatarRejectReason = `系统检测到违规内容：${reasons.join('，')}`
            server.log.warn(`[Avatar Censor] Auto-rejected for user ${userId}: ${avatarRejectReason}`)
          } else {
            // review 或不确定的情况，转人工审核
            avatarStatus = 'pending'
            server.log.info(`[Avatar Censor] Manual review required for user ${userId}`)
          }
        }

        // 更新用户头像和审核状态
        await prisma.user.update({
          where: { id: userId },
          data: {
            avatar: avatarUrl,
            avatarStatus,
            avatarRejectReason,
          },
        })

        server.log.info(`[Avatar Submit] User ${userId} submitted avatar: ${avatarKey}, status: ${avatarStatus}`)

        reply.send({
          message: avatarStatus === 'approved' 
            ? '头像上传成功，已通过自动审核' 
            : avatarStatus === 'rejected'
            ? `头像上传失败：${avatarRejectReason}`
            : '头像已提交审核，审核通过前不会显示',
          status: avatarStatus,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '提交头像审核失败',
        })
      }
    }
  )

  // 辅助函数：审核类型名称映射
  function getSceneName(scene: string): string {
    const map: Record<string, string> = {
      pulp: '色情内容',
      terror: '暴恐内容',
      politician: '敏感人物',
      ads: '广告内容',
      behavior: '不良场景',
    }
    return map[scene] || scene
  }

  // ==================== 管理员审核头像 ====================
  server.put(
    '/admin/avatar/:userId/review',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          // 检查是否是管理员
          if (!['admin', 'content_admin', 'system_admin'].includes(decoded.role)) {
            return reply.code(403).send({ error: 'Forbidden', message: '权限不足' })
          }
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string }
        const { status, rejectReason } = request.body as {
          status: 'approved' | 'rejected'
          rejectReason?: string
        }

        if (!['approved', 'rejected'].includes(status)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '审核状态必须是 approved 或 rejected',
          })
        }

        if (status === 'rejected' && !rejectReason) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '拒绝头像需要提供拒绝原因',
          })
        }

        const user = await prisma.user.findUnique({
          where: { id: parseInt(userId) },
        })

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '用户不存在',
          })
        }

        // 更新头像审核状态
        await prisma.user.update({
          where: { id: parseInt(userId) },
          data: {
            avatarStatus: status,
            avatarRejectReason: rejectReason || null,
          },
        })

        server.log.info(`[Avatar Review] Admin ${request.user.userId} ${status} avatar for user ${userId}`)

        reply.send({
          message: status === 'approved' ? '头像审核通过' : '头像已拒绝',
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '审核头像失败',
        })
      }
    }
  )

  // ==================== 获取待审核头像列表（管理员） ====================
  server.get(
    '/admin/avatars/pending',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          if (!['admin', 'content_admin', 'system_admin'].includes(decoded.role)) {
            return reply.code(403).send({ error: 'Forbidden', message: '权限不足' })
          }
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const pendingAvatars = await prisma.user.findMany({
          where: {
            avatarStatus: 'pending',
          },
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            avatarStatus: true,
            avatarRejectReason: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        reply.send({ avatars: pendingAvatars })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取待审核头像列表失败',
        })
      }
    }
  )
}
