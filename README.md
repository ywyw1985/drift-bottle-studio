# Drift Bottle Studio

第一版摄影师官网，面向 Cloudflare Pages 零构建部署。

## 功能

- 高端简约首页与高清作品展示区
- 摄影师简介、服务列表与价格
- 摄影服务说明、样片位、客户 FAQ
- 询价表单，先保留入口；配置 Resend 后再启用邮件通知
- 独立照片管理后台：批量压缩上传、栏目管理、封面与排序、草稿预览和发布
- 作品照片与清单存储在 Cloudflare R2，前台保留静态内容作为安全回退
- 基础 SEO：标题描述、canonical、OG、robots、图片 sitemap、ProfessionalService 与 FAQ schema

## Cloudflare Pages 环境变量

询价邮件：

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INQUIRY_TO_EMAIL`

照片管理后台：

- R2 绑定 `PORTFOLIO_UPLOADS`
- 加密变量 `ADMIN_PASSWORD_HASH`（管理员密码的 SHA-256 十六进制摘要）
- 加密变量 `ADMIN_SESSION_SECRET`（用于签署 8 小时登录会话）

后台地址：`/admin/`。后台页面不会公开密码；所有修改接口要求同源请求和已签名的 HttpOnly 会话 Cookie。

## 部署

Cloudflare Pages 构建设置：

- Build command: 留空
- Build output directory: `/`
- Functions directory: `functions`

自定义域名：`driftbottlestudio.com`
