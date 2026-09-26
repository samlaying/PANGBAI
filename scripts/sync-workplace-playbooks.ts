/**
 * PANGBAI · 职场战法库 (Playbooks) 批量同步脚本
 *
 * 遍历 /Users/sam/Downloads/01-产品与职场课程/职场提升字幕/notes/
 * 解析 127 篇 Markdown 笔记，抽取 Frontmatter、一句话主张、情况-动作表格与底层规则
 * 持久化至 Supabase PostgreSQL playbooks 表，并生成本地极速缓存 playbooks-cache.json
 */

import "../src/server/network/dns-patch";
import * as fs from "node:fs";
import * as path from "node:path";
import yaml from "js-yaml";
import { db } from "../src/db/client";
import { playbooks } from "../src/db/schema";
import { sql } from "drizzle-orm";

const NOTES_DIR = "/Users/sam/Downloads/01-产品与职场课程/职场提升字幕/notes";
const CACHE_OUT = path.join(process.cwd(), "src", "server", "knowledge", "playbooks-cache.json");

interface SituationItem {
  situation: string;
  action: string;
  outcome: string;
}

export interface ParsedPlaybook {
  id: string;
  title: string;
  themes: string[];
  abilities: string[];
  stage: string[];
  type: string;
  entities: string[];
  useWhen: string;
  oneLiner: string;
  situations: SituationItem[];
  rules: string[];
  rawContent: string;
}

function parseMarkdownNote(filePath: string): ParsedPlaybook | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  // 1. 提取 EP ID
  const idMatch = fileName.match(/^(EP\d+)/i);
  const id = idMatch ? idMatch[1].toUpperCase() : fileName.replace(/\.md$/, "");

  // 2. 提取 Frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    console.warn(`[Skip] No frontmatter found in ${fileName}`);
    return null;
  }

  const fmRaw = fmMatch[1];
  const bodyRaw = fmMatch[2].trim();

  let meta: any = {};
  try {
    meta = yaml.load(fmRaw) as any;
  } catch (err: any) {
    console.warn(`[Skip] YAML parse error in ${fileName}:`, err.message);
    return null;
  }

  // 3. 提取一句话主张
  // 结构：# EPxxx · 标题 之后的一句话
  let oneLiner = "";
  const lines = bodyRaw.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      if (i + 1 < lines.length && !lines[i + 1].startsWith("##")) {
        oneLiner = lines[i + 1];
      }
      break;
    }
  }

  // 4. 提取「遇到什么情况，怎么说/做」表格
  const situations: SituationItem[] = [];
  const tableRegex = /\|([^|\r\n]+)\|([^|\r\n]+)\|([^|\r\n]+)\|/g;
  let inTable = false;

  for (const line of bodyRaw.split("\n")) {
    if (line.includes("遇到什么情况") || line.includes("怎么做") || line.includes("怎么说")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("##")) {
      inTable = false;
      continue;
    }
    if (inTable && line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (parts.length >= 3) {
        const [sit, act, out] = parts;
        if (sit.includes("情况") || sit.includes("---") || sit === "") continue;
        situations.push({
          situation: sit,
          action: act,
          outcome: out || "",
        });
      }
    }
  }

  // 5. 提取底层规则
  const rules: string[] = [];
  let inRules = false;
  for (const line of bodyRaw.split("\n")) {
    if (line.includes("底层规则") || line.includes("核心规则")) {
      inRules = true;
      continue;
    }
    if (inRules && line.startsWith("##")) {
      inRules = false;
      continue;
    }
    if (inRules && line.trim().startsWith("- ")) {
      rules.push(line.trim().slice(2).trim());
    }
  }

  return {
    id,
    title: meta.title || id,
    themes: Array.isArray(meta.themes) ? meta.themes : [],
    abilities: Array.isArray(meta.abilities) ? meta.abilities : [],
    stage: Array.isArray(meta.stage) ? meta.stage : [],
    type: meta.type || "框架模型",
    entities: Array.isArray(meta.entities) ? meta.entities : [],
    useWhen: (meta.use_when || "").trim(),
    oneLiner: oneLiner.trim(),
    situations,
    rules,
    rawContent: content,
  };
}

async function main() {
  console.log(`Starting sync from: ${NOTES_DIR}...`);

  if (!fs.existsSync(NOTES_DIR)) {
    console.error(`Notes directory not found: ${NOTES_DIR}`);
    process.exit(1);
  }

  // 1. 确保数据库表存在
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS playbooks (
        id text PRIMARY KEY,
        title text NOT NULL,
        themes_json text NOT NULL,
        abilities_json text NOT NULL,
        stage_json text NOT NULL,
        type text NOT NULL,
        entities_json text NOT NULL,
        use_when text NOT NULL,
        one_liner text,
        situations_json text,
        rules_json text,
        raw_content text NOT NULL,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("PostgreSQL playbooks table verified.");
  } catch (err: any) {
    console.warn("Table creation check warning:", err.message);
  }

  // 2. 遍历所有 Markdown 文件
  const files = fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_") && !f.startsWith("."));

  console.log(`Found ${files.length} markdown notes to parse.`);

  const parsedList: ParsedPlaybook[] = [];

  for (const f of files) {
    const filePath = path.join(NOTES_DIR, f);
    const pb = parseMarkdownNote(filePath);
    if (pb) {
      parsedList.push(pb);
    }
  }

  console.log(`Successfully parsed ${parsedList.length} playbooks.`);

  // 3. 批量持久化至数据库
  console.log("Upserting playbooks into database...");
  for (const item of parsedList) {
    await db
      .insert(playbooks)
      .values({
        id: item.id,
        title: item.title,
        themesJson: JSON.stringify(item.themes),
        abilitiesJson: JSON.stringify(item.abilities),
        stageJson: JSON.stringify(item.stage),
        type: item.type,
        entitiesJson: JSON.stringify(item.entities),
        useWhen: item.useWhen,
        oneLiner: item.oneLiner,
        situationsJson: JSON.stringify(item.situations),
        rulesJson: JSON.stringify(item.rules),
        rawContent: item.rawContent,
      })
      .onConflictDoUpdate({
        target: playbooks.id,
        set: {
          title: item.title,
          themesJson: JSON.stringify(item.themes),
          abilitiesJson: JSON.stringify(item.abilities),
          stageJson: JSON.stringify(item.stage),
          type: item.type,
          entitiesJson: JSON.stringify(item.entities),
          useWhen: item.useWhen,
          oneLiner: item.oneLiner,
          situationsJson: JSON.stringify(item.situations),
          rulesJson: JSON.stringify(item.rules),
          rawContent: item.rawContent,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`All ${parsedList.length} playbooks stored in PostgreSQL.`);

  // 4. 写入本地极速缓存
  const cacheDir = path.dirname(CACHE_OUT);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(CACHE_OUT, JSON.stringify(parsedList, null, 2), "utf-8");
  console.log(`Playbooks cache saved to: ${CACHE_OUT}`);

  console.log("🎉 Sync completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
