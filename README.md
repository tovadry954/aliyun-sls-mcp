# aliyun-sls-mcp

阿里云日志服务（SLS）的 MCP Server，让 AI 助手（Cursor、Claude Desktop 等）能够直接查询 SLS 日志，辅助开发过程中的问题排查与分析。

**只读模式，不执行任何写入或删除操作。**

[English](./README.en.md) | [GitHub](https://github.com/SuxyEE/aliyun-sls-mcp) | [npm](https://www.npmjs.com/package/aliyun-sls-mcp)

## 功能特性

- **列出项目** — 按地域动态发现所有 SLS Project，无需手动配置项目列表
- **列出日志库** — 浏览 Project 下的所有 Logstore
- **查询日志** — 支持时间范围 + SLS 查询语法过滤，适合错误排查
- **SQL 分析** — 对日志做聚合、统计、分组分析
- **日志分布图** — ASCII 柱状图展示某时间段内的日志量分布，快速定位异常时间窗口
- **上下文日志** — 获取某条日志前后的日志，还原完整执行链路

---

## 快速开始（npx 方式）

> 推荐方式，无需克隆代码，配置完成后即可使用。

### 第一步：获取阿里云 AccessKey

前往 [RAM 访问控制台](https://ram.console.aliyun.com/manage/ak) 创建 AccessKey，并为对应 RAM 用户授予以下权限：

```
AliyunLogReadOnlyAccess
```

### 第二步：配置 MCP

**Cursor**：编辑 `~/.cursor/mcp.json`（Windows: `%USERPROFILE%\.cursor\mcp.json`）

**Claude Desktop**：编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（Windows: `%APPDATA%\Claude\claude_desktop_config.json`）

```json
{
  "mcpServers": {
    "aliyun-sls": {
      "command": "npx",
      "args": ["-y", "aliyun-sls-mcp"],
      "env": {
        "ALIBABA_CLOUD_ACCESS_KEY_ID": "your_access_key_id",
        "ALIBABA_CLOUD_ACCESS_KEY_SECRET": "your_access_key_secret",
        "SLS_REGION": "cn-hangzhou"
      }
    }
  }
}
```

### 第三步：重启 AI 客户端

重启 Cursor 或 Claude Desktop，即可在对话中直接查询 SLS 日志。

---

## 本地开发 / 源码运行

适合希望二次开发或尚未发布到 npm 时使用。

### 克隆并构建

```bash
git clone https://github.com/your-name/aliyun-sls-mcp.git
cd aliyun-sls-mcp
npm install
npm run build
```

### 配置 MCP（本地路径方式）

```json
{
  "mcpServers": {
    "aliyun-sls": {
      "command": "node",
      "args": ["/path/to/aliyun-sls-mcp/dist/index.js"],
      "env": {
        "ALIBABA_CLOUD_ACCESS_KEY_ID": "your_access_key_id",
        "ALIBABA_CLOUD_ACCESS_KEY_SECRET": "your_access_key_secret",
        "SLS_REGION": "cn-hangzhou"
      }
    }
  }
}
```

Windows 路径示例：

```json
"args": ["e:\\tools\\aliyun-sls-mcp\\dist\\index.js"]
```

### 本地验证

```bash
node dist/index.js
# 输出: Aliyun SLS MCP Server running on stdio
```

---

## 环境变量

| 变量名 | 是否必填 | 说明 |
|--------|----------|------|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | ✅ 必填 | 阿里云 AccessKey ID |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | ✅ 必填 | 阿里云 AccessKey Secret |
| `SLS_REGION` | 可选 | 默认地域，如 `cn-hangzhou`。所有工具调用时可通过 `region` 参数单独覆盖 |
| `SLS_NETWORK` | 可选 | 网络类型：`public`（默认，公网）或 `vpc`（VPC 私网） |

> **多地域支持**：只需配置一个默认地域，所有工具均支持通过 `region` 参数动态切换到任意地域的项目，无需为每个地域单独部署。

---

## 可用工具

### `list_projects` — 列出项目

列出指定地域下的所有 SLS Project。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `region` | string | 否 | 地域 ID，默认使用 `SLS_REGION` |

---

### `list_logstores` — 列出日志库

列出某个 Project 下的所有 Logstore。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project` | string | ✅ | SLS Project 名称 |
| `region` | string | 否 | 地域 ID |

---

### `query_logs` — 查询日志

按时间范围和过滤条件查询日志，适合错误排查、接口追踪等场景。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `logstore` | string | ✅ | — | Logstore 名称 |
| `query` | string | 否 | `*` | SLS 查询语句 |
| `time_range` | string | 否 | `15m` | 相对时间范围 |
| `from` | number | 否 | — | 开始时间（Unix 秒），优先于 `time_range` |
| `to` | number | 否 | — | 结束时间（Unix 秒） |
| `max_logs` | number | 否 | `50` | 最多返回条数（1-500） |
| `region` | string | 否 | — | 地域 ID |

**时间范围格式：** `1m` `5m` `15m` `30m` `1h` `2h` `6h` `12h` `1d` `3d` `7d`

**SLS 查询语法示例：**

```
*                              # 所有日志
level: ERROR                   # 错误级别日志
content: timeout               # 包含 timeout 的日志
level: ERROR AND status: 500   # 组合条件
NOT level: INFO                # 排除 INFO 日志
requestId: abc-123             # 按请求 ID 追踪
```

---

### `query_logs_sql` — SQL 分析

对日志执行 SQL 查询，支持聚合、统计、分组，适合趋势分析和问题统计。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `query` | string | ✅ | — | SQL 语句，FROM 子句指定 Logstore 名称 |
| `time_range` | string | 否 | `1h` | 时间范围 |
| `from` | number | 否 | — | 开始时间（Unix 秒） |
| `to` | number | 否 | — | 结束时间（Unix 秒） |
| `region` | string | 否 | — | 地域 ID |

**SQL 示例：**

```sql
-- 按函数名统计调用量
SELECT functionName, count(*) as total
FROM default-logs
WHERE __time__ > 1700000000
GROUP BY functionName
ORDER BY total DESC

-- 统计各状态码数量
SELECT statusCode, count(*) as cnt
FROM default-logs
WHERE __time__ > 1700000000 AND statusCode != ''
GROUP BY statusCode
ORDER BY cnt DESC
```

---

### `get_log_histogram` — 日志分布图

获取某段时间内日志量的分钟级分布，以 ASCII 柱状图展示，用于快速定位流量异常或错误高峰时间点。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `logstore` | string | ✅ | — | Logstore 名称 |
| `query` | string | 否 | `*` | 过滤条件 |
| `time_range` | string | 否 | `1h` | 时间范围 |
| `from` | number | 否 | — | 开始时间（Unix 秒） |
| `to` | number | 否 | — | 结束时间（Unix 秒） |
| `region` | string | 否 | — | 地域 ID |

**输出示例：**

```
2026/3/19 11:03:00  ███████████████████░░░░░░░░░░░  1996
2026/3/19 11:04:00  ███████████████████████░░░░░░░  2379  ← 流量高峰
2026/3/19 11:05:00  ████████████████░░░░░░░░░░░░░░  1670
```

---

### `get_context_logs` — 上下文日志

获取某条日志前后的若干条日志，还原事件发生前后的完整执行链路。

> 需要日志包含 `__tag__:__pack_meta__` 字段。阿里云 FC 函数计算的日志通常没有该字段，可改用 `query_logs` 按 `__tag__:__pack_id__` 过滤同一批次的日志。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `logstore` | string | ✅ | — | Logstore 名称 |
| `pack_id` | string | ✅ | — | 目标日志的 `__tag__:__pack_id__` 字段值 |
| `pack_meta` | string | ✅ | — | 目标日志的 `__tag__:__pack_meta__` 字段值 |
| `back_lines` | number | 否 | `10` | 向前获取的条数（最大 100） |
| `forward_lines` | number | 否 | `10` | 向后获取的条数（最大 100） |
| `region` | string | 否 | — | 地域 ID |

---

## 对话使用示例

```
列出深圳地域所有 SLS 项目

查询 my-project 项目 app-logs 日志库最近 15 分钟的错误日志

查看 my-project 最近 1 小时的日志量分布，找出流量高峰时间点

统计 my-project 最近 1 小时各函数的调用量

查询 cn-shanghai 地域 payment-project 项目 order-logs 中包含 timeout 的日志

帮我排查 2026-03-19 11:00 到 11:30 之间 xyjapi 函数出现的 SLOW SQL 问题
```

---

## 支持的地域

### 亚太

| 地域名称 | 地域 ID |
|----------|---------|
| 华北1（青岛） | `cn-qingdao` |
| 华北2（北京） | `cn-beijing` |
| 华北3（张家口） | `cn-zhangjiakou` |
| 华北5（呼和浩特） | `cn-huhehaote` |
| 华北6（乌兰察布） | `cn-wulanchabu` |
| 华东1（杭州） | `cn-hangzhou` |
| 华东2（上海） | `cn-shanghai` |
| 华东5（南京-本地地域） | `cn-nanjing` |
| 华东6（福州-本地地域） | `cn-fuzhou` |
| 华南1（深圳） | `cn-shenzhen` |
| 华南2（河源） | `cn-heyuan` |
| 华南3（广州） | `cn-guangzhou` |
| 西南1（成都） | `cn-chengdu` |
| 中国香港 | `cn-hongkong` |
| 日本（东京） | `ap-northeast-1` |
| 韩国（首尔） | `ap-northeast-2` |
| 新加坡 | `ap-southeast-1` |
| 马来西亚（吉隆坡） | `ap-southeast-3` |
| 印度尼西亚（雅加达） | `ap-southeast-5` |
| 菲律宾（马尼拉） | `ap-southeast-6` |
| 泰国（曼谷） | `ap-southeast-7` |

### 欧洲与美洲

| 地域名称 | 地域 ID |
|----------|---------|
| 美国（硅谷） | `us-west-1` |
| 美国（弗吉尼亚） | `us-east-1` |
| 美国（亚特兰大） | `us-southeast-1` |
| 德国（法兰克福） | `eu-central-1` |
| 英国（伦敦） | `eu-west-1` |

### 中东

| 地域名称 | 地域 ID |
|----------|---------|
| 沙特（利雅得） | `me-central-1` |
| 阿联酋（迪拜） | `me-east-1` |

### 行业云

| 地域名称 | 地域 ID |
|----------|---------|
| 华北2 金融云 | `cn-beijing-finance-1` |
| 华东1 金融云 | `cn-hangzhou-finance` |
| 华东2 金融云 | `cn-shanghai-finance-1` |
| 华南1 金融云 | `cn-shenzhen-finance-1` |
| 河源专属云（汽车合规） | `cn-heyuan-acdr-1` |

> 完整接入点列表参见[阿里云 SLS 服务接入点文档](https://help.aliyun.com/zh/sls/developer-reference/service-entrance)。

---

## 技术栈

- **语言**：TypeScript
- **运行时**：Node.js >= 18
- **MCP SDK**：`@modelcontextprotocol/sdk` ^1.27.1
- **SLS SDK**：`@alicloud/sls20201230` ^5.9.0

## 本地开发

```bash
npm install        # 安装依赖
npm run dev        # 监听变化自动编译
npm run build      # 构建
npm start          # 运行
```

## License

MIT
