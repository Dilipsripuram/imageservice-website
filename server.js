const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

function buildDirectoryTree(dirPath, basePath = '') {
    const items = [];
    
    try {
        const entries = fs.readdirSync(dirPath);
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                const children = buildDirectoryTree(fullPath, path.join(basePath, entry));
                const fileCount = children.filter(child => child.type === 'file').length;
                const folderCount = children.filter(child => child.type === 'folder').length;
                
                items.push({
                    name: entry,
                    type: 'folder',
                    children: children,
                    fileCount: fileCount,
                    folderCount: folderCount
                });
            } else {
                items.push({
                    name: entry,
                    type: 'file',
                    size: stats.size,
                    modified: stats.mtime
                });
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }
    
    return items;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
    }

    let filePath;
    let contentType;

    if (pathname === '/' || pathname === '/index.html') {
        filePath = path.join(__dirname, 'index.html');
        contentType = 'text/html';
    } else if (pathname === '/imageEditor') {
        filePath = path.join(__dirname, 'imageEditor.html');
        contentType = 'text/html';
    } else if (pathname === '/api/files') {
        const requestedPath = parsedUrl.query.path || '';
        const fullPath = path.join(__dirname, 'root', requestedPath);
        
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                if (requestedPath === '') {
                    // Return full tree for root
                    const children = buildDirectoryTree(fullPath);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ name: 'root', type: 'folder', children }));
                } else {
                    // Return just current directory contents
                    const items = fs.readdirSync(fullPath).map(item => {
                        const itemPath = path.join(fullPath, item);
                        const itemStats = fs.statSync(itemPath);
                        return {
                            name: item,
                            type: itemStats.isDirectory() ? 'folder' : 'file',
                            size: itemStats.size,
                            modified: itemStats.mtime
                        };
                    });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ name: path.basename(fullPath), type: 'folder', children: items }));
                }
                return;
            }
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Path not found' }));
            return;
        }
    } else if (pathname === '/api/move' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { files, targetPath } = JSON.parse(body);
                let success = true;
                
                files.forEach(filePath => {
                    const sourcePath = path.join(__dirname, 'root', filePath);
                    const fileName = path.basename(filePath);
                    const destPath = path.join(__dirname, 'root', targetPath, fileName);
                    
                    try {
                        fs.renameSync(sourcePath, destPath);
                    } catch (error) {
                        console.error(`Failed to move ${filePath}:`, error);
                        success = false;
                    }
                });
                
                res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
        });
        return;
    } else if (pathname.startsWith('/image/')) {
        const imagePath = pathname.replace('/image/', '');
        const fullImagePath = path.join(__dirname, 'root', imagePath);
        
        try {
            const stats = fs.statSync(fullImagePath);
            if (stats.isFile() && fullImagePath.endsWith('.png')) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                fs.createReadStream(fullImagePath).pipe(res);
                return;
            }
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Image not found');
            return;
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});