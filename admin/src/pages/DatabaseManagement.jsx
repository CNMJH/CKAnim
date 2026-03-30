import { useState } from 'react'
import Layout from '../components/Layout'
import Games from './Games'
import Categories from './Categories'
import Characters from './Characters'
import Actions from './Actions'
import './DatabaseManagement.css'

function DatabaseManagement() {
  const [activeTab, setActiveTab] = useState('games')

  const tabs = [
    { id: 'games', label: '🎮 游戏管理', component: Games },
    { id: 'categories', label: '📁 分类管理', component: Categories },
    { id: 'characters', label: '👤 角色管理', component: Characters },
    { id: 'actions', label: '🎯 动作管理', component: Actions },
  ]

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Games

  return (
    <Layout>
      <div className="database-management">
        <div className="db-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          <ActiveComponent />
        </div>
      </div>
    </Layout>
  )
}

export default DatabaseManagement
