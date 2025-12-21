import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// Move Dialog Component
function MoveDialog({ isOpen, files, targetFolder, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h3>Move Files</h3>
                <p>Move {files.length} file(s) to "{targetFolder}"?</p>
                <ul>
                    {files.map(file => <li key={file}>{file}</li>)}
                </ul>
                <div className="modal-buttons">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={onConfirm}>Move</button>
                </div>
            </div>
        </div>
    );
}

// Content View Component
function ContentView({ currentPath, onNavigate, onRefresh }) {
    const [folder, setFolder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [moveData, setMoveData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });
        
        try {
            const targetFolder = currentPath.join('/');
            
            // Process files in batches for better UX
            const batchSize = 5;
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                await apiService.uploadFiles(targetFolder, batch);
                setUploadProgress({ current: Math.min(i + batchSize, files.length), total: files.length });
            }
            
            onRefresh();
            event.target.value = '';
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    useEffect(() => {
        if (currentPath.length === 0) {
            setFolder(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        apiService.loadFolder(currentPath.join('/'))
            .then(data => {
                setFolder(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [currentPath]);

    useEffect(() => {
        setSelectedFiles(new Set());
    }, [currentPath]);

    const handleFileClick = (fileName) => {
        console.log('File clicked:', fileName);
    };

    const handleCheckboxChange = (fileName, event) => {
        event.stopPropagation();
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(fileName)) {
            newSelected.delete(fileName);
        } else {
            newSelected.add(fileName);
        }
        setSelectedFiles(newSelected);
    };

    const handleDragStart = (event, fileName) => {
        let filesToDrag;
        if (selectedFiles.has(fileName)) {
            filesToDrag = Array.from(selectedFiles);
        } else {
            filesToDrag = [fileName];
        }

        const filesWithPath = filesToDrag.map(file => {
            return currentPath.length > 0 ? `${currentPath.join('/')}/${file}` : file;
        });

        event.dataTransfer.setData('text/plain', JSON.stringify(filesWithPath));
        event.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (event) => {
        event.currentTarget.classList.remove('dragging');
        setDragOverFolder(null);
    };

    const handleDragOver = (event, folderName) => {
        event.preventDefault();
        setDragOverFolder(folderName);
    };

    const handleDragLeave = () => {
        setDragOverFolder(null);
    };

    const handleDrop = (event, folderName) => {
        event.preventDefault();
        setDragOverFolder(null);

        try {
            const files = JSON.parse(event.dataTransfer.getData('text/plain'));
            const targetPath = [...currentPath, folderName].join('/');

            setMoveData({ files, targetFolder: folderName, targetPath });
            setShowMoveDialog(true);
        } catch (error) {
            console.error('Error parsing drag data:', error);
        }
    };

    const confirmMove = async () => {
        if (moveData) {
            const success = await apiService.moveFiles(moveData.files, moveData.targetPath);
            if (success) {
                onRefresh();
            } else {
                alert('Failed to move files');
            }
        }
        setShowMoveDialog(false);
        setMoveData(null);
        setSelectedFiles(new Set());
    };

    const cancelMove = () => {
        setShowMoveDialog(false);
        setMoveData(null);
    };

    if (currentPath.length === 0) return <div>Select a folder to view its contents</div>;
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!folder || !folder.children) return <div>Empty folder</div>;

    return (
        <div>
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="file-upload"
                />
                <input
                    type="file"
                    webkitdirectory="true"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="folder-upload"
                />
                <label
                    htmlFor="file-upload"
                    style={{
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: uploading ? 0.6 : 1,
                        marginRight: '10px'
                    }}
                >
                    <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
                    {uploading ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Upload Files'}
                </label>
                <label
                    htmlFor="folder-upload"
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: uploading ? 0.6 : 1
                    }}
                >
                    <i className="fas fa-folder-plus" style={{ marginRight: '8px' }}></i>
                    Upload Folder
                </label>
                <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6c757d' }}>
                    Upload to: /{currentPath.join('/')}
                </span>
            </div>
            
            {folder.children.map(item => (
                <div
                    key={item.name}
                    className={`${item.type === 'folder' ? 'folder-item' : 'file-item'} ${
                        selectedFiles.has(item.name) ? 'selected' : ''
                    } ${dragOverFolder === item.name ? 'drag-over' : ''}`}
                    draggable={item.type === 'file'}
                    onDragStart={(e) => handleDragStart(e, item.name)}
                    onDragEnd={handleDragEnd}
                    onDragOver={item.type === 'folder' ? (e) => handleDragOver(e, item.name) : undefined}
                    onDragLeave={item.type === 'folder' ? handleDragLeave : undefined}
                    onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.name) : undefined}
                    onClick={(e) => {
                        if (e.target.type === 'checkbox') return;
                        if (item.type === 'folder') {
                            // Only allow navigation to root-level folders
                            if (currentPath.length === 0) {
                                onNavigate([item.name]);
                            }
                        } else {
                            handleFileClick(item.name);
                        }
                    }}
                >
                    {item.type === 'file' && (
                        <input
                            type="checkbox"
                            className="checkbox"
                            checked={selectedFiles.has(item.name)}
                            readOnly
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(item.name, e);
                            }}
                        />
                    )}
                    <i className={`fas ${item.type === 'folder' ? 'fa-folder' : 'fa-file'} icon`}></i>
                    {item.name}
                </div>
            ))}

            <MoveDialog
                isOpen={showMoveDialog}
                files={moveData?.files || []}
                targetFolder={moveData?.targetFolder || ''}
                onConfirm={confirmMove}
                onCancel={cancelMove}
            />
        </div>
    );
}

// Tree View Component
function TreeView({ onNavigate, onDrop, refreshKey }) {
    const [treeData, setTreeData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragOverPath, setDragOverPath] = useState(null);

    const handleDragOver = (event, path) => {
        event.preventDefault();
        setDragOverPath(path.join('/'));
    };

    const handleDragLeave = () => {
        setDragOverPath(null);
    };

    const handleDrop = (event, path) => {
        event.preventDefault();
        setDragOverPath(null);

        try {
            const files = JSON.parse(event.dataTransfer.getData('text/plain'));
            onDrop(files, path.join('/'));
        } catch (error) {
            console.error('Error parsing drag data:', error);
        }
    };

    useEffect(() => {
        const loadTree = async () => {
            try {
                const rootData = await apiService.loadFolder('');
                setTreeData(rootData);
            } catch (error) {
                console.error('Failed to load tree:', error);
            }
        };
        loadTree();
    }, [refreshKey]);

    const renderTreeNode = (node, path = []) => {
        if (!node || node.type !== 'folder') return null;
        const isRoot = path.length === 0;
        const pathString = path.join('/');
        const isDragOver = dragOverPath === pathString;
        
        // Only show root level folders in tree
        if (path.length > 1) return null;

        return (
            <div key={node.name}>
                <div
                    className={`folder-item ${isRoot ? 'root-folder' : ''} ${isDragOver ? 'drag-over' : ''}`}
                    onClick={isRoot ? undefined : () => onNavigate(path)}
                    onDragOver={!isRoot ? (e) => handleDragOver(e, path) : undefined}
                    onDragLeave={!isRoot ? handleDragLeave : undefined}
                    onDrop={!isRoot ? (e) => handleDrop(e, path) : undefined}
                    style={isRoot ? { cursor: 'default' } : {}}
                >
                    <i className="fas fa-folder icon"></i>
                    {node.name}
                </div>
                {node.children && isRoot && (
                    <div className="tree-item">
                        {node.children
                            .filter(child => child.type === 'folder')
                            .map(child =>
                                renderTreeNode(child, [...path, child.name])
                            )
                        }
                    </div>
                )}
            </div>
        );
    };

    if (!treeData) return <div>Loading tree...</div>;

    return (
        <div>
            <input
                type="text"
                className="search-box"
                placeholder="Search folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {renderTreeNode(treeData)}
        </div>
    );
}

// Main File Manager Component
function FileManager({ currentPath, onNavigate }) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [moveData, setMoveData] = useState(null);
    const [showMoveDialog, setShowMoveDialog] = useState(false);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleTreeDrop = (files, targetPath) => {
        const folderName = targetPath.split('/').pop() || 'root';
        setMoveData({ files, targetFolder: folderName, targetPath });
        setShowMoveDialog(true);
    };

    const confirmMove = async () => {
        if (moveData) {
            const success = await apiService.moveFiles(moveData.files, moveData.targetPath);
            if (success) {
                handleRefresh();
            } else {
                alert('Failed to move files');
            }
        }
        setShowMoveDialog(false);
        setMoveData(null);
    };

    const cancelMove = () => {
        setShowMoveDialog(false);
        setMoveData(null);
    };

    return (
        <div className="container">
            <div className="sidebar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e1e5e9' }}>
                    <h3 style={{ margin: 0 }}>Directory Tree</h3>
                    <button
                        style={{
                            padding: '6px 12px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                        onClick={async () => {
                            const folderName = prompt('Enter folder name:');
                            if (folderName && folderName.trim()) {
                                try {
                                    await apiService.createFolder(folderName.trim());
                                    handleRefresh();
                                } catch (error) {
                                    alert('Failed to create folder: ' + error.message);
                                }
                            }
                        }}
                    >
                        New Folder
                    </button>
                </div>
                <div className="tree-container">
                    <TreeView key={refreshKey} onNavigate={onNavigate} onDrop={handleTreeDrop} refreshKey={refreshKey} />
                </div>
            </div>
            <div className="main">
                <div className="toolbar">
                    <div className="breadcrumb">
                        /{currentPath.join('/')}
                    </div>
                </div>
                <div className="content">
                    <ContentView
                        key={refreshKey}
                        currentPath={currentPath}
                        onNavigate={onNavigate}
                        onRefresh={handleRefresh}
                    />
                </div>
            </div>

            <MoveDialog
                isOpen={showMoveDialog}
                files={moveData?.files || []}
                targetFolder={moveData?.targetFolder || ''}
                onConfirm={confirmMove}
                onCancel={cancelMove}
            />
        </div>
    );
}

export default FileManager;