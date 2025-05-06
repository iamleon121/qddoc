# 无纸化会议系统前端当前状态

本文档详细描述了无纸化会议系统前端的当前状态、实现细节和最近的改进。

## 目录

1. [系统架构](#系统架构)
2. [核心模块](#核心模块)
3. [数据流程](#数据流程)
4. [文件结构](#文件结构)
5. [最近改进](#最近改进)
6. [已知问题](#已知问题)
7. [下一步计划](#下一步计划)

## 系统架构

无纸化会议系统前端采用HTML5+技术开发，主要由以下几个部分组成：

### 页面结构

- **init.html**: 初始化页面，负责系统启动和初始配置
- **service.html**: 服务页面，负责后台数据轮询和状态监控
- **main.html**: 主页面，显示会议信息和提供会议入口
- **list.html**: 会议列表页面，显示会议议题和文件
- **file.html**: 文件查看页面，用于查看会议文档
- **option.html**: 设置页面，用于配置系统参数

### 技术栈

- **UI框架**: 原生HTML/CSS
- **脚本语言**: JavaScript
- **存储**: LocalStorage、HTML5+ FileSystem
- **网络请求**: XMLHttpRequest
- **设备API**: HTML5+ API

## 核心模块

### 1. 初始化模块 (init.js)

初始化模块负责系统启动和初始配置，主要功能包括：

- 检查本地存储是否存在
- 创建默认配置和数据
- 初始化会议状态存储
- 跳转到服务页面

```javascript
// 检查本地存储是否存在
function checkLocalStorage() {
    try {
        // 检查meetingData是否存在
        const meetingData = plus.storage.getItem('meetingData');
        // 检查meetingStatus是否存在
        const statusData = plus.storage.getItem('meetingStatus');
        // 检查option是否存在
        const optionData = plus.storage.getItem('option');

        // 如果option不存在，创建默认option数据
        if (!optionData) {
            createOptionStorage();
        }

        // 检查会议数据和状态数据是否存在
        if (meetingData && statusData) {
            // 如果本地存储存在，直接跳转到service页面
            navigateToService();
        } else {
            // 如果本地存储不存在，直接创建默认数据
            createLocalStorage();
        }
    } catch (e) {
        console.error('检查本地存储失败:', e);
        createLocalStorage();
        createOptionStorage();
    }
}
```

### 2. 服务模块 (service.js)

服务模块是系统的核心，负责与后端通信、数据同步和状态监控，主要功能包括：

- 定期轮询会议状态
- 检测状态变化并触发事件
- 管理本地数据存储
- 处理网络错误和恢复

```javascript
// 设置数据获取定时器
setupStatusTimer: function() {
    // 清除现有的定时器
    if (this.statusTimer) {
        clearInterval(this.statusTimer);
        this.statusTimer = null;
    }

    console.log('设置状态获取定时器，间隔:', this.updateInterval, '毫秒');

    // 状态获取定时器 - 严格按照配置的间隔时间
    this.statusTimer = setInterval(() => {
        if (!this.isServiceEnabled) {
            return; // 如果服务被禁用，直接返回
        }

        // 只在没有正在进行的状态获取时才获取状态
        if (!this.isStatusFetching) {
            console.log('定时器触发，获取会议状态，间隔:', this.updateInterval, '毫秒');
            this.getMeetingStatus();
        }
    }, this.updateInterval); // 严格使用配置的间隔时间
}
```

### 3. 主页面模块 (main.js)

主页面模块负责显示会议信息和提供会议入口，主要功能包括：

- 显示会议标题和介绍
- 显示当前时间
- 提供参加会议入口
- 监听会议状态变化

```javascript
// 初始化主页面
function initMainPage() {
    // 从本地存储获取会议数据
    const meetingData = getMeetingDataFromStorage();
    if (meetingData) {
        // 更新页面显示
        updateMeetingInfo(meetingData);
        // 设置页面事件监听
        setupEventListeners();
    } else {
        console.error('无法获取会议数据');
    }
}
```

### 4. 设置模块 (option.js)

设置模块负责系统配置管理，主要功能包括：

- 服务器地址配置
- 服务器端口配置
- 更新间隔设置
- 标题文字设置
- 点击提示显示配置
- 配置保存和加载

```javascript
// 保存设置到本地存储
saveSettings: function() {
    try {
        // 从UI获取设置值
        const serverUrlInput = document.getElementById('server-url');
        const serverPortInput = document.getElementById('server-port');
        const updateIntervalInput = document.getElementById('update-interval');
        const titleTextInput = document.getElementById('title-text');

        // 验证输入
        const server = serverUrlInput.value.trim();
        const port = serverPortInput ? serverPortInput.value.trim() : this.defaultSettings.port;
        const intertime = updateIntervalInput.value.trim();
        const titleText = titleTextInput ? titleTextInput.value.trim() : this.defaultSettings.titleText;

        // 更新当前设置
        this.currentSettings = {
            server: server,
            port: port,
            intertime: intertime,
            titleText: titleText
        };

        // 保存到本地存储
        const optionData = {
            option: this.currentSettings
        };

        const settingsString = JSON.stringify(optionData);
        plus.storage.setItem('option', settingsString);

        // 立即更新main页面的标题文字
        this.updateMainPageTitle();

        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        return false;
    }
}
```

## 数据流程

### 1. 数据获取流程

1. 服务模块定期轮询后端API获取会议状态
2. 检测到状态变更时，更新本地存储
3. 触发状态变更事件，通知相关页面更新

### 2. 文件处理流程

1. 用户在会议列表页面选择文件
2. 文件查看页面加载文件内容
3. 根据文件类型（JPG/PDF）选择不同的查看器
4. 提供文件导航和交互功能

## 最近改进

### 1. 实现随机延时下载功能

为了避免大量客户端同时从服务器下载数据造成拥堵，我们实现了随机延时下载功能：

```javascript
// 生成随机延时时间
generateRandomDelay: function() {
    // 第一重随机：前一分钟(0-60秒)被选中的概率是75%，后一分钟(70-120秒)被选中的概率是25%
    const firstMinuteProbability = 0.75;
    const isFirstMinute = Math.random() < firstMinuteProbability;

    // 根据第一重随机结果，确定可能的延时节点范围
    const possibleNodes = isFirstMinute
        ? this.delayTimeNodes.filter(node => node <= 60)
        : this.delayTimeNodes.filter(node => node > 60);

    // 第二重随机：在确定的分钟内，随机选择具体的延时节点
    const randomIndex = Math.floor(Math.random() * possibleNodes.length);
    const selectedDelay = possibleNodes[randomIndex];

    console.log(`随机延时生成：${isFirstMinute ? '前一分钟' : '后一分钟'}被选中，具体延时为${selectedDelay}秒`);
    return selectedDelay;
}
```

延时下载功能在loading界面显示倒计时，UI设计简洁明了，使用大号字体（60px）显示倒计时时间：

```javascript
// 执行延时等待
performDelayedDownload: function(meetingId, resolve, reject) {
    // 生成随机延时时间
    this.delaySeconds = this.generateRandomDelay();

    if (this.delaySeconds === 0) {
        console.log('无需延时，直接开始下载');
        this.startDownloadProcess(meetingId, resolve, reject);
        return;
    }

    console.log(`开始延时下载，等待${this.delaySeconds}秒后开始`);
    this.isDelaying = true;

    // 触发延时开始事件
    this.triggerEvent('delayStart', {
        meetingId: meetingId,
        delaySeconds: this.delaySeconds
    });

    // 设置倒计时更新的间隔（每秒）
    let remainingSeconds = this.delaySeconds;

    // 创建定时器，每秒更新一次倒计时
    const countdownInterval = setInterval(() => {
        remainingSeconds--;

        // 触发倒计时更新事件
        this.triggerEvent('delayCountdown', {
            meetingId: meetingId,
            remainingSeconds: remainingSeconds,
            totalSeconds: this.delaySeconds
        });

        // 检查是否已取消
        if (this.isCancelled) {
            console.log('延时过程被取消');
            clearInterval(countdownInterval);
            if (this.delayTimeoutId) {
                clearTimeout(this.delayTimeoutId);
                this.delayTimeoutId = null;
            }
            this.isDelaying = false;
            reject(new Error('操作已取消'));
            return;
        }

        // 倒计时结束
        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);

    // 设置延时结束后的操作
    this.delayTimeoutId = setTimeout(() => {
        clearInterval(countdownInterval);
        this.isDelaying = false;
        this.delayTimeoutId = null;

        // 触发延时结束事件
        this.triggerEvent('delayEnd', {
            meetingId: meetingId
        });

        // 开始实际的下载过程
        this.startDownloadProcess(meetingId, resolve, reject);
    }, this.delaySeconds * 1000);
}
```

### 2. 增强数据一致性保护

改进了数据存储逻辑，确保只有在会议文件成功下载并解压后，才更新本地存储中的会议信息：

```javascript
// 暂存数据，但不立即保存到本地存储
this.meetingData = jsonData;
const jsonString = JSON.stringify(jsonData);

console.log('会议数据包解析成功，准备下载文件');

// 触发数据初始化事件，但不更新本地存储
this.triggerEvent('dataInit', jsonData);

// 下载并解压会议ZIP压缩包
this.downloadAndExtractMeetingPackage(meetingId)
    .then(() => {
        console.log('会议ZIP压缩包下载并解压成功');

        // 下载成功后，才保存会议数据到本地存储
        console.log('下载成功，更新本地存储的数据内容');
        plus.storage.setItem('meetingData', jsonString);

        // 触发数据获取完成事件
        this.triggerEvent('dataFetchComplete', jsonData);
        this.isDataFetching = false;
        resolve(jsonData);
    })
    .catch(error => {
        console.error('会议ZIP压缩包下载或解压失败:', error);

        // 下载失败，不更新本地存储
        console.log('下载失败，不更新本地存储的数据内容');

        // 触发下载失败事件
        this.triggerEvent('downloadFailed', {
            meetingId: meetingId,
            error: error.message || String(error)
        });

        this.isDataFetching = false;

        // 尝试从本地存储中恢复旧的会议数据
        try {
            const oldMeetingData = plus.storage.getItem('meetingData');
            if (oldMeetingData) {
                console.log('从本地存储中恢复旧的会议数据');
                this.meetingData = JSON.parse(oldMeetingData);
            }
        } catch (storageError) {
            console.error('恢复旧的会议数据失败:', storageError);
        }

        reject(new Error('会议文件下载失败，无法更新会议数据'));
    });
```

在用户取消下载操作时，同样不更新本地存储中的会议信息：

```javascript
// 取消当前操作
cancelOperation: function() {
    console.log('收到取消操作请求');

    // 设置取消标志
    this.isCancelled = true;

    // 取消延时等待
    if (this.isDelaying && this.delayTimeoutId) {
        try {
            console.log('取消延时等待');
            clearTimeout(this.delayTimeoutId);
            this.delayTimeoutId = null;
            this.isDelaying = false;
            console.log('延时等待已取消');

            // 触发延时取消事件
            this.triggerEvent('delayCancelled', {
                message: '延时等待已取消',
                delaySeconds: this.delaySeconds
            });
        } catch (error) {
            console.error('取消延时等待失败:', error);
        }
    }

    // 取消下载任务
    if (this.downloadTask) {
        try {
            console.log('取消下载任务');
            this.downloadTask.abort();
            this.downloadTask = null;
            console.log('下载任务已取消');
        } catch (error) {
            console.error('取消下载任务失败:', error);
        }
    }

    // 触发取消事件
    this.triggerEvent('operationCancelled', {
        message: '操作已取消',
        cancelledAt: new Date().toISOString()
    });

    // 触发下载失败事件，确保UI能够正确处理
    this.triggerEvent('downloadFailed', {
        error: '用户取消了操作',
        message: '用户取消了操作，下载未完成'
    });

    return true;
}
```

### 3. 优化UI设计

简化了倒计时界面，移除了重复的文字提示和滚动条，增大了倒计时文字大小：

```html
<!-- 延时倒计时显示 -->
<div class="delay-countdown" style="display: none;">
    <div class="countdown-timer">
        <span id="countdown-minutes">00</span>:<span id="countdown-seconds">00</span>
    </div>
</div>
```

```css
.countdown-timer {
    font-size: 60px; /* 增大字体大小 */
    font-weight: bold;
    color: #4CAF50;
    text-shadow: 0 0 15px rgba(76, 175, 80, 0.6); /* 增强文字阴影效果 */
    margin: 15px 0;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px; /* 增加字母间距，提高可读性 */
}
```

添加了响应式设计，在不同屏幕尺寸上调整倒计时文字大小：

```css
@media (max-width: 768px) {
    .countdown-timer {
        font-size: 48px; /* 中等屏幕上稍微减小字体大小 */
        letter-spacing: 1px;
    }
}

@media (max-width: 480px) {
    .countdown-timer {
        font-size: 36px; /* 小屏幕上进一步减小字体大小 */
        letter-spacing: 0;
        margin: 10px 0;
    }
}
```

### 4. 增强loading页面功能

重新设计了loading页面，移除了底部按钮，并增加了自动下载和解压会议文件的功能：

```javascript
// 自动返回主页面
LoadingService.addEventListener('extractComplete', function(data) {
    console.log('解压完成:', data.meetingId);
    updateLoadingText('文件解压完成，准备返回主页面...');
    stopProgressAnimation();
    setProgress(100);

    // 自动返回主页面
    setTimeout(function() {
        returnToMain();
    }, 1000); // 等待1秒后自动返回主页面
});
```

### 2. 实现会议文件自动下载和解压

添加了会议文件自动下载和解压功能，使用plus.io和plus.zip模块处理文件：

```javascript
// 下载并解压会议ZIP压缩包
downloadAndExtractMeetingPackage: function(meetingId) {
    return new Promise((resolve, reject) => {
        console.log('开始下载会议ZIP压缩包, ID:', meetingId);

        // 触发下载开始事件
        this.triggerEvent('downloadStart', { meetingId: meetingId });

        // 构建下载URL
        const downloadUrl = this.meetingPackageUrl + meetingId + '/download-package';
        console.log('下载URL:', downloadUrl);

        // 确保下载文件夹存在
        this.ensureDirectoryExists('_doc/download/')
            .then(() => {
                // 创建下载任务
                const dtask = plus.downloader.createDownload(downloadUrl, {
                    filename: '_doc/download/meeting_' + meetingId + '.zip',
                    timeout: 30, // 超时时间，单位为秒
                    retry: 3 // 重试次数
                }, (d, status) => {
                    // 下载完成后的处理...
                });

                // 监听下载进度
                dtask.addEventListener('statechanged', (task, status) => {
                    // 下载进度处理...
                });

                // 开始下载任务
                dtask.start();
            });
    });
}
```

### 3. 优化文件管理

实现了本地文件管理功能，确保只保留最新的会议文件，避免占用过多存储空间：

```javascript
// 清空所有会议文件夹
cleanAllMeetingFolders: function(basePath) {
    return new Promise((resolve, reject) => {
        console.log('清空所有会议文件夹:', basePath);

        plus.io.resolveLocalFileSystemURL(basePath, entry => {
            const reader = entry.createReader();
            reader.readEntries(entries => {
                // 过滤出所有文件夹
                const folders = entries.filter(entry => entry.isDirectory);

                console.log('找到', folders.length, '个文件夹需要删除');

                // 删除所有文件夹
                let deletedCount = 0;
                folders.forEach(folder => {
                    console.log('删除文件夹:', folder.name);
                    folder.removeRecursively(() => {
                        console.log('文件夹已删除:', folder.name);
                        deletedCount++;
                        if (deletedCount === folders.length) {
                            resolve();
                        }
                    }, error => {
                        console.error('删除文件夹失败:', folder.name, error);
                        deletedCount++;
                        if (deletedCount === folders.length) {
                            resolve();
                        }
                    });
                });
            });
        });
    });
}
```

### 4. 添加会议状态本地存储

为了支持会议状态的监控和同步，我们添加了会议状态的本地存储：

```javascript
// 创建默认会议状态数据
plus.storage.setItem('meetingStatus', JSON.stringify({token: "initial", status: "not_started"}));
```

### 5. 优化状态轮询机制

修改了service.js中的状态轮询机制，使其严格按照配置中设定的间隔时间执行：

```javascript
// 状态获取定时器 - 严格按照配置的间隔时间
this.statusTimer = setInterval(() => {
    if (!this.isServiceEnabled) {
        return; // 如果服务被禁用，直接返回
    }

    // 只在没有正在进行的状态获取时才获取状态
    if (!this.isStatusFetching) {
        console.log('定时器触发，获取会议状态，间隔:', this.updateInterval, '毫秒');
        this.getMeetingStatus();
    }
}, this.updateInterval); // 严格使用配置的间隔时间
```

### 6. 添加端口号设置

在设置页面添加了服务器端口号设置，默认值为8000：

```html
<div class="option-item">
    <label class="option-label" for="server-port">服务器端口</label>
    <input type="number" id="server-port" class="option-input" min="1" max="65535" placeholder="请输入服务器端口">
</div>
```

### 7. 改进页面跳转机制

添加了备用跳转机制，确保即使在网络错误或其他问题的情况下，应用也能从init页面跳转到service页面：

```javascript
// 添加备用跳转机制，确保即使其他方式失败也能跳转
window.onload = function() {
    // 5秒后如果还在init页面，尝试直接跳转
    setTimeout(function() {
        // 检查是否仍然在init页面
        if (document.querySelector('.loading-text')) {
            console.log('备用跳转机制触发，直接跳转到service页面');
            try {
                if (typeof plus !== 'undefined') {
                    plus.webview.open('service.html', 'service');
                } else {
                    window.location.href = 'service.html';
                }
            } catch (e) {
                console.error('备用跳转失败:', e);
                window.location.href = 'service.html';
            }
        }
    }, 5000);
};
```

### 8. 修复UI层叠问题

修复了option页面中设置弹出框被会议标题文字遮挡的问题：

```css
.option-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 500px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: 2000; /* 确保设置弹出框在标题文字之上，比logo的z-index更高 */
}
```

## 已知问题

1. **网络错误处理**: 当网络不可用时，状态轮询会持续失败，需要更好的错误处理和重试机制
2. **多设备同步**: 当多个设备同时使用时，可能会出现数据不一致的情况
3. **大文件处理**: 大型会议文件的下载和显示可能会导致性能问题
4. **缓存管理**: 本地缓存的文件可能会占用大量存储空间，需要更好的缓存管理策略
5. **解压状态码处理**: 当前解压状态码处理逻辑有问题，导致即使解压成功也会先报告“解压失败”然后再报告“解压成功”
6. **事件处理器错误**: 在某些情况下会出现“Cannot read properties of null (reading 'style')”错误，需要添加更多的防御性检查

## 下一步计划

1. **实现与后端API的完整集成**: 完成所有API接口的对接，实现真实数据的获取和同步
2. **优化离线支持**: 增强离线模式下的功能，确保在网络不可用时仍能查看会议文档
3. **改进用户界面**: 优化UI设计，提升用户体验
4. **增强安全性**: 实现更安全的数据传输和存储机制
5. **性能优化**: 优化大文件处理和页面渲染性能

更新日期：2025年5月6日
