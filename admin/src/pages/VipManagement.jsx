import { useState } from 'react'
import Layout from '../components/Layout'
import VipPlans from './VipPlans'
import UserLibraryLevels from './UserLibraryLevels'
import './VipManagement.css'

function VipManagement() {
  const [activeTab, setActiveTab] = useState('plans')

  return (
    <Layout>
      <div className="vip-management">
        <div className="vip-tabs">
          <button 
            className={`tab-button ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            💎 VIP 套餐管理
          </button>
          <button 
            className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
            onClick={() => setActiveTab('levels')}
          >
            📚 参考库等级管理
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'plans' && <VipPlans />}
          {activeTab === 'levels' && <UserLibraryLevels />}
        </div>
      </div>
    </Layout>
  )
}

export default VipManagement
