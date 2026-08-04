## Purpose

为开发者提供时间戳与日期文本之间严格、可复现的双向转换，并让时间单位、时区和自定义格式在每次操作中保持明确。

## ADDED Requirements

### Requirement: Timestamp unit selection
系统 SHALL 支持秒级和毫秒级 Unix 时间戳，并 SHALL 要求当前转换使用明确选择的单位。

#### Scenario: Convert equivalent timestamp units
- **WHEN** 用户分别以秒和毫秒单位输入表示同一时刻的时间戳
- **THEN** 系统在相同的时区和格式设置下输出相同日期时间

### Requirement: Timestamp formatting
系统 SHALL 根据用户选择的 UTC 或浏览器本地时区，将有效时间戳格式化为日期文本。

#### Scenario: Format in UTC
- **WHEN** 用户选择 UTC 并将有效时间戳转换为日期文本
- **THEN** 系统输出该时刻的 UTC 日期和时间字段

#### Scenario: Format in local time
- **WHEN** 用户选择本地时区并将有效时间戳转换为日期文本
- **THEN** 系统按浏览器当前本地时区输出日期和时间字段，并标明正在使用本地时区

### Requirement: Custom date formats
系统 SHALL 支持至少 `YYYY`、`MM`、`DD`、`HH`、`mm`、`ss` 和 `SSS` 格式标记以及用户输入的普通分隔字符。

#### Scenario: Apply a custom format
- **WHEN** 用户选择格式 `YYYY/MM/DD HH:mm:ss.SSS` 并转换有效时间戳
- **THEN** 系统按指定字段宽度和分隔符输出日期文本

#### Scenario: Reject an unsupported format
- **WHEN** 用户的格式包含未支持或含义不明确的标记
- **THEN** 系统指出无效格式且不生成可能误导的日期结果

### Requirement: Strict date-text parsing
系统 SHALL 使用用户提供的格式和时区严格解析日期文本，而不依赖浏览器的模糊日期字符串解析，并 SHALL 拒绝字段缺失、字段越界或与格式不匹配的输入。

#### Scenario: Parse a matching date string
- **WHEN** 日期文本与自定义格式完全匹配且所有日期时间字段有效
- **THEN** 系统按选定时区输出对应单位的 Unix 时间戳

#### Scenario: Reject an impossible date
- **WHEN** 用户输入诸如非闰年 2 月 29 日或超出范围的小时值
- **THEN** 系统显示明确校验错误且不自动修正日期

### Requirement: ISO 8601 date-time parsing
系统 SHALL 严格解析常用 ISO 8601 扩展格式，包括 `YYYY-MM-DD`、以 `T` 分隔的时分秒、可选三位毫秒，以及可选的 `Z` 或 `±HH:mm` 时区偏移。输入包含时区标识时 SHALL 以输入中的时区偏移确定绝对时刻；输入不包含时区标识时 SHALL 使用用户选择的 UTC 或本地时区。

#### Scenario: Parse an ISO UTC date-time
- **WHEN** 用户输入 `2026-08-04T15:30:45.123Z` 并转换为毫秒时间戳
- **THEN** 系统将 `Z` 解释为 UTC 并输出对应的 Unix 毫秒时间戳

#### Scenario: Parse an ISO date-time with an offset
- **WHEN** 用户输入 `2026-08-04T15:30:45+08:00`
- **THEN** 系统使用输入中的 `+08:00` 偏移确定绝对时刻，不受当前 UTC/本地时区选项影响

#### Scenario: Parse an ISO date-time without an offset
- **WHEN** 用户输入 `2026-08-04T15:30:45` 且选择本地时区
- **THEN** 系统将日期时间字段解释为浏览器本地时间并输出对应时间戳

#### Scenario: Parse an ISO calendar date
- **WHEN** 用户输入 `2026-08-04` 且选择 UTC
- **THEN** 系统将其解释为该 UTC 日期的 `00:00:00.000` 并输出对应时间戳

#### Scenario: Reject an invalid ISO date-time
- **WHEN** ISO 输入包含不可能的日期、错误字段宽度、缺失的 `T` 分隔符或无效时区偏移
- **THEN** 系统显示明确校验错误且不使用浏览器模糊解析进行修正

### Requirement: ISO 8601 date-time formatting
系统 SHALL 提供规范化 ISO 8601 输出模式；UTC 输出 SHALL 使用 `Z`，本地时区输出 SHALL 使用明确的 `±HH:mm` 偏移，并 SHALL 以三位 `SSS` 保留毫秒精度。

#### Scenario: Format an ISO UTC date-time
- **WHEN** 用户选择 ISO 8601 输出模式和 UTC 时区转换有效时间戳
- **THEN** 系统输出形如 `2026-08-04T15:30:45.123Z` 的日期时间

#### Scenario: Format an ISO local date-time
- **WHEN** 用户选择 ISO 8601 输出模式和本地时区转换有效时间戳
- **THEN** 系统输出包含本地日期时间字段、三位毫秒和实际 `±HH:mm` 偏移的日期时间

### Requirement: Conversion round trip
系统 SHALL 使未丢弃精度的时间戳经过格式化和严格反向解析后恢复原值；当格式缺少所选单位所需精度时 SHALL 提示精度会丢失。

#### Scenario: Millisecond round trip
- **WHEN** 用户以包含 `SSS` 的格式将毫秒时间戳转换为文本并按相同设置反向转换
- **THEN** 系统恢复原始毫秒时间戳

#### Scenario: Warn about omitted precision
- **WHEN** 用户将含非零毫秒的时间戳格式化为不含 `SSS` 的文本
- **THEN** 系统提示反向转换不能恢复被省略的毫秒精度

#### Scenario: ISO offset round trip
- **WHEN** 用户将毫秒时间戳格式化为带 `Z` 或 `±HH:mm` 的 ISO 8601 文本并反向解析
- **THEN** 系统恢复原始毫秒时间戳
