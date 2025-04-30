// 从配置中获取是否显示点击提示的设置
function getShowClickHintSetting() {
    try {
        if (typeof plus !== 'undefined' && plus.storage) {
            const storedSettings = plus.storage.getItem('option');
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                if (parsedSettings && parsedSettings.option && parsedSettings.option.showClickHint !== undefined) {
                    return parsedSettings.option.showClickHint;
                }
            }
        }
        // 默认显示点击提示
        return 'true';
    } catch (error) {
        console.error('获取点击提示设置失败:', error);
        // 出错时默认显示
        return 'true';
    }
}

// 显示加载状态
function showLoadingState() {
    // 获取内容容器
    const contentContainer = document.querySelector('.content-container');

    // 添加加载提示
    const loadingSection = document.createElement('div');
    loadingSection.className = 'section w3-card';
    loadingSection.id = 'loading-section';

    const loadingText = document.createElement('div');
    loadingText.className = 'section-title';
    loadingText.textContent = '正在加载会议数据...';
    loadingSection.appendChild(loadingText);

    // 添加到内容容器
    contentContainer.appendChild(loadingSection);
}

// 隐藏加载状态
function hideLoadingState() {
    const loadingSection = document.getElementById('loading-section');
    if (loadingSection) {
        loadingSection.remove();
    }
}

// 从本地存储加载会议数据
function loadMeetingDataFromStorage() {
    console.log('从本地存储加载会议数据');

    if (typeof plus === 'undefined' || !plus.storage) {
        console.error('plus对象或storage不可用');
        hideLoadingState();
        return;
    }

    try {
        const storedData = plus.storage.getItem('meetingData');
        if (storedData) {
            console.log('找到存储的会议数据');
            const jsonData = JSON.parse(storedData);

            // 隐藏加载状态
            hideLoadingState();

            // 更新页面内容
            updateMeetingTopics(jsonData);
        } else {
            console.warn('本地存储中未找到会议数据');
            hideLoadingState();

            // 显示错误提示
            const contentContainer = document.querySelector('.content-container');
            const errorSection = document.createElement('div');
            errorSection.className = 'section w3-card';
            errorSection.innerHTML = '<div class="section-title" style="color: #f44336;">未找到会议数据</div>';
            contentContainer.appendChild(errorSection);

            // 延时关闭页面
            setTimeout(() => {
                if (typeof plus !== 'undefined') {
                    var currentWebview = plus.webview.currentWebview();
                    currentWebview.close('slide-out-right');
                }
            }, 2000);
        }
    } catch (error) {
        console.error('读取本地存储数据失败：', error);
        hideLoadingState();

        // 显示错误提示
        const contentContainer = document.querySelector('.content-container');
        const errorSection = document.createElement('div');
        errorSection.className = 'section w3-card';
        errorSection.innerHTML = `<div class="section-title" style="color: #f44336;">读取数据失败: ${error.message}</div>`;
        contentContainer.appendChild(errorSection);
    }
}

document.addEventListener('plusready', function() {
    console.log("list页面plusready事件触发");

    // 检查并管理list页面，确保只有一个实例
    const cleaned = checkAndManageListPage(true); // 保留当前页面
    if (cleaned) {
        console.log('list页面单例检查完成，已清理多余实例');
    } else {
        console.log('list页面单例检查完成，无需清理');
    }

    // 禁止返回
    plus.key.addEventListener('backbutton', function() {
        console.log('返回main页面');
        // 获取当前webview并关闭
        var currentWebview = plus.webview.currentWebview();
        currentWebview.close('slide-out-right');
    }, false);

    // 更新当前时间显示
    function updateCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    // 初始化时执行
    // 启动时间更新
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 显示加载状态
    showLoadingState();

    // 从本地存储读取数据并更新页面
    loadMeetingDataFromStorage();

    // 获取本地存储中的会议数据并输出到调试台
    if (typeof plus !== 'undefined' && plus.storage) {
        try {
            const storedData = plus.storage.getItem('meetingData');
            if (storedData) {
                console.log('本地存储中的会议数据:', storedData);
                const jsonData = JSON.parse(storedData);
                console.log('解析后的会议数据:', JSON.stringify(jsonData, null, 2));

                // 输出议程项信息
                if (jsonData.agenda_items && jsonData.agenda_items.length > 0) {
                    console.log('议程项数量:', jsonData.agenda_items.length);
                    jsonData.agenda_items.forEach((item, index) => {
                        console.log(`议程项 ${index + 1}:`, item.title);
                        if (item.files && item.files.length > 0) {
                            console.log(`  文件数量: ${item.files.length}`);
                            item.files.forEach((file, fileIndex) => {
                                console.log(`  文件 ${fileIndex + 1}:`, file.name || file.display_name);
                            });
                        }
                    });
                }
            } else {
                console.warn('本地存储中没有会议数据');
            }
        } catch (error) {
            console.error('读取本地存储数据失败：', error);
        }
    }
});

function updateMeetingTopics(jsonData) {
    console.log('更新会议议题，数据:', jsonData);

    // 检查数据有效性
    if (!jsonData || !jsonData.id) {
        console.error('无效的会议数据');
        return;
    }

    // 更新会议标题
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle && jsonData.title) {
        headerTitle.textContent = jsonData.title;
    }

    // 更新会议介绍
    const meetingIntroLabel = document.querySelector('.checkbox-item label');
    if (meetingIntroLabel && jsonData.intro) {
        meetingIntroLabel.textContent = jsonData.intro;
    }

    // 获取或创建会议ID元素
    const idElement = document.getElementById('meeting-id');
    if (!idElement) {
        const newIdElement = document.createElement('div');
        newIdElement.id = 'meeting-id';
        newIdElement.style.display = 'none';
        document.body.appendChild(newIdElement);
    }

    // 更新页面内容
    document.getElementById('meeting-id').textContent = jsonData.id;

    // 获取内容容器
    const contentContainer = document.querySelector('.content-container');

    // 保留会议介绍section
    const introSection = document.querySelector('.section:first-child');

    // 清空除会议介绍外的所有section
    while (contentContainer.children.length > 1) {
        contentContainer.removeChild(contentContainer.lastChild);
    }

    // 创建文档片段，减少DOM操作
    const fragment = document.createDocumentFragment();

    // 检查是否有新格式的议程项数据
    if (jsonData.agenda_items && Array.isArray(jsonData.agenda_items)) {
        console.log('使用agenda_items格式的数据');
        // 添加新的议题section
        jsonData.agenda_items.forEach((agendaItem, index) => {
            const section = document.createElement('div');
            section.className = 'section w3-card';

            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = agendaItem.title;
            section.appendChild(sectionTitle);

            if (agendaItem.files && Array.isArray(agendaItem.files)) {
                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';

                agendaItem.files.forEach((fileInfo, fileIndex) => {
                    const topicItem = document.createElement('li');
                    topicItem.className = 'topic-item';
                    topicItem.style.pointerEvents = 'none'; // 禁用整个topic-item的点击事件

                    const topicNumber = document.createElement('div');
                    topicNumber.className = 'topic-number';
                    topicNumber.textContent = (fileIndex + 1);
                    topicNumber.style.pointerEvents = 'none'; // 禁用序号区域的点击事件

                    const topicContent = document.createElement('div');
                    topicContent.className = 'topic-content';
                    topicContent.style.pointerEvents = 'none'; // 禁用整个topic-content的点击事件

                    // 创建文本节点容器
                    const textSpan = document.createElement('span');
                    textSpan.innerHTML = fileInfo.display_name || fileInfo.name;

                    // 根据配置决定是否显示点击提示
                    const showClickHint = getShowClickHintSetting();
                    if (showClickHint === 'true') {
                        textSpan.innerHTML += ' <span style="color:rgb(45, 131, 218);">(点击打开)</span>'; // 添加淡蓝色的“（点击打开）”字样
                    }

                    textSpan.style.pointerEvents = 'auto'; // 只启用文本内容的点击事件
                    textSpan.style.cursor = 'pointer'; // 添加鼠标指针样式

                    // 将文本内容添加到topicContent中
                    topicContent.appendChild(textSpan);

                    // 获取总页数信息
                    const totalPages = fileInfo.total_pages || 1; // 默认为1页

                    // 添加点击事件，只在文本内容上生效
                    textSpan.addEventListener('click', function() {
                        const fileName = fileInfo.display_name || fileInfo.name;
                        const meetingId = jsonData.meeting_id || jsonData.id;
                        const tempId = fileInfo.temp_id;
                        const agendaFolder = fileInfo.agenda_folder || 'agenda_' + (index + 1);

                        console.log('点击文件：' + fileName + '，总页数：' + totalPages);
                        console.log('文件详细信息：', {
                            meetingId: meetingId,
                            tempId: tempId,
                            agendaFolder: agendaFolder,
                            totalPages: totalPages
                        });

                        // 构建文件路径
                        // 路径结构: _doc/meeting_files/meeting_{会议id}/{agenda_folder}/jpgs/{temp_id}/{temp_id}_{name}.jpg
                        const filePath = '_doc/meeting_files/meeting_' + meetingId + '/' + agendaFolder + '/jpgs/' + tempId + '/' + tempId + '_' + fileName + '.jpg';
                        console.log('构建的文件路径：', filePath);

                        if (typeof plus !== 'undefined') {
                            // 使用plus.webview.open打开file页面，传递文件路径、文件名和总页数参数
                            plus.webview.open('file.html?file=' + encodeURIComponent(fileName) +
                                              '&page=' + totalPages +
                                              '&path=' + encodeURIComponent(filePath) +
                                              '&meeting_id=' + meetingId,
                                              'file', {}, '', function(e) {
                                console.error('打开file页面失败：' + JSON.stringify(e));
                            });
                        } else {
                            // 在非plus环境下的后备方案，传递文件名和总页数
                            window.location.href = 'file.html?file=' + encodeURIComponent(fileName) +
                                                  '&page=' + totalPages +
                                                  '&path=' + encodeURIComponent(filePath) +
                                                  '&meeting_id=' + meetingId;
                        }
                    });

                    topicItem.appendChild(topicNumber);
                    topicItem.appendChild(topicContent);
                    topicList.appendChild(topicItem);
                });

                section.appendChild(topicList);
            }

            fragment.appendChild(section);
        });
    }
    // 兼容旧格式数据
    else if (jsonData.part && Array.isArray(jsonData.part)) {
        console.log('使用part格式的数据');
        // 添加新的议题section
        jsonData.part.forEach((part, index) => {
            const section = document.createElement('div');
            section.className = 'section w3-card';

            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = part.title;
            section.appendChild(sectionTitle);

            if (part.file && Array.isArray(part.file)) {
                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';

                part.file.forEach((fileName, fileIndex) => {
                    const topicItem = document.createElement('li');
                    topicItem.className = 'topic-item';
                    topicItem.style.pointerEvents = 'none'; // 禁用整个topic-item的点击事件

                    const topicNumber = document.createElement('div');
                    topicNumber.className = 'topic-number';
                    topicNumber.textContent = (fileIndex + 1);
                    topicNumber.style.pointerEvents = 'none'; // 禁用序号区域的点击事件

                    const topicContent = document.createElement('div');
                    topicContent.className = 'topic-content';
                    topicContent.style.pointerEvents = 'none'; // 禁用整个topic-content的点击事件

                    // 创建文本节点容器
                    const textSpan = document.createElement('span');
                    textSpan.innerHTML = fileName;

                    // 根据配置决定是否显示点击提示
                    const showClickHint = getShowClickHintSetting();
                    if (showClickHint === 'true') {
                        textSpan.innerHTML += ' <span style="color:rgb(29, 99, 168);">(点击打开)</span>'; // 添加淡蓝色的“（点击打开）”字样
                    }

                    textSpan.style.pointerEvents = 'auto'; // 只启用文本内容的点击事件
                    textSpan.style.cursor = 'pointer'; // 添加鼠标指针样式

                    // 将文本内容添加到topicContent中
                    topicContent.appendChild(textSpan);

                    // 获取对应的页数信息（如果存在）
                    let totalPages = 1; // 默认为1页
                    if (part.page && Array.isArray(part.page) && part.page[fileIndex] !== undefined) {
                        totalPages = part.page[fileIndex];
                    }

                    // 添加点击事件，只在文本内容上生效
                    textSpan.addEventListener('click', function() {
                        console.log('点击文件：' + fileName + '，总页数：' + totalPages);
                        if (typeof plus !== 'undefined') {
                            // 使用plus.webview.open打开file页面，传递文件名和总页数参数
                            plus.webview.open('file.html?file=' + encodeURIComponent(fileName) + '&page=' + totalPages, 'file', {}, '', function(e) {
                                console.error('打开file页面失败：' + JSON.stringify(e));
                            });
                        } else {
                            // 在非plus环境下的后备方案，传递文件名和总页数
                            window.location.href = 'file.html?file=' + encodeURIComponent(fileName) + '&page=' + totalPages;
                        }
                    });

                    topicItem.appendChild(topicNumber);
                    topicItem.appendChild(topicContent);
                    topicList.appendChild(topicItem);
                });

                section.appendChild(topicList);
            }

            fragment.appendChild(section);
        });
    } else {
        console.warn('未找到议题数据');
    }

    // 一次性将所有新元素添加到DOM中
    contentContainer.appendChild(fragment);
}



// 添加页面可见性变化监听，在页面显示时更新数据
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && typeof plus !== 'undefined' && plus.storage) {
        try {
            const storedData = plus.storage.getItem('meetingData');
            if (storedData) {
                const jsonData = JSON.parse(storedData);
                if (jsonData && jsonData.title) {
                    updateMeetingTopics(jsonData);
                } else {
                    console.error('无效的会议数据');
                    var currentWebview = plus.webview.currentWebview();
                    currentWebview.close('slide-out-right');
                }
            } else {
                console.log('未找到会议数据，关闭页面');
                var currentWebview = plus.webview.currentWebview();
                currentWebview.close('slide-out-right');
            }
        } catch (error) {
            console.error('读取本地存储数据失败：', error);
            var currentWebview = plus.webview.currentWebview();
            currentWebview.close('slide-out-right');
        }
    }
});

// 在非plus环境下的返回按钮事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 禁用右键菜单和长按选择
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    document.addEventListener('touchstart', function(e) {
        // 移除preventDefault调用以允许触摸事件正常工作
    }, { passive: true });

    // 绑定返回按钮事件
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', function() {
            if (typeof plus !== 'undefined') {
                console.log('返回main页面');
                // 获取当前webview
                var currentWebview = plus.webview.currentWebview();
                // 关闭当前webview
                currentWebview.close('slide-out-right');
            } else {
                console.error('无法关闭窗口：plus对象未初始化');
                // 在非plus环境下的后备方案
                window.history.back();
            }
        });
    }
});