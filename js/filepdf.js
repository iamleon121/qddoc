// 全局变量
let pdfh5Instance = null;
let loadingProgress = 0;
let currentPage = 1;
let totalPages = 1;
let pdfBlob = null; // 用于存储PDF文件的Blob对象
let pdfObjectUrl = null; // 用于存储PDF文件的Object URL

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

// 更新加载进度的函数 - 不再显示loading元素，只记录日志
function updateLoadingProgress(percent, message) {
    loadingProgress = percent;
    console.log(`加载进度更新: ${percent}%, 消息: ${message}`);
}

// 创建loading元素 - 不再实际创建元素，只记录日志
function createLoadingElement(percent, message) {
    console.log(`加载进度: ${percent}%, 消息: ${message}`);
}

// 隐藏加载元素的函数 - 不再需要实际操作，只记录日志
function hideLoadingElement() {
    console.log('加载完成');
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

    // 初始化页码显示
    document.getElementById('totalPages').textContent = '1';
}

// 在DOMContentLoaded事件中初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 禁用右键菜单和长按选择
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    document.addEventListener('touchstart', function() {
        // 移除preventDefault调用以允许触摸事件正常工作
    }, { passive: true });

    // 初始化页面
    initPage();
});

// 加载PDF文件的主函数
function loadPdfFile(filePath) {
    console.log('开始加载PDF文件:', filePath);

    // 只有在开始实际读取文件时才显示loading
    window.forceShowLoading = true;
    updateLoadingProgress(10, '');

    // 使用FileReader分块读取
    loadPdfWithFileReader(filePath)
        .then(() => {
            console.log('FileReader加载成功');
            updateLoadingProgress(90, '');

            // 准备PDF容器
            preparePdfContainer();

            // 使用PDF.js渲染PDF
            renderPdfWithPdfJs(pdfObjectUrl);
        })
        .catch(error => {
            console.error('PDF文件加载失败:', error);
            showErrorMessage('PDF文件加载失败，请检查文件是否存在或格式是否正确');
        });
}

// 方法1：使用FileReader分块读取
function loadPdfWithFileReader(filePath) {
    return new Promise((resolve, reject) => {
        console.log('使用FileReader加载PDF文件:', filePath);

        plus.io.resolveLocalFileSystemURL(filePath, fileEntry => {
            console.log('文件路径解析成功:', fileEntry.name);

            fileEntry.file(file => {
                // 获取文件大小，用于计算进度
                const fileSize = file.size;
                console.log('PDF文件大小:', fileSize, 'bytes');

                // 如果文件过大，使用分块读取
                if (fileSize > 10 * 1024 * 1024) { // 大于10MB的文件
                    console.log('文件较大，使用分块读取');
                    loadLargeFileInChunks(file, fileSize)
                        .then(resolve)
                        .catch(reject);
                } else {
                    console.log('文件较小，直接读取');
                    // 小文件直接读取
                    const reader = new plus.io.FileReader();

                    reader.onloadend = function(e) {
                        if (e.target.readyState === plus.io.FileReader.DONE) {
                            console.log('文件读取完成');
                            updateLoadingProgress(90, '');

                            try {
                                // 将base64数据转换为Blob对象
                                const base64Data = e.target.result.split(',')[1];
                                const binaryString = window.atob(base64Data);
                                const len = binaryString.length;
                                const bytes = new Uint8Array(len);

                                for (let i = 0; i < len; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }

                                pdfBlob = new Blob([bytes], { type: 'application/pdf' });

                                // 创建Object URL
                                if (pdfObjectUrl) {
                                    URL.revokeObjectURL(pdfObjectUrl);
                                }
                                pdfObjectUrl = URL.createObjectURL(pdfBlob);

                                console.log('PDF Blob创建成功，大小:', pdfBlob.size);
                                resolve(pdfBlob);
                            } catch (error) {
                                console.error('处理PDF数据时出错:', error);
                                reject(error);
                            }
                        }
                    };

                    reader.onerror = function(e) {
                        console.error('FileReader读取错误:', e);
                        reject(new Error('FileReader读取错误'));
                    };

                    reader.onprogress = function(e) {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 80) + 10;
                            updateLoadingProgress(percent, '');
                        }
                    };

                    // 以DataURL方式读取
                    reader.readAsDataURL(file);
                }
            }, error => {
                console.error('获取文件对象失败:', error);
                reject(error);
            });
        }, error => {
            console.error('解析文件路径失败:', error);
            reject(error);
        });
    });
}

// 分块读取大文件
function loadLargeFileInChunks(file, fileSize) {
    return new Promise((resolve, reject) => {
        console.log('开始分块读取大文件');
        const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB一块
        const chunks = Math.ceil(fileSize / CHUNK_SIZE);
        let loadedChunks = 0;
        const fileData = new Uint8Array(fileSize);

        console.log(`文件大小: ${formatFileSize(fileSize)}, 分为 ${chunks} 块进行读取`);

        function loadNextChunk(start) {
            const end = Math.min(start + CHUNK_SIZE, fileSize);
            const chunk = file.slice(start, end);

            console.log(`读取块 ${loadedChunks + 1}/${chunks}, 范围: ${formatFileSize(start)}-${formatFileSize(end)}`);

            const reader = new plus.io.FileReader();

            reader.onload = function(e) {
                try {
                    // 将当前块的数据复制到完整文件数据中
                    const arrayBuffer = e.target.result;
                    const chunkArray = new Uint8Array(arrayBuffer);
                    fileData.set(chunkArray, start);

                    loadedChunks++;
                    const percent = Math.round((loadedChunks / chunks) * 80) + 10;
                    updateLoadingProgress(percent, '');

                    if (start + CHUNK_SIZE < fileSize) {
                        // 继续加载下一块
                        loadNextChunk(start + CHUNK_SIZE);
                    } else {
                        // 所有块加载完成
                        console.log('所有块加载完成，总大小:', fileData.length);

                        // 转换为Blob对象
                        pdfBlob = new Blob([fileData], { type: 'application/pdf' });

                        // 创建Object URL
                        if (pdfObjectUrl) {
                            URL.revokeObjectURL(pdfObjectUrl);
                        }
                        pdfObjectUrl = URL.createObjectURL(pdfBlob);

                        console.log('PDF Blob创建成功，大小:', pdfBlob.size);
                        resolve(pdfBlob);
                    }
                } catch (error) {
                    console.error('处理块数据时出错:', error);
                    reject(error);
                }
            };

            reader.onerror = function(e) {
                console.error('块读取错误:', e);
                reject(new Error('块读取错误'));
            };

            reader.readAsArrayBuffer(chunk);
        }

        // 开始加载第一块
        loadNextChunk(0);
    });
}

// 清理临时文件夹
function cleanupTempFolder() {
    console.log('尝试清理临时文件夹');

    try {
        plus.io.resolveLocalFileSystemURL('_doc/temp/', tempDir => {
            console.log('找到临时文件夹，开始清理');

            tempDir.removeRecursively(() => {
                console.log('临时文件夹已成功清理');
            }, error => {
                console.error('清理临时文件夹失败:', error);
            });
        }, () => {
            // 如果文件夹不存在，这是正常的
            console.log('临时文件夹不存在，无需清理');
        });
    } catch (error) {
        console.error('清理临时文件夹时出错:', error);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    // 保留两位小数，并去除末尾的0
    return (bytes / Math.pow(1024, i)).toFixed(2).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + ' ' + units[i];
}

// 准备PDF容器
function preparePdfContainer() {
    console.log('准备PDF容器');

    // 获取文件内容容器
    const fileContent = document.getElementById('fileContent');
    if (!fileContent) {
        console.error('找不到fileContent元素');
        return false;
    }

    // 清空现有内容
    fileContent.innerHTML = '';

    // 创建PDF查看器容器
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-container';
    pdfContainer.className = 'pdf-container';
    pdfContainer.style.width = '100%';
    pdfContainer.style.height = '100%';
    pdfContainer.style.minHeight = '65vh';
    pdfContainer.style.overflow = 'auto';
    pdfContainer.style.position = 'relative';
    pdfContainer.style.backgroundColor = '#f8f8f8';
    pdfContainer.style.border = 'none';
    pdfContainer.style.outline = 'none';
    pdfContainer.style.borderRadius = '0';
    pdfContainer.style.padding = '0';
    fileContent.appendChild(pdfContainer);

    console.log('PDF容器准备完成');
    return true;
}

// 使用PDF.js渲染PDF
function renderPdfWithPdfJs(pdfUrl) {
    console.log('开始使用PDF.js渲染PDF:', pdfUrl);
    updateLoadingProgress(95, '');

    try {
        // 确保PDF容器存在
        const pdfContainer = document.getElementById('pdf-container');
        if (!pdfContainer) {
            console.error('找不到PDF容器元素');
            showErrorMessage('PDF渲染失败：找不到容器元素');
            return;
        }

        // 检查pdfUrl是否有效
        if (!pdfUrl) {
            console.error('PDF URL无效');
            showErrorMessage('PDF渲染失败：无效的PDF URL');
            return;
        }

        console.log('PDF容器:', pdfContainer);
        console.log('PDF URL:', pdfUrl);

        // 清空容器
        pdfContainer.innerHTML = '';

        // 确保容器可见
        pdfContainer.style.display = 'block';

        // 记录开始时间
        const startTime = performance.now();

        // 使用PDF.js加载PDF
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
            console.log('PDF加载成功，总页数:', pdf.numPages);

            // 更新总页数
            const actualTotalPages = pdf.numPages;
            totalPages = actualTotalPages;
            document.getElementById('totalPages').textContent = actualTotalPages;
            window.totalPages = actualTotalPages;

            // 浮动页码已移除，不需要更新总页数

            // 更新页码选择器
            updatePageSelector(actualTotalPages);

            // 不再需要显示当前页码

            // 创建页面容器
            const pagesContainer = document.createElement('div');
            pagesContainer.className = 'pdf-pages-container';
            pagesContainer.style.width = '100%';
            pagesContainer.style.position = 'relative';
            pagesContainer.style.border = 'none';
            pagesContainer.style.outline = 'none';
            pagesContainer.style.borderRadius = '0';
            pagesContainer.style.padding = '0';
            pdfContainer.appendChild(pagesContainer);

            // 渲染所有页面
            let renderedPages = 0;

            // 渲染单个页面的函数
            function renderPage(pageNumber) {
                return pdf.getPage(pageNumber).then(function(page) {
                    console.log('开始渲染第', pageNumber, '页');

                    // 创建页面容器
                    const pageContainer = document.createElement('div');
                    pageContainer.className = 'pdf-page-container';
                    pageContainer.style.position = 'relative';
                    pageContainer.style.margin = '10px auto';
                    pageContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    pageContainer.style.border = 'none';
                    pageContainer.style.borderRadius = '0';
                    pageContainer.style.outline = 'none';
                    pageContainer.style.padding = '0';
                    pageContainer.setAttribute('data-page-number', pageNumber);
                    pagesContainer.appendChild(pageContainer);

                    // 创建canvas元素
                    const canvas = document.createElement('canvas');
                    canvas.className = 'pdf-page';
                    canvas.style.border = 'none';
                    canvas.style.outline = 'none';
                    canvas.style.borderRadius = '0';
                    pageContainer.appendChild(canvas);

                    // 获取渲染上下文
                    const context = canvas.getContext('2d');

                    // 设置缩放比例
                    const scale = 2.0; // 高清渲染
                    const viewport = page.getViewport({ scale: scale });

                    // 设置canvas尺寸
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.display = 'block';  // 防止默认的inline显示可能导致的间隙
                    canvas.style.boxSizing = 'border-box';

                    // 渲染页面
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    return page.render(renderContext).promise.then(function() {
                        console.log('第', pageNumber, '页渲染完成');
                        renderedPages++;

                        // 更新进度
                        const percent = 95 + Math.round((renderedPages / actualTotalPages) * 5);
                        updateLoadingProgress(percent, '');

                        // 如果所有页面都渲染完成
                        if (renderedPages === actualTotalPages) {
                            const endTime = performance.now();
                            console.log('PDF渲染完成，耗时:', (endTime - startTime).toFixed(2), '毫秒');
                            updateLoadingProgress(100, '');

                            // 记录加载完成
                            hideLoadingElement();

                            // 添加页面分隔线
                            addPageDividers();

                            // 添加页面切换事件
                            addPageChangeListeners();

                            // 设置IntersectionObserver监测页面可见性
                            setupPageObserver();

                            // 添加窗口大小变化事件，重新计算分隔线位置
                            window.addEventListener('resize', function() {
                                setTimeout(addPageDividers, 300);
                            });
                        }
                    });
                }).catch(function(error) {
                    console.error('渲染第', pageNumber, '页时出错:', error);
                });
            }

            // 添加页面切换事件监听器
            function addPageChangeListeners() {
                // 不再使用滚动事件监听页码变化，改用IntersectionObserver
                // 仅保留页码选择器的事件监听

                // 页码选择器切换页面
                document.getElementById('pageSelect').addEventListener('change', function() {
                    const selectedPage = parseInt(this.value);
                    document.getElementById('currentPage').textContent = selectedPage;

                    // 更新浮动页码显示
                    updateFloatingPageNumber(selectedPage);

                    scrollToPage(selectedPage);
                });
            }

            // 滚动到指定页面 - 简化版
            function scrollToPage(pageNumber) {
                const pageContainer = document.querySelector(`.pdf-page-container[data-page-number="${pageNumber}"]`);
                if (pageContainer) {
                    // 使用平滑滚动
                    pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // 更新当前页码
                    currentPage = pageNumber;

                    // 更新最后一次页码更新时间
                    lastPageUpdateTime = Date.now();

                    console.log('手动滚动到页面:', pageNumber);
                } else {
                    console.error('找不到页面容器:', pageNumber);
                }
            }

            // 开始渲染所有页面
            const renderPromises = [];
            for (let i = 1; i <= actualTotalPages; i++) {
                renderPromises.push(renderPage(i));
            }

            // 等待所有页面渲染完成
            Promise.all(renderPromises).catch(function(error) {
                console.error('渲染PDF页面时出错:', error);
                showErrorMessage('PDF渲染失败：' + error.message);
            });

        }).catch(function(error) {
            console.error('加载PDF时出错:', error);
            console.error('错误堆栈:', error.stack);
            showErrorMessage('PDF加载失败：' + error.message);
        });

    } catch (error) {
        console.error('PDF.js初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        showErrorMessage('PDF渲染失败：' + error.message);
    }
}

// 分隔线位置调整值，可以通过控制台调整
let dividerOffsetAdjustment = 30; // 默认下移20px

// 添加页面分隔线的函数
function addPageDividers() {
    console.log('添加PDF页面分隔线，偏移量:', dividerOffsetAdjustment);

    // 移除已有的分隔线（如果有）
    const existingDividers = document.querySelectorAll('.page-divider');
    existingDividers.forEach(divider => divider.remove());

    // 获取所有PDF页面容器
    const pageContainers = document.querySelectorAll('.pdf-page-container');
    if (pageContainers.length <= 1) {
        console.log('只有一个或没有PDF页面，不需要添加分隔线');
        return;
    }

    // 获取文件内容容器
    const fileContent = document.getElementById('fileContent');
    if (!fileContent) {
        console.error('找不到fileContent元素');
        return;
    }

    // 为每个页面添加分隔线
    for (let i = 0; i < pageContainers.length; i++) {
        const container = pageContainers[i];

        // 创建分隔线元素
        const divider = document.createElement('div');
        divider.className = 'page-divider';
        divider.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(to right, transparent, #9c2424, transparent);
            z-index: 100;
            margin: 0 15px;
        `;

        // 设置分隔线位置在页面顶部，稍微下移以与页面上檐对齐
        // 考虑到PDF页面容器有20px的上边距，我们需要调整位置
        divider.style.top = (container.offsetTop + dividerOffsetAdjustment) + 'px';

        // 添加页码标签
        const pageLabel = document.createElement('div');
        pageLabel.className = 'page-label';
        pageLabel.style.cssText = `
            position: absolute;
            right: 20px;
            background-color: #9c2424;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            transform: translateY(-50%);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // 显示页码
        pageLabel.textContent = `第 ${i+1} 页`;
        divider.appendChild(pageLabel);

        // 添加到文件内容容器
        fileContent.appendChild(divider);

        console.log(`添加第 ${i+1} 个分隔线，位置: ${container.offsetTop + dividerOffsetAdjustment}px`);
    }
}

// 调整分隔线位置的函数，可以通过控制台调用
function adjustDividerOffset(offset) {
    dividerOffsetAdjustment = offset;
    console.log('分隔线偏移量已调整为:', offset);
    addPageDividers();
}

// 将调整函数暴露给全局，以便通过控制台调用
window.adjustDividerOffset = adjustDividerOffset;

// 更新页码显示（浮动页码已移除，仅保留日志）
function updateFloatingPageNumber(pageNumber) {
    // 浮动页码已移除，仅保留日志
    console.log('更新页码显示:', pageNumber + '/' + totalPages);
}

// 页面观察器实例
let pageObserver = null;

// 防抖定时器
let pageUpdateDebounceTimer = null;

// 页码稳定性检查
let lastDetectedPage = null;
let pageStabilityCounter = 0;
let pageStabilityThreshold = 2; // 需要连续检测到相同页码的次数
let lastPageUpdateTime = Date.now(); // 上次页码更新时间，初始化为当前时间
let fastScrollDetected = false; // 是否检测到快速滚动

// 防抖函数 - 用于减少页码更新频率
function debouncePageUpdate(callback, delay = 200) {
    if (pageUpdateDebounceTimer) {
        clearTimeout(pageUpdateDebounceTimer);
    }
    pageUpdateDebounceTimer = setTimeout(callback, delay);
}

// 简化的页码检测函数
function checkPageStability(pageNumber, intersectionRatio) {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastPageUpdateTime;

    // 如果页码相同，直接返回false，不需要更新
    if (pageNumber === currentPage) {
        return false;
    }

    // 如果交叉比例很高，直接更新
    if (intersectionRatio > 0.6) {
        console.log('页面可见度很高，直接更新页码');
        lastPageUpdateTime = now;
        return true;
    }

    // 如果距离上次更新时间很短，且交叉比例不高，不更新
    if (timeSinceLastUpdate < 300 && intersectionRatio < 0.4) {
        console.log('更新过于频繁，忽略此次更新');
        return false;
    }

    // 更新时间戳并返回true
    lastPageUpdateTime = now;
    return true;
}

// 设置IntersectionObserver监测页面可见性
function setupPageObserver() {
    console.log('设置IntersectionObserver监测页面可见性');

    // 如果已经存在观察器，先清理
    if (pageObserver) {
        pageObserver.disconnect();
        pageObserver = null;
    }

    // 创建IntersectionObserver配置
    const options = {
        root: null, // 使用视口作为根
        rootMargin: '-5% 0px', // 稍微缩小检测区域，但不要太多
        threshold: [0.1, 0.2, 0.3, 0.4, 0.5] // 增加低阈值，提高检测灵敏度
    };

    // 记录上次滚动位置，用于判断滚动方向
    let lastScrollTop = 0;
    let scrollDirection = 'down'; // 默认向下滚动

    // 添加滚动事件监听，仅用于检测滚动方向
    const pdfContainer = document.getElementById('pdf-container');
    if (pdfContainer) {
        pdfContainer.addEventListener('scroll', function() {
            const currentScrollTop = pdfContainer.scrollTop;
            if (currentScrollTop > lastScrollTop) {
                scrollDirection = 'down';
            } else if (currentScrollTop < lastScrollTop) {
                scrollDirection = 'up';
            }
            lastScrollTop = currentScrollTop;
        }, { passive: true });
    }

    // 创建IntersectionObserver实例 - 简化版
    pageObserver = new IntersectionObserver((entries) => {
        // 使用防抖函数减少更新频率
        debouncePageUpdate(() => {
            // 过滤出可见的页面并按交叉比例排序
            const visibleEntries = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            // 如果有可见的页面
            if (visibleEntries.length > 0) {
                // 获取可见比例最高的页面
                const mostVisibleEntry = visibleEntries[0];
                const pageNumber = parseInt(mostVisibleEntry.target.getAttribute('data-page-number'));
                const intersectionRatio = mostVisibleEntry.intersectionRatio;

                // 考虑滚动方向和可见比例
                if (visibleEntries.length > 1 &&
                    mostVisibleEntry.intersectionRatio - visibleEntries[1].intersectionRatio < 0.1) {

                    // 如果两个页面可见比例接近，考虑滚动方向
                    const secondEntry = visibleEntries[1];
                    const secondPageNumber = parseInt(secondEntry.target.getAttribute('data-page-number'));

                    // 根据滚动方向选择页面
                    if ((scrollDirection === 'down' && secondPageNumber > pageNumber) ||
                        (scrollDirection === 'up' && secondPageNumber < pageNumber)) {

                        console.log(`滚动方向${scrollDirection === 'down' ? '向下' : '向上'}，选择${scrollDirection === 'down' ? '后' : '前'}面的页面:`, secondPageNumber);
                        updatePageNumber(secondPageNumber, secondEntry.intersectionRatio);
                        return;
                    }
                }

                // 更新页码
                updatePageNumber(pageNumber, intersectionRatio);
            }
        }, 100); // 减少防抖延迟到100ms，提高响应速度
    }, options);

    // 更新页码的辅助函数 - 简化版
    function updatePageNumber(pageNumber, intersectionRatio) {
        console.log('检测到页面可见性变化，页码:', pageNumber, '交叉比例:', intersectionRatio.toFixed(2));

        // 进行页码稳定性检查
        if (!checkPageStability(pageNumber, intersectionRatio)) {
            return; // 页码不稳定或相同，不更新
        }

        // 记录之前的页码，用于日志
        const previousPage = currentPage;

        // 更新当前页码
        currentPage = pageNumber;

        // 更新页码选择器（保留此功能以确保同步）
        const pageSelect = document.getElementById('pageSelect');
        if (pageSelect) {
            pageSelect.value = pageNumber;
        }

        // 更新隐藏的当前页码
        const currentPageElement = document.getElementById('currentPage');
        if (currentPageElement) {
            currentPageElement.textContent = pageNumber;
        }

        // 记录页码更新（浮动页码已移除）
        console.log('页码已更新，从', previousPage, '变为:', pageNumber);
    }

    // 获取所有PDF页面容器
    const pageContainers = document.querySelectorAll('.pdf-page-container');

    // 开始观察所有页面容器
    pageContainers.forEach(container => {
        pageObserver.observe(container);
        console.log('开始观察页面容器:', container.getAttribute('data-page-number'));
    });

    console.log('IntersectionObserver设置完成，正在观察', pageContainers.length, '个页面容器');

    return pageObserver;
}

// 更新页码选择器
function updatePageSelector(totalPages) {
    console.log('更新页码选择器，总页数:', totalPages);

    const pageSelect = document.getElementById('pageSelect');
    if (!pageSelect) {
        console.error('找不到页码选择器元素');
        return;
    }

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

    // 初始化浮动页码
    updateFloatingPageNumber(1);
}

// 在plusready事件中处理设备相关功能
document.addEventListener('plusready', function() {
    console.log('plusready事件触发，开始初始化PDF查看器');

    // 清理临时文件夹
    cleanupTempFolder();

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

                // 更新浮动页码显示
                updateFloatingPageNumber(selectedPage);

                // 这里暂时不实现滚动功能，后续添加PDF渲染后再实现
                console.log('切换到第', selectedPage, '页');
            });
        }

        // 开始加载PDF文件，不显示初始loading
        window.forceShowLoading = false;
        loadPdfFile(filePath);
    } else {
        showErrorMessage('未指定文件路径');
    }
});

// 初始化放大镜功能
function initMagnifier() {
    console.log('初始化PDF放大镜功能');
    const pdfContainer = document.getElementById('pdf-container');
    if (!pdfContainer) {
        console.log('PDF容器不存在，放大镜功能初始化延迟');
        // 如果PDF容器不存在，等待它创建完成后再初始化
        const checkInterval = setInterval(() => {
            const container = document.getElementById('pdf-container');
            if (container) {
                clearInterval(checkInterval);
                console.log('PDF容器已创建，开始初始化放大镜功能');
                setupMagnifier(container);
            }
        }, 500);
        return;
    }

    setupMagnifier(pdfContainer);
}

// 设置放大镜功能
function setupMagnifier(pdfContainer) {
    let longPressTimer;
    let magnifier = null;
    let isLongPress = false;
    let touchStartX = 0;
    let touchStartY = 0;
    const LONG_PRESS_DURATION = 1200; // 长按时间为1.2秒
    const MOVE_THRESHOLD = 10; // 移动阈值，超过这个距离则取消长按

    // 创建放大镜元素
    function createMagnifier() {
        if (magnifier) return;

        magnifier = document.createElement('div');
        magnifier.id = 'magnifier';
        magnifier.style.cssText = `
            position: absolute;
            width: 300px;
            height: 160px;
            background-repeat: no-repeat;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 1001;
            pointer-events: none;
            display: none;
            border: 2px solid #fff;
            overflow: hidden;
            border-radius: 5px;
        `;
        document.body.appendChild(magnifier);
    }

    // 触摸开始事件
    pdfContainer.addEventListener('touchstart', function(e) {
        // 检查是否点击在PDF页面上
        const target = e.target;
        if (!target.classList.contains('pdf-page') && !target.closest('.pdf-page-container')) {
            return;
        }

        createMagnifier();

        clearTimeout(longPressTimer);
        isLongPress = false;

        // 记录初始触摸位置
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        longPressTimer = setTimeout(function() {
            isLongPress = true;
            updateMagnifier(touch);
            magnifier.style.display = 'block';
        }, LONG_PRESS_DURATION);
    }, { passive: false });

    // 触摸移动事件
    pdfContainer.addEventListener('touchmove', function(e) {
        if (isLongPress) {
            e.preventDefault(); // 阻止页面滚动

            const touch = e.touches[0];
            updateMagnifier(touch);
            return;
        }

        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - touchStartX);
        const moveY = Math.abs(touch.clientY - touchStartY);

        // 如果移动距离超过阈值，取消长按
        if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
            clearTimeout(longPressTimer);
            if (magnifier) {
                magnifier.style.display = 'none';
            }
            isLongPress = false;
        }
    }, { passive: false });

    // 触摸结束事件
    pdfContainer.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
        if (magnifier) {
            magnifier.style.display = 'none';
        }
        isLongPress = false;
    });

    // 触摸取消事件
    pdfContainer.addEventListener('touchcancel', function() {
        clearTimeout(longPressTimer);
        if (magnifier) {
            magnifier.style.display = 'none';
        }
        isLongPress = false;
    });

    // 更新放大镜位置和内容
    function updateMagnifier(touch) {
        // 找到触摸点所在的canvas
        const canvas = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!canvas || !canvas.classList.contains('pdf-page')) {
            magnifier.style.display = 'none';
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - canvasRect.left;
        const touchY = touch.clientY - canvasRect.top;

        // 检查触摸点是否在canvas内
        if (touchX < 0 || touchX > canvasRect.width || touchY < 0 || touchY > canvasRect.height) {
            magnifier.style.display = 'none';
            return;
        }

        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const magX = touch.clientX - 120;
        const magY = touch.clientY + scrollY - 200;

        magnifier.style.left = `${magX}px`;
        magnifier.style.top = `${magY}px`;

        // 计算放大倍数和背景位置
        const zoom = 1;
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算在原始canvas中的位置
        const originalX = touchX * scaleX;
        const originalY = touchY * scaleY;

        // 创建临时canvas用于放大显示
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 300;
        tempCanvas.height = 160;
        const tempCtx = tempCanvas.getContext('2d');

        // 从原始canvas中提取区域并放大
        const sourceWidth = 150 / zoom;
        const sourceHeight = 80 / zoom;
        tempCtx.drawImage(
            canvas,
            originalX - sourceWidth / 2,
            originalY - sourceHeight / 2,
            sourceWidth,
            sourceHeight,
            0,
            0,
            300,
            160
        );

        // 将临时canvas的内容设置为放大镜的背景
        magnifier.style.backgroundImage = `url(${tempCanvas.toDataURL()})`;
    }

    console.log('PDF放大镜功能初始化完成');
}

// 在DOMContentLoaded事件中初始化放大镜功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化放大镜功能
    setTimeout(initMagnifier, 1000); // 延迟1秒初始化，确保PDF容器已创建
});
