# 无纸化会议系统前后端数据交互规范

本文档定义了无纸化会议系统前端与后端之间的数据交互规范，包括API接口定义、数据格式、错误处理等内容。

## 目录

1. [基本原则](#基本原则)
2. [API基础规范](#api基础规范)
3. [认证与安全](#认证与安全)
4. [会议相关API](#会议相关api)
5. [文件相关API](#文件相关api)
6. [状态同步API](#状态同步api)
7. [错误处理](#错误处理)
8. [数据模型](#数据模型)

## 基本原则

1. **RESTful设计**：API遵循RESTful设计原则，使用标准HTTP方法表达操作语义。
2. **JSON数据格式**：所有API请求和响应均使用JSON格式，除文件上传/下载外。
3. **版本控制**：API路径包含版本号（如`/api/v1/meetings`），确保兼容性。
4. **状态码使用**：使用标准HTTP状态码表示请求结果。
5. **错误信息统一**：错误响应使用统一格式，包含错误代码和描述信息。
6. **幂等性**：GET、PUT、DELETE请求应具有幂等性，多次调用结果一致。

## API基础规范

### 基础URL

```
http://{server_address}/api/v1/
```

其中`{server_address}`为服务器地址，从应用设置中获取。

### 请求头

所有请求应包含以下HTTP头：

```
Content-Type: application/json
Accept: application/json
```

### 响应格式

标准成功响应：

```json
{
  "data": {
    // 响应数据
  },
  "status": "success"
}
```

标准错误响应：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息"
  },
  "status": "error"
}
```

## 认证与安全

### 认证方式

系统使用简单的API密钥认证，每个请求需要在请求头中包含API密钥：

```
X-API-Key: {api_key}
```

API密钥在应用设置中配置，用于标识和验证客户端。

### 安全考虑

1. 所有API通信应使用HTTPS加密传输
2. 敏感数据（如API密钥）不应明文存储
3. 文件下载链接应包含有效期和签名
4. 客户端应实现请求频率限制，避免服务器过载

## 会议相关API

### 获取会议列表

获取所有可用的会议列表。

**请求**

```
GET /api/v1/meetings
```

**响应**

```json
{
  "data": {
    "meetings": [
      {
        "id": "651122",
        "title": "市政协完全大会",
        "intro": "会议介绍",
        "time": "2025年3月29日 9:00",
        "status": "未开始",
        "update_time": "2025-04-15T10:30:45Z"
      },
      {
        "id": "651123",
        "title": "年度工作总结会",
        "intro": "回顾全年工作",
        "time": "2025年12月30日 14:00",
        "status": "未开始",
        "update_time": "2025-04-15T11:20:30Z"
      }
    ]
  },
  "status": "success"
}
```

### 获取会议详情

获取指定会议的详细信息，包括议程项和文件列表。

**请求**

```
GET /api/v1/meetings/{meeting_id}
```

**响应**

```json
{
  "data": {
    "id": "651122",
    "title": "市政协完全大会",
    "intro": "会议介绍",
    "time": "2025年3月29日 9:00",
    "status": "未开始",
    "update_time": "2025-04-15T10:30:45Z",
    "part": [
      {
        "title": "议题一：审议资格",
        "file": [
          "关于审议资格的通知.pdf"
        ],
        "page": [
          "10"
        ],
        "reporter": "张三"
      },
      {
        "title": "议题二：全体会议",
        "file": [
          "全委会文件.pdf",
          "选举文件.pdf"
        ],
        "page": [
          "1",
          "1"
        ],
        "reporter": "李四"
      }
    ]
  },
  "status": "success"
}
```

## 文件相关API

### 获取文件列表

获取指定会议的所有文件列表。

**请求**

```
GET /api/v1/meetings/{meeting_id}/files
```

**响应**

```json
{
  "data": {
    "files": [
      {
        "name": "关于审议资格的通知.pdf",
        "size": 1024000,
        "update_time": "2025-04-15T10:30:45Z",
        "download_url": "https://{server_address}/api/v1/files/download/651122_关于审议资格的通知.pdf?token=xxx",
        "jpg_url": "https://{server_address}/api/v1/files/jpg/651122_关于审议资格的通知.jpg?token=xxx",
        "pages": 10
      },
      {
        "name": "全委会文件.pdf",
        "size": 2048000,
        "update_time": "2025-04-15T10:35:22Z",
        "download_url": "https://{server_address}/api/v1/files/download/651122_全委会文件.pdf?token=xxx",
        "jpg_url": "https://{server_address}/api/v1/files/jpg/651122_全委会文件.jpg?token=xxx",
        "pages": 1
      }
    ]
  },
  "status": "success"
}
```

### 下载文件

下载指定的文件。

**请求**

```
GET /api/v1/files/download/{file_name}?token={token}
```

**响应**

文件二进制数据，Content-Type根据文件类型设置。

### 下载JPG文件

下载PDF文件对应的JPG格式图片。

**请求**

```
GET /api/v1/files/jpg/{file_name}?token={token}
```

**响应**

JPG图片二进制数据，Content-Type为image/jpeg。

### 下载会议数据包

下载指定会议的完整数据包，包含所有文件和JPG图片。

**状态**：已实现

**请求**

```
GET /api/v1/meetings/{meeting_id}/download-package
```

**响应**

ZIP压缩包二进制数据，Content-Type为application/zip。

**客户端实现**

```javascript
// 下载并解压会议ZIP压缩包
downloadAndExtractMeetingPackage: function(meetingId) {
    return new Promise((resolve, reject) => {
        // 构建下载URL
        const downloadUrl = this.meetingPackageUrl + meetingId + '/download-package';

        // 创建下载任务
        const dtask = plus.downloader.createDownload(downloadUrl, {
            filename: '_doc/download/meeting_' + meetingId + '.zip',
            timeout: 30, // 超时时间，单位为秒
            retry: 3 // 重试次数
        }, (d, status) => {
            if (status === 200) {
                // 下载成功，解压文件
                this.extractZipFile(d.filename, meetingId);
            }
        });

        // 开始下载任务
        dtask.start();
    });
}
```

### 获取会议数据

获取指定会议的完整数据，包含会议信息、议题项和文件信息。

**状态**：已实现

**请求**

```
GET /api/v1/meetings/{meeting_id}/data
```

**响应**

```json
{
  "data": {
    "id": "651122",
    "title": "市政协完全大会",
    "intro": "会议介绍",
    "time": "2025年3月29日 9:00",
    "status": "未开始",
    "update_time": "2025-04-15T10:30:45Z",
    "package_url": "https://{server_address}/api/v1/meetings/651122/download-package",
    "part": [
      {
        "title": "议题一：审议资格",
        "file": [
          {
            "name": "关于审议资格的通知.pdf",
            "pages": 10,
            "jpg": [
              "https://{server_address}/api/v1/files/jpg/651122_关于审议资格的通知_1.jpg",
              "https://{server_address}/api/v1/files/jpg/651122_关于审议资格的通知_2.jpg"
            ]
          }
        ],
        "reporter": "张三"
      },
      {
        "title": "议题二：全体会议",
        "file": [
          {
            "name": "全委会文件.pdf",
            "pages": 1,
            "jpg": [
              "https://{server_address}/api/v1/files/jpg/651122_全委会文件_1.jpg"
            ]
          },
          {
            "name": "选举文件.pdf",
            "pages": 1,
            "jpg": [
              "https://{server_address}/api/v1/files/jpg/651122_选举文件_1.jpg"
            ]
          }
        ],
        "reporter": "李四"
      }
    ]
  },
  "status": "success"
}
```

**客户端实现**

```javascript
// 获取会议数据
fetchMeetingById: function(meetingId) {
    return new Promise((resolve, reject) => {
        console.log('开始获取会议数据, ID:', meetingId);

        // 构建请求URL
        const url = this.meetingDataUrl + meetingId + '/data';
        console.log('开始获取会议数据，URL:', url);

        try {
            const xhr = new plus.net.XMLHttpRequest();
            xhr.timeout = 10000;
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response && response.data) {
                            // 解析成功，处理数据
                            this.processMeetingData(response.data, meetingId);
                            resolve(response.data);
                        } else {
                            reject(new Error('响应数据格式错误'));
                        }
                    } catch (error) {
                        reject(new Error('解析响应数据失败: ' + error.message));
                    }
                } else {
                    reject(new Error('获取会议数据失败, 状态码: ' + xhr.status));
                }
            };
            xhr.open('GET', url);
            xhr.send();
        } catch (error) {
            reject(new Error('创建请求失败: ' + error.message));
        }
    });
}
```

## 状态同步API

### 获取会议状态变更标识

获取会议状态变更标识，用于检测会议状态是否有变化。

**状态**：已实现

**请求**

```
GET /api/v1/meetings/status/token
```

**响应**

```json
{
  "data": {
    "token": "a1b2c3d4e5f6",
    "meetings": [
      {
        "id": "651122",
        "status": "进行中"
      }
    ]
  },
  "status": "success"
}
```

**客户端实现**

```javascript
// 获取会议状态信息
fetchMeetingStatus: function() {
    // 检查是否正在获取状态
    if (this.isStatusFetching) {
        return;
    }

    this.isStatusFetching = true;
    console.log('开始获取会议状态，URL:', this.meetingStatusUrl);

    try {
        const xhr = new plus.net.XMLHttpRequest();
        xhr.timeout = 5000;
        xhr.onload = () => {
            if (xhr.status === 200) {
                this.parseStatusData(xhr.responseText);
            } else {
                this.handleStatusError('获取状态失败', { status: xhr.status });
            }
        };
        xhr.open('GET', this.meetingStatusUrl);
        xhr.send();
    } catch (error) {
        this.handleStatusError('创建状态请求失败', error);
    }
}
```

### 获取文件更新列表

获取指定时间戳后更新的文件列表。

**请求**

```
GET /api/v1/files/updates?since={timestamp}
```

**响应**

```json
{
  "data": {
    "updates": [
      {
        "meeting_id": "651122",
        "file_name": "关于审议资格的通知.pdf",
        "update_time": "2025-04-16T09:30:45Z",
        "action": "update"
      },
      {
        "meeting_id": "651122",
        "file_name": "新增文件.pdf",
        "update_time": "2025-04-16T10:15:22Z",
        "action": "add"
      }
    ],
    "timestamp": "2025-04-16T10:15:22Z"
  },
  "status": "success"
}
```

## 错误处理

**状态**：已实现错误处理机制

### 错误码定义

| 错误码 | 描述 | HTTP状态码 |
|--------|------|------------|
| AUTH_ERROR | 认证失败 | 401 |
| PERMISSION_DENIED | 权限不足 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| INVALID_REQUEST | 请求参数无效 | 400 |
| SERVER_ERROR | 服务器内部错误 | 500 |
| NETWORK_ERROR | 网络错误 | 503 |

**客户端实现**

```javascript
// 状态错误处理
handleStatusError: function(message, error = null) {
    console.error('状态错误:', message, error);
    this.triggerEvent('statusError', { error: message, details: error });
    this.isStatusFetching = false;

    // 如果还没有触发过statusInit事件，则触发一个默认的
    if (!this.statusToken) {
        const defaultStatus = {token: "initial", status: "not_started", error: true};
        this.statusToken = defaultStatus.token;
        this.triggerEvent('statusInit', defaultStatus);
    }
}
```

### 错误响应示例

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "请求的会议不存在"
  },
  "status": "error"
}
```

## 数据模型

### 会议模型

```json
{
  "id": "字符串，会议ID",
  "title": "字符串，会议标题",
  "intro": "字符串，会议介绍",
  "time": "字符串，会议时间",
  "status": "字符串，会议状态（未开始、进行中、已结束）",
  "update_time": "字符串，ISO8601格式的更新时间",
  "part": [
    {
      "title": "字符串，议题标题",
      "file": ["字符串数组，文件名列表"],
      "page": ["字符串数组，对应文件的页数"],
      "reporter": "字符串，报告人"
    }
  ]
}
```

### 文件模型

```json
{
  "name": "字符串，文件名",
  "size": "数字，文件大小（字节）",
  "update_time": "字符串，ISO8601格式的更新时间",
  "download_url": "字符串，文件下载URL",
  "jpg_url": "字符串，JPG格式文件URL",
  "pages": "数字，文件页数"
}
```

### 更新记录模型

```json
{
  "meeting_id": "字符串，会议ID",
  "file_name": "字符串，文件名",
  "update_time": "字符串，ISO8601格式的更新时间",
  "action": "字符串，操作类型（add、update、delete）"
}
```

更新日期：2025年04月22日
