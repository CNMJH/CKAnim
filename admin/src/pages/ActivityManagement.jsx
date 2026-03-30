import { Outlet } from 'react-router-dom'
import Layout from '../components/Layout'

function ActivityManagement() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default ActivityManagement
