# VoiceRights Vault Aleo 参赛实施规划

> 文档状态：V1.0
> 更新日期：2026-08-05
> 参赛活动：Aleo Hackathon 2026
> 推荐赛道：AI × Privacy
> 项目提交截止：2026-08-14 23:59
> 最终状态：产品、公共 Testnet、真实 AI 服务、公开视频、公共 HTTPS 与提交均已完成
>
> Public demo: https://voice-rights-vault.onrender.com
>
> Repository: https://github.com/Chengyuann/voice-rights-vault
>
> 以下正文保留为项目从规划到交付的实施记录；顶部状态为当前最终结果。

---

## 0. 当前进度快照

更新时间：2026-08-05

按第 16 节的 15 个时间节点计算：

```text
交付里程碑：15 / 15
公共 Testnet 交易：6 / 6 accepted
公开浏览器主流程：passed
交付状态：PUBLIC + SUBMITTED
```

当前已提前完成：

- 三个私有 Record 与核心 Leo 接口；
- 11 / 11 Leo 单测；
- 本地 devnode 部署、额度消费、防重放、用途不匹配、额度耗尽和撤销证据；
- register / issue / use / publish_receipt 的真实本地 proof；
- `publish_receipt` 与最小公开 commitment mapping；
- Shield Wallet Adapter、五个 transition 提交和 accepted 状态门禁；
- `voice_rights_v1.aleo` 公共 Testnet accepted 部署和 Explorer 链接；
- register / issue / use / publish / revoke 五笔公共 Testnet accepted 交易；
- Creator / Licensee / Verifier 三角色浏览器工作台；
- 浏览器本地 SHA-256 与 salted commitment 演示；
- 规则优先的 Policy Agent 交互模拟；
- 30 / 30 Policy 回归用例与 8 / 8 Leo 隐私检查；
- 五类失败场景：政治、金融冒充、过期、额度耗尽、撤销；
- UsageReceipt 门禁后的真实 CosyVoice、音频播放和 Manifest 下载；
- 选择性披露验证界面、隐私边界图和实施进度看板；
- 桌面、平板和移动端适配。

最终交付包含：

1. Shield Wallet 官方 adapter 与 app-side 交易兼容证据；
2. ASR consent + one-time challenge Voice Identity Service；
3. Architecture / Threat Model / Privacy / Operations 文档；
4. 80.73 秒 Demo 视频、公共 HTTPS URL 和 HackAgent 提交。

说明：

> 当前网页提供稳定的浏览器产品流，并已集成 Shield Wallet 交易模式；公共
> Testnet、Explorer 交易、本地 proof、Bailian ASR、Qwen Policy Agent、
> CosyVoice 和外部 Verifier 证据均可验证。

---

## 1. 执行摘要

### 1.1 项目名称

**VoiceRights Vault**

中文名：

> 私密声音肖像许可库

报名沿用名称时可写为：

> **OmniBetter: VoiceRights Vault**

### 1.2 一句话定义

VoiceRights Vault 是构建在 Aleo 上的 AI 声音许可 Agent。它帮助声音创作者签发私有、限定用途、可计次、可过期、可撤销的 AI 声音使用许可；每次生成必须消费有效许可，同时不公开原始声音样本、买方身份、价格、使用范围和剩余次数。

### 1.3 核心问题

AI 声音克隆正在把人的声音变成可复制的数字资产，但现有流程通常存在以下问题：

1. 声音授权只存在于平台条款、邮件或线下合同中，机器无法直接验证。
2. 一次授权容易被复制成无限次使用。
3. 创作者无法精细限制用途、期限、次数和可使用的模型。
4. 买方不希望公开项目、报价和商业用途。
5. 创作者不希望公开完整声纹、训练样本和客户名单。
6. 跨平台迁移时，许可状态和历史用量无法被独立验证。
7. 音频水印或内容来源只能说明“文件从哪里来”，不能单独证明“本次使用获得了什么许可”。

本项目要解决的不是新的 TTS 模型，而是：

> 如何把 AI 声音使用权变成一个默认私密、可以被程序消费、不可重复使用且可选择性证明的数字许可。

### 1.4 Aleo 不可替代性

本项目不是把许可哈希存到链上。Aleo 直接承载许可的私有状态：

- `VoiceIdentity`：声音创作者私有持有的声音身份凭证；
- `VoiceLicense`：买方私有持有的使用许可证；
- `UsageReceipt`：一次合法生成产生的私有使用凭证；
- `Revocation`：公开最小撤销状态或撤销根；
- Record 消费：防止同一使用额度被重复使用；
- ZK 执行：验证用途、期限、次数和策略，但不公开私有条款。

如果移除 Aleo，系统将退化成一个中心化许可数据库，无法同时提供：

- 私有所有权；
- 不可重放的计次许可；
- 跨平台可验证性；
- 最小披露；
- 不依赖单个平台的授权状态。

### 1.5 获奖主张

> 现有 AI Voice 平台解决“如何克隆声音”，VoiceRights Vault 解决“谁在什么条件下有权使用这段声音”。它将声音肖像许可建模为 Aleo 私有 Record，让 AI Agent 在不看到完整商业条款的情况下，也能证明一次生成是被授权的。

---

## 2. 赛题匹配

### 2.1 推荐赛道

首选：

> **AI × Privacy**

原因：

- AI 声音模型是产品入口；
- 声音本身同时属于生物特征、人格权益和商业资产；
- Aleo 可编程隐私直接控制 AI 是否允许生成；
- 产品展示的是 AI Agent 的隐私权限，而非普通资产铸造。

不建议首选：

- `Payments`：MVP 不做真实版税结算；
- `GameFi & SocialFi`：游戏 NPC、虚拟主播是使用场景，不是产品主体；
- `Infrastructure`：项目提供协议能力，但首先是用户产品。

### 2.2 官方要求映射

| 官方期待 | VoiceRights Vault 响应 |
|---|---|
| 围绕 Aleo、ZK、隐私计算 | 许可、用量与收据均以 Aleo 私有 Record 建模 |
| AI × Privacy | AI Voice Agent 只有在许可证明通过后才能生成 |
| 真实使用场景 | 配音演员、游戏 NPC、虚拟主播、品牌语音和有声内容 |
| 不只是技术 Demo | 提供创作者、买方、验证者三端完整流程 |
| 合理使用 Aleo | 使用 Record 所有权、消费、防重放、签名和公开撤销状态 |
| 可演示原型 | 展示签发、合法使用、越权拒绝、计次、过期和撤销 |
| 长期潜力 | 平台无关许可层，可接入多个 TTS 与内容平台 |

### 2.3 项目定位边界

本项目不是：

- 新的 TTS 基础模型；
- 声音 NFT 图片市场；
- 仅把合同哈希写链；
- 仅做深伪检测；
- 仅做音频水印；
- 自动判断合同法律效力的系统；
- 保证生成内容一定合法的系统。

本项目是：

> AI 声音生成前的机器可验证许可层，以及生成后的私有使用凭证层。

---

## 3. 市场与竞品调研

### 3.1 现有 AI Voice 平台

| 方案 | 已解决能力 | 主要缺口 |
|---|---|---|
| ElevenLabs Voice Library | Professional Voice Clone、声音验证、共享、内容审核、按使用量补偿 | 许可状态依赖单一平台；买方、报价、范围和剩余额度不能跨平台私密验证 |
| Voice-Swap | 艺术家声音模型、审批式生成、按使用付费 | 主要服务音乐生态；授权执行由平台控制 |
| Kits AI | Artist Voices、声音训练和生成工作流 | 平台内许可，缺乏跨平台私有凭证 |
| Veritone Voice | 企业级合成声音与声音授权服务 | 偏中心化 B2B 合约和平台交付 |
| Story Protocol | 可编程 IP 注册、许可和版税 | 偏公开 IP 图谱；不是默认私有的声音许可和用量状态 |
| C2PA / Content Credentials | 内容来源、签名和编辑历史 | 能证明来源，不等价于证明具体许可条款与剩余使用权 |

### 3.2 市场空位

VoiceRights Vault 补的是：

```text
已验证声音身份
       ↓
默认私有的使用许可
       ↓
生成前机器验证
       ↓
使用一次即消费一次额度
       ↓
私有使用收据
       ↓
必要时选择性公开“已授权”
```

差异化重点：

1. 平台无关，而非某个 TTS 产品内部功能；
2. 默认私有，而非把客户、价格和条款公开在 IP 图谱中；
3. 许可是可消费状态，而非静态签名文件；
4. 支持选择性公开证明，不要求公开完整许可证；
5. 许可验证位于生成之前，而不是侵权发生后的检测。

### 3.3 法律与制度边界

规划参考的制度信号：

- 美国版权局已将数字复制品中的声音与形象问题作为独立 AI 议题研究；
- 演员工会协议持续强调数字替身的知情同意、补偿和控制；
- 美国多地围绕声音和肖像的 AI 使用建立或讨论保护机制；
- 行业正在形成“同意、用途、期限、补偿、撤销、可追踪”的共同框架。

产品不得宣称：

- Aleo 凭证自动构成所有司法辖区的有效合同；
- 钱包持有人必然是真实声音本人；
- 声纹模型输出是法律身份认证；
- 许可证明可以替代内容审核；
- 链上状态可以撤回已经分发的音频文件。

正确表达：

> VoiceRights Vault 提供可验证的技术授权状态和使用凭证；法律身份验证、合同文本、内容审核和争议解决由外部服务或人工流程承担。

---

## 4. 用户与核心旅程

### 4.1 用户角色

#### 声音创作者 Creator

包括：

- 配音演员；
- 主播和播客创作者；
- 歌手和音乐人；
- 虚拟人背后的声音所有者；
- 品牌专属声音持有人；
- 普通用户。

目标：

- 控制谁能使用声音；
- 控制用途、次数、期限和模型；
- 隐藏客户与报价；
- 获得可验证使用记录；
- 随时停止新许可。

#### 使用方 Licensee

包括：

- 游戏工作室；
- 动画和有声内容团队；
- 广告制作方；
- 虚拟主播运营方；
- AI 应用开发者。

目标：

- 证明自己获得授权；
- 隐藏未发布项目和商业报价；
- 在许可额度内自动生成；
- 向平台或发行方出示最小证明。

#### 验证方 Verifier

包括：

- 内容平台；
- 游戏发行方；
- 广告审核方；
- 创作者经纪公司；
- 争议处理机构。

目标：

- 确认内容生成时存在有效许可；
- 不读取完整合同和商业隐私；
- 检查许可是否已撤销或过期。

### 4.2 核心用户故事

#### US-01 创建声音身份

**作为**声音创作者，
**我希望**登记经过链下验证的声音身份，
**从而**能够签发与该声音关联的私有许可。

验收条件：

- 原始音频不写入 Aleo；
- 声纹模板不写入公开状态；
- 生成 `VoiceIdentity` 私有 Record；
- 记录身份验证提供方和策略版本的承诺值；
- 同一声音不得被产品 UI 误导性声明为全球唯一。

#### US-02 签发私有许可

**作为**声音创作者，
**我希望**给指定买方签发限定用途和次数的许可，
**从而**不公开客户和商业条款。

验收条件：

- 买方收到 `VoiceLicense` Record；
- 用途、过期时间、次数和策略承诺默认私有；
- 创作者和买方地址不在公共 UI 中公开展示；
- 无效签名不能创建许可。

#### US-03 合法生成

**作为**买方，
**我希望**在生成音频前验证并消费一次许可，
**从而**向平台证明该次生成受到授权。

验收条件：

- 必须持有有效 License Record；
- 生成前检查未过期、未撤销、用途匹配且剩余次数大于零；
- 消费旧 License，生成 `remaining_uses - 1` 的新 License；
- 生成 `UsageReceipt`；
- TTS Adapter 只在许可消费成功后执行。

#### US-04 越权拒绝

**作为**创作者，
**我希望**超范围使用被自动拒绝，
**从而**防止一次游戏授权被用于政治广告或诈骗。

验收条件：

- 用途码不匹配时证明失败；
- 过期许可不能使用；
- 剩余次数为零不能使用；
- 被撤销许可不能使用；
- 失败时不得调用真实或模拟 TTS。

#### US-05 选择性证明

**作为**买方，
**我希望**证明某个音频在生成时拥有许可，
**从而**不公开价格和完整条款。

验收条件：

- 对外证明至少包含 `licensed = true`；
- 可以公开 Voice ID 承诺、用途类别和生成时间区间；
- 不公开买方身份、价格和剩余次数；
- 证明不能用于推断原始声音样本。

---

## 5. MVP 范围

### 5.1 必须完成

1. 创作者、买方、验证者三种演示身份；
2. 合成声音样本与本地声音指纹；
3. `VoiceIdentity` 私有 Record；
4. `VoiceLicense` 私有 Record；
5. 签发许可；
6. 消费一次许可并递减次数；
7. 生成 `UsageReceipt`；
8. 用途不匹配拒绝；
9. 过期拒绝；
10. 次数耗尽拒绝；
11. 撤销后拒绝新使用；
12. 许可通过后调用 Mock 或可替换 TTS Adapter；
13. 前端显示 Aleo 执行状态和隐私字段边界；
14. Leo 编译、单测和至少一条可复查的真实执行证据；
15. README、架构图、Demo 视频和提交材料。

### 5.2 可选增强

- Shield Wallet 或 Aleo Wallet Adapter；
- Testnet 部署与 Explorer 交易；
- C2PA 风格音频来源清单；
- 实际开源 TTS Adapter；
- 私有版税 Receipt；
- 多许可证批量验证；
- 平台 SDK；
- 可撤销列表的 Merkle Root；
- 声音模型提供方签名。

### 5.3 明确不做

- 自研大型 TTS 模型；
- 完整商业声音市场；
- 法律 KYC；
- 真实支付和资金托管；
- 自动判定政治、色情、诈骗等所有内容类别；
- 把完整声纹、音频或模型权重写链；
- 对已经导出的音频执行远程删除；
- 宣称能够百分百阻止盗版或深伪。

---

## 6. 隐私与披露设计

### 6.1 数据分类

| 数据 | 默认位置 | 默认可见性 |
|---|---|---|
| 原始声音样本 | 本地对象存储 | 创作者可见 |
| 声纹向量 | 本地加密存储 | 验证服务可见 |
| Voice ID 承诺 | Aleo Record / 必要时公开映射 | 默认私有 |
| 创作者地址 | Aleo Record | 默认私有 |
| 买方地址 | Aleo Record | 默认私有 |
| 用途 | Aleo Record | 默认私有，可选择性披露类别 |
| 价格 | 链下合同或未来私有支付 | 私有 |
| 剩余次数 | Aleo Record | 私有 |
| 过期时间 | Aleo Record | 私有，可在验证时证明有效 |
| 撤销状态 | Aleo Mapping 或撤销根 | 最小公开 |
| 音频文件 | 本地/对象存储 | 买方可见 |
| Usage Receipt | Aleo Record | 私有，可导出最小证明 |

### 6.2 隐私不变量

1. 链上不得出现原始音频 URL；
2. 链上不得出现可逆声纹模板；
3. 公开事件不得直接暴露买卖双方关系；
4. 默认不得公开许可价格和剩余次数；
5. 使用一次必须产生新的状态，旧许可不可重放；
6. 撤销检查必须发生在 TTS 执行之前；
7. 前端日志不得打印 Record 明文、私钥或 View Key；
8. Demo 素材必须使用合成或已获授权声音。

### 6.3 选择性披露

公开验证最小输出：

```json
{
  "voice_commitment": "field...",
  "authorized": true,
  "purpose_class": "GAME_NPC",
  "generated_before_expiry": true,
  "receipt_commitment": "field..."
}
```

不公开：

```text
creator_address
licensee_address
price
remaining_uses
full_policy
raw_voice_sample
voice_embedding
```

---

## 7. Aleo 数据模型

### 7.1 公共枚举编码

Leo 中采用整数或 field 编码：

```text
Purpose:
1 = GAME_NPC
2 = AUDIOBOOK
3 = VIRTUAL_HOST
4 = ADVERTISING
5 = MUSIC_DEMO
6 = ACCESSIBILITY

Risk flags:
1 = POLITICAL
2 = FINANCIAL_IMPERSONATION
4 = CUSTOMER_SUPPORT_IMPERSONATION
8 = ADULT_CONTENT
```

MVP 仅实现：

- 允许 `GAME_NPC`；
- 禁止 `POLITICAL`；
- 其他类别用于测试。

### 7.2 VoiceIdentity Record

```leo
record VoiceIdentity {
    owner: address,
    voice_commitment: field,
    issuer_commitment: field,
    policy_root: field,
    identity_version: u32,
}
```

说明：

- `owner`：声音创作者；
- `voice_commitment`：链下指纹和随机盐的承诺；
- `issuer_commitment`：验证服务与验证结果的承诺；
- `policy_root`：创作者默认策略；
- 不存原始音频和声纹向量。

### 7.3 VoiceLicense Record

```leo
record VoiceLicense {
    owner: address,
    creator: address,
    voice_commitment: field,
    purpose: u8,
    policy_commitment: field,
    expiry_height: u32,
    remaining_uses: u32,
    revocation_id: field,
    license_nonce: field,
}
```

说明：

- `owner` 为买方；
- 一条许可只能对应一个声音承诺和用途类别；
- `remaining_uses` 通过 Record 消费递减；
- `license_nonce` 防止许可内容碰撞；
- 详细自然语言合同保存在链下，以 `policy_commitment` 绑定。

### 7.4 UsageReceipt Record

```leo
record UsageReceipt {
    owner: address,
    voice_commitment: field,
    purpose: u8,
    content_commitment: field,
    policy_commitment: field,
    used_at_height: u32,
    license_nonce: field,
}
```

默认 owner：

- MVP：买方；
- 增强：同时向创作者生成 CreatorReceipt。

### 7.5 公共状态

```leo
mapping revoked: field => bool;
mapping public_receipts: field => bool;
```

MVP 选择：

- `revoked` 保存撤销 ID 的最小公开状态；
- `public_receipts` 仅在用户主动选择公开证明时写入承诺；
- 不公开完整许可或使用历史。

---

## 8. Leo 合约接口

### 8.1 `register_voice`

输入：

- `voice_commitment`
- `issuer_commitment`
- `policy_root`

输出：

- `VoiceIdentity`

校验：

- caller 成为 owner；
- commitment 不得为零值；
- 身份版本从 1 开始。

### 8.2 `issue_license`

输入：

- `VoiceIdentity`
- `licensee`
- `purpose`
- `policy_commitment`
- `expiry_height`
- `max_uses`
- `revocation_id`
- `license_nonce`

输出：

- 原 `VoiceIdentity` 的更新/保留版本；
- `VoiceLicense`

校验：

- caller 必须控制 VoiceIdentity；
- `max_uses > 0`；
- 过期高度必须晚于当前高度；
- 用途符合创作者默认策略；
- `revocation_id` 不得已撤销。

### 8.3 `use_license`

输入：

- `VoiceLicense`
- `requested_purpose`
- `content_commitment`

输出：

- 剩余次数减一的新 `VoiceLicense`；
- `UsageReceipt`；
- 必要的公开 Final 检查。

校验：

```text
requested_purpose == license.purpose
remaining_uses > 0
block.height <= expiry_height
revoked[revocation_id] != true
content_commitment != 0
```

执行顺序：

```text
钱包提交 use_license
→ Aleo 执行成功
→ 前端获得新 License 和 UsageReceipt
→ 才允许调用 TTS Adapter
```

### 8.4 `revoke_license`

输入：

- `VoiceIdentity`
- `revocation_id`

结果：

- 在公开映射中标记撤销；
- 不公开买方、用途、价格和剩余次数。

MVP 语义：

> 撤销阻止后续生成，但无法删除此前已合法导出的音频。

### 8.5 `publish_receipt`

输入：

- `UsageReceipt`

结果：

- 公开最小 `receipt_commitment`；
- 不公开 Record 其他字段；
- 用于向内容平台证明“生成时持有有效许可”。

### 8.6 合约测试矩阵

| Case | 预期 |
|---|---|
| 正常签发 3 次游戏 NPC 许可 | 成功 |
| 使用一次 | 新许可剩余 2 次，生成 Receipt |
| 重放旧许可 | 失败 |
| 用游戏许可生成政治广告 | 失败 |
| 使用过期许可 | 失败 |
| 使用次数为 0 | 失败 |
| 撤销后使用 | 失败 |
| 非创作者签发许可 | 失败 |
| 空内容承诺 | 失败 |
| 发布最小 Receipt | 成功且不泄露完整条款 |

---

## 9. 链下系统

### 9.1 逻辑架构

```text
┌──────────────────────────────────────────────────┐
│                VoiceRights Web App               │
│ Creator Studio | License Request | Verify Receipt│
└───────────────┬──────────────────────┬───────────┘
                │                      │
┌───────────────▼──────────────┐ ┌─────▼──────────┐
│ Voice Identity Service      │ │ Policy Agent    │
│ sample / liveness / embed   │ │ purpose / risk │
└───────────────┬──────────────┘ └─────┬──────────┘
                │                      │
                └──────────┬───────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│               Aleo License Program              │
│ Identity Record | License Record | Usage Receipt│
└──────────────────────────┬───────────────────────┘
                           │ success
┌──────────────────────────▼───────────────────────┐
│                   TTS Adapter                   │
│ Receipt-gated CosyVoice API                     │
└──────────────────────────┬───────────────────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│ Audio + optional C2PA-style manifest            │
└──────────────────────────────────────────────────┘
```

### 9.2 Voice Identity Service

MVP：

- 使用合成的创作者声音样本；
- 计算音频 SHA-256；
- 可选计算开源 speaker embedding；
- 加随机盐生成 `voice_commitment`；
- 本地保存样本、embedding 和盐；
- 仅把 commitment 交给 Aleo。

不得宣称：

- 仅靠 embedding 能证明真人法律身份；
- 相似度等于授权；
- 声纹不可伪造。

### 9.3 Policy Agent

输入：

```json
{
  "requested_purpose": "GAME_NPC",
  "prompt": "Welcome, traveler.",
  "project": "Demo RPG",
  "license_policy": {}
}
```

输出：

```json
{
  "purpose_code": 1,
  "risk_flags": [],
  "policy_match": true,
  "content_commitment": "field...",
  "explanation": "Allowed under GAME_NPC scope"
}
```

边界：

- Agent 负责分类和解释；
- Aleo 负责验证结构化条件；
- Agent 输出不直接成为法律事实；
- 高风险内容可以被规则直接阻止；
- 不允许 Prompt 覆盖许可证策略。

### 9.4 TTS Adapter

接口：

```typescript
interface TtsAdapter {
  synthesize(input: {
    text: string;
    voiceRef: string;
    authorizationReceipt: string;
  }): Promise<{
    audioPath: string;
    audioHash: string;
    provider: string;
  }>;
}
```

MVP 默认：

- `MockTtsAdapter` 返回预生成、已授权的演示音频；
- 保证 Demo 稳定；
- 真实模型作为可替换增强项。

可选适配：

- 本地开源 TTS；
- 已有合法授权的 TTS API；
- 用户本人声音，仅在明确授权下使用。

### 9.5 Manifest

输出 `manifest.json`：

```json
{
  "audio_sha256": "...",
  "voice_commitment": "...",
  "purpose_class": "GAME_NPC",
  "receipt_commitment": "...",
  "generated_at": "...",
  "provider": "mock-tts",
  "c2pa_status": "not_embedded"
}
```

MVP 不宣称完整 C2PA 合规，只提供兼容方向。

---

## 10. API 契约

### 10.1 `POST /api/voice-identities`

用途：处理样本并准备链上登记。

请求：

```json
{
  "sample_id": "sample_demo_creator",
  "consent_confirmed": true
}
```

响应：

```json
{
  "voice_commitment": "field...",
  "issuer_commitment": "field...",
  "policy_root": "field...",
  "aleo_call": {
    "program": "voice_rights_v1.aleo",
    "function": "register_voice"
  }
}
```

### 10.2 `POST /api/licenses/prepare`

用途：将自然语言许可转换成结构化参数，等待创作者钱包签名。

### 10.3 `POST /api/generations/authorize`

用途：分类用途、生成内容承诺并准备 `use_license`。

失败条件：

- 没有 License Record；
- 分类置信度不足；
- 用途不匹配；
- 高风险标记；
- 过期、撤销或额度耗尽。

### 10.4 `POST /api/generations/execute`

前置条件：

- 提供已完成的 `UsageReceipt`；
- Receipt 与内容承诺一致；
- 幂等键未使用。

### 10.5 `POST /api/receipts/verify`

输出：

- receipt 是否有效；
- 最小公开字段；
- 是否匹配指定音频哈希；
- 不返回完整私有许可。

---

## 11. UI 与 Demo 工作台

### 11.1 页面

#### Creator Studio

- 上传/选择演示声音；
- 创建 Voice Identity；
- 设置默认禁止用途；
- 查看已签发许可的本地索引；
- 撤销许可。

#### License Request

- 选择声音；
- 填写项目类型；
- 设置次数和期限；
- 生成许可摘要；
- 创作者确认并签发。

#### Generate

- 输入生成文本；
- 自动分类用途；
- 展示许可证匹配结果；
- 消费一次许可；
- 生成音频；
- 下载音频和 Manifest。

#### Verify

- 上传音频和 Receipt；
- 展示“授权有效 / 无效”；
- 展示最小披露信息；
- 不展示价格、客户和剩余次数。

### 11.2 隐私可视化

UI 必须清楚区分：

```text
LOCAL ONLY
PRIVATE ON ALEO
PUBLIC ON ALEO
SELECTIVELY DISCLOSED
```

评委应在 10 秒内看懂：

- 原始声音没有上链；
- 许可证是私有 Record；
- 每次使用会递减；
- 撤销是最小公开状态；
- 验证结果可公开，完整条款不公开。

---

## 12. Demo 脚本

### 12.1 时长

- 视频：120 秒；
- 现场演示：3 分钟。

### 12.2 故事

#### 场景一：创作者登记声音

配音演员 Maya 上传一段合成演示样本。

页面显示：

```text
Raw sample: Local only
Voice commitment: Ready
Identity Record: Private on Aleo
```

#### 场景二：游戏工作室申请许可

游戏工作室申请：

```text
用途：GAME_NPC
次数：3
期限：Demo 期间
禁止：政治广告、金融客服冒充
```

Maya 签发许可，工作室钱包收到私有 License Record。

#### 场景三：合法生成

输入：

> “Welcome, traveler. The northern gate closes at sunset.”

系统：

1. 分类为 `GAME_NPC`；
2. 许可验证成功；
3. 剩余次数从 3 变成 2；
4. 生成音频和私有 Receipt；
5. 输出最小 Manifest。

#### 场景四：越权生成被拒绝

输入：

> “Vote for candidate X. This message uses Maya's trusted voice.”

系统：

- 分类为政治用途；
- 与 GAME_NPC 许可不匹配；
- Aleo 调用失败或策略门禁阻止；
- TTS Adapter 未执行；
- 剩余次数仍为 2。

#### 场景五：撤销

Maya 撤销许可。

工作室再次尝试合法 NPC 生成：

- 撤销检查失败；
- 不执行 TTS；
- 展示“许可已撤销”。

#### 场景六：选择性证明

工作室向发行平台提交第一次生成的 Receipt。

平台看到：

```text
Authorized at generation time: Yes
Purpose: GAME_NPC
Audio hash match: Yes
Buyer identity: Hidden
Price: Hidden
Remaining uses: Hidden
```

结尾：

> Your voice can be cloned. Your rights should not be.

---

## 13. 评测方案

### 13.1 合约正确性

| 指标 | 目标 |
|---|---:|
| Leo 编译 | 100% |
| 正向测试通过 | 100% |
| 越权测试拒绝 | 100% |
| 旧 Record 重放拒绝 | 100% |
| 撤销后拒绝 | 100% |
| 过期拒绝 | 100% |

### 13.2 隐私检查

自动扫描：

- 链上公开输出不得包含音频 URL；
- 不得包含邮箱、姓名和原始地址标签；
- 不得包含完整 policy JSON；
- 不得包含价格和剩余次数；
- 日志不得包含私钥、View Key 和 Record 明文。

目标：

```text
public PII leak count = 0
secret leak count = 0
raw sample on-chain count = 0
```

### 13.3 Policy Agent

已实现 30 条确定性回归用例：

- 10 条合法游戏 NPC；
- 5 条政治用途；
- 5 条金融冒充；
- 5 条广告用途；
- 5 条客服、新闻、医疗与边界输入。

结果：

```text
policy regression = 30 / 30
privacy static checks = 8 / 8
```

该结果是项目内部确定性回归集，不宣称为外部 benchmark 或生产级
Policy Agent 安全评测。

### 13.4 端到端

| 流程 | 目标 |
|---|---:|
| 创建身份到获得 Record | < 60 秒，不含链确认 |
| 签发许可 | < 60 秒，不含链确认 |
| 合法生成授权 | 可重复稳定完成 |
| 越权拒绝 | 100% 不调用 TTS |
| Receipt 验证 | < 3 秒，本地验证 |

---

## 14. 安全与威胁模型

### 14.1 威胁

1. 攻击者上传他人声音并声称所有权；
2. 买方复制旧 License 重放；
3. 买方修改用途字段；
4. Prompt Injection 要求绕过策略；
5. TTS Provider 在没有 Receipt 时被直接调用；
6. 撤销状态缓存过期；
7. 前端或日志泄露 Record；
8. 音频文件与 Receipt 被调包；
9. 创作者私钥泄露；
10. 平台伪造声纹验证结果。

### 14.2 缓解

| 威胁 | 缓解 |
|---|---|
| 冒认声音 | 链下活体挑战、人工/第三方身份校验、issuer commitment |
| Record 重放 | Aleo Record 消费和序列号 |
| 修改用途 | 钱包签名 + ZK 约束 |
| Prompt Injection | 文本作为数据，策略在独立结构中；规则优先 |
| 绕过 TTS 门禁 | Adapter 要求 UsageReceipt 和幂等键 |
| 撤销缓存 | 每次生成前查询最新撤销状态 |
| 日志泄露 | 结构化脱敏日志与 secret scan |
| 音频调包 | content/audio hash 与 Receipt 绑定 |
| 私钥泄露 | 钱包托管，不进入服务端和日志 |
| 恶意验证方 | issuer 白名单或多签增强，MVP 明示信任边界 |

### 14.3 高风险动作

必须由用户钱包确认：

- 创建 Voice Identity；
- 签发 License；
- 撤销 License；
- 公开 Receipt。

合法生成使用 License 时：

- Demo 可由买方钱包确认；
- 后续可研究 Session Key 或受限委托；
- MVP 不实现长期静默授权。

---

## 15. 技术栈

### 15.1 推荐

```text
Frontend:
  React + TypeScript + Vite
  Tailwind CSS
  Aleo Wallet Adapter / Shield Wallet integration

Backend:
  Node.js + TypeScript
  Fastify or Express
  SQLite
  Local object storage

Aleo:
  Leo 4.4.0
  voice_rights_v1.aleo
  leo test
  Testnet deployment if stable

Voice:
  ffmpeg
  SHA-256 + salted commitment
  Optional SpeechBrain / WeSpeaker embedding
  MockTtsAdapter by default

Testing:
  Vitest
  Playwright
  Leo tests
  secret scanning
```

### 15.2 仓库结构

```text
voice-rights-vault/
├── README.md
├── LICENSE
├── apps/
│   ├── web/
│   └── api/
├── programs/
│   └── voice_rights_v1/
│       ├── program.json
│       ├── src/main.leo
│       └── tests/
├── packages/
│   ├── aleo-client/
│   ├── policy-engine/
│   ├── voice-identity/
│   ├── tts-adapter/
│   └── shared-types/
├── fixtures/
│   ├── audio/
│   ├── policy-cases/
│   └── aleo-records/
├── scripts/
│   ├── setup-leo.sh
│   ├── run-demo.sh
│   ├── verify-receipt.ts
│   └── security-scan.sh
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRIVACY_MODEL.md
│   ├── THREAT_MODEL.md
│   ├── DEMO_SCRIPT.md
│   ├── ALEO_EVIDENCE.md
│   └── EVIDENCE_NOTES.md
└── outputs/
    ├── screenshots/
    ├── test-reports/
    └── submission/
```

---

## 16. 时间计划

当前日期：2026-07-30
提交截止：2026-08-14 23:59

### 7 月 30 日：方向冻结

- 冻结项目名与一句话；
- 确认赛道保持 AI × Privacy；
- 完成本实施规划；
- 创建仓库；
- 安装 Leo 4.4.0；
- 跑通官方私有 Token Record 示例。

退出条件：

- `leo --version` 可用；
- 官方私有 Record 示例可以 build/test；
- 项目 README 创建。

### 7 月 31 日：Leo Spike

- 定义三个 Record；
- 实现 `register_voice`；
- 实现 `issue_license`；
- 编写基础测试。

退出条件：

- VoiceIdentity 和 VoiceLicense 可生成；
- 非 owner 签发失败。

### 8 月 1 日：许可消费

- 实现 `use_license`；
- 剩余次数递减；
- UsageReceipt；
- 重放、次数耗尽、用途不匹配测试。

退出条件：

- 正向和核心反向测试通过；
- Record 消费逻辑稳定。

### 8 月 2 日：撤销与公开证明

- 实现撤销映射；
- 实现 `publish_receipt`；
- 检查公开字段；
- 生成 ABI。

退出条件：

- 撤销后无法使用；
- 公开证明不泄露完整条款。

### 8 月 3 日：Web 骨架

- Creator Studio；
- License Request；
- Generate；
- Verify；
- 本地角色切换。

退出条件：

- 无链模式下完整 UI 流可点击。

### 8 月 4 日：Aleo Client

- Wallet Adapter；
- Record 输入输出解析；
- 交易状态 UI；
- 本地 Mock 与真实模式切换。

退出条件：

- Web 可调用至少一个 Leo 函数；
- 失败状态不会继续调用 TTS。

### 8 月 5 日：Voice Identity

- 合成演示音频；
- 音频哈希；
- salted commitment；
- 本地 metadata；
- 可选 speaker embedding。

退出条件：

- 原始音频与链上字段边界可展示；
- commitment 可重复验证。

### 8 月 6 日：Policy Agent

- 用途分类；
- 明确禁止规则；
- Prompt Injection 测试；
- content commitment。

退出条件：

- 合法 NPC 文本通过；
- 政治和金融冒充被拒绝。

### 8 月 7 日：TTS Adapter

- MockTtsAdapter；
- Receipt 门禁；
- 幂等键；
- 输出音频与 Manifest。

退出条件：

- 没有 Receipt 无法生成；
- 合法生成输出音频、哈希和 Manifest。

### 8 月 8 日：端到端联调

- Creator → Licensee → Verifier；
- 合法使用；
- 越权拒绝；
- 撤销；
- 选择性公开。

退出条件：

- 一键 Demo 成功；
- 所有状态可重置。

### 8 月 9 日：Testnet 与证据

- 尝试部署；
- 保存程序 ID、交易 ID、Explorer 链接；
- 如果 Testnet 不稳定，保留编译、测试和本地执行证据。

止损规则：

- 当天不因 Testnet 连续失败而停止其他交付；
- 不伪造部署成功；
- 在 `EVIDENCE_NOTES.md` 明确记录。

### 8 月 10 日：评测

- [x] Leo 测试矩阵；
- [x] Policy 30 条测试；
- [x] 隐私扫描；
- E2E 自动化；
- [x] 生成报告。

### 8 月 11 日：产品与视觉

- 完善 UI；
- 架构图；
- 隐私数据流图；
- 失败态；
- 移动端基本适配。

### 8 月 12 日：文档

- README；
- ARCHITECTURE；
- PRIVACY_MODEL；
- THREAT_MODEL；
- ALEO_EVIDENCE；
- 提交表单草稿。

### 8 月 13 日：Demo 视频

- 录制 120 秒视频；
- 生成字幕；
- 音画与链接检查；
- 准备 3 分钟现场版本。

### 8 月 14 日：提交门禁

- GitHub public；
- Demo URL；
- 视频 URL；
- 测试报告；
- Explorer 证据；
- 提交前检查；
- 用户确认后提交。

---

## 17. 风险与止损

| 风险 | 概率 | 影响 | 对策 |
|---|---:|---:|---|
| Leo 工具链安装失败 | 中 | 高 | 使用官方 macOS ARM release；第一天完成 Spike |
| Wallet Adapter 不稳定 | 中 | 高 | 保留 CLI/Mock 模式，Demo 展示真实 Leo 结果 |
| Testnet 不稳定 | 中 | 中 | 编译、测试、本地执行优先，部署不阻塞提交 |
| Record 输入 UX 复杂 | 高 | 中 | 预置 Demo 钱包和固定流程；封装 record parser |
| 撤销模型语义复杂 | 中 | 中 | 明确仅阻止未来使用，不声称删除旧音频 |
| 声纹验证被质疑 | 高 | 高 | 明确链下信任边界，不宣称法律身份认证 |
| TTS 模型拖慢开发 | 高 | 高 | 默认 Mock Adapter，模型不是评审核心 |
| 与 Privacy AI Helper 同质 | 低 | 中 | 强调私有数字权利、许可消费和跨平台使用 |
| 被认为只是 NFT | 中 | 高 | Demo 必须展示用途约束、计次、撤销和生成门禁 |
| 法律表达过度 | 中 | 高 | 禁止宣称法律合同或全面防侵权 |

---

## 18. Definition of Done

### 18.1 产品

- [ ] 三角色完整流程可运行；
- [ ] 合法生成成功；
- [ ] 越权生成失败且未调用 TTS；
- [ ] 次数递减可见；
- [ ] 撤销后失败；
- [ ] Receipt 可验证；
- [ ] 隐私字段边界清楚。

### 18.2 Aleo

- [x] Leo 4.4.0 锁定；
- [ ] 三个 Record 编译通过；
- [ ] 核心函数测试通过；
- [ ] 重放测试失败；
- [ ] 撤销测试失败；
- [ ] 公开输出隐私检查通过；
- [ ] 有真实执行证据；
- [ ] Testnet 状态如实记录。

### 18.3 工程

- [ ] 一键启动；
- [ ] 前后端测试通过；
- [ ] E2E 流程通过；
- [ ] secret scan 通过；
- [ ] 不包含真实私钥和真实未授权音频；
- [ ] GitHub README 可独立复现。

### 18.4 提交

- [ ] 项目介绍；
- [ ] Demo URL；
- [ ] GitHub URL；
- [ ] Demo 视频；
- [ ] 技术架构；
- [ ] Aleo 使用说明；
- [ ] 测试报告；
- [ ] 风险和限制；
- [ ] Hackathon 期间完成内容说明。

---

## 19. 禁止宣称

提交材料中禁止出现：

- “彻底杜绝深伪”；
- “保证所有生成内容合法”；
- “声纹等于真人身份”；
- “链上凭证自动构成法律合同”；
- “撤销后可以删除所有历史音频”；
- “原始声音存储在 Aleo”；
- “Aleo 验证了音频内容真实性”；
- “已完成真实版税支付”，除非存在可验证交易；
- “已部署 Testnet”，除非提供真实程序和交易证据；
- “完全匿名”，应改为“默认私密并最小披露”。

---

## 20. 提交文案草稿

### 中文

VoiceRights Vault 是构建在 Aleo 上的隐私 AI 声音许可 Agent。声音创作者可以签发限定用途、期限和次数的私有 Voice License；每次 AI 语音生成必须消费一条有效许可，并产生可验证的使用凭证。原始声音、买方身份、报价、完整条款和剩余额度默认不公开，但内容平台可以验证某次生成在当时确实获得授权。

### English

VoiceRights Vault is a privacy-preserving AI voice licensing agent built on Aleo. Creators issue private, purpose-scoped, expiring, usage-limited Voice License records. Every synthesis must consume a valid license and produces a verifiable usage receipt. Raw voice samples, buyer identity, pricing, full policy terms, and remaining quota stay private, while platforms can still verify that a generation was authorized at the time of use.

### Tagline

> Your voice can be cloned. Your rights should not be.

---

## 21. 立即执行

### P0

1. 确认项目名使用 `VoiceRights Vault`；
2. 决定报名展示名是否保留 `OmniBetter` 前缀；
3. 安装 Leo 4.4.0；
4. 创建 GitHub 仓库；
5. 跑通官方私有 Token 示例；
6. 创建 `voice_rights_v1.aleo`；
7. 先实现 `VoiceLicense.remaining_uses` 的消费测试。

### 48 小时成功标准

```text
leo build passes
issue_license creates private record
use_license decrements remaining_uses
replay of consumed record fails
purpose mismatch fails
```

如果 48 小时内未达到：

- 暂停 UI 和 TTS；
- 优先解决合约；
- 不降低为“链上存哈希”；
- 必要时缩减撤销和公开证明，但保留私有许可消费核心。

---

## 22. 研究来源

### Aleo 与比赛

- Aleo Hackathon 官方手册与 HackAgent 活动页面；
- OpenBuild Aleo 101 中文文档；
- ProvableHQ Leo Examples；
- Leo `v4.4.0` release；
- Aleo public/private state、Record 和 finalization 相关文档。

### 声音授权与制度

- U.S. Copyright Office: Copyright and Artificial Intelligence, Part 1: Digital Replicas；
- SAG-AFTRA 关于数字替身、知情同意和补偿的公开材料；
- Tennessee ELVIS Act 等声音与 AI 相关制度信号。

### 产品与协议

- ElevenLabs Voice Library / Professional Voice Clone；
- Voice-Swap；
- Kits AI Artist Voices；
- Veritone Voice；
- Story Protocol Programmable IP License；
- C2PA / Content Credentials。

### 声音与来源技术

- SpeechBrain / WeSpeaker speaker verification；
- C2PA 音频来源与签名机制；
- 开源或合法授权 TTS Adapter，仅作为可替换生成层。
