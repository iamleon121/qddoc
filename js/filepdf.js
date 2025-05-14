// 全局变量
let pdfh5Instance = null;
let loadingProgress = 0;
let currentPage = 1;
let totalPages = 1;

// 显示错误信息的函数
function showErrorMessage(message) {
    const fileContent = document.getElementById('fileContent');
    fileContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="color: #666; margin-bottom: 20px;">${message}</div>
            <button onclick="goBack()" style="background-color: #ff6b00; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;" onmouseover="this.style.backgroundColor='#ff8533'" onmouseout="this.style.backgroundColor='#ff6b00'">返回列表</button>
        </div>
    `;
    // 隐藏加载元素
    hideLoadingElement();
}

// 返回函数
function goBack() {
    if (typeof plus !== 'undefined') {
        console.log('返回list页面');
        // 获取当前webview并使用动画关闭
        var currentWebview = plus.webview.currentWebview();
        currentWebview.close('slide-out-right');
    } else {
        console.log('返回上一页');
        window.history.back();
    }
}

// 更新当前时间的函数
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    document.getElementById('current-time').textContent = timeString;
}

// 更新加载进度的函数
function updateLoadingProgress(percent, message) {
    loadingProgress = percent;
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        // 更新加载进度显示
        loadingElement.innerHTML = `
            <div class="spinner"></div>
            <div>${message || '正在加载文件...'}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
            <div>${Math.round(percent)}%</div>
        `;
        loadingElement.style.display = 'flex';
        console.log(`加载进度更新: ${percent}%, 消息: ${message}`);
    } else {
        console.error('找不到loading元素');
    }
}

// 隐藏加载元素的函数
function hideLoadingElement() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
        console.log('隐藏加载元素');
    }
}

// 从URL获取参数
function getUrlParameter(name) {
    const url = window.location.href;
    const params = new URLSearchParams(url.split('?')[1]);
    return params.get(name);
}

// 初始化页面
function initPage() {
    console.log("初始化PDF查看页面");

    // 设置返回按钮事件
    document.getElementById('backButton').addEventListener('click', goBack);

    // 获取文件名并设置标题
    const fileName = getUrlParameter('file') || '文件内容';
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
        // 当文件名超过30个字时，截断后面的部分并用省略号代替
        if (fileName.length > 30) {
            headerTitle.textContent = fileName.substring(0, 30) + '......';
            console.log('文件名超过30个字，已截断：', fileName.substring(0, 30) + '......');
        } else {
            headerTitle.textContent = fileName;
        }
    }

    // 更新当前时间
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 获取总页数
    const pageParam = getUrlParameter('page');
    totalPages = pageParam ? parseInt(pageParam) : 1;

    // 更新总页数显示
    document.getElementById('totalPages').textContent = totalPages;

    // 生成页码选择器选项
    const pageSelect = document.getElementById('pageSelect');
    if (pageSelect) {
        // 清空现有选项
        pageSelect.innerHTML = '';

        // 添加页码选项
        for (let i = 1; i <= totalPages; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            pageSelect.appendChild(option);
        }

        // 设置当前页码为1
        pageSelect.value = 1;
        document.getElementById('currentPage').textContent = 1;

        // 添加页码切换事件
        pageSelect.addEventListener('change', function() {
            const selectedPage = parseInt(this.value);
            currentPage = selectedPage;
            document.getElementById('currentPage').textContent = selectedPage;
            // 这里暂时不实现滚动功能，后续添加PDF渲染后再实现
            console.log('切换到第', selectedPage, '页');
        });
    }

    // 获取文件路径
    const filePath = getUrlParameter('path');
    if (filePath) {
        console.log('从URL参数获取到文件路径:', filePath);
        // 这里暂时只显示文件路径，不加载PDF
        document.getElementById('fileContent').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>PDF文件路径</h3>
                <p>${filePath}</p>
                <div style="margin-top: 20px; color: #666;">
                    PDF查看功能正在开发中...
                </div>
            </div>
        `;
    } else {
        showErrorMessage('未指定文件路径');
    }
}

// 在DOMContentLoaded事件中初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 禁用右键菜单和长按选择
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    document.addEventListener('touchstart', function(e) {
        // 移除preventDefault调用以允许触摸事件正常工作
    }, { passive: true });

    // 初始化页面
    initPage();
});

// 在plusready事件中处理设备相关功能
document.addEventListener('plusready', function() {
    console.log('plusready事件触发，开始初始化PDF查看器');

    // 禁止返回键
    plus.key.addEventListener('backbutton', function() {
        console.log('返回list页面');
        goBack();
    }, false);

    // 获取文件路径
    const filePath = getUrlParameter('path');
    if (filePath) {
        console.log('从URL参数获取到文件路径:', filePath);

        // 获取总页数
        const pageParam = getUrlParameter('page');
        totalPages = pageParam ? parseInt(pageParam) : 1;

        // 更新总页数显示
        document.getElementById('totalPages').textContent = totalPages;

        // 生成页码选择器选项
        const pageSelect = document.getElementById('pageSelect');
        if (pageSelect) {
            // 清空现有选项
            pageSelect.innerHTML = '';

            // 添加页码选项
            for (let i = 1; i <= totalPages; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                pageSelect.appendChild(option);
            }

            // 设置当前页码为1
            pageSelect.value = 1;
            document.getElementById('currentPage').textContent = 1;

            // 添加页码切换事件
            pageSelect.addEventListener('change', function() {
                const selectedPage = parseInt(this.value);
                currentPage = selectedPage;
                document.getElementById('currentPage').textContent = selectedPage;
                // 这里暂时不实现滚动功能，后续添加PDF渲染后再实现
                console.log('切换到第', selectedPage, '页');
            });
        }

        // 这里暂时只显示文件路径，不加载PDF
        document.getElementById('fileContent').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>PDF文件路径</h3>
                <p>${filePath}</p>
                <div style="margin-top: 20px; color: #666;">
                    PDF查看功能正在开发中...
                </div>
            </div>
        `;
    } else {
        showErrorMessage('未指定文件路径');
    }
});
