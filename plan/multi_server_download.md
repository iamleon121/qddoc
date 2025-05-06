# 多服务器下载机制实现与优化

本文档详细描述了无纸化会议系统前端的多服务器下载机制的实现和优化过程。

## 目录

1. [需求背景](#需求背景)
2. [实现方案](#实现方案)
3. [优化过程](#优化过程)
4. [最终实现](#最终实现)
5. [测试结果](#测试结果)
6. [未来改进](#未来改进)

## 需求背景

在无纸化会议系统中，会议文件需要从服务器下载到客户端设备上。由于单一服务器的下载能力有限，系统需要支持从多个服务器下载文件，以提高下载成功率和速度。具体需求包括：

1. 支持配置多个服务器IP地址
2. 当一个服务器下载失败时，自动尝试下一个服务器
3. 当任何一个服务器下载成功时，停止其他下载尝试
4. 避免重复下载和资源浪费

## 实现方案

### 1. 服务器IP池生成

根据配置的服务器数量，生成一个IP池，包含多个服务器地址：

```javascript
// 生成IP池
generateIpPool: function() {
    const ipPool = [];
    const serverCount = parseInt(this.serverCount) || 1;
    console.log('配置的服务器数量:', serverCount);

    // 获取基础IP地址和端口
    const baseIp = this.serverIp;
    const port = this.serverPort;
    console.log('配置的服务器地址:', baseIp, '端口:', port);

    // 解析IP地址
    const ipParts = baseIp.split('.');
    if (ipParts.length !== 4) {
        console.error('无效的IP地址格式:', baseIp);
        // 如果IP格式无效，至少添加配置的IP
        ipPool.push({
            ip: baseIp,
            url: 'http://' + baseIp + ':' + port
        });
        return ipPool;
    }

    // 添加基础IP
    ipPool.push({
        ip: baseIp,
        url: 'http://' + baseIp + ':' + port
    });

    // 根据服务器数量生成其他IP
    const baseIpPrefix = ipParts[0] + '.' + ipParts[1] + '.' + ipParts[2] + '.';
    const baseIpLast = parseInt(ipParts[3]);

    for (let i = 1; i < serverCount; i++) {
        // 计算新的IP地址，最后一段递增
        const newIpLast = baseIpLast + i;
        // 确保IP地址最后一段不超过254
        if (newIpLast > 254) {
            break;
        }

        const newIp = baseIpPrefix + newIpLast;
        ipPool.push({
            ip: newIp,
            url: 'http://' + newIp + ':' + port
        });
    }

    console.log('生成的IP集合:', ipPool);
    return ipPool;
}
```

### 2. 顺序下载实现

初始实现采用了顺序尝试的方式，当一个服务器下载失败时，尝试下一个服务器：

```javascript
// 下载并解压会议ZIP压缩包
downloadAndExtractMeetingPackage: function(meetingId) {
    return new Promise((resolve, reject) => {
        console.log('开始下载会议ZIP压缩包, ID:', meetingId);

        // 触发下载开始事件
        this.triggerEvent('downloadStart', { meetingId: meetingId });

        // 生成IP集合
        const ipPool = this.generateIpPool();
        // 创建可用IP集合的副本
        const availableIps = [...ipPool];

        // 当前下载任务
        let currentTask = null;

        // 尝试下载函数
        const attemptDownload = () => {
            // 如果没有可用的IP了，则失败
            if (availableIps.length === 0) {
                console.error('所有服务器都尝试失败，无法下载文件');
                this.triggerEvent('downloadError', { meetingId: meetingId, status: 'all_servers_failed' });
                // 即使下载失败也算成功，不中断整体流程
                resolve();
                return;
            }

            // 随机选择一个IP
            const randomIndex = Math.floor(Math.random() * availableIps.length);
            const selectedServer = availableIps[randomIndex];

            // 从可用列表中移除该IP
            availableIps.splice(randomIndex, 1);

            // 构建下载URL
            const downloadUrl = selectedServer.url + '/api/v1/meetings/' + meetingId + '/download-package';
            console.log('尝试从服务器下载:', selectedServer.ip, '下载URL:', downloadUrl);

            // 确保下载文件夹存在
            this.ensureDirectoryExists('_doc/download/')
                .then(() => {
                    // 重置取消标志
                    this.isCancelled = false;

                    // 创建下载任务
                    const dtask = plus.downloader.createDownload(downloadUrl, {
                        filename: '_doc/download/meeting_' + meetingId + '.zip',
                        timeout: 30, // 超时时间，单位为秒
                        retry: 3 // 重试次数
                    }, (d, status) => {
                        if (status === 200) {
                            console.log('下载成功:', d.filename);
                            // 处理下载成功...
                        } else {
                            console.error('从服务器', selectedServer.ip, '下载失败, 状态码:', status);
                            // 尝试下一个服务器
                            attemptDownload();
                        }
                    });

                    // 监听下载进度
                    dtask.addEventListener('statechanged', (task, _status) => {
                        // 处理下载状态变化...
                    });

                    // 保存当前下载任务
                    currentTask = dtask;
                    this.downloadTask = dtask;

                    // 开始下载任务
                    dtask.start();
                    console.log('下载任务已启动');
                });
        };

        // 开始尝试下载
        attemptDownload();
    });
}
```

## 优化过程

在实际使用中，我们发现了以下问题：

1. **并发下载问题**：当一个服务器下载失败时，系统会尝试下一个服务器，但如果第一个服务器的下载任务仍在进行中，可能会导致多个下载任务同时执行
2. **重复下载问题**：即使一个服务器已经成功下载，其他服务器的下载任务可能仍会继续执行，导致重复下载
3. **资源浪费**：多个下载任务同时执行会占用大量网络和系统资源

为解决这些问题，我们进行了以下优化：

### 1. 添加下载成功标志

添加全局下载成功标志，用于标记是否已有一个下载成功：

```javascript
// 下载成功标志
isDownloadSucceeded: false,

// 所有下载任务列表
allDownloadTasks: [],
```

### 2. 重构下载逻辑

将下载逻辑重构为递归函数，确保一次只有一个下载任务在执行：

```javascript
// 从单个服务器尝试下载
tryDownloadWithServer: function(server, meetingId, availableServers, resolve, reject) {
    // 如果已经有一个下载成功，直接返回
    if (this.isDownloadSucceeded) {
        console.log('已有一个下载成功，不再尝试新的下载');
        return;
    }

    // 构建下载URL
    const downloadUrl = server.url + '/api/v1/meetings/' + meetingId + '/download-package';
    console.log('尝试从服务器下载:', server.ip, '下载URL:', downloadUrl);

    // 确保下载文件夹存在
    this.ensureDirectoryExists('_doc/download/')
        .then(() => {
            // 重置取消标志
            this.isCancelled = false;

            // 创建下载任务
            const dtask = plus.downloader.createDownload(downloadUrl, {
                filename: '_doc/download/meeting_' + meetingId + '.zip',
                timeout: 30, // 超时时间，单位为秒
                retry: 3 // 重试次数
            }, (d, status) => {
                // 在回调开始处检查下载成功标志
                if (this.isDownloadSucceeded) {
                    console.log('已有一个下载成功，忽略当前下载回调');
                    return;
                }

                if (status === 200) {
                    console.log('下载成功:', d.filename);

                    // 设置下载成功标志
                    this.isDownloadSucceeded = true;

                    // 取消所有其他下载任务
                    this.cancelAllOtherDownloadTasks(dtask);

                    // 触发下载完成事件
                    this.triggerEvent('downloadComplete', { meetingId: meetingId, filename: d.filename });

                    // 后续处理...
                } else {
                    console.error('从服务器', server.ip, '下载失败, 状态码:', status);

                    // 再次检查下载成功标志
                    if (this.isDownloadSucceeded) {
                        console.log('已有一个下载成功，不再尝试其他服务器');
                        return;
                    }

                    // 如果还有其他服务器可尝试，则尝试下一个
                    if (availableServers.length > 0) {
                        console.log('尝试从下一个服务器下载');
                        // 选择下一个服务器
                        const nextServer = availableServers.shift();
                        this.tryDownloadWithServer(nextServer, meetingId, availableServers, resolve, reject);
                    } else {
                        console.error('所有服务器都尝试失败，无法下载文件');
                        this.triggerEvent('downloadError', { meetingId: meetingId, status: 'all_servers_failed' });
                        // 即使下载失败也算成功，不中断整体流程
                        resolve();
                    }
                }
            });

            // 监听下载进度
            dtask.addEventListener('statechanged', (task, _status) => {
                // 在事件处理开始处检查下载成功标志
                if (this.isDownloadSucceeded) {
                    console.log('已有一个下载成功，忽略当前事件');
                    return;
                }

                if (task.state === 3) { // 下载进行中
                    // 处理下载进度...
                } else if (task.state === 4) { // 下载失败
                    console.error('从服务器', server.ip, '下载失败, 状态:', task.state);

                    // 再次检查下载成功标志
                    if (this.isDownloadSucceeded) {
                        console.log('已有一个下载成功，不再尝试其他服务器');
                        return;
                    }

                    // 如果还有其他服务器可尝试，则尝试下一个
                    if (availableServers.length > 0) {
                        console.log('尝试从下一个服务器下载');
                        // 选择下一个服务器
                        const nextServer = availableServers.shift();
                        this.tryDownloadWithServer(nextServer, meetingId, availableServers, resolve, reject);
                    } else {
                        console.error('所有服务器都尝试失败，无法下载文件');
                        this.triggerEvent('downloadError', { meetingId: meetingId, status: 'all_servers_failed' });
                        // 即使下载失败也算成功，不中断整体流程
                        resolve();
                    }
                }
            });

            // 保存当前下载任务
            this.downloadTask = dtask;

            // 添加到下载任务列表
            this.allDownloadTasks.push(dtask);
            console.log('当前下载任务列表数量:', this.allDownloadTasks.length);

            // 再次检查下载成功标志
            if (this.isDownloadSucceeded) {
                console.log('已有一个下载成功，不启动新的下载任务');
                return;
            }

            // 开始下载任务
            dtask.start();
            console.log('下载任务已启动');
        });
}
```

### 3. 添加取消其他下载任务的功能

当一个下载成功时，取消所有其他下载任务：

```javascript
// 取消所有其他下载任务
cancelAllOtherDownloadTasks: function(currentTask) {
    console.log('取消所有其他下载任务');

    // 如果有当前下载任务，尝试取消
    if (this.downloadTask && this.downloadTask !== currentTask) {
        try {
            console.log('取消当前下载任务');
            this.downloadTask.abort();
            console.log('当前下载任务已取消');
        } catch (error) {
            console.error('取消当前下载任务失败:', error);
        }
    }

    // 尝试取消所有下载任务列表中的任务
    for (let i = 0; i < this.allDownloadTasks.length; i++) {
        const task = this.allDownloadTasks[i];
        if (task !== currentTask && task.state < 4) { // 如果任务不是当前任务且任务还在进行中
            try {
                console.log('取消下载任务:', i);
                task.abort();
            } catch (error) {
                console.error('取消下载任务失败:', error);
            }
        }
    }

    // 清空下载任务列表，只保留当前任务
    this.allDownloadTasks = currentTask ? [currentTask] : [];
}
```

### 4. 修改主下载函数

修改主下载函数，使用新的下载逻辑：

```javascript
// 下载并解压会议ZIP压缩包
downloadAndExtractMeetingPackage: function(meetingId) {
    return new Promise((resolve, reject) => {
        console.log('开始下载会议ZIP压缩包, ID:', meetingId);

        // 重置下载成功标志
        this.isDownloadSucceeded = false;

        // 清空下载任务列表
        this.allDownloadTasks = [];

        // 触发下载开始事件
        this.triggerEvent('downloadStart', { meetingId: meetingId });

        // 生成IP集合
        const ipPool = this.generateIpPool();
        console.log('生成的IP集合:', ipPool.map(ip => ip.ip).join(','));

        if (ipPool.length === 0) {
            console.error('没有可用的服务器IP');
            this.triggerEvent('downloadError', { meetingId: meetingId, status: 'no_servers' });
            resolve();
            return;
        }

        // 随机打乱IP池顺序
        for (let i = ipPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ipPool[i], ipPool[j]] = [ipPool[j], ipPool[i]];
        }

        // 选择第一个服务器开始下载
        const firstServer = ipPool.shift();
        const remainingServers = ipPool; // 剩余的服务器

        // 使用辅助函数尝试下载
        this.tryDownloadWithServer(firstServer, meetingId, remainingServers, resolve, reject);
    });
}
```

## 最终实现

经过优化，我们实现了一个高效、可靠的多服务器下载机制，具有以下特点：

1. **严格的顺序下载**：一次只有一个下载任务在执行，避免资源浪费
2. **随机服务器选择**：随机打乱IP池顺序，避免总是从同一个服务器开始下载
3. **下载成功标志**：使用全局标志标记下载成功，避免重复下载
4. **取消其他任务**：当一个下载成功时，立即取消所有其他下载任务
5. **多重检查**：在多个关键点检查下载成功标志，确保不会有多余的下载任务启动

## 测试结果

测试表明，优化后的多服务器下载机制能够正确工作：

1. 当第一个服务器下载失败时，系统会尝试下一个服务器
2. 当任何一个服务器下载成功时，系统会立即取消所有其他下载任务
3. 不会出现多个下载任务同时执行的情况
4. 下载成功后，系统会正确进入解压和后续流程

## 未来改进

虽然当前实现已经能够满足需求，但仍有一些可能的改进点：

1. **超时处理**：添加全局超时机制，避免下载任务长时间无响应
2. **断点续传**：实现断点续传功能，提高大文件下载的可靠性
3. **并发限制**：允许有限的并发下载，但设置最大并发数，平衡速度和资源使用
4. **智能重试**：根据网络状况和服务器响应时间，动态调整重试策略
5. **下载进度合并**：当切换服务器时，合并下载进度，提供更准确的进度显示

## 版本回退与功能移除

经过评估，我们决定回退多服务器下载功能，恢复到单服务器下载模式。这一决定基于以下考虑：

1. **架构调整**：系统架构调整为使用分布式文件服务节点，而不是前端直接管理多服务器下载
2. **简化前端逻辑**：移除前端的IP池生成和多服务器下载逻辑，简化前端代码
3. **集中管理下载**：由后端分布式文件服务节点负责文件同步和分发，前端只需连接到单一服务器

### 移除的功能

1. **IP池生成功能**：移除了前端的IP池生成逻辑
2. **多服务器下载逻辑**：移除了尝试多个服务器下载的逻辑
3. **服务器数量配置**：从选项页面移除了服务器数量配置

### 保留的功能

1. **基本下载功能**：保留了基本的文件下载功能，但只使用单一服务器
2. **下载进度显示**：保留了下载进度显示功能
3. **解压和文件管理**：保留了文件解压和管理功能

### 新的架构

在新的架构中，分布式文件服务节点负责：

1. 从主控服务器获取会议状态
2. 同步下载会议文件
3. 为前端提供文件下载服务

前端只需连接到配置的单一服务器，无需关心多服务器下载逻辑。

更新日期：2025年04月25日
