# Drift Bottle Studio

第一版摄影师官网，面向 Cloudflare Pages 零构建部署。

## 功能

- 高端简约首页与高清作品展示区
- 摄影师简介、服务列表与价格
- 摄影服务说明、样片位、客户 FAQ
- 询价表单，Cloudflare Pages Function 调用 Resend 发邮件
- 管理上传入口，支持本地预览；配置 Cloudflare Images 后可持久上传
- 基础 SEO：标题描述、canonical、OG、robots、sitemap、ProfessionalService schema

## Cloudflare Pages 环境变量

询价邮件：

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INQUIRY_TO_EMAIL`

作品上传：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_IMAGES_TOKEN`

## 部署

Cloudflare Pages 构建设置：

- Build command: 留空
- Build output directory: `/`
- Functions directory: `functions`

自定义域名：`driftbottlestudio.com`
