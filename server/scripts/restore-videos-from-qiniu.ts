/**
 * 从七牛云扫描视频文件并重建数据库记录
 * 用于恢复被误删除的视频数据
 */

import { PrismaClient } from '@prisma/client'
import qiniu from 'qiniu'
import * as path from 'path'

const prisma = new PrismaClient()

// 七牛云配置
const accessKey = process.env.QINIU_ACCESS_KEY || '7SQACfWTDUZdDgJFlRZGRbKQDIHUFGilt_H3UE2L'
const secretKey = process.env.QINIU_SECRET_KEY || 'LTaPJ6mK_LDudhkxJRmvLmdpnr-PLoL1gvOGDvfn'
const bucket = 'zhuque-guangdong'
const domain = 'http://video.jiangmeijixie.com'

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)

async function listAllFiles() {
  console.log('📋 正在扫描七牛云文件...\n')
  
  const config = new qiniu.conf.Config()
  config.zone = qiniu.zone.Zone_z2 // 华南
  
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  
  let marker = ''
  let allFiles: any[] = []
  
  // 分页获取所有文件
  do {
    const [err, { items, marker: nextMarker }] = await new Promise((resolve) => {
      bucketManager.createListFilesIterator(bucket, { marker }).next((result: any) => {
        resolve([result.error, result.value])
      })
    })
    
    if (err) {
      console.error('列出文件失败:', err)
      break
    }
    
    if (items) {
      allFiles = allFiles.concat(items)
      console.log(`  获取到 ${items.length} 个文件，累计 ${allFiles.length} 个`)
    }
    
    marker = nextMarker || ''
  } while (marker)
  
  return allFiles
}

async function main() {
  console.log('🚀 开始从七牛云恢复视频数据...\n')
  
  // 1. 扫描七牛云所有文件
  const allFiles = await listAllFiles()
  
  // 2. 筛选视频文件
  const videoFiles = allFiles.filter(file => {
    const key = file.key as string
    return key.endsWith('.mp4') && key.includes('参考网站 2026/')
  })
  
  console.log(`\n📹 找到 ${videoFiles.length} 个视频文件\n`)
  
  // 3. 解析文件路径，提取游戏 ID
  // 格式：参考网站 2026/{category}/game-{gameId}/{filename}.mp4
  const gameMap = new Map<number, string>()
  const categoryMap = new Map<string, number>()
  
  // 先获取所有游戏
  const games = await prisma.game.findMany()
  games.forEach(game => {
    gameMap.set(game.id, game.name)
  })
  
  console.log('📋 现有游戏:')
  gameMap.forEach((name, id) => {
    console.log(`  Game ${id}: ${name}`)
  })
  console.log()
  
  // 4. 按游戏分组视频文件
  const videosByGame = new Map<number, any[]>()
  
  videoFiles.forEach(file => {
    const key = file.key as string
    const match = key.match(/game-(\d+)/)
    if (match) {
      const gameId = parseInt(match[1])
      if (!videosByGame.has(gameId)) {
        videosByGame.set(gameId, [])
      }
      videosByGame.get(gameId)!.push(file)
    }
  })
  
  // 5. 为每个游戏恢复视频
  for (const [gameId, files] of videosByGame.entries()) {
    console.log(`\n🎮 处理游戏 ${gameId} (${gameMap.get(gameId) || '未知'}): ${files.length} 个视频`)
    
    // 获取该游戏的所有角色
    const characters = await prisma.character.findMany({
      where: { gameId },
    })
    
    console.log(`  找到 ${characters.length} 个角色`)
    
    // 按角色分组文件
    const filesByCharPath = new Map<string, any[]>()
    files.forEach(file => {
      const key = file.key as string
      const charPathMatch = key.match(/game-\d+\/([^\/]+)\//)
      if (charPathMatch) {
        const charPath = charPathMatch[1]
        if (!filesByCharPath.has(charPath)) {
          filesByCharPath.set(charPath, [])
        }
        filesByCharPath.get(charPath)!.push(file)
      }
    })
    
    // 为每个角色创建动作和视频
    for (const [charPath, charFiles] of filesByCharPath.entries()) {
      // 查找角色（通过路径匹配）
      let character = characters.find(c => {
        // 尝试匹配角色名称或路径
        return charPath.toLowerCase().includes(c.name.toLowerCase()) ||
               c.name.toLowerCase().includes(charPath.toLowerCase())
      })
      
      if (!character) {
        console.log(`  ⚠️  未找到匹配的角色：${charPath}，跳过`)
        continue
      }
      
      console.log(`  👤 角色：${character.name} (${charFiles.length} 个视频)`)
      
      // 为每个视频文件创建动作和视频记录
      for (const file of charFiles) {
        const key = file.key as string
        const filename = path.basename(key, '.mp4')
        
        // 从文件名提取动作名称（去掉时间戳和随机码）
        // 格式：1773919456209-hkcn1m -> 需要反向查找
        const nameMatch = filename.match(/\d+-[a-z0-9]+$/)
        if (!nameMatch) {
          console.log(`    ⚠️  无法解析文件名：${filename}`)
          continue
        }
        
        // 检查是否已存在
        const existingVideo = await prisma.video.findFirst({
          where: { qiniuKey: key },
        })
        
        if (existingVideo) {
          console.log(`    ⏭️  视频已存在：${existingVideo.title}`)
          continue
        }
        
        // 创建动作（使用文件名作为动作名）
        const actionName = filename.replace(/^\d+-[a-z0-9]+-?/, '') || filename
        const action = await prisma.action.create({
          data: {
            name: actionName,
            code: actionName,
            characterId: character.id,
            published: true,
            order: 1,
          },
        })
        
        console.log(`    ✅ 创建动作：${action.name} (ID: ${action.id})`)
        
        // 创建视频记录
        const video = await prisma.video.create({
          data: {
            title: actionName,
            gameId,
            actionId: action.id,
            qiniuKey: key,
            coverUrl: '', // 需要后续生成封面
            duration: 0, // 需要后续获取
            published: true,
          },
        })
        
        console.log(`    ✅ 创建视频：${video.title} (ID: ${video.id})`)
      }
    }
  }
  
  console.log('\n✅ 数据恢复完成！\n')
  
  // 统计结果
  const videoCount = await prisma.video.count()
  const actionCount = await prisma.action.count()
  console.log(`📊 当前数据库统计:`)
  console.log(`  视频：${videoCount} 个`)
  console.log(`  动作：${actionCount} 个`)
}

main()
  .catch((e) => {
    console.error('❌ 恢复失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
