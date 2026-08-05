import { DEFAULT_TOOL_AVAILABILITY, getEnabledToolGroups, type ToolGroup } from '../../shell/toolRegistry'

export function HomePage({ groups = getEnabledToolGroups(DEFAULT_TOOL_AVAILABILITY) }: { groups?: ToolGroup[] }) {
  return (
    <section className='home-page' aria-labelledby='home-title'>
      <header className='home-hero'>
        <div className='home-hero-copy'>
          <span className='eyebrow'>DEV TOOLBOX / HOME</span>
          <h1 id='home-title'>开发者工具箱</h1>
          <p>把常用的随机、密码、摘要、时间与编码操作集中在一个简洁的本地工作台中。</p>
        </div>
        <div className='home-local-card'>
          <span className='home-local-icon' aria-hidden='true'>●</span>
          <div><strong>完全本地处理</strong><span>输入、密钥与结果不会离开当前浏览器</span></div>
        </div>
      </header>

      <div className='home-principles' aria-label='工具箱特性'>
        <span>无需账号</span><span>无上传</span><span>无追踪</span><span>即开即用</span>
      </div>

      <section className='home-catalog' aria-labelledby='home-catalog-title'>
        <div className='home-section-heading'>
          <div><span className='eyebrow'>CAPABILITIES</span><h2 id='home-catalog-title'>工具一览</h2></div>
          <p>从左侧分类选择工具开始使用</p>
        </div>
        <div className='home-category-grid'>
          {groups.map((group) => (
            <article className='home-category-card' key={group.id}>
              <span className='home-category-icon' aria-hidden='true'>{group.homeIcon}</span>
              <div><h3>{group.name}</h3><strong>{group.tools.map((tool) => tool.name).join(' · ')}</strong><p>{group.homeDescription}</p></div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
