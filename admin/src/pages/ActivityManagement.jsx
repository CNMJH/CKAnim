import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import DailyLottery from './DailyLottery'
import Placeholder from './Placeholder'

function ActivityManagement() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/activity-management/daily-lottery" replace />} />
        <Route path="/daily-lottery" element={<DailyLottery />} />
        <Route path="/placeholder" element={<Placeholder />} />
      </Routes>
    </Layout>
  )
}

export default ActivityManagement
