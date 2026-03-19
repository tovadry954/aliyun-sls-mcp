# aliyun-sls-mcp

阿里云日志服务（SLS）的 MCP Server，让 AI 助手（Cursor、Claude Desktop 等）能够直接查询 SLS 日志，辅助开发过程中的问题排查与分析。

**只读模式，不执行任何写入或删除操作。**

[![npm version](https://img.shields.io/npm/v/aliyun-sls-mcp.svg)](https://www.npmjs.com/package/aliyun-sls-mcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[GitHub](https://github.com/SuxyEE/aliyun-sls-mcp) | [npm](https://www.npmjs.com/package/aliyun-sls-mcp)

---

## 这是什么？

你有没有遇到过这种情况：线上出了问题，要去阿里云控制台一页页翻日志，又慢又麻烦？

**aliyun-sls-mcp** 让你可以在 Cursor 或 Claude Desktop 的对话框里，直接用自然语言查询 SLS 日志：

> "查一下 my-project 项目最近 15 分钟的错误日志"
>
> "统计一下最近一小时各接口的报错次数"
>
> "帮我排查今天上午 11 点左右 支付服务的 timeout 问题"

AI 会自动调用 SLS API 查出日志，帮你分析问题。

---

## 支持哪些日志来源？

**只要你的服务日志写入了阿里云 SLS，就可以用本工具查询。** 以下是常见场景：

### 函数计算 FC（Function Compute）

阿里云函数计算默认将函数执行日志（包括 `console.log` 输出、错误堆栈、冷启动信息等）持久化到 SLS。

在 FC 控制台 → 函数详情 → 日志，可以看到对应的 SLS Project 和 Logstore，将它们填入对话即可：

```
查询 fc-log-project aliyun-fc-cn-shenzhen-xxx-log logstore 最近 30 分钟内 my-function 函数的错误日志
```

> 注意：FC 日志不包含 `__pack_meta__` 字段，无法使用 `get_context_logs`，可改用 `query_logs` 按请求 ID 或 `__tag__:__pack_id__` 追踪同一次调用的完整日志。

### SAE（Serverless 应用引擎）

SAE 支持将应用的标准输出（stdout/stderr）投递到 SLS。开启后可查询所有实例的日志，无需逐台登录。

在 SAE 控制台 → 应用详情 → 日志管理 → 日志采集，配置投递到 SLS 后，即可通过本工具查询：

```
查询 sae-log-project sae-app-stdout-store 中 my-app 最近 1 小时的日志
```

### ECS / 自建服务

通过阿里云 Logtail 采集器，可以将 ECS 上任意文件日志（如 Nginx 日志、应用日志）采集到 SLS。配置完成后即可查询：

```
查询 my-nginx-project nginx-access-log 中最近 1 小时状态码为 5xx 的请求
```

### 容器服务 ACK（Kubernetes）

ACK 集群可配置将 Pod 日志（容器标准输出）采集到 SLS，支持按 namespace、Pod 名称等字段过滤：

```
查询 k8s-log-project k8s-stdout 中 namespace 为 production，pod 包含 payment 的最近 15 分钟错误日志
```

### API 网关 / SLB / CDN 访问日志

阿里云 API 网关、SLB 负载均衡、CDN 等产品支持将访问日志自动投递到 SLS，可用于分析流量、排查 4xx/5xx 错误：

```
统计 apigw-log-project access-log 最近 1 小时各 API 路径的请求量和平均延迟
```

### RDS / 数据库慢查询日志

RDS 审计日志和慢查询日志也可投递到 SLS，配合 SQL 分析功能可快速定位慢查询：

```
查询 rds-log-project rds-slowquery-log 最近 1 天执行时间超过 1 秒的慢 SQL，按执行次数排序
```

---

## 功能特性

- **列出项目** — 支持同时查询多个地域，自动发现所有 SLS Project
- **列出日志库** — 浏览 Project 下的所有 Logstore
- **查询日志** — 支持时间范围 + SLS 查询语法过滤，适合错误排查
- **SQL 分析** — 对日志做聚合、统计、分组分析
- **日志分布图** — 展示某时间段内的日志量分布，快速定位异常时间窗口
- **上下文日志** — 获取某条日志前后的日志，还原完整执行链路

---

## 快速开始

### 第一步：获取阿里云 AccessKey

AccessKey 是访问阿里云 API 的凭证，类似账号密码，请妥善保管，不要泄露。

1. 打开 [阿里云 RAM 访问控制台](https://ram.console.aliyun.com/manage/ak)
2. 点击「创建 AccessKey」
3. 记下 **AccessKey ID** 和 **AccessKey Secret**（Secret 只显示一次，请立即保存）

> **最佳实践**：建议创建一个子 RAM 用户，只授予 `AliyunLogReadOnlyAccess` 权限，而不是使用主账号的 AccessKey，这样即使 Key 泄露也不会影响其他服务。

---

### 第二步：配置 MCP Server

根据你使用的 AI 工具，找到对应的配置文件并编辑：

**Cursor**

| 系统 | 配置文件路径 |
|------|-------------|
| Windows | `%USERPROFILE%\.cursor\mcp.json` |
| macOS / Linux | `~/.cursor/mcp.json` |

**Claude Desktop**

| 系统 | 配置文件路径 |
|------|-------------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |

在配置文件中添加以下内容（如果文件不存在就新建，如果已有内容就在 `mcpServers` 里追加）：

```json
{
  "mcpServers": {
    "aliyun-sls": {
      "command": "npx",
      "args": ["-y", "aliyun-sls-mcp"],
      "env": {
        "ALIBABA_CLOUD_ACCESS_KEY_ID": "你的AccessKeyId",
        "ALIBABA_CLOUD_ACCESS_KEY_SECRET": "你的AccessKeySecret",
        "SLS_REGIONS": "cn-hangzhou,cn-shenzhen"
      }
    }
  }
}
```

**把以下内容替换成你自己的：**

- `你的AccessKeyId` → 第一步获取的 AccessKey ID
- `你的AccessKeySecret` → 第一步获取的 AccessKey Secret  
- `cn-hangzhou,cn-shenzhen` → 你的 SLS 数据所在地域，多个用英文逗号分隔，只有一个地域也可以直接填单个，如 `cn-shenzhen`

**地域 ID 怎么查？**

登录 [阿里云 SLS 控制台](https://sls.console.aliyun.com/)，进入你的 Project，URL 里会有地域信息，如 `cn-shenzhen`。也可以参考本文末尾的[支持地域列表](#支持的地域)。

---

### 第三步：重启 AI 客户端

保存配置文件后，**完全退出**并重新打开 Cursor 或 Claude Desktop。

重启后，在对话框输入以下内容验证是否配置成功：

```
帮我列出所有 SLS 项目
```

如果返回了你的项目列表，说明配置成功！

---

## 环境变量说明

| 变量名 | 是否必填 | 说明 |
|--------|----------|------|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | ✅ 必填 | 阿里云 AccessKey ID |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | ✅ 必填 | 阿里云 AccessKey Secret |
| `SLS_REGIONS` | 可选 | 地域配置，多个用英文逗号分隔，单个直接填写即可。如 `cn-hangzhou` 或 `cn-hangzhou,cn-shenzhen,cn-beijing`。不填默认使用 `cn-hangzhou` |
| `SLS_NETWORK` | 可选 | 网络类型：`public`（默认，公网）或 `vpc`（VPC 内网，适合服务器部署） |

---

## 对话使用示例

配置成功后，你可以用自然语言告诉 AI 你想做什么，AI 会自动调用合适的工具：

**发现资源**

```
列出所有 SLS 项目（会查询所有配置的地域）

列出深圳地域的 SLS 项目

列出 my-project 项目下所有的日志库
```

**查询日志**

```
查询 my-project 项目 app-logs 日志库最近 15 分钟的错误日志

查找 order-service 最近 1 小时内包含 "timeout" 的日志

查询 cn-shanghai 地域 payment-project 项目 order-logs 中最近 30 分钟的日志
```

**统计分析**

```
统计 my-project 最近 1 小时各接口的报错次数，按数量排序

查看 my-project app-logs 最近 1 小时的日志量分布，找出流量高峰时间点

统计今天各函数的调用量和平均耗时
```

**问题排查**

```
帮我排查 2026-03-19 11:00 到 11:30 之间 payment 函数出现的 SLOW SQL 问题

查一下刚才那条报错日志的前后 20 条日志，看看完整的执行链路
```

---

## 可用工具详情

### `list_projects` — 列出项目

列出一个或多个地域下的所有 SLS Project。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `regions` | string 或 string[] | 否 | 地域 ID，支持单个字符串或数组。不填则查询 `SLS_REGIONS` / `SLS_REGION` 配置的所有地域 |

---

### `list_logstores` — 列出日志库

列出某个 Project 下的所有 Logstore。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project` | string | ✅ | SLS Project 名称 |
| `region` | string | 否 | 地域 ID，不填则使用默认地域 |

---

### `query_logs` — 查询日志

按时间范围和过滤条件查询日志，适合错误排查、接口追踪等场景。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `logstore` | string | ✅ | — | Logstore 名称 |
| `query` | string | 否 | `*` | SLS 查询语句（见下方示例） |
| `time_range` | string | 否 | `15m` | 相对时间范围，如 `15m`、`1h`、`1d` |
| `from` | number | 否 | — | 开始时间（Unix 时间戳，秒），与 `to` 同时使用，优先级高于 `time_range` |
| `to` | number | 否 | — | 结束时间（Unix 时间戳，秒） |
| `max_logs` | number | 否 | `50` | 最多返回条数（1-500） |
| `region` | string | 否 | — | 地域 ID |

**时间范围格式：** `1m` `5m` `15m` `30m` `1h` `2h` `6h` `12h` `1d` `3d` `7d`

**SLS 查询语法示例：**

```
*                              # 所有日志
level: ERROR                   # 错误级别日志
content: timeout               # 包含 timeout 的日志
level: ERROR AND status: 500   # 组合条件（AND 连接）
level: ERROR OR level: WARN    # 任一条件（OR 连接）
NOT level: INFO                # 排除 INFO 日志
requestId: "abc-123-xyz"       # 按请求 ID 追踪
```

---

### `query_logs_sql` — SQL 分析

对日志执行 SQL 查询，支持聚合、统计、分组，适合趋势分析和问题统计。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project` | string | ✅ | — | SLS Project 名称 |
| `query` | string | ✅ | — | SQL 语句，FROM 子句填写 Logstore 名称 |
| `time_range` | string | 否 | `1h` | 时间范围 |
| `from` | number | 否 | — | 开始时间（Unix 秒） |
| `to` | number | 否 | — | 结束时间（Unix 秒） |
| `region` | string | 否 | — | 地域 ID |

**SQL 示例：**

```sql
-- 统计各函数调用量，按数量降序
SELECT functionName, count(*) as total
FROM my-logstore
GROUP BY functionName
ORDER BY total DESC

-- 统计各状态码数量
SELECT statusCode, count(*) as cnt
FROM my-logstore
WHERE statusCode != ''
GROUP BY statusCode
ORDER BY cnt DESC

-- 统计最近 1 小时每分钟的日志量趋势
SELECT date_trunc('minute', __time__) as t, count(*) as cnt
FROM my-logstore
GROUP BY t
ORDER BY t
```

---

### `get_log_histogram` — 日志分布图

获取某段时间内日志量的分布，用于快速定位流量异常或错误高峰时间点。

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

> **注意**：此工具需要日志包含 `__tag__:__pack_meta__` 字段。阿里云函数计算（FC）的日志通常没有该字段，可以改用 `query_logs` 按 `__tag__:__pack_id__` 过滤同一批次的日志来达到类似效果。

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

## 常见问题

**Q：配置后 AI 说连不上 / 工具调用失败？**

1. 检查 AccessKey ID 和 Secret 是否填写正确，注意不要有多余空格
2. 检查地域 ID 是否正确（如深圳是 `cn-shenzhen`，不是 `shenzhen`）
3. 确认 RAM 用户已授予 `AliyunLogReadOnlyAccess` 权限
4. 确保 Node.js >= 18 已安装（命令行执行 `node -v` 检查）
5. 完全重启 Cursor 或 Claude Desktop

**Q：提示 "No SLS projects found" 但我确实有项目？**

可能是地域填错了。登录 SLS 控制台确认你的 Project 所在地域，然后告诉 AI：

```
查询 cn-shenzhen 地域的 SLS 项目
```

**Q：`SLS_REGIONS` 只能填一个地域吗？**

不是，`SLS_REGIONS` 同时支持单个或多个地域：

```
# 单个地域
SLS_REGIONS=cn-shenzhen

# 多个地域（英文逗号分隔）
SLS_REGIONS=cn-shenzhen,cn-hangzhou,cn-beijing
```

不填时默认使用 `cn-hangzhou`。

**Q：查不到 FC 函数计算的上下文日志？**

FC 日志不包含 `__pack_meta__` 字段，无法使用 `get_context_logs`。可以这样替代：

```
查询 my-project fc-logs 中 __tag__:__pack_id__ 为 "xxx" 的所有日志
```

---

## 本地开发 / 源码运行

适合希望二次开发的用户。

```bash
git clone https://github.com/SuxyEE/aliyun-sls-mcp.git
cd aliyun-sls-mcp
npm install
npm run build
```

配置 MCP 时使用本地路径：

```json
{
  "mcpServers": {
    "aliyun-sls": {
      "command": "node",
      "args": ["e:\\tools\\aliyun-sls-mcp\\dist\\index.js"],
      "env": {
        "ALIBABA_CLOUD_ACCESS_KEY_ID": "你的AccessKeyId",
        "ALIBABA_CLOUD_ACCESS_KEY_SECRET": "你的AccessKeySecret",
        "SLS_REGIONS": "cn-hangzhou"
      }
    }
  }
}
```

开发命令：

```bash
npm run dev    # 监听文件变化，自动重新编译
npm run build  # 构建一次
npm start      # 运行（用于验证启动是否正常）
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
- **MCP SDK**：`@modelcontextprotocol/sdk`
- **SLS SDK**：`@alicloud/sls20201230`

## License

MIT
