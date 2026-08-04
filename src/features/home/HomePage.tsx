const categorySummaries = [
  { icon: 'D', name: '随机数工具', tools: '色子模拟器 · 随机数生成器', description: '组合多面骰子，或按范围、数量与唯一性生成安全随机值。' },
  { icon: 'S', name: '对称加密', tools: 'AES · DES · SM4', description: '使用明确的密钥编码、模式、填充和偏移参数完成本地加解密。' },
  { icon: 'R', name: '非对称加密', tools: 'RSA', description: '生成或导入密钥，完成 RSA 加解密与签名验证。' },
  { icon: 'H', name: '摘要算法', tools: 'MD5 · SHA', description: '计算 MD5，或同时生成 SHA-1、SHA-256、SHA-384、SHA-512 摘要。' },
  { icon: 'T', name: '时间工具', tools: '时间戳', description: '在 Unix 时间戳、ISO 时间与可读日期之间转换。' },
  { icon: 'E', name: '编码工具', tools: 'URL 编解码 · Base64 · JWT', description: '处理常见文本编码，并在本地解析、校验或生成 JWT。' },
] as const

export function HomePage() {
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
          {categorySummaries.map((category) => (
            <article className='home-category-card' key={category.name}>
              <span className='home-category-icon' aria-hidden='true'>{category.icon}</span>
              <div><h3>{category.name}</h3><strong>{category.tools}</strong><p>{category.description}</p></div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
