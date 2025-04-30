// loading.js - 专门为loading.html提供的JS文件，支持5+app plus模块

// 初始化plus对象的函数
function initializePlus() {
    if (typeof plus === 'undefined') {
        console.error('plus对象未初始化');
        showError('系统环境未就绪，请重启应用');
        return false;
    }
    return true;
}

// 所有涉及plus的操作都放在plusready事件中
let plusReadyInitialized = false;

// 标记数据是否已更新完成
let dataUpdateCompleted = false;

// 用于跟踪是否已经执行过跳转的标志
let redirectExecuted = false;

// 加载进度
let loadingProgress = 0;

// 进度条更新定时器
let progressTimer = null;

// 检查本地存储中的会议状态并显示会议选择界面
function checkMeetingStatus() {
    if (!initializePlus()) {
        console.error('plus初始化失败，无法检查会议状态');
        showError('初始化失败，请重启应用');
        return;
    }

    try {
        // 从本地存储中获取会议状态
        const meetingStatusJson = plus.storage.getItem('meetingStatus');
        if (!meetingStatusJson) {
            console.log('未找到会议状态数据，直接获取会议数据');
            fetchMeetingData();
            return;
        }

        const meetingStatus = JSON.parse(meetingStatusJson);
        console.log('从本地存储中获取到会议状态:', meetingStatus);

        // 检查是否有进行中的会议
        if (meetingStatus.meetings && meetingStatus.meetings.length > 0) {
            // 如果只有一个会议，直接选择它
            if (meetingStatus.meetings.length === 1) {
                console.log('只有一个进行中的会议，直接获取数据');
                // 将选中的会议ID存储到本地
                const selectedMeeting = meetingStatus.meetings[0];
                plus.storage.setItem('selectedMeetingId', selectedMeeting.id);

                // 显示加载提示
                updateLoadingText(`正在加载会议: ${selectedMeeting.title || '未命名会议'}`);

                // 直接获取数据
                fetchMeetingData();
            }
            // 如果有多个会议，显示选择界面
            else {
                console.log('发现多个进行中的会议，显示会议选择界面');
                displayMeetingSelection(meetingStatus.meetings);
            }
        } else {
            console.log('未找到进行中的会议，直接获取数据');
            fetchMeetingData();
        }
    } catch (error) {
        console.error('检查会议状态时出错:', error);
        showError('检查会议状态失败，请重试');
    }
}

// 显示会议选择界面
function displayMeetingSelection(meetings) {
    // 隐藏加载进度界面
    document.getElementById('loading-progress').style.display = 'none';

    // 显示会议选择模态框
    const meetingSelectionModal = document.getElementById('meeting-selection-modal');
    meetingSelectionModal.style.display = 'flex';

    // 获取会议列表容器
    const meetingList = document.getElementById('meeting-list');
    meetingList.innerHTML = '';

    // 添加会议选项
    meetings.forEach((meeting, index) => {
        const meetingItem = document.createElement('div');
        meetingItem.className = 'meeting-item';
        meetingItem.dataset.id = meeting.id;

        // 格式化时间
        const meetingTime = meeting.time || '无时间信息';

        // 获取会议简介，如果有的话
        const meetingIntro = meeting.intro || '无会议简介';

        // 添加延迟动画效果
        meetingItem.style.animationDelay = `${index * 0.1}s`;

        meetingItem.innerHTML = `
            <h3>${meeting.title || '未命名会议'}</h3>
            <p class="meeting-time"><i class="meeting-icon time-icon"></i>${meetingTime}</p>
            <p class="meeting-intro">${meetingIntro.length > 50 ? meetingIntro.substring(0, 50) + '...' : meetingIntro}</p>
        `;

        // 添加点击事件
        meetingItem.addEventListener('click', function() {
            // 移除其他选项的选中状态
            document.querySelectorAll('.meeting-item').forEach(item => {
                item.classList.remove('selected');
            });

            // 添加选中状态
            this.classList.add('selected');

            // 将选中的会议ID存储到本地
            plus.storage.setItem('selectedMeetingId', meeting.id);

            // 更新标题显示选中的会议
            const meetingSelectionTitle = document.querySelector('#meeting-selection h2');
            if (meetingSelectionTitle) {
                meetingSelectionTitle.innerHTML = `已选择: <span style="color:#4CAF50;">${meeting.title || '未命名会议'}</span>`;
            }

            // 添加确认按钮，如果还没有
            if (!document.getElementById('confirm-selection-btn')) {
                const confirmBtn = document.createElement('button');
                confirmBtn.id = 'confirm-selection-btn';
                confirmBtn.className = 'confirm-btn';
                confirmBtn.textContent = '确认选择';
                confirmBtn.style.cssText = `
                    display: block;
                    margin: 20px auto 0;
                    padding: 12px 25px;
                    background: linear-gradient(135deg, #4CAF50, #2E7D32);
                    color: white;
                    border: none;
                    border-radius: 30px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 10px rgba(46, 125, 50, 0.3);
                `;

                confirmBtn.addEventListener('mouseover', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 6px 15px rgba(46, 125, 50, 0.4)';
                });

                confirmBtn.addEventListener('mouseout', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 4px 10px rgba(46, 125, 50, 0.3)';
                });

                confirmBtn.addEventListener('click', function() {
                    // 添加点击效果
                    this.style.transform = 'scale(0.95)';

                    // 隐藏会议选择模态框
                    setTimeout(() => {
                        meetingSelectionModal.style.display = 'none';

                        // 显示加载进度界面
                        document.getElementById('loading-progress').style.display = 'flex';

                        // 开始获取会议数据
                        fetchMeetingData();
                    }, 200);
                });

                document.getElementById('meeting-selection').appendChild(confirmBtn);
            }
        });

        meetingList.appendChild(meetingItem);
    });

    // 添加提示文字
    const meetingCount = meetings.length;
    const meetingCountText = document.createElement('div');
    meetingCountText.className = 'meeting-count';
    meetingCountText.textContent = `共找到 ${meetingCount} 个进行中的会议`;
    meetingCountText.style.cssText = `
        text-align: center;
        color: #7f8c8d;
        font-size: 14px;
        margin-top: 15px;
        font-style: italic;
    `;

    document.getElementById('meeting-selection').appendChild(meetingCountText);
}

// 获取会议数据的函数
function fetchMeetingData() {
    if (!initializePlus()) {
        console.error('plus初始化失败，无法获取会议数据');
        showError('初始化失败，请重启应用');
        return;
    }

    // 更新加载文本和进度条
    updateLoadingText('正在获取会议数据...');
    setProgress(20);

    // 启动进度条动画，只到一半，留出一半给下载和解压过程
    startProgressAnimation(20, 50, 5000); // 从20%到50%，持续5秒

    // 初始化并使用LoadingService获取数据
    if (typeof LoadingService !== 'undefined') {
        // 初始化LoadingService
        if (!LoadingService.init()) {
            console.error('LoadingService初始化失败');
            showError('LoadingService初始化失败，请重试');
            stopProgressAnimation();
            setProgress(20);
            dataUpdateCompleted = true;
            showButtons();
            return;
        }

        // 从本地存储中获取选中的会议ID
        const selectedMeetingId = plus.storage.getItem('selectedMeetingId');
        if (!selectedMeetingId) {
            console.error('未找到选中的会议ID');
            showError('未选择会议，请重试');
            stopProgressAnimation();
            setProgress(20);
            dataUpdateCompleted = true;
            showButtons();
            return;
        }

        console.log('从本地存储中获取到选中的会议ID:', selectedMeetingId);
        fetchMeetingById(selectedMeetingId);
    } else {
        console.error('LoadingService未定义');

        // 停止进度条动画
        stopProgressAnimation();

        // 设置进度为20%，表示失败
        setProgress(20);

        // 标记为完成
        dataUpdateCompleted = true;

        // 显示返回按钮
        showButtons();

        // 显示错误消息
        showError('LoadingService未定义，请重试');
    }
}

// 显示会议选择界面
function showMeetingSelection(meetings) {
    console.log('显示会议选择界面');

    // 停止进度条动画
    stopProgressAnimation();

    // 设置进度为50%
    setProgress(50);

    // 更新加载文本
    updateLoadingText('请选择要加载的会议');

    // 获取会议选择界面元素
    const meetingSelection = document.querySelector('.meeting-selection');
    const meetingList = document.getElementById('meetingList');

    if (!meetingSelection || !meetingList) {
        console.error('找不到会议选择界面元素');
        showError('加载会议选择界面失败');
        dataUpdateCompleted = true;
        showButtons();
        return;
    }

    // 清空会议列表
    meetingList.innerHTML = '';

    // 添加会议项
    meetings.forEach(meeting => {
        const meetingItem = document.createElement('div');
        meetingItem.className = 'meeting-item';
        meetingItem.dataset.id = meeting.id;

        const meetingTitle = document.createElement('div');
        meetingTitle.className = 'meeting-item-title';
        meetingTitle.textContent = meeting.title || '无标题会议';

        const meetingTime = document.createElement('div');
        meetingTime.className = 'meeting-item-time';
        meetingTime.textContent = meeting.time || '无时间信息';

        meetingItem.appendChild(meetingTitle);
        meetingItem.appendChild(meetingTime);

        // 添加点击事件
        meetingItem.addEventListener('click', function() {
            const meetingId = this.dataset.id;
            console.log('选择了会议:', meetingId);

            // 隐藏会议选择界面
            meetingSelection.style.display = 'none';

            // 更新加载文本
            updateLoadingText('正在获取会议数据...');

            // 重新启动进度条动画
            startProgressAnimation(50, 80, 5000); // 从50%到80%，持续5秒

            // 获取选中会议的数据
            fetchMeetingById(meetingId);
        });

        meetingList.appendChild(meetingItem);
    });

    // 显示会议选择界面
    meetingSelection.style.display = 'flex';
}

// 获取指定会议的数据
function fetchMeetingById(meetingId) {
    console.log('开始获取会议数据, ID:', meetingId);

    // 设置数据更新完成的回调
    const dataUpdateHandler = function(jsonData) {
        console.log('数据更新成功');

        // 停止进度条动画
        stopProgressAnimation();

        // 设置进度为100%
        setProgress(100);

        // 更新完成，显示返回按钮
        dataUpdateCompleted = true;
        showButtons();

        // 更新加载文本
        updateLoadingText('数据更新完成，准备返回主页面');

        // 移除所有事件监听器，避免重复处理和内存泄漏
        LoadingService.removeEventListener('dataUpdate', dataUpdateHandler);
        LoadingService.removeEventListener('dataInit', dataUpdateHandler);
        LoadingService.removeEventListener('idChanged', dataUpdateHandler);

        // 移除下载和解压进度事件监听器
        LoadingService.removeEventListener('downloadStart', null);
        LoadingService.removeEventListener('downloadProgress', null);
        LoadingService.removeEventListener('downloadComplete', null);
        LoadingService.removeEventListener('downloadError', null);
        LoadingService.removeEventListener('extractStart', null);
        LoadingService.removeEventListener('extractComplete', null);
        LoadingService.removeEventListener('extractError', null);

        // 如果有数据，输出日志
        if (jsonData) {
            console.log('获取到的会议数据:', jsonData.title || '无标题');
        }

        // 使用页面管理器关闭现有main页面并创建新的main页面
        try {
            console.log('准备创建新的main页面');

            // 先关闭所有现有的main页面
            const allWebviews = plus.webview.all();
            const mainViews = allWebviews.filter(webview => webview.id === 'main');

            if (mainViews.length > 0) {
                console.log(`找到${mainViews.length}个main页面，准备关闭`);

                // 关闭所有现有的main页面
                mainViews.forEach(view => {
                    console.log(`关闭页面: ${view.id}`);
                    view.close('none');
                });
            } else {
                console.log('未找到现有的main页面');
            }

            // 创建新的main页面
            console.log('创建新的main页面');
            const newMainView = plus.webview.create('main.html', 'main', {
                scrollIndicator: 'none',
                scalable: false
            });

            // 等待新页面加载完成
            newMainView.addEventListener('loaded', function() {
                console.log('新的main页面加载完成');

                // 显示新页面
                newMainView.show('fade-in', 300);

                // 关闭当前loading页面
                const currentWebview = plus.webview.currentWebview();
                currentWebview.close('none');
                console.log('loading页面已关闭');
            });

            // 如果加载超时，也显示新页面
            setTimeout(function() {
                const mainView = plus.webview.getWebviewById('main');
                if (mainView && !mainView.isVisible()) {
                    console.log('新页面加载超时，强制显示');
                    mainView.show('fade-in', 300);

                    // 关闭当前loading页面
                    const currentWebview = plus.webview.currentWebview();
                    if (currentWebview) {
                        currentWebview.close('none');
                        console.log('loading页面已关闭（超时处理）');
                    }
                }
            }, 3000);
        } catch (error) {
            console.error('关闭并创建新main页面时出错:', error);
            // 出错时尝试使用页面管理器打开新页面
            try {
                console.log('错误恢复：准备创建新的main页面');

                // 先关闭所有现有的main页面
                const allWebviews = plus.webview.all();
                const mainViews = allWebviews.filter(webview => webview.id === 'main');

                if (mainViews.length > 0) {
                    console.log(`错误恢复：找到${mainViews.length}个main页面，准备关闭`);

                    // 关闭所有现有的main页面
                    mainViews.forEach(view => {
                        console.log(`错误恢复：关闭页面: ${view.id}`);
                        view.close('none');
                    });
                } else {
                    console.log('错误恢复：未找到现有的main页面');
                }

                // 创建新的main页面
                console.log('错误恢复：创建新的main页面');
                const newMainView = plus.webview.create('main.html', 'main', {
                    scrollIndicator: 'none',
                    scalable: false
                });

                // 等待新页面加载完成
                newMainView.addEventListener('loaded', function() {
                    console.log('错误恢复：新的main页面加载完成');

                    try {
                        // 在新页面中启用状态轮询
                        newMainView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); console.log("\u9519\u8bef\u6062\u590d\uff1a\u72b6\u6001\u8f6e\u8be2\u5df2\u5728\u65b0\u9875\u9762\u4e2d\u542f\u7528"); }');
                    } catch (error) {
                        console.error('错误恢复：在新页面中启用状态轮询失败：', error);
                    }

                    // 显示新页面
                    newMainView.show('fade-in', 300);

                    // 关闭当前loading页面
                    const currentWebview = plus.webview.currentWebview();
                    if (currentWebview) {
                        currentWebview.close('none');
                        console.log('错误恢复：loading页面已关闭');
                    }
                });

                // 如果加载超时，也关闭当前页面
                setTimeout(function() {
                    try {
                        // 尝试获取main页面并恢复轮询
                        const mainView = plus.webview.getWebviewById('main');
                        if (mainView) {
                            try {
                                // 在main页面中启用状态轮询
                                mainView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); console.log("\u9519\u8bef\u6062\u590d\uff1a\u8d85\u65f6\u5904\u7406\u4e2d\u6062\u590d\u8f6e\u8be2"); }');
                            } catch (error) {
                                console.error('错误恢复：超时处理中启用状态轮询失败：', error);
                            }
                        }

                        // 关闭loading页面
                        const currentWebview = plus.webview.currentWebview();
                        if (currentWebview) {
                            console.log('错误恢复：超时关闭loading页面');
                            currentWebview.close('none');
                        }
                    } catch (closeError) {
                        console.error('错误恢复：关闭loading页面失败:', closeError);
                    }
                }, 5000);
            } catch (e) {
                console.error('尝试直接打开新页面也失败:', e);

                // 即使打开新页面失败，也尝试恢复轮询并关闭loading页面
                try {
                    setTimeout(function() {
                        // 尝试获取service页面并恢复轮询
                        try {
                            const serviceView = plus.webview.getWebviewById('service');
                            if (serviceView) {
                                console.log('最后尝试通知service模块恢复轮询');
                                serviceView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); }');
                            }
                        } catch (error) {
                            console.error('最后尝试恢复轮询失败:', error);
                        }

                        // 关闭loading页面
                        const currentWebview = plus.webview.currentWebview();
                        if (currentWebview) {
                            console.log('最后尝试关闭loading页面');
                            currentWebview.close('none');
                        }
                    }, 3000);
                } catch (closeError) {
                    console.error('最后尝试关闭loading页面失败:', closeError);
                }
            }
        }
    };

    // 设置数据更新错误的回调
    const errorHandler = function(error) {
        console.error('数据获取失败:', error);

        // 停止进度条动画
        stopProgressAnimation();

        // 设置进度为20%，表示失败
        setProgress(20);

        // 即使失败也标记为完成
        dataUpdateCompleted = true;

        // 显示返回按钮
        showButtons();

        // 显示错误消息
        let errorMessage = '数据获取失败，请重试';
        if (error && error.message) {
            errorMessage = error.message;
        }
        showError(errorMessage);

        // 移除所有事件监听器，避免重复处理和内存泄漏
        LoadingService.removeEventListener('error', errorHandler);
        LoadingService.removeEventListener('dataUpdate', dataUpdateHandler);
        LoadingService.removeEventListener('dataInit', dataUpdateHandler);
        LoadingService.removeEventListener('idChanged', dataUpdateHandler);

        // 移除下载和解压进度事件监听器
        LoadingService.removeEventListener('downloadStart', null);
        LoadingService.removeEventListener('downloadProgress', null);
        LoadingService.removeEventListener('downloadComplete', null);
        LoadingService.removeEventListener('downloadError', null);
        LoadingService.removeEventListener('extractStart', null);
        LoadingService.removeEventListener('extractComplete', null);
        LoadingService.removeEventListener('extractError', null);
    };

    // 添加事件监听器
    LoadingService.addEventListener('dataUpdate', dataUpdateHandler);
    LoadingService.addEventListener('dataInit', dataUpdateHandler);
    LoadingService.addEventListener('idChanged', dataUpdateHandler);
    LoadingService.addEventListener('error', errorHandler);

    // 添加下载和解压进度事件监听器
    LoadingService.addEventListener('downloadStart', function(data) {
        console.log('开始下载会议ZIP包:', data.meetingId);
        updateLoadingText('正在下载会议文件...');
        stopProgressAnimation();
        setProgress(50);
        startProgressAnimation(50, 70, 10000); // 从50%到70%，持续10秒

        // 显示下载信息区域
        const downloadInfo = document.querySelector('.download-info');
        if (downloadInfo) {
            downloadInfo.style.display = 'block';
        }

        // 重置下载节点和大小信息
        document.getElementById('current-node').textContent = '-';
        document.getElementById('downloaded-size').textContent = '0';
        document.getElementById('total-size').textContent = '0';
    });

    // 上次输出的进度百分比
    let lastLoggedPercent = -1;

    LoadingService.addEventListener('downloadProgress', function(data) {
        // 只在进度变化超过5%时输出日志，避免过多的日志输出
        if (data.percent - lastLoggedPercent >= 5 || data.percent === 100) {
            console.log('下载进度:', data.percent + '%', '节点:', data.node || '未知');
            lastLoggedPercent = data.percent;
        }

        // 将下载进度映射到50%-70%的范围
        const mappedProgress = 50 + (data.percent / 100 * 20);
        stopProgressAnimation();
        setProgress(mappedProgress);
        updateLoadingText(`正在下载会议文件... ${data.percent}%`);

        // 更新下载节点和大小信息
        if (data.node) {
            document.getElementById('current-node').textContent = data.node;
        }

        if (data.downloadedSize !== undefined && data.totalSize !== undefined) {
            // 格式化文件大小
            const downloadedSizeFormatted = formatFileSize(data.downloadedSize);
            const totalSizeFormatted = formatFileSize(data.totalSize);

            document.getElementById('downloaded-size').textContent = downloadedSizeFormatted;
            document.getElementById('total-size').textContent = totalSizeFormatted;
        }
    });

    // 添加重试事件监听器
    LoadingService.addEventListener('downloadRetry', function(data) {
        console.log('下载重试:', data);
        updateLoadingText(`从节点 ${data.previousNode} 下载失败，正在切换到节点 ${data.nextNode}...`);

        // 更新下载节点信息
        document.getElementById('current-node').textContent = data.nextNode || '-';

        // 重置下载大小信息
        document.getElementById('downloaded-size').textContent = '0';
    });

    LoadingService.addEventListener('downloadComplete', function(data) {
        console.log('下载完成:', data.filename, '节点:', data.node || '未知');
        updateLoadingText('下载完成，准备解压文件...');
        stopProgressAnimation();
        setProgress(70);

        // 隐藏下载信息区域
        const downloadInfo = document.querySelector('.download-info');
        if (downloadInfo) {
            downloadInfo.style.display = 'none';
        }
    });

    LoadingService.addEventListener('downloadError', function(data) {
        console.error('下载失败:', data);
        updateLoadingText('下载文件失败，继续处理...');
        // 不中断整体流程，继续处理
        stopProgressAnimation();
        setProgress(70);

        // 如果是最终失败（所有节点都尝试过），隐藏下载信息区域
        if (data.message && data.message.includes('所有节点下载尝试均失败')) {
            const downloadInfo = document.querySelector('.download-info');
            if (downloadInfo) {
                downloadInfo.style.display = 'none';
            }
        }
    });

    LoadingService.addEventListener('extractStart', function(data) {
        console.log('开始解压会议文件...');
        updateLoadingText('正在解压会议文件...');
        stopProgressAnimation();
        setProgress(70);
        startProgressAnimation(70, 90, 8000); // 从70%到90%，持续8秒

        // 取消按钮始终显示，不需要显示
        // if (typeof showCancelButton === 'function') {
        //     showCancelButton();
        //     console.log('解压开始，显示取消更新按钮');
        // }
    });

    LoadingService.addEventListener('extractComplete', function(data) {
        console.log('会议文件解压完成');
        updateLoadingText('文件解压完成，准备返回主页面...');
        stopProgressAnimation();
        setProgress(100);

        // 取消按钮始终显示，不需要隐藏
        // if (typeof hideCancelButton === 'function') {
        //     hideCancelButton();
        //     console.log('解压完成，隐藏取消更新按钮');
        // }

        // 自动返回主页面
        setTimeout(function() {
            returnToMain();
        }, 1000); // 等待1秒后自动返回主页面
    });

    LoadingService.addEventListener('extractError', function(data) {
        console.error('解压失败:', data);
        updateLoadingText('文件解压失败，准备返回主页面...');
        stopProgressAnimation();
        setProgress(100);

        // 取消按钮始终显示，不需要隐藏
        // if (typeof hideCancelButton === 'function') {
        //     hideCancelButton();
        //     console.log('解压失败，隐藏取消更新按钮');
        // }

        // 即使解压失败也自动返回主页面
        setTimeout(function() {
            returnToMain();
        }, 1000); // 等待1秒后自动返回主页面
    });

    // 添加取消操作事件监听器
    LoadingService.addEventListener('operationCancelled', function(data) {
        console.log('操作已取消:', data.message);
        updateLoadingText('操作已取消，准备返回主页面...');
        stopProgressAnimation();
        setProgress(0);

        // 取消按钮始终显示，不需要隐藏
        // if (typeof hideCancelButton === 'function') {
        //     hideCancelButton();
        //     console.log('操作已取消，隐藏取消更新按钮');
        // }
    });

    // 触发数据获取
    try {
        LoadingService.fetchMeetingById(meetingId)
            .then(data => {
                console.log('获取会议数据成功:', data.title || '无标题');
            })
            .catch(error => {
                console.error('获取会议数据失败:', error);
                errorHandler(error);
            });
    } catch (error) {
        console.error('触发数据获取失败:', error);
        errorHandler({
            message: '数据服务调用失败，请重试'
        });
    }
}

// 进度条动画函数
function startProgressAnimation(startPercent, endPercent, duration) {
    // 停止现有的定时器
    stopProgressAnimation();

    // 设置起始进度
    loadingProgress = startPercent;
    setProgress(loadingProgress);

    // 计算每次更新的增量
    const totalSteps = 50; // 总步数
    const stepDuration = duration / totalSteps; // 每步时间
    const stepIncrement = (endPercent - startPercent) / totalSteps; // 每步增量

    // 创建定时器
    progressTimer = setInterval(() => {
        // 增加进度
        loadingProgress += stepIncrement;

        // 确保不超过结束进度
        if (loadingProgress >= endPercent) {
            loadingProgress = endPercent;
            stopProgressAnimation();
        }

        // 更新进度条
        setProgress(loadingProgress);
    }, stepDuration);
}

// 停止进度条动画
function stopProgressAnimation() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

// 设置进度条函数
function setProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

// 更新加载文本函数
function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

// 显示错误消息函数
function showError(message) {
    const errorText = document.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = message || '加载过程中出现错误';
        errorText.style.display = 'block';
        // 不再显示重试按钮，因为我们已经移除了按钮
    }
}

// 隐藏错误消息函数
function hideError() {
    const errorText = document.querySelector('.error-text');
    if (errorText) {
        errorText.style.display = 'none';
    }
}

// 格式化文件大小函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    // 保留两位小数，并去除末尾的0
    return (bytes / Math.pow(1024, i)).toFixed(2).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + ' ' + units[i];
}

// 显示按钮函数（现在什么也不做，因为我们已经移除了按钮）
function showButtons() {
    // 按钮已经被移除，这个函数仅为了兼容现有代码
    console.log('按钮已移除，不再显示');
}

// 保留原来的showReturnButton函数以兼容现有代码
function showReturnButton() {
    showButtons();
}

// 使用一次性事件监听器，确保plusready事件只被处理一次
document.addEventListener('plusready', function plusReadyHandler() {
    // 防止重复初始化
    if (plusReadyInitialized) {
        console.log('plusready已经初始化过，跳过');
        return;
    }

    console.log('plusready事件触发，初始化loading页面');
    plusReadyInitialized = true;

    // 移除事件监听器，确保只执行一次
    document.removeEventListener('plusready', plusReadyHandler);

    // 通知service模块暂停轮询
    try {
        const serviceView = plus.webview.getWebviewById('service');
        if (serviceView) {
            console.log('通知service模块暂停轮询');
            serviceView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.pauseDataFetch(); }');
        } else {
            console.log('未找到service页面，无法通知暂停轮询');
        }
    } catch (error) {
        console.error('通知service暂停轮询失败:', error);
    }

    // 检查并管理loading页面，确保只有一个实例
    const cleaned = checkAndManageLoadingPage(true); // 保留当前页面
    if (cleaned) {
        console.log('loading页面单例检查完成，已清理多余实例');
    } else {
        console.log('loading页面单例检查完成，无需清理');
    }

    // 添加页面关闭事件监听
    const currentWebview = plus.webview.currentWebview();
    currentWebview.addEventListener('close', function() {
        console.log('loading页面即将关闭，通知service模块');
        // 获取service页面
        const serviceView = plus.webview.getWebviewById('service');
        if (serviceView) {
            // 通知service模块恢复轮询
            console.log('通知service模块恢复轮询');
            serviceView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); }');

            // 在service页面中执行监测页面关闭的方法
            serviceView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.monitorPageClosing(); }');
        } else {
            console.log('未找到service页面，无法通知恢复轮询');
        }
    });

    if (!initializePlus()) {
        console.error('plus初始化失败');
        return;
    }

    // 从配置中读取并更新标题文字
    console.log('从配置中读取标题文字');
    updateTitleFromConfig();

    // 先检查本地存储中的会议状态
    console.log('开始检查本地存储中的会议状态');
    checkMeetingStatus();

    // 创建返回main页面的函数
    window.returnToMain = function() {
        // 如果已经执行过跳转，则跳过
        if (redirectExecuted) {
            console.log('已经执行过跳转，跳过');
            return;
        }

        if (initializePlus()) {
            console.log('点击返回按钮，跳转到主页面');
            redirectExecuted = true;

            // 使用页面管理器关闭现有main页面并创建新的main页面
            console.log('准备创建新的main页面');

            // 先关闭所有现有的main页面
            const allWebviews = plus.webview.all();
            const mainViews = allWebviews.filter(webview => webview.id === 'main');

            if (mainViews.length > 0) {
                console.log(`找到${mainViews.length}个main页面，准备关闭`);

                // 关闭所有现有的main页面
                mainViews.forEach(view => {
                    console.log(`关闭页面: ${view.id}`);
                    view.close('none');
                });
            } else {
                console.log('未找到现有的main页面');
            }

            // 创建新的main页面
            console.log('创建新的main页面');
            const newMainView = plus.webview.create('main.html', 'main', {
                scrollIndicator: 'none',
                scalable: false
            });

            // 等待新页面加载完成
            newMainView.addEventListener('loaded', function() {
                console.log('新的main页面加载完成');

                try {
                    // 在新页面中启用状态轮询
                    newMainView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); console.log("状态轮询已在新页面中启用"); }');
                } catch (error) {
                    console.error('在新页面中启用状态轮询失败：', error);
                }

                // 显示新页面
                newMainView.show('fade-in', 300);

                // 关闭当前loading页面
                const currentWebview = plus.webview.currentWebview();
                currentWebview.close();
            });

            // 如果加载超时，也显示新页面
            setTimeout(function() {
                const mainView = plus.webview.getWebviewById('main');
                if (mainView && !mainView.isVisible()) {
                    console.log('新页面加载超时，强制显示');

                    try {
                        // 在新页面中启用状态轮询
                        mainView.evalJS('if (typeof MeetingService !== "undefined") { MeetingService.resumeDataFetch(); console.log("状态轮询已在超时后启用"); }');
                    } catch (error) {
                        console.error('在超时后启用状态轮询失败：', error);
                    }

                    mainView.show('fade-in', 300);

                    // 关闭当前loading页面
                    const currentWebview = plus.webview.currentWebview();
                    currentWebview.close();
                }
            }, 3000);
        } else {
            console.error('plus未初始化，无法跳转');
        }
    };
});

// 从配置中读取标题文字并更新页面
function updateTitleFromConfig() {
    if (typeof plus !== 'undefined' && plus.storage) {
        try {
            // 从设置中获取标题文字
            const storedSettings = plus.storage.getItem('option');
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                if (parsedSettings && parsedSettings.option && parsedSettings.option.titleText) {
                    const titleText = parsedSettings.option.titleText;

                    // 更新页面上的标题文字
                    const logoTextElement = document.querySelector('.logo-text');
                    if (logoTextElement) {
                        logoTextElement.textContent = titleText;
                        console.log('从配置中读取并更新标题文字:', titleText);
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
    } else {
        console.log('plus对象或storage不可用，无法读取标题文字设置');
    }
}

// 添加页面可见性变化监听，在页面显示时更新标题文字
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && typeof plus !== 'undefined' && plus.storage) {
        // 页面变为可见时，更新标题文字
        console.log('页面变为可见，更新标题文字');
        updateTitleFromConfig();
    }
});

// 页面加载完成后的处理
document.addEventListener('DOMContentLoaded', function() {
    console.log('loading页面DOM加载完成');

    // 初始化进度条
    setProgress(5);

    // 更新加载文本
    updateLoadingText('正在初始化系统...');

    // 隐藏错误消息
    hideError();

    // 按钮已经被移除，不需要初始化
    console.log('按钮已经被移除，不需要初始化');

    // 尝试从本地存储中读取标题文字
    // 即使plus对象还没有准备好，也先尝试读取
    if (typeof plus !== 'undefined' && plus.storage) {
        updateTitleFromConfig();
    } else {
        console.log('DOM加载时plus对象未就绪，等待plusready事件更新标题');
    }

    // 添加测试按钮（只在开发环境下显示）
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        // 创建测试按钮容器
        const testButtonContainer = document.createElement('div');
        testButtonContainer.style.position = 'fixed';
        testButtonContainer.style.top = '10px';
        testButtonContainer.style.right = '10px';
        testButtonContainer.style.zIndex = '10000';

        // 创建测试成功按钮
        const testSuccessButton = document.createElement('button');
        testSuccessButton.textContent = '测试成功';
        testSuccessButton.style.marginRight = '10px';
        testSuccessButton.style.padding = '5px 10px';
        testSuccessButton.style.backgroundColor = '#4CAF50';
        testSuccessButton.style.color = 'white';
        testSuccessButton.style.border = 'none';
        testSuccessButton.style.borderRadius = '4px';
        testSuccessButton.style.cursor = 'pointer';
        testSuccessButton.onclick = function() {
            stopProgressAnimation();
            setProgress(100);
            updateLoadingText('测试成功');
            // 按钮已经被移除，不再显示
            console.log('按钮已经被移除，不再显示');
        };

        // 创建测试失败按钮
        const testErrorButton = document.createElement('button');
        testErrorButton.textContent = '测试失败';
        testErrorButton.style.padding = '5px 10px';
        testErrorButton.style.backgroundColor = '#f44336';
        testErrorButton.style.color = 'white';
        testErrorButton.style.border = 'none';
        testErrorButton.style.borderRadius = '4px';
        testErrorButton.style.cursor = 'pointer';
        testErrorButton.onclick = function() {
            stopProgressAnimation();
            setProgress(20);
            showError('测试错误消息');
            // 按钮已经被移除，不再显示
            console.log('按钮已经被移除，不再显示');
        };

        // 添加按钮到容器
        testButtonContainer.appendChild(testSuccessButton);
        testButtonContainer.appendChild(testErrorButton);

        // 添加容器到页面
        document.body.appendChild(testButtonContainer);
    }
});