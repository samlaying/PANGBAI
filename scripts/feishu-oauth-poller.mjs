import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as https from "node:https";

const deviceCode = process.argv[2];
const intervalSec = parseInt(process.argv[3] || "5", 10);
const maxAttempts = parseInt(process.argv[4] || "60", 10); // 5 min timeout

if (!deviceCode) {
  console.error("Missing deviceCode argument");
  process.exit(1);
}

const tokenPath = path.join(os.homedir(), ".pangbai", "feishu_user_token.json");
const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error("FEISHU_APP_ID and FEISHU_APP_SECRET are required");
}

console.log(`[OAuth Poller] Started polling for device code: ${deviceCode.slice(0, 15)}...`);

function poll() {
  return new Promise((resolve) => {
    const postData = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: appId,
      client_secret: appSecret,
      device_code: deviceCode,
    }).toString();

    const req = https.request(
      {
        host: "101.47.85.10",
        port: 443,
        path: "/oauth/v3/token",
        method: "POST",
        servername: "accounts.feishu.cn",
        headers: {
          Host: "accounts.feishu.cn",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve({ error: "json_parse_error", raw: data });
          }
        });
      }
    );

    req.on("error", (err) => resolve({ error: err.message }));
    req.write(postData);
    req.end();
  });
}

let attempt = 0;
const timer = setInterval(async () => {
  attempt++;
  const res = await poll();

  if (res.access_token) {
    clearInterval(timer);
    const tokenData = {
      user_access_token: res.access_token,
      refresh_token: res.refresh_token,
      expires_in: res.expires_in,
      obtained_at: new Date().toISOString(),
    };
    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2), "utf-8");
    console.log(`[OAuth Poller] SUCCESS! user_access_token received and saved to ${tokenPath}`);
    process.exit(0);
  }

  if (res.error === "authorization_pending") {
    if (attempt % 3 === 0) {
      console.log(`[OAuth Poller] Waiting for user authorization... (attempt ${attempt}/${maxAttempts})`);
    }
  } else if (res.error) {
    console.warn(`[OAuth Poller] Server response:`, res.error, res.error_description || "");
    if (res.error !== "slow_down") {
      clearInterval(timer);
      process.exit(1);
    }
  }

  if (attempt >= maxAttempts) {
    clearInterval(timer);
    console.warn("[OAuth Poller] Polling timed out (5 minutes).");
    process.exit(2);
  }
}, intervalSec * 1000);
