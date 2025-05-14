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

                            // 添加页面切换事件
                            addPageChangeListeners();
                        }
                    });
                }).catch(function(error) {
                    console.error('渲染第', pageNumber, '页时出错:', error);
                });
            }

            // 添加页面切换事件监听器
            function addPageChangeListeners() {
                // 页面滚动时更新当前页码
                pdfContainer.addEventListener('scroll', function() {
                    // 找到当前可见的页面
                    const pageContainers = document.querySelectorAll('.pdf-page-container');
                    let visiblePage = 1;

                    for (let i = 0; i < pageContainers.length; i++) {
                        const container = pageContainers[i];
                        const rect = container.getBoundingClientRect();

                        // 如果页面在视口中
                        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                            visiblePage = parseInt(container.getAttribute('data-page-number'));
                            break;
                        }
                    }

                    // 更新当前页码
                    if (currentPage !== visiblePage) {
                        currentPage = visiblePage;
                        document.getElementById('pageSelect').value = visiblePage;
                        console.log('当前页码:', visiblePage);
                    }
                });

                // 页码选择器切换页面
                document.getElementById('pageSelect').addEventListener('change', function() {
                    const selectedPage = parseInt(this.value);
                    scrollToPage(selectedPage);
                });
            }

            // 滚动到指定页面
            function scrollToPage(pageNumber) {
                const pageContainer = document.querySelector(`.pdf-page-container[data-page-number="${pageNumber}"]`);
                if (pageContainer) {
                    pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    currentPage = pageNumber;
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

            // 添加页码切换事件
            pageSelect.addEventListener('change', function() {
                const selectedPage = parseInt(this.value);
                currentPage = selectedPage;
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
