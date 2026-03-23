// 用户系统 API 测试脚本
// 使用方法：node test-user-api.js

const API_BASE = 'http://localhost:3002/api';

async function test() {
  console.log('🧪 开始测试用户系统 API...\n');

  // 1. 测试注册
  console.log('1️⃣  测试用户注册...');
  try {
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: '123456',
      }),
    });
    const registerData = await registerRes.json();
    
    if (registerRes.ok) {
      console.log('   ✅ 注册成功');
      console.log('   Token:', registerData.token.substring(0, 50) + '...');
      console.log('   用户 ID:', registerData.user.id);
      console.log('   用户名:', registerData.user.username);
      
      const token = registerData.token;
      
      // 2. 测试获取用户信息
      console.log('\n2️⃣  测试获取用户信息...');
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meRes.ok) {
        console.log('   ✅ 获取成功');
        console.log('   角色:', meData.user.role);
        console.log('   VIP 等级:', meData.user.vipLevel);
      } else {
        console.log('   ❌ 获取失败:', meData.message);
      }
      
      // 3. 测试更新用户信息
      console.log('\n3️⃣  测试更新用户信息...');
      const updateRes = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: '13800138000' }),
      });
      const updateData = await updateRes.json();
      if (updateRes.ok) {
        console.log('   ✅ 更新成功');
        console.log('   手机号:', updateData.user.phone);
      } else {
        console.log('   ❌ 更新失败:', updateData.message);
      }
      
      // 4. 测试修改密码
      console.log('\n4️⃣  测试修改密码...');
      const passwordRes = await fetch(`${API_BASE}/auth/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: '123456',
          newPassword: '654321',
        }),
      });
      if (passwordRes.ok) {
        console.log('   ✅ 密码修改成功');
      } else {
        const passwordData = await passwordRes.json();
        console.log('   ❌ 密码修改失败:', passwordData.message);
      }
      
      // 5. 测试收藏夹
      console.log('\n5️⃣  测试收藏夹功能...');
      
      // 先获取视频列表
      const videosRes = await fetch(`${API_BASE}/videos?limit=1`);
      const videosData = await videosRes.json();
      if (videosData.videos && videosData.videos.length > 0) {
        const videoId = videosData.videos[0].id;
        console.log('   测试视频 ID:', videoId);
        
        // 添加收藏
        const addFavRes = await fetch(`${API_BASE}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ videoId }),
        });
        if (addFavRes.ok) {
          console.log('   ✅ 添加收藏成功');
        } else {
          const addFavData = await addFavRes.json();
          console.log('   ❌ 添加收藏失败:', addFavData.message);
        }
        
        // 检查收藏状态
        const checkRes = await fetch(`${API_BASE}/favorites/check/${videoId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        console.log('   收藏状态:', checkData.favorited ? '已收藏' : '未收藏');
        
        // 获取收藏列表
        const listRes = await fetch(`${API_BASE}/favorites`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const listData = await listRes.json();
        if (listRes.ok) {
          console.log('   ✅ 获取收藏列表成功');
          console.log('   收藏数量:', listData.favorites.length);
        }
        
        // 删除收藏
        const delRes = await fetch(`${API_BASE}/favorites/${videoId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (delRes.ok || delRes.status === 204) {
          console.log('   ✅ 删除收藏成功');
        } else {
          console.log('   ❌ 删除收藏失败');
        }
      } else {
        console.log('   ⚠️  没有视频可测试');
      }
      
    } else {
      console.log('   ❌ 注册失败:', registerData.message);
    }
  } catch (err) {
    console.log('   ❌ 测试出错:', err.message);
  }
  
  // 6. 测试登录（用管理员账号）
  console.log('\n6️⃣  测试管理员登录...');
  try {
    const loginRes = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok) {
      console.log('   ✅ 管理员登录成功');
      console.log('   角色:', loginData.user.role);
    } else {
      console.log('   ❌ 管理员登录失败:', loginData.message);
    }
  } catch (err) {
    console.log('   ❌ 登录测试出错:', err.message);
  }
  
  console.log('\n✅ 所有测试完成！\n');
}

test();
