import type { ReactNode } from 'react'
import { DiceSimulatorTool } from '../features/dice/DiceSimulatorTool'
import { EncodingTool } from '../features/encoding/EncodingTool'
import { HashTool } from '../features/hash/HashTool'
import { JsonTool } from '../features/json/JsonTool'
import { JwtTool } from '../features/jwt/JwtTool'
import { RandomNumberGeneratorTool } from '../features/random-number/RandomNumberGeneratorTool'
import { RsaTool } from '../features/rsa/RsaTool'
import { SymmetricCryptoTool } from '../features/symmetric/SymmetricCryptoTool'
import { TimestampTool } from '../features/timestamp/TimestampTool'

export type ToolId = 'aes' | 'base64' | 'des' | 'dice' | 'json' | 'jwt' | 'md5' | 'random-number' | 'rsa' | 'sha' | 'sm4' | 'timestamp' | 'unicode' | 'url'
export type ToolGroupId = 'random' | 'symmetric' | 'asymmetric' | 'digest' | 'time' | 'encoding'
export type ToolAvailability = Record<ToolId, boolean>

export interface ToolDefinition {
  id: ToolId
  name: string
  short: string
  icon: string
  element: ReactNode
}

export interface ToolGroup {
  id: ToolGroupId
  name: string
  homeIcon: string
  homeDescription: string
  tools: ToolDefinition[]
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'random',
    name: '随机数工具',
    homeIcon: 'D',
    homeDescription: '组合多面骰子，或按范围、数量与唯一性生成安全随机值。',
    tools: [
      { id: 'dice', name: '色子模拟器', short: '多面骰子组合', icon: 'D', element: <DiceSimulatorTool /> },
      { id: 'random-number', name: '随机数生成器', short: '范围与批量', icon: '#', element: <RandomNumberGeneratorTool /> },
    ],
  },
  {
    id: 'symmetric',
    name: '对称加密',
    homeIcon: 'S',
    homeDescription: '使用明确的密钥编码、模式、填充和偏移参数完成本地加解密。',
    tools: [
      { id: 'aes', name: 'AES', short: '现代分组加密', icon: 'AE', element: <SymmetricCryptoTool algorithm='AES' /> },
      { id: 'des', name: 'DES', short: '遗留系统兼容', icon: 'DE', element: <SymmetricCryptoTool algorithm='DES' /> },
      { id: 'sm4', name: 'SM4', short: '国密分组加密', icon: 'S4', element: <SymmetricCryptoTool algorithm='SM4' /> },
    ],
  },
  {
    id: 'asymmetric',
    name: '非对称加密',
    homeIcon: 'R',
    homeDescription: '生成或导入密钥，完成 RSA 加解密与签名验证。',
    tools: [{ id: 'rsa', name: 'RSA', short: '加密与签名', icon: 'RS', element: <RsaTool /> }],
  },
  {
    id: 'digest',
    name: '摘要算法',
    homeIcon: 'H',
    homeDescription: '计算 MD5，或同时生成 SHA-1、SHA-256、SHA-384、SHA-512 摘要。',
    tools: [
      { id: 'md5', name: 'MD5', short: '消息摘要', icon: 'M5', element: <HashTool algorithm="MD5" /> },
      { id: 'sha', name: 'SHA', short: '四种 SHA 摘要', icon: 'S4', element: <HashTool algorithm="SHA" /> },
    ],
  },
  {
    id: 'time',
    name: '时间工具',
    homeIcon: 'T',
    homeDescription: '在 Unix 时间戳、ISO 时间与可读日期之间转换。',
    tools: [{ id: 'timestamp', name: '时间戳', short: 'ISO 与日期', icon: 'TS', element: <TimestampTool /> }],
  },
  {
    id: 'encoding',
    name: '编码工具',
    homeIcon: 'E',
    homeDescription: '处理常见文本编码、令牌和 JSON 格式化、树状查看与转义。',
    tools: [
      { id: 'url', name: 'URL 编解码', short: '百分号编码', icon: '%', element: <EncodingTool kind="url" /> },
      { id: 'unicode', name: 'Unicode', short: '\\uXXXX 转换', icon: 'U', element: <EncodingTool kind="unicode" /> },
      { id: 'base64', name: 'Base64', short: '文本编解码', icon: 'B64', element: <EncodingTool kind="base64" /> },
      { id: 'jwt', name: 'JWT', short: '令牌生成与解析', icon: 'JWT', element: <JwtTool /> },
      { id: 'json', name: 'JSON', short: '格式化与转义', icon: '{}', element: <JsonTool /> },
    ],
  },
]

export const TOOL_IDS = TOOL_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id))

export const DEFAULT_TOOL_AVAILABILITY: ToolAvailability = {
  aes: true,
  base64: true,
  des: false,
  dice: true,
  json: true,
  jwt: true,
  md5: true,
  'random-number': true,
  rsa: true,
  sha: true,
  sm4: true,
  timestamp: true,
  unicode: true,
  url: true,
}

export function getEnabledToolGroups(availability: ToolAvailability): ToolGroup[] {
  return TOOL_GROUPS
    .map((group) => ({ ...group, tools: group.tools.filter((tool) => availability[tool.id]) }))
    .filter((group) => group.tools.length > 0)
}
