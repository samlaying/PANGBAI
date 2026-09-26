/**
 * PANGBAI · 飞书聊天记录多维导出脚本
 *
 * 目标：将黄越（+1）、朱晓天（MT）、袁金龙（研发）的原始聊天记录与结构化Markdown
 * 导出至桌面独立的子文件夹中。
 */

import "../src/server/network/dns-patch";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const USER_TOKEN_PATH = path.join(os.homedir(), ".pangbai", "feishu_user_token.json");
const DESKTOP_DIR = path.join(os.homedir(), "Desktop", "飞书聊天记录");

const USER_MAPPING: Record<string, string> = {
  "ou_1a393a8939ece17b5f6b3841385b5060": "黄越（喜庆儿）[+1]",
  "ou_cf32dafafd2912b09220ba2681577c85": "朱晓天（晓然）[MT]",
  "ou_02306af1bfc014feebff68a67e801287": "袁金龙（瘦头陀）[研发]",
  "ou_0b4759a6b5fd45e3e78b409aa6db303a": "林承列（昀和）[我]",
  "ou_10e4c1559b620ccf269659d962cb67cf": "林玺磊（小异）",
  "ou_53222b43ed7941157d87d1a4e54b32d1": "青桐（张扬）",
  "ou_a97e3a1c5b7ff89568c56021fb3c3eb1": "八宝粥（杨超）",
  "ou_808e56663912b4a466c27f147049f49a": "旅程（王智泉）",
  "ou_f82dcf26c91563d576dbb7e8d8407971": "拜月（李昭刚）",
  "ou_63f0430a6c1d11c22c29f3d1bbee3549": "风华（宋亚旭）",
  "ou_fb0f7f98babcf7057af956fe48ab3446": "文平（蒋文平）",
  "ou_3af247426fbfd3e58c95f4e12b3b7dcf": "摩卡（肖思宇）",
  "ou_84e7d731545f88563c635b9fc62d22cd": "木欣欣（孔可新）",
};

interface TargetPerson {
  key: string;
  name: string;
  folderName: string;
  role: string;
  openId: string;
  keywords: string[];
}

const TARGETS: TargetPerson[] = [
  {
    key: "huang_yue",
    name: "黄越",
    folderName: "黄越_喜庆儿(+1)",
    role: "+1 业务负责人",
    openId: "ou_1a393a8939ece17b5f6b3841385b5060",
    keywords: ["黄越", "喜庆儿"],
  },
  {
    key: "zhu_xiaotian",
    name: "朱晓天",
    folderName: "朱晓天_晓然(MT)",
    role: "MT (产品导师)",
    openId: "ou_cf32dafafd2912b09220ba2681577c85",
    keywords: ["朱晓天", "晓然"],
  },
  {
    key: "yuan_jinlong",
    name: "袁金龙",
    folderName: "袁金龙_瘦头陀(研发)",
    role: "核心研发 / Agent 架构骨干",
    openId: "ou_02306af1bfc014feebff68a67e801287",
    keywords: ["袁金龙", "金龙", "瘦头陀"],
  },
];

function getToken(): string {
  if (!fs.existsSync(USER_TOKEN_PATH)) {
    throw new Error(`Token file not found: ${USER_TOKEN_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(USER_TOKEN_PATH, "utf-8"));
  return data.user_access_token;
}

async function fetchDirect<T>(pathUrl: string, token: string): Promise<T> {
  const res = await fetch(`https://open.feishu.cn${pathUrl}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${pathUrl}`);
  }
  return (await res.json()) as T;
}

async function getAllChats(token: string): Promise<any[]> {
  const chats: any[] = [];
  let pageToken = "";
  do {
    const url = `/open-apis/im/v1/chats?page_size=50${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetchDirect<any>(url, token);
    if (res.code === 0 && res.data?.items) {
      chats.push(...res.data.items);
      pageToken = res.data.has_more ? res.data.page_token : "";
    } else {
      break;
    }
  } while (pageToken);
  return chats;
}

async function getChatMessagesWithPagination(chatId: string, token: string, maxMessages = 150): Promise<any[]> {
  const messages: any[] = [];
  let pageToken = "";
  do {
    const url = `/open-apis/im/v1/messages?container_id_type=chat&container_id=${encodeURIComponent(chatId)}&page_size=50${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetchDirect<any>(url, token);
    if (res.code === 0 && res.data?.items) {
      messages.push(...res.data.items);
      pageToken = res.data.has_more ? res.data.page_token : "";
    } else {
      break;
    }
  } while (pageToken && messages.length < maxMessages);

  // 按时间升序排序
  return messages.sort((a, b) => parseInt(a.create_time, 10) - parseInt(b.create_time, 10));
}

function parseMessageContent(msg: any): string {
  const rawBody = msg.body?.content;
  if (!rawBody) return "(无内容)";

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed.text) {
      return parsed.text;
    }
    if (parsed.title || parsed.content) {
      const parts: string[] = [];
      if (parsed.title) parts.push(`### ${parsed.title}`);
      if (Array.isArray(parsed.content)) {
        for (const row of parsed.content) {
          if (Array.isArray(row)) {
            const line = row
              .map((el) => {
                if (el.tag === "text") return el.text;
                if (el.tag === "a") return `[${el.text || el.href}](${el.href})`;
                if (el.tag === "at") return `@${el.user_name || el.user_id}`;
                if (el.tag === "img") return `[图片:${el.image_key}]`;
                if (el.tag === "code_block") return `\n\`\`\`${el.language || ""}\n${el.text}\n\`\`\`\n`;
                return JSON.stringify(el);
              })
              .join("");
            parts.push(line);
          }
        }
      }
      return parts.join("\n");
    }
    if (parsed.template) {
      return `[系统提示]: ${parsed.template}`;
    }
    return JSON.stringify(parsed);
  } catch {
    return rawBody;
  }
}

function formatSender(msg: any): string {
  const id = msg.sender?.id || "";
  if (USER_MAPPING[id]) {
    return USER_MAPPING[id];
  }
  if (msg.sender?.sender_type === "bot") {
    return `应用机器人 (${msg.sender?.id || "Bot"})`;
  }
  return id || "未知用户";
}

async function main() {
  const token = getToken();
  console.log("1. 获取全量群聊与会话列表...");
  const allChats = await getAllChats(token);
  console.log(`成功获取 ${allChats.length} 个可用会话。`);

  if (!fs.existsSync(DESKTOP_DIR)) {
    fs.mkdirSync(DESKTOP_DIR, { recursive: true });
  }

  for (const target of TARGETS) {
    console.log(`\n======================================================`);
    console.log(`处理目标: ${target.name} (${target.role})`);
    console.log(`======================================================`);

    const targetDir = path.join(DESKTOP_DIR, target.folderName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const matchedChats: Array<{ chat: any; messages: any[] }> = [];

    for (const chat of allChats) {
      // 判断群名是否匹配
      const nameMatch = target.keywords.some((kw) => chat.name?.includes(kw));

      // 抓取聊天消息做深度检测
      try {
        const msgs = await getChatMessagesWithPagination(chat.chat_id, token, 100);
        let hasDirectInteraction = false;

        for (const m of msgs) {
          if (m.sender?.id === target.openId) {
            hasDirectInteraction = true;
            break;
          }
          const str = JSON.stringify(m);
          if (target.keywords.some((kw) => str.includes(kw))) {
            hasDirectInteraction = true;
            break;
          }
        }

        if (nameMatch || hasDirectInteraction) {
          matchedChats.push({ chat, messages: msgs });
          console.log(`  -> 命中会话: 「${chat.name}」(${msgs.length} 条消息)`);
        }
      } catch (err: any) {
        // ignore single chat failure
      }
    }

    console.log(`为 ${target.name} 导出 ${matchedChats.length} 个会话记录...`);

    let indexMd = `# ${target.name} · 飞书原始聊天记录汇总\n\n`;
    indexMd += `- **角色**：${target.role}\n`;
    indexMd += `- **关联 Open ID**：\`${target.openId}\`\n`;
    indexMd += `- **命中会话总数**：${matchedChats.length} 个\n`;
    indexMd += `- **导出时间**：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n\n`;
    indexMd += `## 目录索引\n\n`;

    let totalExportedMsgs = 0;

    for (const { chat, messages } of matchedChats) {
      const safeChatName = (chat.name || "未命名会话")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, "_")
        .slice(0, 50);

      const mdFileName = `${safeChatName}_(${chat.chat_id.slice(-8)}).md`;
      const jsonFileName = `${safeChatName}_(${chat.chat_id.slice(-8)})_raw.json`;

      indexMd += `- [${chat.name}](./${encodeURIComponent(mdFileName)}) （共 ${messages.length} 则记录，原始 JSON: [${jsonFileName}](./${encodeURIComponent(jsonFileName)})）\n`;
      totalExportedMsgs += messages.length;

      // 1. 写入完整原始 JSON
      fs.writeFileSync(
        path.join(targetDir, jsonFileName),
        JSON.stringify(messages, null, 2),
        "utf-8"
      );

      // 2. 写入格式化高可读 Markdown
      let chatMd = `# 会话名称：${chat.name}\n\n`;
      chatMd += `- **Chat ID**：\`${chat.chat_id}\`\n`;
      chatMd += `- **会话类型**：${chat.chat_mode || "group"} (${chat.chat_type || "normal"})\n`;
      chatMd += `- **消息总数**：${messages.length} 条\n`;
      chatMd += `- **导出时间**：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n\n`;
      chatMd += `---\n\n## 对话记录流\n\n`;

      for (const m of messages) {
        const time = new Date(parseInt(m.create_time, 10)).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        const sender = formatSender(m);
        const text = parseMessageContent(m);

        chatMd += `#### 💬 **${sender}** · \`${time}\`\n\n`;
        chatMd += `${text}\n\n`;
        chatMd += `---\n\n`;
      }

      fs.writeFileSync(path.join(targetDir, mdFileName), chatMd, "utf-8");
    }

    indexMd += `\n**合计导出消息量**：${totalExportedMsgs} 条。\n`;
    fs.writeFileSync(path.join(targetDir, "README.md"), indexMd, "utf-8");
  }

  console.log(`\n======================================================`);
  console.log(`🎉 导出完成！所有聊天记录已保存在桌面：`);
  console.log(DESKTOP_DIR);
  console.log(`======================================================`);
}

main().catch(console.error);
