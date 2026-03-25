import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Database.css'

const API_BASE = 'http://39.102.115.79:3002/api'

const ALLOWED_TABLES = [
  { name: 'User', label: '用户' },
  { name: 'Video', label: '视频' },
  { name: 'Action', label: '动作' },
  { name: 'Character', label: '角色' },
  { name: 'Game', label: '游戏' },
  { name: 'GameCategory', label: '分类' },
  { name: 'Favorite', label: '收藏' },
  { name: 'FavoriteCollection', label: '收藏夹' },
  { name: 'SiteSettings', label: '网站设置' },
  { name: 'VipPlan', label: 'VIP 套餐' },
  { name: 'AvatarReview', label: '头像审核' },
]

function Database() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [fields, setFields] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [backupPath, setBackupPath] = useState('')
  const [backups, setBackups] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [operationHistory, setOperationHistory] = useState([])
  const [isUndoing, setIsUndoing] = useState(false)

  // 获取数据库统计
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('加载统计失败:', err)
    }
  }

  // 获取表数据
  const loadTableData = async (tableName, pageNum = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(searchField && { searchField })
      })
      
      const res = await fetch(`${API_BASE}/admin/database/table/${tableName}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.data) {
        setTableData(data.data)
        setFields(data.fields || [])
        setTotal(data.total || 0)
        setPage(pageNum)
      }
    } catch (err) {
      showMessage('error', '加载数据失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 获取备份列表
  const loadBackups = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/backups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.backups) {
        setBackups(data.backups)
      }
    } catch (err) {
      console.error('加载备份列表失败:', err)
    }
  }

  // 备份数据库
  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupPath: backupPath || undefined })
      })
      const data = await res.json()
      
      if (data.success) {
        showMessage('success', `备份成功！大小：${(data.size / 1024).toFixed(2)} KB`)
        setBackupPath('')
        loadBackups()
      } else {
        showMessage('error', data.message || '备份失败')
      }
    } catch (err) {
      showMessage('error', '备份失败：' + err.message)
    }
  }

  // 恢复备份
  const handleRestore = async (backupPath) => {
    if (!confirm('确定要恢复到此备份吗？当前数据库会自动备份。恢复后需要重启服务！')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupPath })
      })
      const data = await res.json()
      
      if (data.success) {
        showMessage('success', '恢复成功！请重启 ckanim-server 服务。')
        loadBackups()
      } else {
        showMessage('error', data.message || '恢复失败')
      }
    } catch (err) {
      showMessage('error', '恢复失败：' + err.message)
    }
  }

  // 执行 SQL 查询
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      showMessage('error', '请输入 SQL 查询')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: sqlQuery })
      })
      const data = await res.json()
      
      if (data.success) {
        setSqlResult(data.data)
        showMessage('success', '查询成功')
      } else {
        showMessage('error', data.message || '查询失败')
      }
    } catch (err) {
      showMessage('error', '查询失败：' + err.message)
    }
  }

  // 更新单元格
  const handleUpdateCell = async (id, field, value) => {
    if (!selectedTable) return

    // 获取旧值
    const oldRow = tableData.find(row => row.id === id)
    const oldValue = oldRow ? oldRow[field] : null

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/table/${selectedTable}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      })
      const data = await res.json()
      
      if (data.success) {
        // 记录操作历史
        const operation = {
          type: 'update',
          table: selectedTable,
          id,
          field,
          oldValue,
          newValue: value,
          timestamp: Date.now()
        }
        setOperationHistory(prev => [operation, ...prev].slice(0, 50)) // 最多保留 50 条
        
        showMessage('success', '更新成功')
        loadTableData(selectedTable, page)
        setEditingCell(null)
      } else {
        showMessage('error', data.message || '更新失败')
      }
    } catch (err) {
      showMessage('error', '更新失败：' + err.message)
    }
  }

  // 删除记录
  const handleDelete = async (id) => {
    if (!selectedTable) return
    if (!confirm('确定要删除这条记录吗？此操作不可恢复！')) return

    // 获取完整行数据
    const deletedRow = tableData.find(row => row.id === id)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/admin/database/table/${selectedTable}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.success) {
        // 记录操作历史
        const operation = {
          type: 'delete',
          table: selectedTable,
          id,
          data: deletedRow,
          timestamp: Date.now()
        }
        setOperationHistory(prev => [operation, ...prev].slice(0, 50))
        
        showMessage('success', '删除成功')
        loadTableData(selectedTable, page)
      } else {
        showMessage('error', data.message || '删除失败')
      }
    } catch (err) {
      showMessage('error', '删除失败：' + err.message)
    }
  }

  // 撤销操作
  const handleUndo = async () => {
    if (operationHistory.length === 0 || isUndoing) return

    const lastOp = operationHistory[0]
    setIsUndoing(true)

    try {
      const token = localStorage.getItem('token')
      
      if (lastOp.type === 'update') {
        // 撤销更新：恢复旧值
        const res = await fetch(`${API_BASE}/admin/database/table/${lastOp.table}/${lastOp.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ [lastOp.field]: lastOp.oldValue })
        })
        const data = await res.json()
        
        if (data.success) {
          showMessage('success', '已撤销更新')
          setOperationHistory(prev => prev.slice(1))
          loadTableData(selectedTable, page)
        } else {
          showMessage('error', '撤销失败：' + data.message)
        }
      } else if (lastOp.type === 'delete') {
        // 撤销删除：重新创建记录
        const { id, data: rowData, ...rest } = lastOp
        const { createdAt, updatedAt, ...dataToRestore } = rowData
        
        const res = await fetch(`${API_BASE}/admin/database/table/${lastOp.table}/restore`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: lastOp.id,
            data: dataToRestore
          })
        })
        const data = await res.json()
        
        if (data.success) {
          showMessage('success', '已恢复删除的记录')
          setOperationHistory(prev => prev.slice(1))
          loadTableData(selectedTable, page)
        } else {
          showMessage('error', '恢复失败：' + data.message)
        }
      }
    } catch (err) {
      showMessage('error', '撤销失败：' + err.message)
    } finally {
      setIsUndoing(false)
    }
  }

  // 显示消息
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // 初始化加载
  useEffect(() => {
    if (user?.role !== 'system_admin') {
      showMessage('error', '仅系统管理员可访问')
      return
    }
    loadStats()
    loadBackups()
  }, [])

  // 选择表时加载数据
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable)
    }
  }, [selectedTable])

  // 格式化字段值
  const formatValue = (value, field) => {
    if (value === null) return 'NULL'
    if (field?.type?.includes('INT')) return value
    if (field?.type?.includes('BOOL')) return value ? 'true' : 'false'
    return String(value)
  }

  // 获取可搜索字段
  const getSearchableFields = () => {
    if (!fields.length) return []
    return fields.filter(f => 
      f.type.includes('TEXT') || f.type.includes('STRING')
    ).map(f => f.name)
  }

  return (
    <Layout>
      <div className="database-page">
        <h1>🗄️ 数据库管理</h1>
        
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {/* 统计信息 */}
        <div className="stats-grid">
          {stats && Object.entries(stats).map(([key, value]) => (
            <div key={key} className="stat-card">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{key}</div>
            </div>
          ))}
        </div>

        {/* 备份恢复 */}
        <div className="section">
          <h2>💾 备份与恢复</h2>
          <div className="backup-controls">
            <input
              type="text"
              placeholder="备份路径（可选，默认 backups/）"
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              className="input"
            />
            <button onClick={handleBackup} className="btn btn-primary">
              立即备份
            </button>
          </div>

          {backups.length > 0 && (
            <div className="backups-list">
              <h3>历史备份</h3>
              {backups.map(backup => (
                <div key={backup.path} className="backup-item">
                  <span className="backup-name">{backup.filename}</span>
                  <span className="backup-size">{(backup.size / 1024).toFixed(2)} KB</span>
                  <span className="backup-time">
                    {new Date(backup.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <button
                    onClick={() => handleRestore(backup.path)}
                    className="btn btn-warning"
                  >
                    恢复
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL 查询 */}
        <div className="section">
          <h2> SQL 查询（只读）</h2>
          <div className="sql-editor">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="输入 SELECT 查询语句..."
              rows={4}
              className="textarea"
            />
            <button onClick={handleExecuteQuery} className="btn btn-primary">
              执行查询
            </button>
          </div>
          {sqlResult && (
            <div className="sql-result">
              <h3>查询结果</h3>
              <pre>{JSON.stringify(sqlResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* 表选择 */}
        <div className="section">
          <h2>📊 数据表管理</h2>
          <div className="table-selector">
            {ALLOWED_TABLES.map(table => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`table-btn ${selectedTable === table.name ? 'active' : ''}`}
              >
                {table.label} ({table.name})
              </button>
            ))}
          </div>
        </div>

        {/* 数据表格 */}
        {selectedTable && tableData && (
          <div className="section">
            <div className="table-header">
              <h3>📋 {ALLOWED_TABLES.find(t => t.name === selectedTable)?.label}</h3>
              <div className="table-controls">
                <button
                  onClick={handleUndo}
                  disabled={operationHistory.length === 0 || isUndoing}
                  className="btn btn-warning"
                  title="撤销上一次操作"
                >
                  ↶ 撤销 {operationHistory.length > 0 ? `(${operationHistory.length})` : ''}
                </button>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="select"
                >
                  <option value="">搜索字段</option>
                  {getSearchableFields().map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="搜索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input"
                  onKeyPress={(e) => e.key === 'Enter' && loadTableData(selectedTable, 1)}
                />
                <button
                  onClick={() => loadTableData(selectedTable, 1)}
                  className="btn"
                >
                  搜索
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {fields.map(field => (
                          <th key={field.name}>{field.name}</th>
                        ))}
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map(row => (
                        <tr key={row.id}>
                          {fields.map(field => (
                            <td key={field.name}>
                              {editingCell?.id === row.id && editingCell?.field === field.name ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleUpdateCell(row.id, field.name, editValue)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateCell(row.id, field.name, editValue)
                                    }
                                  }}
                                  autoFocus
                                  className="input"
                                />
                              ) : (
                                <span
                                  onDoubleClick={() => {
                                    setEditingCell({ id: row.id, field: field.name })
                                    setEditValue(String(row[field.name] || ''))
                                  }}
                                  className="cell-value"
                                  title="双击编辑"
                                >
                                  {formatValue(row[field.name], field)}
                                </span>
                              )}
                            </td>
                          ))}
                          <td>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="btn btn-danger btn-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                <div className="pagination">
                  <span className="pagination-info">
                    共 {total} 条，第 {page} 页 / 共 {Math.ceil(total / limit)} 页
                  </span>
                  <div className="pagination-buttons">
                    <button
                      onClick={() => loadTableData(selectedTable, page - 1)}
                      disabled={page <= 1}
                      className="btn"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => loadTableData(selectedTable, page + 1)}
                      disabled={page >= Math.ceil(total / limit)}
                      className="btn"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Database
