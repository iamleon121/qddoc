// init.js - 无纸化会议系统初始化控制器

// 更新加载文本
function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

// 显示错误信息
function showError(message) {
    const errorText = document.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = message;
        errorText.style.display = 'block';
    }
}

// 隐藏错误信息
function hideError() {
    const errorText = document.querySelector('.error-text');
    if (errorText) {
        errorText.style.display = 'none';
    }
}

document.addEventListener('plusready', function() {
    // 检查本地存储是否存在
    console.log('plusready事件触发，初始化应用');
    updateLoadingText('正在检查系统数据...');

    // 尝试从设置中读取标题文字
    try {
        const storedSettings = plus.storage.getItem('option');
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            if (parsedSettings && parsedSettings.option && parsedSettings.option.titleText) {
                const titleText = parsedSettings.option.titleText;
                // 不输出标题文字相关提示

                // 更新页面上的标题文字
                const logoTextElement = document.querySelector('.logo-text');
                if (logoTextElement) {
                    logoTextElement.textContent = titleText;
                }
            }
        }
    } catch (error) {
        console.error('读取标题文字设置失败:', error);
    }

    // 检查本地存储是否存在
    function checkLocalStorage() {
        try {
            console.log('开始检查本地存储...');
            // 检查meetingData是否存在
            const meetingData = plus.storage.getItem('meetingData');
            console.log('meetingData存储状态:', meetingData ? '存在' : '不存在');

            // 检查meetingStatus是否存在
            const statusData = plus.storage.getItem('meetingStatus');
            console.log('meetingStatus存储状态:', statusData ? '存在' : '不存在');

            // 检查option是否存在
            const optionData = plus.storage.getItem('option');
            console.log('option存储状态:', optionData ? '存在' : '不存在');

            // 如果option不存在，创建默认option数据
            if (!optionData) {
                console.log('option数据不存在，创建默认数据');
                updateLoadingText('正在初始化系统配置...');
                createOptionStorage();
            }

            // 检查会议数据和状态数据是否存在
            if (meetingData && statusData) {
                console.log('会议数据和状态数据均存在，直接跳转到service页面');
                updateLoadingText('正在加载应用...');
                // 如果本地存储存在，直接跳转到service页面
                navigateToService();
            } else {
                console.log('会议数据或状态数据不存在，创建默认数据');
                // 如果本地存储不存在，直接创建默认数据
                updateLoadingText('正在初始化系统数据...');
                createLocalStorage();
            }
        } catch (e) {
            console.error('检查本地存储失败:', e);
            showError('系统初始化失败，正在尝试重新初始化...');
            createLocalStorage();
            createOptionStorage(); // 同时创建option数据
        }
    }

    // 创建本地存储
    function createLocalStorage() {
        try {
            // 直接创建默认会议数据 {"id":"1"}
            plus.storage.setItem('meetingData', JSON.stringify({id: "1"}));
            console.log('已创建默认会议数据');

            // 创建默认会议状态数据
            plus.storage.setItem('meetingStatus', JSON.stringify({token: "initial", status: "not_started"}));
            console.log('已创建默认会议状态数据');

            updateLoadingText('数据初始化完成，正在启动应用...');
            navigateToService();
        } catch (e) {
            console.error('创建本地存储失败:', e);
            showError('系统初始化失败');
            setTimeout(() => {
                plus.nativeUI.alert('初始化数据失败，请重启应用', function() {
                    plus.runtime.quit();
                }, '错误');
            }, 1000);
        }
    }

    // 创建option本地存储
    function createOptionStorage() {
        try {
            // 创建默认option数据
            const defaultOption = {
                option: {
                    server: '192.168.110.10',
                    port: '80',
                    intertime: '10',
                    titleText: '中国人民政治协商会议阜新市委员会' // 默认标题文字
                }
            };
            plus.storage.setItem('option', JSON.stringify(defaultOption));
            console.log('已创建默认option数据:', JSON.stringify(defaultOption));
        } catch (e) {
            console.error('创建option存储失败:', e);
            showError('系统配置初始化失败');
            setTimeout(() => {
                plus.nativeUI.alert('初始化配置失败，请重启应用', function() {
                    plus.runtime.quit();
                }, '错误');
            }, 1000);
        }
    }

    // 创建本地存储函数已在上方定义

    // 跳转到service页面
    function navigateToService() {
        console.log('准备跳转到service页面...');

        // 检查是否已经有service页面存在
        try {
            const existingService = plus.webview.getWebviewById('service');
            if (existingService) {
                console.log('service页面已存在，显示已有页面');
                existingService.show();
                return;
            }
        } catch (error) {
            console.error('检查service页面时出错:', error);
        }

        // 如果没有已存在的service页面，创建新页面
        try {
            console.log('创建新的service页面');
            plus.webview.open('service.html', 'service', {
                scrollIndicator: 'none',
                scalable: false
            }, function(w) {
                // 成功回调
                console.log('service页面打开成功:', w ? w.id : 'unknown');
            }, function(e) {
                // 失败回调
                console.error('service页面打开失败:', e.message);
                // 尝试使用更简单的方式打开
                plus.webview.open('service.html');
            });
        } catch (error) {
            console.error('跳转到service页面时出错:', error);
            // 尝试使用浏览器原生方式跳转
            window.location.href = 'service.html';
        }
    }

    // 启动检查
    checkLocalStorage();
});
