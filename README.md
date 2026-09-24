# 旁白 PANGBAI

本地单用户工作区。人物、项目、文档与确认后的记忆存储在 SQLite；首次运行创建空数据库，不写入演示资料。

## 开发

```bash
npm ci
npm run dev
```

打开 http://localhost:3000，在「人物」和「项目」面板添加真实资料。数据库位于 `.data/pangbai.db`，已由 `.gitignore` 排除。对话功能需要设置 `SILICONFLOW_API_KEY`；可选 `SILICONFLOW_BASE_URL` 与 `DEFAULT_MODEL`。未配置密钥时，对话会显示服务未配置错误，不会生成假回复。

## 验证

```bash
npm test
npm run lint
npm run build
```

Canvas 中的「保存」按钮写入当前项目的文档。人物观察确认在数据库事务中完成。当前会议与成长报告没有数据来源，页面显示空状态。
