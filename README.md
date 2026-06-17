# 个人收藏中心

一个 Google 风格的轻量个人收藏中心。支持保存链接、文本、代码、JSON、图片和账号记录；账号敏感字段在浏览器端使用主密码加密后再保存。

## 本地运行

```bash
npm run dev
```

项目使用 Vite + React + TypeScript + Tailwind CSS 构建，UI 组件全面采用 shadcn/ui 风格组件。默认进入本地演示模式，数据保存在浏览器 `localStorage` 中。

开发服务器由 Vite 提供热更新。PWA 静态资源位于 `public/`，`config.js` 作为本地运行时配置从项目根目录读取。

## Supabase 配置

1. 复制 `.env.example` 为 `.env.local`，填入：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

2. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
3. 在 Supabase Auth 中启用 GitHub OAuth Provider。
   - 在 GitHub Developer settings 创建 OAuth App。
   - GitHub OAuth App 的 Authorization callback URL 填：

```text
https://你的项目 ref.supabase.co/auth/v1/callback
```

本项目当前 Supabase 回调 URL 为：

```text
https://mtcrypfaiincjdboqidu.supabase.co/auth/v1/callback
```

   - 回到 Supabase Dashboard，在 Authentication -> Providers -> GitHub 中开启 GitHub，并填入 GitHub OAuth App 的 Client ID 和 Client Secret。
4. 在 Supabase Auth URL Configuration 中加入本地和生产回调地址，例如：

```text
http://localhost:3000/
https://your-app-domain.vercel.app/
```

应用登录时会使用当前页面无 query 的 URL 作为 `redirectTo`，因此本地和 Vercel 部署会自动回到当前站点入口。
5. 在 Vercel 配置同名环境变量 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY` 后部署。生产构建会生成 `dist/config.js`。

Supabase 未配置时，OAuth 按钮会进入本地演示模式；配置后会调用真实 GitHub OAuth。

`.env.local` 已被 `.gitignore` 忽略，不要提交真实配置。Supabase publishable key 会被浏览器用于 OAuth 和客户端请求，它不是 service role secret；数据保护依赖 `supabase/schema.sql` 中的 RLS 策略。

### GitHub 登录常见错误

如果本地登录返回：

```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

说明 Supabase 的 GitHub Provider 没有启用，或 GitHub Provider 中缺少有效的 Client ID/Client Secret。按上面的第 3 步启用后再重试。

## 验证

```bash
npm run typecheck
npm run build
```

`typecheck` 会执行 TypeScript 校验；`build` 会检查关键文件、OAuth/加密/图片上传行为标记和 Supabase RLS SQL，然后由 Vite 生成 `dist/`。

## UI 与主题

- shadcn/ui 组件位于 `src/components/ui/`，包括 Button、Input、Textarea、Dialog、AlertDialog、Select、Tabs、Dropdown Menu、Tooltip、ScrollArea、Badge、Card、Label、Separator。
- `src/components/theme-provider.tsx` 和 `src/components/theme-toggle.tsx` 提供白天、晚上、跟随系统主题切换。
- shadcn 主题 token 定义在 `src/styles.css`，页面布局使用 Tailwind utility 和 shadcn/ui 组件完成。

## 目录结构

- `src/main.tsx`：React 浏览器入口，注册 PWA service worker。
- `src/App.tsx`：应用启动、状态管理、页面组件和用户操作。
- `src/styles.css`：Tailwind v4 入口和 shadcn light/dark 主题 token。
- `src/components/ui/`：shadcn/ui 组件。
- `src/components/theme-provider.tsx`、`src/components/theme-toggle.tsx`：主题上下文与切换控件。
- `src/data.js`：Supabase/localStorage 数据访问和图片上传。
- `src/crypto.js`：保险箱端到端加密与解密。
- `src/utils.js`：内容识别、URL/标题/预览处理和通用工具。
- `src/state.js`：全局运行状态。
- `src/constants.js`、`src/icons.js`：类型配置和图标。
- `public/`：manifest、图标和 service worker。

## 设计文档

设计文档位于 `docs/design/personal-favorite-center.md`。
