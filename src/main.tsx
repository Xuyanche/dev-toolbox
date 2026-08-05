import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './shell/App'
import { loadRuntimeConfig } from './shell/runtimeConfig'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('找不到应用根节点')

root.innerHTML = '<div class="app-loading" role="status">正在加载工具配置…</div>'
const appRoot = createRoot(root)

async function bootstrap() {
  const availability = await loadRuntimeConfig()
  appRoot.render(
    <StrictMode>
      <App availability={availability} />
    </StrictMode>,
  )
}

void bootstrap()
