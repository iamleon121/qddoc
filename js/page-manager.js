// page-manager.js - 页面单例管理工具

/**
 * 检查并管理指定ID的页面，确保只有一个实例
 * @param {string} pageId - 页面ID
 * @param {boolean} keepCurrent - 是否保留当前页面（如果为true，则保留当前页面，关闭其他同ID页面；如果为false，则保留第一个页面）
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManagePage(pageId, keepCurrent = false) {
    try {
        // 获取当前页面
        const currentWebview = plus.webview.currentWebview();

        // 获取所有已打开的页面
        const allWebviews = plus.webview.all();

        // 过滤出所有指定ID的页面
        const targetPages = allWebviews.filter(webview => webview.id === pageId);

        // 如果没有找到页面，直接返回null
        if (targetPages.length === 0) {
            return null;
        }

        // 如果有多个指定ID的页面，只保留一个，关闭其他的
        if (targetPages.length > 1) {
            console.log(`发现${targetPages.length}个${pageId}页面，关闭多余页面`);

            // 确定要保留的页面
            let keepPage;
            if (keepCurrent && currentWebview.id === pageId) {
                // 如果需要保留当前页面，且当前页面ID匹配
                keepPage = currentWebview;
            } else {
                // 否则保留第一个页面
                keepPage = targetPages[0];
            }

            // 关闭其他页面
            for (let i = 0; i < targetPages.length; i++) {
                if (targetPages[i] !== keepPage) {
                    console.log(`关闭多余${pageId}页面: ${targetPages[i].id}`);
                    targetPages[i].close();
                }
            }

            // 确保保留的页面显示
            keepPage.show();

            return keepPage;
        }

        // 如果只有一个页面，直接返回
        return targetPages[0];
    } catch (error) {
        console.error(`检查${pageId}页面时出错:`, error);
        return null;
    }
}

/**
 * 检查并管理option页面，确保只有一个实例
 * @param {boolean} keepCurrent - 是否保留当前页面
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManageOptionPage(keepCurrent = false) {
    return checkAndManagePage('option', keepCurrent);
}

/**
 * 检查并管理loading页面，确保只有一个实例
 * @param {boolean} keepCurrent - 是否保留当前页面
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManageLoadingPage(keepCurrent = false) {
    return checkAndManagePage('loading', keepCurrent);
}

/**
 * 检查并管理list页面，确保只有一个实例
 * @param {boolean} keepCurrent - 是否保留当前页面
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManageListPage(keepCurrent = false) {
    return checkAndManagePage('list', keepCurrent);
}

/**
 * 检查并管理file页面，确保只有一个实例
 * @param {boolean} keepCurrent - 是否保留当前页面
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManageFilePage(keepCurrent = false) {
    return checkAndManagePage('file', keepCurrent);
}

/**
 * 检查并管理main页面，确保只有一个实例
 * @param {boolean} keepCurrent - 是否保留当前页面
 * @returns {object|null} - 返回保留的页面实例，如果没有找到页面则返回null
 */
function checkAndManageMainPage(keepCurrent = false) {
    return checkAndManagePage('main', keepCurrent);
}

/**
 * 打开页面，如果页面已存在则显示已有页面，否则创建新页面
 * @param {string} pageUrl - 页面URL
 * @param {string} pageId - 页面ID
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function openPage(pageUrl, pageId, options = {}) {
    // 首先检查并管理现有的页面
    const existingPage = checkAndManagePage(pageId);

    if (existingPage) {
        console.log(`${pageId}页面已存在，显示已有页面`);
        existingPage.show();
        return existingPage;
    } else {
        console.log(`${pageId}页面不存在，创建新页面`);
        const defaultOptions = {
            scrollIndicator: 'none',
            scalable: false
        };
        const mergedOptions = Object.assign({}, defaultOptions, options);
        return plus.webview.open(pageUrl, pageId, mergedOptions);
    }
}

/**
 * 打开option页面
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function gotoOption(options = {}) {
    return openPage('option.html', 'option', options);
}

/**
 * 打开loading页面
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function gotoLoading(options = {}) {
    return openPage('loading.html', 'loading', options);
}

/**
 * 打开list页面
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function gotoList(options = {}) {
    return openPage('list.html', 'list', options);
}

/**
 * 打开file页面
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function gotoFile(options = {}) {
    return openPage('file.html', 'file', options);
}

/**
 * 打开main页面
 * @param {object} options - 打开页面的选项
 * @returns {object} - 返回页面实例
 */
function gotoMain(options = {}) {
    return openPage('main.html', 'main', options);
}

// 导出函数
window.checkAndManagePage = checkAndManagePage;
window.checkAndManageOptionPage = checkAndManageOptionPage;
window.checkAndManageLoadingPage = checkAndManageLoadingPage;
window.checkAndManageListPage = checkAndManageListPage;
window.checkAndManageFilePage = checkAndManageFilePage;
window.checkAndManageMainPage = checkAndManageMainPage;
window.openPage = openPage;
window.gotoOption = gotoOption;
window.gotoLoading = gotoLoading;
window.gotoList = gotoList;
window.gotoFile = gotoFile;
window.gotoMain = gotoMain;
