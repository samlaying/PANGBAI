# 旁白 PANGBAI

单用户 AI 职场导师工作区。人物、项目、文档与确认后的记忆存储在 Supabase Cloud PostgreSQL（Drizzle ORM，`pgTable`）；开发和测试环境未配置数据库时可使用进程内 PGlite 内存库，生产环境缺失数据库配置会直接启动失败。首次运行不写入演示资料。

## 开发

```bash
npm ci
npm run dev
```

打开 http://localhost:3000，在「人物」和「项目」面板添加真实资料。

数据库连接：设置 `DATABASE_URL`（或 `SUPABASE_DATABASE_URL`，Supabase Supavisor 事务池端口 6543）连接云端 PostgreSQL。开发和测试环境未设置时使用内嵌 PGlite 内存模式（数据不持久化）；生产环境必须配置数据库。表结构通过 `npm run db:push` 同步（Drizzle Kit，`drizzle.config.ts` 已配置 `postgresql` 方言）。`.data/` 目录下的旧 SQLite 文件是历史遗留，当前代码不再读写，可安全删除。

对话功能需要设置 `SILICONFLOW_API_KEY`；可选 `SILICONFLOW_BASE_URL` 与 `DEFAULT_MODEL`（默认 `deepseek-ai/DeepSeek-V3`，经 SiliconFlow OpenAI 兼容协议接入）。未配置密钥时，对话会显示服务未配置错误，不会生成假回复。

生产部署还必须设置 `DATABASE_URL`（或 `SUPABASE_DATABASE_URL`）、`PANGBAI_AUTH_USER` 和 `PANGBAI_AUTH_PASSWORD`。生产环境通过 HTTP Basic Auth 保护页面和 API；数据库连接缺失时应用会直接启动失败，不会降级到内存库。飞书集成按需设置 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 和服务器可执行的 `LARK_CLI_BIN`。

数据库迁移按顺序执行 `supabase/migrations/` 中的 SQL。`20260926000000_security_hardening.sql` 会移除 Supabase 公共 API 的匿名读写策略，线上执行前请确认 Next.js 服务使用的是数据库连接串，而不是匿名 API Key。

## 验证

```bash
npm test
npm run lint
npm run build
```

Canvas 中的「保存」按钮写入当前项目的文档。人物观察确认在数据库事务中完成。当前会议与成长报告没有数据来源，页面显示空状态。
