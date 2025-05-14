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
        // 如果loading元素不存在，创建一个临时的
        const fileContent = document.getElementById('fileContent');
        if (fileContent) {
            const tempLoadingElement = document.createElement('div');
            tempLoadingElement.className = 'loading';
            tempLoadingElement.innerHTML = `
                <div class="spinner"></div>
                <div>${message || '正在加载文件...'}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div>${Math.round(percent)}%</div>
            `;
            tempLoadingElement.style.display = 'flex';
            fileContent.appendChild(tempLoadingElement);
            console.log(`加载进度更新: ${percent}%, 消息: ${message}`);
        } else {
            console.error('找不到loading元素和fileContent元素');
        }
    }
}

// 隐藏加载元素的函数
function hideLoadingElement() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        // 确保元素被完全隐藏
        loadingElement.style.display = 'none';
        loadingElement.style.visibility = 'hidden';
        loadingElement.style.opacity = '0';

        // 为确保隐藏成功，可以考虑从DOM中移除元素
        try {
            loadingElement.parentNode.removeChild(loadingElement);
            console.log('加载元素已从DOM中移除');
        } catch (e) {
            console.error('移除加载元素失败:', e);
        }

        console.log('隐藏加载元素');
    } else {
        console.log('找不到loading元素，无需隐藏');
    }

    // 确保PDF容器可见
    const pdfViewer = document.getElementById('pdf-viewer');
    if (pdfViewer) {
        pdfViewer.style.display = 'block';
        pdfViewer.style.visibility = 'visible';
        pdfViewer.style.opacity = '1';
        console.log('确保PDF容器可见');
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

            // 如果Pdfh5实例已经初始化，则使用它的goto方法
            if (pdfh5Instance) {
                console.log('使用Pdfh5切换到第', selectedPage, '页');
                pdfh5Instance.goto(selectedPage);
            } else {
                console.log('Pdfh5实例未初始化，无法切换页面');
            }
        });
    }

    // 创建初始loading元素
    const fileContent = document.getElementById('fileContent');
    if (fileContent) {
        // 检查是否已存在loading元素
        if (!document.querySelector('.loading')) {
            const loadingElement = document.createElement('div');
            loadingElement.className = 'loading';
            loadingElement.innerHTML = `
                <div class="spinner"></div>
                <div>准备加载PDF文件...</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div>0%</div>
            `;
            fileContent.appendChild(loadingElement);
            console.log('创建了初始loading元素');
        }
    }

    // 获取文件路径
    const filePath = getUrlParameter('path');
    if (!filePath) {
        showErrorMessage('未指定文件路径');
    }
    // 注意：我们不在这里加载PDF，而是在plusready事件中处理
}

// 强制显示PDF内容
function forceShowPdf() {
    console.log('强制显示PDF内容');

    // 移除所有loading元素
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(function(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            console.log('强制移除loading元素');
        }
    });

    // 确保PDF容器可见
    const pdfViewer = document.getElementById('pdf-viewer');
    if (pdfViewer) {
        pdfViewer.style.display = 'block';
        pdfViewer.style.visibility = 'visible';
        pdfViewer.style.opacity = '1';
        pdfViewer.style.zIndex = '1000';
        console.log('强制设置PDF容器可见');

        // 尝试刷新PDF内容
        if (pdfh5Instance) {
            try {
                pdfh5Instance.reset();
                pdfh5Instance.goto(1);
                console.log('重置并刷新PDF内容');
            } catch (e) {
                console.error('刷新PDF内容失败:', e);
            }
        }
    }

    // 修改body和fileContent的样式，确保内容可见
    document.body.style.overflow = 'auto';
    const fileContent = document.getElementById('fileContent');
    if (fileContent) {
        fileContent.style.overflow = 'auto';
        fileContent.style.position = 'relative';
        fileContent.style.zIndex = '1';
    }
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

    // 添加强制显示PDF按钮的事件监听器
    const forceShowPdfButton = document.getElementById('forceShowPdf');
    if (forceShowPdfButton) {
        forceShowPdfButton.addEventListener('click', forceShowPdf);
        console.log('添加了强制显示PDF按钮的事件监听器');
    }

    // 5秒后自动尝试强制显示PDF
    setTimeout(function() {
        forceShowPdf();
        console.log('自动尝试强制显示PDF');
    }, 5000);
});

// 加载PDF文件的主函数
function loadPdfFile(filePath) {
    console.log('开始加载PDF文件:', filePath);
    updateLoadingProgress(10, '正在准备加载PDF文件...');

    // 首先尝试使用FileReader分块读取
    loadPdfWithFileReader(filePath)
        .then(() => {
            console.log('FileReader加载成功');
            updateLoadingProgress(90, 'PDF文件加载成功，准备渲染...');

            // 准备PDF容器
            if (preparePdfContainer()) {
                // 渲染PDF
                renderPdfWithPdfh5(pdfObjectUrl);
            } else {
                console.error('PDF容器准备失败，无法渲染PDF');
                showErrorMessage('PDF渲染失败：容器准备失败');
            }
        })
        .catch(error => {
            console.error('FileReader加载失败:', error);
            updateLoadingProgress(20, '尝试备用加载方法...');

            // 备用方法：使用plus.io.resolveLocalFileSystemURL
            loadPdfWithFileSystem(filePath)
                .then(() => {
                    console.log('FileSystem加载成功');
                    updateLoadingProgress(90, 'PDF文件加载成功(备用方法)，准备渲染...');

                    // 准备PDF容器
                    if (preparePdfContainer()) {
                        // 渲染PDF
                        renderPdfWithPdfh5(pdfObjectUrl);
                    } else {
                        console.error('PDF容器准备失败，无法渲染PDF');
                        showErrorMessage('PDF渲染失败：容器准备失败');
                    }
                })
                .catch(finalError => {
                    console.error('所有加载方法均失败:', finalError);
                    showErrorMessage('PDF文件加载失败，请检查文件是否存在或格式是否正确');
                });
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
                            updateLoadingProgress(90, '文件读取完成，准备处理...');

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
                            updateLoadingProgress(percent, '正在读取PDF文件...');
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
                    updateLoadingProgress(percent, `正在读取PDF文件(${loadedChunks}/${chunks})...`);

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

// 方法2：使用FileSystem API
function loadPdfWithFileSystem(filePath) {
    return new Promise((resolve, reject) => {
        console.log('使用FileSystem API加载PDF文件:', filePath);
        updateLoadingProgress(30, '尝试备用方法加载PDF...');

        plus.io.resolveLocalFileSystemURL(filePath, fileEntry => {
            // 创建临时目录用于存放转换后的文件
            plus.io.resolveLocalFileSystemURL('_doc/', docDir => {
                docDir.getDirectory('temp', { create: true, exclusive: false }, tempDir => {
                    // 生成唯一的临时文件名
                    const tempFileName = 'pdf_' + Date.now() + '.pdf';
                    const tempFilePath = '_doc/temp/' + tempFileName;

                    console.log('创建临时文件:', tempFilePath);

                    // 复制文件到临时目录
                    fileEntry.copyTo(tempDir, tempFileName, tempFileEntry => {
                        console.log('文件已复制到临时目录:', tempFilePath);
                        updateLoadingProgress(60, '文件已复制到临时目录...');

                        // 使用HTML5+的方式获取本地文件URL
                        const localUrl = plus.io.convertLocalFileSystemURL(tempFilePath);
                        console.log('转换后的URL:', localUrl);

                        // 使用base64编码
                        const reader = new plus.io.FileReader();
                        reader.onloadend = function(e) {
                            if (e.target.readyState === plus.io.FileReader.DONE) {
                                console.log('临时文件读取完成');
                                updateLoadingProgress(90, '文件读取完成，准备处理...');

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
                            console.error('读取临时文件失败:', e);
                            reject(new Error('读取临时文件失败'));
                        };

                        // 以base64方式读取
                        tempFileEntry.file(file => {
                            reader.readAsDataURL(file);
                        });
                    }, error => {
                        console.error('复制文件失败:', error);
                        reject(error);
                    });
                }, error => {
                    console.error('创建临时目录失败:', error);
                    reject(error);
                });
            }, error => {
                console.error('获取文档目录失败:', error);
                reject(error);
            });
        }, error => {
            console.error('解析文件路径失败:', error);
            reject(error);
        });
    });
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

    // 添加加载元素
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.style.zIndex = '1001'; // 确保loading元素在最上层
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.background = 'rgba(255, 255, 255, 0.9)';
    loadingElement.style.padding = '20px';
    loadingElement.style.borderRadius = '8px';
    loadingElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    loadingElement.style.display = 'flex';
    loadingElement.style.flexDirection = 'column';
    loadingElement.style.alignItems = 'center';
    loadingElement.style.justifyContent = 'center';
    loadingElement.style.textAlign = 'center';

    loadingElement.innerHTML = `
        <div class="spinner"></div>
        <div>正在加载PDF文件...</div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div>0%</div>
    `;

    // 清空现有内容
    fileContent.innerHTML = '';

    // 创建PDF查看器容器
    const newPdfViewer = document.createElement('div');
    newPdfViewer.id = 'pdf-viewer';
    newPdfViewer.className = 'pdfjs'; // 添加pdfjs类，这是PDFh5需要的
    newPdfViewer.style.width = '100%';
    newPdfViewer.style.height = '100%';
    newPdfViewer.style.minHeight = '65vh';
    newPdfViewer.style.overflow = 'auto'; // 改为auto，允许滚动
    newPdfViewer.style.position = 'relative';
    newPdfViewer.style.zIndex = '1';
    newPdfViewer.style.backgroundColor = '#fff';
    newPdfViewer.style.imageRendering = 'high-quality'; // 提高图像渲染质量
    newPdfViewer.style.textRendering = 'geometricPrecision'; // 提高文本渲染质量
    newPdfViewer.style.webkitFontSmoothing = 'antialiased'; // 字体平滑
    newPdfViewer.style.mozOsxFontSmoothing = 'grayscale'; // 字体平滑

    // 添加容器和加载元素
    fileContent.appendChild(newPdfViewer);
    fileContent.appendChild(loadingElement);

    console.log('创建了新的PDF查看器容器');

    // 检查容器是否正确创建
    if (!document.getElementById('pdf-viewer')) {
        console.error('PDF查看器容器创建失败');
        return false;
    }

    console.log('PDF容器准备完成');
    return true;
}

// 使用Pdfh5渲染PDF
function renderPdfWithPdfh5(pdfUrl) {
    console.log('开始渲染PDF:', pdfUrl);
    updateLoadingProgress(95, '正在渲染PDF...');

    try {
        // 确保Pdfh5容器存在
        const pdfContainer = document.getElementById('pdf-viewer');
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

        // 确保容器可见
        pdfContainer.style.display = 'block';

        // 初始化Pdfh5
        console.log('初始化Pdfh5实例');

        // 创建Pdfh5配置
        const pdfh5Config = {
            pdfurl: pdfUrl,
            renderType: 'canvas', // 使用canvas渲染，性能更好
            scrollEnable: true,
            zoomEnable: true,
            pageNum: 1, // 初始页码
            scale: 1.5, // 提高初始缩放比例，使文字更清晰
            zoomWheelEnable: true, // 允许滚轮缩放
            textLayer: false, // 禁用文本层，避免错误
            loadingBar: false, // 禁用内置加载条，使用我们自己的
            URIenable: false, // 禁用URI处理
            maxCanvasPixels: 16777216 * 4 // 增加最大画布像素数，提高渲染质量
        };

        console.log('Pdfh5配置:', pdfh5Config);

        // 初始化Pdfh5实例
        pdfh5Instance = new Pdfh5(pdfContainer, pdfh5Config);

        console.log('Pdfh5实例创建成功');

        // 监听Pdfh5事件
        pdfh5Instance.on('complete', function(status, msg, time) {
            console.log('PDF渲染完成，状态:', status, '消息:', msg, '耗时:', time, '毫秒');
            updateLoadingProgress(100, '加载完成');

            // 获取总页数
            const actualTotalPages = pdfh5Instance.totalNum || 1;
            console.log('实际总页数:', actualTotalPages);

            // 更新页码信息
            document.getElementById('totalPages').textContent = actualTotalPages;
            window.totalPages = actualTotalPages;

            // 更新页码选择器
            updatePageSelector(actualTotalPages);

            // 显示当前页码
            document.getElementById('currentPage').style.display = 'inline';

            // 确保PDF容器可见
            const pdfViewer = document.getElementById('pdf-viewer');
            if (pdfViewer) {
                pdfViewer.style.display = 'block';
                pdfViewer.style.visibility = 'visible';
                pdfViewer.style.opacity = '1';
                console.log('PDF容器已设置为可见');
            }

            // 使用setTimeout确保在DOM更新后再隐藏loading元素
            setTimeout(function() {
                hideLoadingElement();
                console.log('延迟隐藏loading元素');

                // 再次延迟1秒后强制显示PDF
                setTimeout(function() {
                    forceShowPdf();
                    console.log('PDF渲染完成后强制显示PDF');
                }, 1000);
            }, 500);
        });

        pdfh5Instance.on('error', function(error) {
            console.error('PDF渲染错误:', error);
            showErrorMessage('PDF渲染失败：' + error);
        });

        pdfh5Instance.on('progress', function(progress) {
            // 渲染进度
            const percent = 95 + Math.round(progress * 5);
            updateLoadingProgress(percent, '正在渲染PDF...');
        });

        pdfh5Instance.on('pageChange', function(pageNum) {
            // 页码变化
            currentPage = pageNum;
            document.getElementById('currentPage').textContent = pageNum;
            document.getElementById('pageSelect').value = pageNum;
        });

        console.log('Pdfh5事件监听器已设置');
    } catch (error) {
        console.error('Pdfh5初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        showErrorMessage('PDF渲染失败：' + error.message);
    }
}

// 更新页码选择器
function updatePageSelector(totalPages) {
    console.log('更新页码选择器，总页数:', totalPages);
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

        // 设置当前页码
        pageSelect.value = currentPage;

        // 添加页码切换事件
        pageSelect.addEventListener('change', function() {
            const selectedPage = parseInt(this.value);
            if (pdfh5Instance) {
                console.log('切换到第', selectedPage, '页');
                pdfh5Instance.goto(selectedPage);
            }
        });
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

        // 注意：页码选择器的事件处理已经在initPage函数中设置，这里不需要重复设置

        // 显示加载元素
        updateLoadingProgress(0, '准备加载PDF文件...');

        // 开始加载PDF文件
        loadPdfFile(filePath);
    } else {
        showErrorMessage('未指定文件路径');
    }
});
