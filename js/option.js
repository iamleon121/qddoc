// option.js - 无纸化会议系统设置控制器

// 设置控制器对象
const OptionService = {
    // 默认设置
    defaultSettings: {
        server: '192.168.110.10',
        port: '8000',
        intertime: '10',
        titleText: '政协阜新市委员会', // 默认标题文字
        showClickHint: 'true' // 默认显示点击提示
    },

    // 当前设置
    currentSettings: null,

    // 初始化设置服务
    init: function() {
        console.log('初始化设置服务');

        // 确保plus环境完全就绪
        if (!this.initializePlus()) {
            setTimeout(() => this.init(), 500);
            return;
        }

        // 从本地存储加载设置
        this.loadSettings();

        // 设置页面元素事件
        this.setupEventListeners();

        // 时间显示功能已移除
    },

    // 初始化plus环境
    initializePlus: function() {
        if (typeof plus === 'undefined' || typeof plus.storage === 'undefined') {
            console.error('plus环境未完全初始化');
            return false;
        }
        return true;
    },

    // 从本地存储加载设置
    loadSettings: function() {
        try {
            const storedSettings = plus.storage.getItem('option');
            if (storedSettings) {
                console.log('从本地存储加载设置:', storedSettings);
                const parsedSettings = JSON.parse(storedSettings);
                // 确保数据格式正确
                if (parsedSettings && parsedSettings.option) {
                    this.currentSettings = parsedSettings.option;
                    console.log('成功加载设置:', this.currentSettings);
                } else {
                    console.warn('设置数据格式不正确，使用默认设置');
                    this.currentSettings = { ...this.defaultSettings };
                }
            } else {
                // 如果没有保存的设置，使用默认设置
                this.currentSettings = { ...this.defaultSettings };
                console.log('未找到设置，使用默认设置');
            }

            // 更新页面上的设置值
            this.updateSettingsUI();
        } catch (error) {
            console.error('加载设置失败:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.updateSettingsUI();
        }
    },

    // 保存设置到本地存储
    saveSettings: function() {
        try {
            // 从UI获取设置值
            const serverUrlInput = document.getElementById('server-url');
            const serverPortInput = document.getElementById('server-port');
            const updateIntervalInput = document.getElementById('update-interval');
            const titleTextInput = document.getElementById('title-text');
            const showClickHintSelect = document.getElementById('show-click-hint');

            if (!serverUrlInput || !updateIntervalInput) {
                console.error('找不到设置输入元素');
                return false;
            }

            // 验证输入
            const server = serverUrlInput.value.trim();
            const port = serverPortInput ? serverPortInput.value.trim() : this.defaultSettings.port;
            const intertime = updateIntervalInput.value.trim();
            const titleText = titleTextInput ? titleTextInput.value.trim() : this.defaultSettings.titleText;
            const showClickHint = showClickHintSelect ? showClickHintSelect.value : this.defaultSettings.showClickHint;

            if (!server) {
                alert('请输入有效的服务器地址');
                return false;
            }

            if (port) {
                const portNum = parseInt(port);
                if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                    alert('请输入有效的端口号（1-65535）');
                    return false;
                }
            }



            const updateInterval = parseInt(intertime);
            if (isNaN(updateInterval) || updateInterval < 5) {
                alert('请输入有效的更新间隔（最小5秒）');
                return false;
            }

            // 更新当前设置
            this.currentSettings = {
                server: server,
                port: port,
                intertime: intertime,
                titleText: titleText,
                showClickHint: showClickHint
            };

            // 保存到本地存储，使用与init.js相同的格式
            const optionData = {
                option: this.currentSettings
            };

            const settingsString = JSON.stringify(optionData);
            plus.storage.setItem('option', settingsString);
            console.log('设置已保存:', settingsString);

            // 立即更新main页面的标题文字
            this.updateMainPageTitle();

            // 通知用户，使用更长的延迟确保更新操作完成
            setTimeout(() => {
                alert('设置已保存');
            }, 500);

            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存设置失败: ' + error.message);
            return false;
        }
    },

    // 更新设置UI
    updateSettingsUI: function() {
        const serverUrlInput = document.getElementById('server-url');
        const serverPortInput = document.getElementById('server-port');
        const updateIntervalInput = document.getElementById('update-interval');
        const titleTextInput = document.getElementById('title-text');
        const showClickHintSelect = document.getElementById('show-click-hint');

        if (serverUrlInput && this.currentSettings.server) {
            serverUrlInput.value = this.currentSettings.server;
        }

        if (serverPortInput && this.currentSettings.port) {
            serverPortInput.value = this.currentSettings.port;
        }

        if (updateIntervalInput && this.currentSettings.intertime) {
            updateIntervalInput.value = this.currentSettings.intertime;
        }

        if (titleTextInput && this.currentSettings.titleText) {
            titleTextInput.value = this.currentSettings.titleText;
        }

        if (showClickHintSelect && this.currentSettings.showClickHint) {
            showClickHintSelect.value = this.currentSettings.showClickHint;
        }
    },



    // 设置页面元素事件
    setupEventListeners: function() {
        // 保存按钮点击事件
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                if (this.saveSettings()) {
                    // 保存成功后延迟返回，使用更长的延迟确保更新操作完成
                    setTimeout(() => {
                        this.returnToPreviousPage();
                    }, 1000);
                }
            });
        }

        // 取消按钮点击事件
        const cancelButton = document.getElementById('cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.returnToPreviousPage();
            });
        }
    },

    // 返回上一页
    returnToPreviousPage: function() {
        if (typeof plus !== 'undefined' && plus.webview) {
            // 在关闭页面前先更新main页面的标题文字
            this.updateMainPageTitle();

            // 延迟一下关闭页面，确保更新操作完成
            setTimeout(() => {
                const currentWebview = plus.webview.currentWebview();
                currentWebview.close();
            }, 100);
        } else {
            history.back();
        }
    },

    // 更新main页面的标题文字
    updateMainPageTitle: function() {
        try {
            // 获取标题文字
            const titleText = this.getTitleText();
            // 不输出标题文字更新提示

            // 尝试获取所有页面
            const webviews = plus.webview.all();
            console.log('当前所有页面:', webviews.map(w => w.id || 'unknown').join(', '));

            // 尝试获取main页面
            let mainPage = plus.webview.getWebviewById('main');

            // 如果找不到main页面，尝试获取首页
            if (!mainPage) {
                console.log('找不到main页面，尝试获取首页');
                // 尝试获取首页
                const homePage = plus.webview.getLaunchWebview();
                if (homePage) {
                    mainPage = homePage;
                    console.log('使用首页作为main页面');
                }
            }

            if (mainPage) {
                // 如果找到页面，强制更新标题文字
                // 不输出标题文字更新提示

                // 使用更简单的方式更新标题文字
                mainPage.evalJS(
                    "try {\n" +
                    "    var logoText = document.querySelector('.logo-text');\n" +
                    "    if (logoText) {\n" +
                    "        logoText.innerText = '" + titleText + "';\n" +
                    "        // 不输出标题文字更新提示\n" +
                    "    } else {\n" +
                    "        console.error('\u627e\u4e0d\u5230logo-text\u5143\u7d20');\n" +
                    "    }\n" +
                    "} catch(e) {\n" +
                    "    console.error('\u66f4\u65b0\u6807\u9898\u6587\u5b57\u5931\u8d25:', e);\n" +
                    "}\n"
                );

                // 强制刷新页面
                mainPage.reload(true);

                // 不输出标题文字更新提示
            } else {
                console.log('无法找到任何可用页面，无法更新标题文字');
            }
        } catch (error) {
            console.error('更新main页面标题文字失败:', error);
        }
    },

    // 获取当前设置
    getSettings: function() {
        return this.currentSettings || this.defaultSettings;
    },

    // 获取服务器地址
    getServerUrl: function() {
        return (this.currentSettings && this.currentSettings.server) || this.defaultSettings.server;
    },

    // 获取服务器端口
    getServerPort: function() {
        return (this.currentSettings && this.currentSettings.port) || this.defaultSettings.port;
    },



    // 获取更新间隔（秒）
    getUpdateInterval: function() {
        return (this.currentSettings && this.currentSettings.intertime) || this.defaultSettings.intertime;
    },

    // 获取标题文字
    getTitleText: function() {
        return (this.currentSettings && this.currentSettings.titleText) || this.defaultSettings.titleText;
    },

    // 获取是否显示点击提示
    getShowClickHint: function() {
        return (this.currentSettings && this.currentSettings.showClickHint) || this.defaultSettings.showClickHint;
    }
};

// 在plusready事件中初始化设置服务
document.addEventListener('plusready', function() {
    // 检查并管理option页面，确保只有一个实例
    const cleaned = checkAndManageOptionPage(true); // 保留当前页面
    if (cleaned) {
        console.log('option页面单例检查完成，已清理多余实例');
    } else {
        console.log('option页面单例检查完成，无需清理');
    }

    OptionService.init();
});

// 导出设置服务对象
window.OptionService = OptionService;
