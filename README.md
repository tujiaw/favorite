# 个人收藏中心

一个 Google 风格的轻量个人收藏中心。支持保存链接、文本、代码、JSON、图片和账号记录；账号敏感字段在浏览器端使用主密码加密后再保存。

## 本地运行

```bash
npm run dev
```

项目是零构建静态 PWA，不需要安装依赖。默认进入本地演示模式，数据保存在浏览器 `localStorage` 中。

开发服务器支持热更新，会监听 `index.html`、`app.js`、`styles.css`、`config.js`、`manifest.webmanifest` 和 `icon.svg`，文件保存后浏览器自动刷新。

## Supabase 配置

1. 复制 `.env.example` 为 `.env.local`，填入：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

2. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
3. 在 Supabase Auth 中启用 GitHub OAuth Provider。
4. 在 Supabase Auth URL Configuration 中加入本地和生产回调地址，例如：

```text
http://localhost:3000/
https://your-app-domain.vercel.app/
```

应用登录时会使用当前页面无 query 的 URL 作为 `redirectTo`，因此本地和 Vercel 部署会自动回到当前站点入口。
5. 在 Vercel 配置同名环境变量 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY` 后部署。本地开发由 `scripts/dev-server.mjs` 生成 `/config.js`，Vercel 由 `api/config.js` 生成 `/config.js`。

Supabase 未配置时，OAuth 按钮会进入本地演示模式；配置后会调用真实 GitHub OAuth。

`.env.local` 已被 `.gitignore` 忽略，不要提交真实配置。Supabase publishable key 会被浏览器用于 OAuth 和客户端请求，它不是 service role secret；数据保护依赖 `supabase/schema.sql` 中的 RLS 策略。

## 验证

```bash
npm run build
```

该命令会检查静态应用关键文件、OAuth/加密/图片上传行为标记和 Supabase RLS SQL。

## 设计文档

设计文档位于 `docs/design/personal-favorite-center.md`。
