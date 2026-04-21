import { MainScreen } from './ui/MainScreen'
import { OrientationGuard } from './ui/OrientationGuard'

export default function App() {
  return (
    <OrientationGuard>
      <MainScreen />
    </OrientationGuard>
  )
}
