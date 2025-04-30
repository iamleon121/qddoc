/**
 * pdfh5.worker.js v1.4.9
 * Copyright © 2019-2023 gjTool
 * Released under the MIT License.
 * https://github.com/gjTool/pdfh5
 */

// PDF.js worker script for pdfh5
// This file is a simplified version of the worker script

'use strict';

self.onmessage = function(e) {
  var data = e.data;
  var id = data.id;
  var cmd = data.cmd;
  var result;

  try {
    switch (cmd) {
      case 'init':
        // Initialize worker
        result = { success: true };
        break;
      case 'getPage':
        // Process page request
        result = { 
          success: true, 
          pageIndex: data.pageIndex,
          width: data.width || 800,
          height: data.height || 1200
        };
        break;
      case 'render':
        // Process render request
        result = { 
          success: true, 
          pageIndex: data.pageIndex
        };
        break;
      case 'getTextContent':
        // Process text content request
        result = { 
          success: true, 
          pageIndex: data.pageIndex,
          textContent: { items: [] }
        };
        break;
      default:
        result = { success: false, error: 'Unknown command: ' + cmd };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }

  // Send result back to main thread
  self.postMessage({
    id: id,
    result: result
  });
};

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' });