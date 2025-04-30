// 更新标题文字
function updateTitleText() {
    try {
        // 从设置中获取标题文字
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
                    // 不输出标题文字相关提示

                    // 确保标题文字始终显示
                    logoTextElement.style.display = '';
                    // 添加日志以跟踪标题文字更新
                    console.log('标题文字已更新为:', titleText);
                } else {
                    console.error('找不到logo-text元素');
                }
            } else {
                console.log('设置中没有标题文字配置');
            }
        } else {
            console.log('未找到设置数据');
        }
    } catch (error) {
        console.error('读取标题文字设置失败:', error);
    }
}

document.addEventListener('plusready', function() {
    //console.log("plusready");

    // 设置当前页面的ID为'main'，便于其他页面找到并操作它
    const currentWebview = plus.webview.currentWebview();
    currentWebview.id = 'main';
    console.log('已设置当前页面ID为: main');

    // 检查并管理main页面，确保只有一个实例
    const cleaned = checkAndManageMainPage(true); // 保留当前页面
    if (cleaned) {
        console.log('main页面单例检查完成，已清理多余实例');
    } else {
        console.log('main页面单例检查完成，无需清理');
    }

    // 添加页面关闭事件监听
    currentWebview.addEventListener('close', function() {
        console.log('main页面即将关闭，通知service模块');
        // 获取service页面
        const serviceView = plus.webview.getWebviewById('service');
        if (serviceView) {
            // 在service页面中执行监测页面关闭的方法
            serviceView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.monitorPageClosing(); }');
        }
    });

    // 打印所有页面信息，用于调试
    const webviews = plus.webview.all();
    console.log('当前所有页面:', webviews.map(w => w.id || 'unknown').join(', '));

    // 禁止返回
    plus.key.addEventListener('backbutton', function() {
        plus.nativeUI.confirm('确认退出？', function(e) {
            if (e.index > 0) {
                plus.runtime.quit();
            }
        }, '退出程序', ['取消', '确定']);
    }, false);

    // 更新当前时间显示
    function updateCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        document.getElementById('current-time').textContent = timeString;
    }

    // 初始化时执行
    // 启动时间更新
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 更新标题文字
    updateTitleText();

    // 确保图标和标题文字显示
    const logoElement = document.querySelector('.logo img');
    const logoTextElement = document.querySelector('.logo-text');

    if (logoElement) {
        logoElement.style.display = '';
        console.log('plusready事件中确保图标显示');

        // 添加隐藏的退出功能 - 连续点击logo图标3次退出应用
        // 初始化点击计数器和时间戳
        let logoClickCount = 0;
        let logoFirstClickTime = 0;

        // 为logo图标添加点击事件监听
        logoElement.addEventListener('click', function() {
            const currentTime = new Date().getTime();

            // 如果是第一次点击或者距离第一次点击已超过3秒，重置计数和时间戳
            if (logoClickCount === 0) {
                // 第一次点击，开始计时
                logoClickCount = 1;
                logoFirstClickTime = currentTime;

                // 设置3秒后的超时处理，如果没有完成3次点击，重置计数器
                setTimeout(function() {
                    if (logoClickCount < 3) {
                        logoClickCount = 0;
                        logoFirstClickTime = 0;
                    }
                }, 3000);
            } else if ((currentTime - logoFirstClickTime) <= 3000) {
                // 在3秒内的连续点击，增加计数
                logoClickCount++;

                // 如果点击次数达到3次，退出应用
                if (logoClickCount >= 3) {
                    // 重置计数器和时间戳
                    logoClickCount = 0;
                    logoFirstClickTime = 0;

                    // 退出应用
                    exitApplication();
                }
            } else {
                // 超过3秒，这次点击成为新的第一次点击
                logoClickCount = 1;
                logoFirstClickTime = currentTime;

                // 设置新的3秒超时处理
                setTimeout(function() {
                    if (logoClickCount < 3) {
                        logoClickCount = 0;
                        logoFirstClickTime = 0;
                    }
                }, 3000);
            }
        });
    }

    if (logoTextElement) {
        logoTextElement.style.display = '';
        console.log('plusready事件中确保标题文字显示');
    }

    // 添加点击时间区域打开设置页面的功能
    // 初始化点击计数器和时间戳
    let timeClickCount = 0;
    let firstClickTime = 0;

    // 为时间显示区域添加点击事件监听
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.addEventListener('click', function() {
            const currentTime = new Date().getTime();

            // 如果是第一次点击或者距离第一次点击已超过3秒，重置计数和时间戳
            if (timeClickCount === 0) {
                // 第一次点击，开始计时
                timeClickCount = 1;
                firstClickTime = currentTime;
                console.log('开始计时，时间区域点击次数：', timeClickCount);

                // 设置3秒后的超时处理，如果没有完成3次点击，重置计数器
                setTimeout(function() {
                    if (timeClickCount < 3) {
                        console.log('3秒内未完成3次点击，重置计数器');
                        timeClickCount = 0;
                        firstClickTime = 0;
                    }
                }, 3000);
            } else if ((currentTime - firstClickTime) <= 3000) {
                // 在3秒内的连续点击，增加计数
                timeClickCount++;
                console.log('时间区域点击次数：', timeClickCount);

                // 如果点击次数达到3次，打开设置页面
                if (timeClickCount >= 3) {
                    // 重置计数器和时间戳
                    timeClickCount = 0;
                    firstClickTime = 0;
                    // 打开设置页面
                    console.log('3秒内连续点击3次，打开设置页面');
                    openOptionPage();
                }
            } else {
                // 超过3秒，这次点击成为新的第一次点击
                timeClickCount = 1;
                firstClickTime = currentTime;
                console.log('超时重新开始计时，时间区域点击次数：', timeClickCount);

                // 设置新的3秒超时处理
                setTimeout(function() {
                    if (timeClickCount < 3) {
                        console.log('3秒内未完成3次点击，重置计数器');
                        timeClickCount = 0;
                        firstClickTime = 0;
                    }
                }, 3000);
            }
        });
    }

    // 从本地存储读取数据并更新页面
    if (typeof plus !== 'undefined' && plus.storage) {
        try {
            const storedData = plus.storage.getItem('meetingData');
            if (storedData) {
                const jsonData = JSON.parse(storedData);
                updateMeetingInfo(jsonData);
            }
        } catch (error) {
            console.error('读取本地存储数据失败：', error);
        }
    }
});

function updateMeetingInfo(jsonData) {
    // 检查数据有效性
    if (!jsonData || !jsonData.id) {
        console.error('无效的会议数据');
        return;
    }

    // 输出本地存储的title和time信息
    console.log('从本地存储读取的title:', jsonData.title);
    console.log('从本地存储读取的time:', jsonData.time);

    const titleElement = document.querySelector('.meeting-title-text');
    const introElement = document.querySelector('.meeting-intro-text');
    const idElement = document.getElementById('meeting-id');

    // 如果id元素不存在，创建一个隐藏的元素来存储id
    if (!idElement) {
        const newIdElement = document.createElement('div');
        newIdElement.id = 'meeting-id';
        newIdElement.style.display = 'none';
        document.body.appendChild(newIdElement);
    }

    // 更新页面内容
    document.getElementById('meeting-id').textContent = jsonData.id;
    if (titleElement && jsonData.title) {
        titleElement.textContent = jsonData.title;
    }
    if (introElement && jsonData.time) {
        // 将时间格式从 YYYY-MM-DD HH:MM 转换为 YYYY年MM月DD日 HH:MM
        let formattedTime = jsonData.time;

        // 检查是否有日期部分
        if (jsonData.time && jsonData.time.includes('-')) {
            try {
                // 分离日期和时间部分
                let datePart = '';
                let timePart = '';

                if (jsonData.time.includes(' ')) {
                    // 如果包含空格，则有时间部分
                    const parts = jsonData.time.split(' ');
                    datePart = parts[0];
                    timePart = parts.length > 1 ? ' ' + parts[1] : '';
                } else {
                    // 只有日期部分
                    datePart = jsonData.time;
                }

                // 处理日期部分
                if (datePart) {
                    const dateComponents = datePart.split('-');
                    if (dateComponents.length === 3) {
                        const year = dateComponents[0];
                        // 对于月份和日期，如果是一位数，则去掉前导零
                        const month = dateComponents[1].replace(/^0/, '');
                        const day = dateComponents[2].replace(/^0/, '');

                        // 组合成新的格式
                        formattedTime = `${year}年${month}月${day}日${timePart}`;
                        console.log('格式化后的时间:', formattedTime);
                    }
                }
            } catch (error) {
                console.error('格式化时间时出错:', error);
                // 出错时使用原始时间
                formattedTime = jsonData.time;
            }
        }

        introElement.textContent = formattedTime;
    }
}

// 添加页面可见性变化监听，在页面显示时更新数据
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && typeof plus !== 'undefined' && plus.storage) {
        try {
            console.log('页面变为可见状态，更新数据和样式');

            // 确保图标和标题文字显示
            const logoElement = document.querySelector('.logo img');
            const logoTextElement = document.querySelector('.logo-text');

            if (logoElement) {
                logoElement.style.display = '';
                console.log('确保图标显示');
            }

            if (logoTextElement) {
                logoTextElement.style.display = '';
                console.log('确保标题文字显示');
            }

            // 更新标题文字
            updateTitleText();

            const storedData = plus.storage.getItem('meetingData');
            if (storedData) {
                const jsonData = JSON.parse(storedData);
                if (jsonData && jsonData.title && jsonData.time) {
                    // 直接调用现有的updateMeetingInfo函数来更新会议信息
                    updateMeetingInfo(jsonData);
                    console.log('更新会议标题和时间成功');
                } else {
                    console.error('无效的会议数据');
                    plus.webview.close();
                }
            } else {
                console.log('未找到会议数据，关闭页面');
                plus.webview.close();
            }
        } catch (error) {
            console.error('读取本地存储数据失败：', error);
            plus.webview.close();
        }
    }
});

// 参加会议按钮点击事件处理函数
function openMeetingDetail() {
    if (typeof plus !== 'undefined') {
        // 在HTML5+环境下使用plus.webview.open打开list.html页面
        console.log('打开会议详情页面');
        plus.webview.open('list.html', 'list', {}, '', 'slide-in-right');
    } else {
        // 在非plus环境下使用普通的页面跳转
        console.log('非plus环境，使用普通页面跳转');
        window.location.href = 'list.html';
    }
}

// 设置页面打开函数
function openOptionPage() {
    if (typeof plus !== 'undefined') {
        // 在HTML5+环境下使用plus.webview.open打开option.html页面
        console.log('打开设置页面');
        plus.webview.open('option.html', 'option', {}, '', 'slide-in-right');
    } else {
        // 在非plus环境下使用普通的页面跳转
        console.log('非plus环境，使用普通页面跳转');
        window.location.href = 'option.html';
    }
}



/**
 * 监听网络状态并更新“参加会议”按钮颜色
 * 绿色代表网络正常，黄色代表网络断开
 * 注意：这个函数保留为兼容旧版本，新代码应使用updateConnectionStatus
 */
function updateNetworkStatus(isOnline) {
    console.log('调用旧版updateNetworkStatus函数，状态:', isOnline ? '正常' : '异常');
    updateConnectionStatus(isOnline, isOnline); // 兼容模式，网络状态和API状态相同
}

/**
 * 更新连接状态并更新“参加会议”按钮颜色
 * 绿色代表全部正常，黄色代表有异常
 * @param {boolean} isNetworkOnline - 网络是否连接
 * @param {boolean} isApiConnected - API是否可访问
 */
function updateConnectionStatus(isNetworkOnline, isApiConnected) {
    var joinButton = document.getElementById('join-meeting-btn');
    if (!joinButton) {
        console.error('找不到参加会议按钮');
        return;
    }

    console.log('更新连接状态 - 网络:', isNetworkOnline ? '已连接' : '未连接',
              'API:', isApiConnected ? '正常' : '异常');

    // 获取当前按钮提示文本
    var currentTitle = joinButton.title;

    // 只有当网络连接且API可访问时，按钮才显示为橙色渐变
    if (isNetworkOnline && isApiConnected) {
        // 全部正常时使用黄色渐变（已与异常状态对调）
        joinButton.style.background = 'linear-gradient(135deg, #FFD54F, #FF8F00)';
        joinButton.title = '网络和服务器连接正常';
        console.log('按钮颜色已更新为黄色渐变(正常状态)');
        console.log('按钮提示已更新: ' + (currentTitle !== '网络和服务器连接正常' ? currentTitle + ' -> 网络和服务器连接正常' : '保持不变'));
    } else {
        // 任一异常时使用橙色渐变（已与正常状态对调）
        joinButton.style.background = 'linear-gradient(135deg, #F9A825, #D35400)';

        // 设置不同的提示文本
        var newTitle = '';
        if (!isNetworkOnline) {
            newTitle = '网络连接已断开';
            joinButton.title = newTitle;
        } else if (!isApiConnected) {
            newTitle = '服务器连接异常';
            joinButton.title = newTitle;
            console.log('网络正常但API连接异常，按钮显示为橙色渐变');
        } else {
            newTitle = '连接状态异常';
            joinButton.title = newTitle;
        }
        console.log('按钮颜色已更新为橙色渐变(异常状态)');
        console.log('按钮提示已更新: ' + (currentTitle !== newTitle ? currentTitle + ' -> ' + newTitle : '保持不变'));
    }
}

// 页面加载后初始化网络状态
window.addEventListener('DOMContentLoaded', function() {
    // 初始化时假设网络和API状态相同
    updateConnectionStatus(navigator.onLine, navigator.onLine);
});

// 监听浏览器原生网络事件
window.addEventListener('online', function() {
    // 网络恢复时，保持API状态不变
    var joinButton = document.getElementById('join-meeting-btn');
    var isApiConnected = joinButton && joinButton.title !== '服务器连接异常';
    updateConnectionStatus(true, isApiConnected);
});
window.addEventListener('offline', function() {
    // 网络断开时，API一定不可用
    updateConnectionStatus(false, false);
});

// 若service页面有更精确的网络检测，可通过plus.webview通信机制通知main页面
if (typeof plus !== 'undefined' && plus.webview) {
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'network-status') {
            // 兼容旧版消息格式
            updateConnectionStatus(event.data.online, event.data.online);
        } else if (event.data && event.data.type === 'connection-status') {
            // 新版消息格式，包含网络和API状态
            updateConnectionStatus(event.data.networkOnline, event.data.apiConnected);
        }
    });
}

/**
 * 退出应用函数 - 由隐藏的logo点击功能触发
 */
function exitApplication() {
    console.log('检测到连续点击logo图标3次，准备退出应用');

    if (typeof plus !== 'undefined') {
        // 使用确认对话框询问用户是否确定退出
        plus.nativeUI.confirm('确认退出应用？', function(e) {
            if (e.index > 0) { // 用户点击了"确定"
                console.log('用户确认退出，正在关闭应用...');

                try {
                    // 简化退出逻辑，避免触发应用重启
                    if (plus.os.name.toLowerCase() === 'android') {
                        // Android平台使用Activity的finish方法
                        var main = plus.android.runtimeMainActivity();
                        main.moveTaskToBack(false);
                        setTimeout(function(){
                            plus.runtime.quit();
                        }, 200);
                    } else {
                        // iOS平台直接使用quit
                        plus.runtime.quit();
                    }
                } catch (error) {
                    console.error('退出应用时出错:', error);
                    // 如果出错，使用最基本的退出方法
                    plus.runtime.quit();
                }
            } else {
                console.log('用户取消退出');
            }
        }, '退出程序', ['取消', '确定']);
    } else {
        console.log('非plus环境，无法退出应用');
        alert('在浏览器环境中无法退出应用');
    }
}
