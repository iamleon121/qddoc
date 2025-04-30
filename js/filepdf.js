// PDF相关变量
let pdfh5Instance = null;
let loadingProgress = 0; // 加载进度变量

// 检查jQuery是否正确加载
if (typeof $ === 'undefined') {
    console.error('jQuery库未正确加载，请检查网络连接');
    showErrorMessage('PDF查看器加载失败，无法加载必要组件');
}

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
        plus.webview.close('filepdf');
    } else {
        console.log('返回上一页');
        window.history.back();
    }
}

// 从本地存储获取文件内容的函数
function tryReadFromStorage(filename) {
    if (typeof plus !== 'undefined' && plus.storage) {
        try {
            const fileContent = plus.storage.getItem(filename);
            if (fileContent) {
                document.getElementById('fileContent').textContent = fileContent;
            } else {
                showErrorMessage('未找到文件内容');
            }
        } catch (error) {
            console.error('读取本地存储文件内容失败：', error);
            showErrorMessage('读取文件内容失败');
        }
    } else {
        showErrorMessage('无法访问本地存储');
    }
}

// 检查文件是否存在于documents目录
function checkFileInDocuments(filename, callback) {
    if (typeof plus === 'undefined') {
        callback(false);
        return;
    }
    
    const filePath = '_doc/documents/' + filename;
    plus.io.resolveLocalFileSystemURL(filePath, function() {
        callback(true);
    }, function() {
        callback(false);
    });
}

// 图片处理函数 - 移除了jsPDF转换功能
function handleImage(imageData) {
    console.log('图片格式不支持直接查看，请转换为PDF后查看');
    showErrorMessage('暂不支持直接查看图片格式，请使用其他应用打开');
    hideLoadingElement();
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

// 使用pdfh5加载PDF文件
function loadPDF(data) {
    const pdfViewer = document.getElementById('pdf-viewer');

    // 显示加载进度
    updateLoadingProgress(10, '正在加载PDF文档...');

    // 清空之前的内容
    pdfViewer.innerHTML = '';

    // 检查jQuery是否正确加载
    if (typeof $ === 'undefined') {
        console.error('jQuery库未正确加载');
        hideLoadingElement();
        showErrorMessage('PDF查看器加载失败，请检查网络连接并刷新页面');
        return;
    }

    // 加载PDF文档
    console.log('开始加载PDF文档，数据大小:', data.length, '字节');
    try {
        // 设置更详细的加载进度
        updateLoadingProgress(15, '正在准备PDF查看器...');
        
        // 销毁之前的pdfh5实例（如果存在）
        if (pdfh5Instance) {
            try {
                pdfh5Instance.destroy();
                console.log('已销毁之前的pdfh5实例');
            } catch (e) {
                console.warn('销毁之前的pdfh5实例失败:', e);
            }
        }
        
        // 创建PDF容器
        pdfViewer.innerHTML = '<div id="pdfh5-container"></div>';
        pdfViewer.style.display = 'block';
        
        // 将二进制数据转换为Blob对象
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // 初始化pdfh5
        pdfh5Instance = new pdfh5({
            pdfurl: '#pdfh5-container',
            pdfOpenParams: {
                data: data
            },
            zoomEnable: true,
            scrollEnable: true,
            loadingBar: true,
            pageNum: true,
            backTop: true,
            toolBar: true,
            scale: 1.5,
            workerSrc: 'js/pdfh5.worker.js'
        });
        
        // 添加触摸事件监听
        addTouchListeners();
        
        // 监听事件
        pdfh5Instance.on('complete', function(status, msg, time) {
            console.log('PDF加载完成', status, msg, time);
            hideLoadingElement();
            
            // 获取文件名并设置标题
            const filename = getFilenameFromUrl() || '文件内容';
            document.querySelector('.header-title').textContent = filename;
        });
        
        pdfh5Instance.on('error', function(msg) {
            console.error('PDF加载错误:', msg);
            hideLoadingElement();
            showErrorMessage('PDF文件加载失败: ' + msg);
        });
        
        pdfh5Instance.on('progress', function(progress) {
            const percent = progress.loaded / progress.total * 100;
            updateLoadingProgress(percent, `正在加载PDF: ${Math.floor(percent)}%`);
        });
        
        pdfh5Instance.on('render', function(currentNum, time, totalNum) {
            console.log('PDF渲染页面', currentNum, time, totalNum);
        });
        
    } catch (error) {
        console.error('PDF加载过程中发生错误:', error);
        hideLoadingElement();
        showErrorMessage('PDF加载过程中发生错误: ' + error.message);
    }
}

// 添加触摸事件监听器
function addTouchListeners() {
    const pdfViewer = document.getElementById('pdf-viewer');
    let lastTouchDistance = 0;
    let isZooming = false;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 3.0;
    
    // 触摸开始事件
    pdfViewer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            isZooming = true;
            lastTouchDistance = getTouchDistance(e.touches);
            e.preventDefault();
        }
    }, { passive: false });
    
    // 触摸移动事件
    pdfViewer.addEventListener('touchmove', function(e) {
        if (isZooming && e.touches.length === 2) {
            const currentDistance = getTouchDistance(e.touches);
            const delta = currentDistance / lastTouchDistance;
            const newScale = scale * delta;
            
            if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
                scale = newScale;
                applyScaleToPages(delta);
            }
            
            lastTouchDistance = currentDistance;
            e.preventDefault();
        }
    }, { passive: false });
    
    // 触摸结束事件
    pdfViewer.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            isZooming = false;
        }
    });
    
    // 触摸取消事件
    pdfViewer.addEventListener('touchcancel', function(e) {
        isZooming = false;
    });
}

// 计算两个触摸点之间的距离
function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// 直接应用缩放到所有页面，不重新渲染
function applyScaleToPages(delta) {
    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach(function(page) {
        const canvas = page.querySelector('canvas');
        if (canvas) {
            const currentWidth = parseFloat(canvas.style.width || canvas.width);
            const currentHeight = parseFloat(canvas.style.height || canvas.height);
            
            const newWidth = currentWidth * delta;
            const newHeight = currentHeight * delta;
            
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
        }
    });
}


// 获取文件名的函数
function getFilenameFromUrl() {
    const url = window.location.href;
    const params = new URLSearchParams(url.split('?')[1]);
    return params.get('filename') || '文件内容';
}

// 初始化页面
function initPage() {
    // 设置返回按钮事件
    document.getElementById('backButton').addEventListener('click', goBack);
    
    // 获取文件名并设置标题
    const filename = getFilenameFromUrl();
    document.querySelector('.header-title').textContent = filename;
    
    // 更新当前时间
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

// 从documents目录加载PDF文件
function loadPDFFromDocuments(filename) {
    if (typeof plus === 'undefined') {
        showErrorMessage('无法访问本地文件系统');
        return;
    }
    
    const filePath = '_doc/documents/' + filename;
    console.log('尝试访问文件路径:', filePath);
    plus.io.resolveLocalFileSystemURL(filePath, function(entry) {
        console.log('成功获取文件entry:', entry);
        entry.file(function(file) {
            console.log('获取文件对象成功，文件大小:', file.size, '字节');
            const reader = new plus.io.FileReader();
            reader.onloadend = function(e) {
                console.log('文件读取完成，结果:', e.target.result ? '成功' : '失败');
                if (e.target.result) {
                    console.log('文件数据大小:', e.target.result.byteLength, '字节');
                    const typedarray = new Uint8Array(e.target.result);
                    loadPDF(typedarray);
                } else {
                    console.error('文件读取结果为空');
                    showErrorMessage('文件读取失败');
                }
            };
            reader.onerror = function(e) {
                console.error('文件读取错误:', e);
                showErrorMessage('读取文件时发生错误: ' + (e.message || '未知错误'));
            };
            reader.readAsArrayBuffer(file);
        });
    }, function() {
        showErrorMessage('找不到文件: ' + filename);
    });
}

// 从documents目录加载图片文件
function loadImageFromDocuments(filename) {
    if (typeof plus === 'undefined') {
        showErrorMessage('无法访问本地文件系统');
        return;
    }
    
    const filePath = '_doc/documents/' + filename;
    plus.io.resolveLocalFileSystemURL(filePath, function(entry) {
        entry.file(function(file) {
            const reader = new plus.io.FileReader();
            reader.onloadend = function(e) {
                if (e.target.result) {
                    handleImage(e.target.result);
                } else {
                    showErrorMessage('图片读取失败');
                }
            };
            reader.onerror = function() {
                showErrorMessage('读取图片时发生错误');
            };
            reader.readAsDataURL(file);
        });
    }, function() {
        showErrorMessage('找不到图片: ' + filename);
    });
}
// 更新当前时间的函数
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    document.getElementById('current-time').textContent = timeString;
}

// 从URL获取文件名
function getFilenameFromUrl() {
    const url = window.location.href;
    const params = new URLSearchParams(url.split('?')[1]);
    return params.get('filename') || '文件内容';
}

// 列出documents目录中的所有文件
function listDocumentsFiles() {
    if (typeof plus === 'undefined') {
        console.error('plus对象未定义');
        return;
    }

    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function(fs) {
        console.log('成功获取文件系统');
        
        // 获取documents目录
        fs.root.getDirectory('documents', {}, function(dirEntry) {
            console.log('成功获取documents目录');
            
            // 创建目录读取器
            const reader = dirEntry.createReader();
            
            // 读取目录内容
            reader.readEntries(function(entries) {
                console.log('documents目录中的文件列表：');
                entries.forEach(function(entry) {
                    console.log(entry.isDirectory ? '[目录] ' : '[文件] ', entry.name);
                });
            }, function(error) {
                console.error('读取目录失败：', error);
            });
        }, function(error) {
            console.error('获取documents目录失败：', error);
        });
    }, function(error) {
        console.error('请求文件系统失败：', error);
    });
}

// 在plusready事件中调用listDocumentsFiles函数
document.addEventListener('plusready', function() {
    console.log('plusready事件触发，开始初始化PDF查看器');
    
    // 检查pdfh5库是否正确加载
    if (typeof pdfh5 === 'undefined') {
        console.error('pdfh5库未正确加载，请检查网络连接');
        showErrorMessage('PDF查看器加载失败，请检查网络连接并刷新页面');
        return;
    }
    
    // 调用列出文件函数
    listDocumentsFiles();
    // 禁止返回
    plus.key.addEventListener('backbutton', function() {
        console.log('返回list页面');
        plus.webview.close('filepdf');
    }, false);

    // 固定加载test.pdf文件
    const filename = 'test.pdf';
    console.log('开始加载固定文件:', filename);
    // 更新标题
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
        headerTitle.textContent = filename;
    }
        
        // 显示初始加载进度
        updateLoadingProgress(0, '正在准备加载文件...');

        // 固定处理test.pdf文件
        const fileExt = 'pdf';
        const processedFilename = 'test.pdf';
        const isPDF = fileExt === 'pdf';
        const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);

        // 获取查看器元素
        const pdfViewer = document.getElementById('pdf-viewer');
        const loadingElement = document.querySelector('.loading');

        if (isPDF || isImage) {
            console.log('文件类型:', isPDF ? 'PDF' : '图片');
            // 显示PDF查看器
            pdfViewer.style.display = 'block';
            loadingElement.style.display = 'flex';

            // 检查pdfh5库是否正确加载
            if (typeof pdfh5 === 'undefined') {
                console.error('pdfh5库未正确加载');
                showErrorMessage('PDF查看器加载失败，请刷新页面重试');
                return;
            }

            // 构建文件路径
            const filePath = '_doc/documents/' + processedFilename;
            console.log('尝试加载文件:', filePath);
            
            // 更新加载进度
            updateLoadingProgress(10, '正在查找文件...');
            
            // 加载文件
            plus.io.resolveLocalFileSystemURL(filePath, function(entry) {
                console.log('文件存在，开始读取');
                updateLoadingProgress(20, '文件已找到，正在读取...');
                
                entry.file(function(file) {
                    const reader = new plus.io.FileReader();
                    // 移除此处的onloadend处理器，避免重复定义
                    reader.onerror = function(e) {
                        console.error('读取文件失败：', e);
                        hideLoadingElement();
                        showErrorMessage('无法读取文件：' + (e.message || '未知错误'));
                    };
                    
                    // 添加超时处理，增加超时时间以适应大文件和低性能设备
                    let readTimeout = setTimeout(function() {
                        reader.abort(); // 中止读取操作
                        console.error('文件读取超时');
                        hideLoadingElement();
                        showErrorMessage('文件读取超时，请检查网络连接或重试');
                    }, 60000); // 增加到60秒超时
                    
                    // 优化读取方法，确保正确读取二进制数据
                    try {
                        console.log('开始读取文件，大小:', file.size, '字节');
                        
                        // 添加读取进度监听（如果支持）
                        if (typeof reader.onprogress !== 'undefined') {
                            reader.onprogress = function(e) {
                                if (e.lengthComputable) {
                                    const percent = Math.round((e.loaded / e.total) * 100);
                                    updateLoadingProgress(20 + percent/10, `正在读取文件: ${percent}%`);
                                    console.log('文件读取进度:', percent + '%');
                                    
                                    // 重置超时计时器，防止大文件读取时超时
                                    clearTimeout(readTimeout);
                                    readTimeout = setTimeout(function() {
                                        reader.abort(); // 中止读取操作
                                        console.error('文件读取超时');
                                        hideLoadingElement();
                                        showErrorMessage('文件读取超时，请检查网络连接或重试');
                                    }, 60000);
                                }
                            };
                        }
                        
                        // 清除超时并处理文件
                        reader.onloadend = function(e) {
                            clearTimeout(readTimeout);
                            if (e.target.result) {
                                console.log('文件读取成功，开始处理');
                                updateLoadingProgress(30, '文件读取成功，开始处理...');
                                
                                try {
                                    console.log('文件大小:', e.target.result.byteLength, '字节');
                                    const typedarray = new Uint8Array(e.target.result);
                                    if (isPDF) {
                                        loadPDF(typedarray);
                                    } else if (isImage) {
                                        showErrorMessage('暂不支持图片格式，请使用PDF格式文件');
                                        hideLoadingElement();
                                    }
                                } catch (error) {
                                    console.error('处理文件数据失败:', error);
                                    hideLoadingElement();
                                    showErrorMessage('处理文件数据失败: ' + error.message);
                                }
                            } else {
                                console.error('文件读取结果为空');
                                hideLoadingElement();
                                showErrorMessage('文件读取失败，文件可能已损坏');
                            }
                        };
                        
                        // 开始读取文件
                        reader.readAsArrayBuffer(file);
                    } catch (readError) {
                        clearTimeout(readTimeout);
                        console.error('启动文件读取失败:', readError);
                        hideLoadingElement();
                        showErrorMessage('无法启动文件读取: ' + readError.message);
                    }
                }, function(error) {
                    console.error('获取文件对象失败：', error);
                    hideLoadingElement();
                    showErrorMessage('无法访问文件：' + (error.message || '文件可能已损坏或被移除'));
                });
            }, function(error) {
                console.error('文件不存在，详细错误信息：', JSON.stringify(error));
                console.log('尝试的文件路径：', filePath);
                hideLoadingElement();
                showErrorMessage('找不到文件：' + filename + '<br>请确保文件已正确保存到documents目录<br>错误代码：' + (error.code || 'unknown'));
            });
        } else {
            console.error('不支持的文件类型：', fileExt);
            hideLoadingElement();
            showErrorMessage('不支持的文件格式：' + fileExt + '<br>系统目前仅支持PDF和图片(jpg/jpeg/png/gif)文件');
        }
    } else {
        showErrorMessage('未指定文件名');
    }
});

// DOMContentLoaded事件监听
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
        backButton.addEventListener('click', goBack);
    }
    
    // 初始化时间显示并设置定时器
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});