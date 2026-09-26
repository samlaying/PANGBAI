/**
 * PANGBAI · 服务端直连网络补丁 (DNS Direct Resolver Patch)
 *
 * 解决在本地开启 Clash / TUN 代理环境下，
 * 访问国内高可用云服务（SiliconFlow 大模型网关、飞书开放平台）
 * 被 TUN Fake-IP (28.0.0.x) 劫持重置 (ECONNRESET) 的常见网络顽疾。
 */

const DOMAIN_IP_MAP: Record<string, string> = {
  "api.siliconflow.cn": "47.239.184.63",
  "open.feishu.cn": "71.18.1.161",
  "accounts.feishu.cn": "101.47.85.10",
};

let isPatched = false;

export function ensureDirectDnsPatch(): void {
  if (isPatched) return;
  isPatched = true;

  try {
    // 动态引入底层 CJS dns 模块以绕过 ESM 命名空间只读 getter 限制
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("node:dns");
    const originalLookup = dns.lookup.bind(dns);

    type LookupOptions = { all?: boolean } | number | undefined;
    type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void;
    dns.lookup = (
      hostname: string,
      options: LookupOptions | LookupCallback,
      callback?: LookupCallback
    ) => {
      let cb = callback;
      let opt = options;
      if (typeof options === "function") {
        cb = options;
        opt = {};
      }

      if (!cb) return originalLookup(hostname, opt, callback);

      const directIp = DOMAIN_IP_MAP[hostname];
      if (directIp) {
        if (typeof opt === "object" && opt?.all) {
          return cb(null, [{ address: directIp, family: 4 }]);
        }
        return cb(null, directIp, 4);
      }

      return originalLookup(hostname, opt, cb);
    };
  } catch (err) {
    console.warn("ensureDirectDnsPatch failed to hook node:dns:", err);
  }
}

// 自动加载生效
ensureDirectDnsPatch();
