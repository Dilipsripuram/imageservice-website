import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';
import ImagePreview from './ImagePreview';

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
function ContentView({ currentFolder, onRefresh, onImagesChange }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [moveData, setMoveData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [imagesPerPage, setImagesPerPage] = useState(20);
    const [images, setImages] = useState([]);
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [loadedImageCount, setLoadedImageCount] = useState(0);
    const [hasMoreImages, setHasMoreImages] = useState(false);
    const [lastImageKey, setLastImageKey] = useState(null);
    
    // Cache for images by folderId
    const [imageCache, setImageCache] = useState(new Map());

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0 || !currentFolder) return;

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });
        
        try {
            const result = await apiService.uploadFiles(
                currentFolder.folderId, 
                files,
                (current, total) => {
                    setUploadProgress({ current, total });
                }
            );
            
            setUploadProgress({ current: files.length, total: files.length });
            loadImages(); // Reload images
            
            // Clear cache for current folder to force refresh
            setImageCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(currentFolder.folderId);
                return newCache;
            });
            event.target.value = '';
            
            if (result.failedUploads && result.failedUploads.length > 0) {
                alert(`Upload completed with ${result.failedUploads.length} failures`);
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    useEffect(() => {
        setSelectedFiles(new Set());
        setSelectedImage(null);
        setSelectedImageIndex(0);
        
        if (currentFolder) {
            // Check cache first
            const cached = imageCache.get(currentFolder.folderId);
            if (cached) {
                setImages(cached.images);
                setLoadedImageCount(cached.images.length);
                setHasMoreImages(cached.hasMore);
                setLastImageKey(cached.nextKey);
                if (onImagesChange) onImagesChange(cached.images);
            } else {
                setLoadedImageCount(0);
                setImages([]);
                setLastImageKey(null);
                loadImages();
            }
        }
    }, [currentFolder]);

    const loadImages = async (append = false) => {
        if (!currentFolder) return;
        
        try {
            const lastKey = append ? lastImageKey : null;
            const data = await apiService.loadImages(currentFolder.folderId, imagesPerPage, lastKey);
            
            let newImages;
            if (append) {
                newImages = [...images, ...(data.images || [])];
                setImages(newImages);
            } else {
                newImages = data.images || [];
                setImages(newImages);
            }
            
            // Update cache
            setImageCache(prev => new Map(prev.set(currentFolder.folderId, {
                images: newImages,
                hasMore: data.hasMore || false,
                nextKey: data.nextKey || null
            })));
            
            setLoadedImageCount(prev => append ? prev + (data.images?.length || 0) : (data.images?.length || 0));
            setHasMoreImages(data.hasMore || false);
            setLastImageKey(data.nextKey || null);
            
            if (onImagesChange) onImagesChange(newImages);
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    };

    const loadMoreImages = () => {
        loadImages(true);
    };

    const isImageFile = (fileName) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    };

    const handleFileClick = (fileName, index, event) => {
        if (event.shiftKey && lastClickedIndex !== null) {
            // Shift+click: select range
            event.preventDefault();
            event.stopPropagation();
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const newSelected = new Set(selectedFiles);
            
            for (let i = start; i <= end; i++) {
                if (images[i]) {
                    newSelected.add(images[i].fileName);
                }
            }
            setSelectedFiles(newSelected);
            // Keep the same lastClickedIndex for chaining ranges
        } else {
            // Regular click: set last clicked index and open preview
            setLastClickedIndex(index);
            setSelectedImage(fileName);
            setSelectedImageIndex(index);
            setShowImagePreview(true);
        }
    };

    const handleCheckboxChange = (fileName, index, event) => {
        event.stopPropagation();
        
        if (event.shiftKey && lastClickedIndex !== null) {
            // Shift+click: select range
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const newSelected = new Set(selectedFiles);
            
            for (let i = start; i <= end; i++) {
                if (images[i]) {
                    newSelected.add(images[i].fileName);
                }
            }
            setSelectedFiles(newSelected);
        } else {
            // Regular checkbox click: toggle single item
            const newSelected = new Set(selectedFiles);
            if (newSelected.has(fileName)) {
                newSelected.delete(fileName);
            } else {
                newSelected.add(fileName);
            }
            setSelectedFiles(newSelected);
            setLastClickedIndex(index); // Set last clicked for shift+click chaining
        }
    };

    const handleDragStart = (event, fileName) => {
        let filesToDrag;
        if (selectedFiles.has(fileName)) {
            filesToDrag = Array.from(selectedFiles);
        } else {
            filesToDrag = [fileName];
        }

        event.dataTransfer.setData('text/plain', JSON.stringify(filesToDrag));
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

            setMoveData({ files, targetFolder: folderName });
            setShowMoveDialog(true);
        } catch (error) {
            console.error('Error parsing drag data:', error);
        }
    };

    const confirmMove = async () => {
        if (moveData) {
            alert('Move functionality is now handled at the main level');
        }
        setShowMoveDialog(false);
        setMoveData(null);
        setSelectedFiles(new Set());
    };

    const cancelMove = () => {
        setShowMoveDialog(false);
        setMoveData(null);
    };

    if (!currentFolder) return <div>Select a folder to view its contents</div>;
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
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
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginRight: '10px'
                        }}
                    >
                        <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
                        Upload Files
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
                        {uploading ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Upload Folder'}
                    </label>
                    <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6c757d' }}>
                        Upload to: {currentFolder?.name || 'No folder selected'}
                    </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '6px 12px',
                            background: viewMode === 'list' ? '#007bff' : '#e9ecef',
                            color: viewMode === 'list' ? 'white' : '#495057',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        <i className="fas fa-list"></i> List
                    </button>
                    <button
                        onClick={() => setViewMode('thumbnail')}
                        style={{
                            padding: '6px 12px',
                            background: viewMode === 'thumbnail' ? '#007bff' : '#e9ecef',
                            color: viewMode === 'thumbnail' ? 'white' : '#495057',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        <i className="fas fa-th"></i> Thumbnail
                    </button>
                </div>
            </div>
            
            {/* Select All/Deselect All Row */}
            {images.length > 0 && (
                <div style={{
                    padding: '10px',
                    background: '#f1f3f4',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <div
                        onClick={() => {
                            if (selectedFiles.size === images.length) {
                                setSelectedFiles(new Set());
                            } else {
                                setSelectedFiles(new Set(images.map(img => img.fileName)));
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <input
                            type="checkbox"
                            checked={selectedFiles.size === images.length && images.length > 0}
                            readOnly
                            style={{
                                width: '18px',
                                height: '18px',
                                marginRight: '10px',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                            {selectedFiles.size === images.length && images.length > 0 ? 'Deselect All' : 'Select All'} ({images.length} images)
                        </span>
                    </div>
                </div>
            )}
            
            {viewMode === 'thumbnail' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '15px',
                    padding: '10px'
                }}>
                    {/* Show images */}
                    {images.slice(0, loadedImageCount).map((item, index) => (
                        <div
                            key={item.imageId}
                            className={`thumbnail-item ${
                                selectedFiles.has(item.fileName) ? 'selected' : ''
                            } ${
                                selectedImage === item.fileName ? 'recently-clicked' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.fileName)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleFileClick(item.fileName, index, e)}
                            style={{
                                border: '2px solid #e1e5e9',
                                borderRadius: '8px',
                                padding: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={selectedFiles.has(item.fileName)}
                                readOnly
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckboxChange(item.fileName, index, e);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    width: '20px',
                                    height: '20px',
                                    zIndex: 1,
                                    cursor: 'pointer'
                                }}
                            />
                            <img
                                src={item.url}
                                alt={item.fileName}
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    marginBottom: '8px'
                                }}
                            />
                            <div style={{
                                fontSize: '12px',
                                textAlign: 'center',
                                color: '#666',
                                wordBreak: 'break-word'
                            }}>
                                {item.fileName}
                            </div>
                        </div>
                    ))}
                    {hasMoreImages && (
                        <div
                            onClick={loadMoreImages}
                            style={{
                                border: '2px dashed #007bff',
                                borderRadius: '8px',
                                padding: '40px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#007bff',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            <i className="fas fa-plus" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                            Load More Images
                        </div>
                    )}
                </div>
            ) : (
                images.map((item, index) => (
                    <div
                        key={item.imageId}
                        className={`file-item ${
                            selectedFiles.has(item.fileName) ? 'selected' : ''
                        } ${
                            selectedImage === item.fileName ? 'recently-clicked' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.fileName)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                            if (e.target.type === 'checkbox') return;
                            handleFileClick(item.fileName, index, e);
                        }}
                    >
                        <input
                            type="checkbox"
                            className="checkbox"
                            checked={selectedFiles.has(item.fileName)}
                            readOnly
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(item.fileName, index, e);
                            }}
                            style={{
                                width: '18px',
                                height: '18px',
                                marginRight: '12px',
                                cursor: 'pointer'
                            }}
                        />
                        <i className="fas fa-image icon"></i>
                        {item.fileName}
                    </div>
                ))
            )}

            <ImagePreview
                isOpen={showImagePreview}
                imageName={selectedImage}
                imagePath={selectedImage ? (images.find(img => img.fileName === selectedImage)?.url || '') : ''}
                imageData={selectedImage ? images.find(img => img.fileName === selectedImage) : null}
                images={images}
                currentIndex={selectedImageIndex}
                onClose={() => setShowImagePreview(false)}
                onImageChange={(newImageName, newIndex) => {
                    setSelectedImage(newImageName);
                    setSelectedImageIndex(newIndex);
                }}
                onImageReplaced={() => {
                    // Clear cache and reload images
                    setImageCache(prev => {
                        const newCache = new Map(prev);
                        newCache.delete(currentFolder.folderId);
                        return newCache;
                    });
                    loadImages();
                }}
            />
        </div>
    );
}

// Tree View Component
function TreeView({ onFolderSelect, onDrop, refreshKey, onFolderCreated, onTreeDataChange }) {
    const [treeData, setTreeData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragOverPath, setDragOverPath] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [renameDialog, setRenameDialog] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [filterRecent, setFilterRecent] = useState(false);
    const [filterUser, setFilterUser] = useState(false);
    const treeRef = useRef(null);

    // NewImplementation - Add new folder to existing tree data
    const addFolderToTree = (newFolder) => {
        if (treeData && treeData.children) {
            const newChild = {
                name: newFolder.folderName,
                type: 'folder',
                folderId: newFolder.folderId,
                createdBy: newFolder.createdBy,
                createdAt: newFolder.createdAt,
                notes: newFolder.notes || '',
                children: []
            };
            
            const newTreeData = {
                ...treeData,
                children: [...treeData.children, newChild]
            };
            setTreeData(newTreeData);
            if (onTreeDataChange) onTreeDataChange(newTreeData);
        }
    };

    // NewImplementation - Expose addFolderToTree to parent
    useEffect(() => {
        if (onFolderCreated) {
            onFolderCreated.current = addFolderToTree;
        }
    }, [onFolderCreated, treeData]);

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

    const handleRightClick = (event, folder) => {
        event.preventDefault();
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            folder: folder
        });
    };

    const handleRename = (folder) => {
        setContextMenu(null);
        setRenameDialog(folder);
        setNewFolderName(folder.name);
    };

    const confirmRename = async () => {
        if (!renameDialog || !newFolderName.trim()) return;
        
        try {
            await apiService.renameFolder(renameDialog.folderId, newFolderName.trim());
            
            // Update tree data locally
            if (treeData && treeData.children) {
                const updatedChildren = treeData.children.map(child => 
                    child.folderId === renameDialog.folderId 
                        ? { ...child, name: newFolderName.trim() }
                        : child
                );
                const newTreeData = { ...treeData, children: updatedChildren };
                setTreeData(newTreeData);
                if (onTreeDataChange) onTreeDataChange(newTreeData);
            }
            
            setRenameDialog(null);
            setNewFolderName('');
        } catch (error) {
            alert('Failed to rename folder: ' + error.message);
        }
    };

    const cancelRename = () => {
        setRenameDialog(null);
        setNewFolderName('');
    };

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
        };
        
        if (contextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [contextMenu]);

    useEffect(() => {
        const loadTree = async () => {
            try {
                const rootData = await apiService.loadFolder('');
                setTreeData(rootData);
                if (onTreeDataChange) onTreeDataChange(rootData);
            } catch (error) {
                console.error('Failed to load tree:', error);
            }
        };
        loadTree();
    }, [refreshKey]);

    const matchesSearch = (name) => {
        return searchTerm === '' || name.toLowerCase().includes(searchTerm.toLowerCase());
    };

    const getFilteredFolders = () => {
        if (!treeData || !treeData.children) return [];
        
        let folders = [...treeData.children];
        const currentUser = localStorage.getItem('username');
        
        console.log('Current user:', currentUser);
        console.log('All folders:', folders.map(f => ({ name: f.name, createdBy: f.createdBy })));
        
        // Filter by user if enabled
        if (filterUser && currentUser) {
            folders = folders.filter(folder => {
                console.log(`Checking folder ${folder.name}: createdBy=${folder.createdBy}, currentUser=${currentUser}`);
                // Only show folders created by current user (strict filtering)
                return folder.createdBy === currentUser;
            });
        }
        
        // Sort by recent if enabled
        if (filterRecent) {
            folders.sort((a, b) => {
                const dateA = new Date(a.createdAt || '1970-01-01');
                const dateB = new Date(b.createdAt || '1970-01-01');
                return dateB - dateA; // Most recent first
            });
        }
        
        // Apply search filter
        const filtered = folders.filter(folder => matchesSearch(folder.name));
        console.log('Filtered folders:', filtered.map(f => f.name));
        return filtered;
    };

    const renderTreeNode = (node, path = []) => {
        if (!node || node.type !== 'folder') return null;
        const isRoot = path.length === 0;
        const pathString = path.join('/');
        const isDragOver = dragOverPath === pathString;
        
        // Only show root level folders in tree
        if (path.length > 1) return null;

        // Filter based on search term
        if (!isRoot && !matchesSearch(node.name)) return null;

        return (
            <div key={node.name}>
                <div
                    ref={!isRoot && matchesSearch(node.name) && searchTerm ? (el) => {
                        if (el) {
                            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                        }
                    } : null}
                    className={`folder-item ${isRoot ? 'root-folder' : ''} ${isDragOver ? 'drag-over' : ''} ${
                        !isRoot && matchesSearch(node.name) && searchTerm ? 'search-highlight' : ''
                    }`}
                    onClick={isRoot ? undefined : () => onFolderSelect({
                        folderId: node.folderId,
                        name: node.name
                    })}
                    onContextMenu={!isRoot ? (e) => handleRightClick(e, node) : undefined}
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
                        {getFilteredFolders()
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
            {/* Filter Options */}
            <div style={{
                padding: '15px',
                borderBottom: '1px solid #e1e5e9',
                background: '#f8f9fa'
            }}>
                <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '500', color: '#495057' }}>Filters</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#6c757d'
                    }}>
                        <input
                            type="checkbox"
                            checked={filterRecent}
                            onChange={(e) => setFilterRecent(e.target.checked)}
                            style={{ marginRight: '6px' }}
                        />
                        Recent
                    </label>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#6c757d'
                    }}>
                        <input
                            type="checkbox"
                            checked={filterUser}
                            onChange={(e) => setFilterUser(e.target.checked)}
                            style={{ marginRight: '6px' }}
                        />
                        My Folders
                    </label>
                </div>
            </div>
            
            <input
                type="text"
                className="search-box"
                placeholder="Search folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div ref={treeRef}>
                {renderTreeNode(treeData)}
            </div>
            
            {/* Context Menu */}
            {contextMenu && (
                <div style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    minWidth: '120px'
                }}>
                    <div
                        onClick={() => handleRename(contextMenu.folder)}
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            borderBottom: '1px solid #eee'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                        Rename Folder
                    </div>
                </div>
            )}
            
            {/* Rename Dialog */}
            {renameDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        minWidth: '300px'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Rename Folder</h3>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && confirmRename()}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                marginBottom: '15px'
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={cancelRename}
                                style={{
                                    padding: '6px 12px',
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                ✕
                            </button>
                            <button
                                onClick={confirmRename}
                                disabled={!newFolderName.trim()}
                                style={{
                                    padding: '6px 12px',
                                    background: newFolderName.trim() ? '#28a745' : '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '12px'
                                }}
                            >
                                ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Main File Manager Component
function FileManager({ currentPath, onNavigate }) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [moveData, setMoveData] = useState(null);
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [currentImages, setCurrentImages] = useState([]);
    const [showNotesDialog, setShowNotesDialog] = useState(false);
    const [folderNotes, setFolderNotes] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    
    // NewImplementation - Ref to add folder without API call
    const folderCreatedRef = useRef(null);

    // Helper function to find folder ID by path
    const findFolderIdByPath = (targetPath) => {
        if (!treeData || !treeData.children) return null;
        
        const folderName = targetPath.split('/').pop();
        const folder = treeData.children.find(child => child.name === folderName);
        return folder ? folder.folderId : null;
    };

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isResizing) return;
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 600) {
            setSidebarWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing]);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleTreeDrop = (files, targetPath) => {
        const folderName = targetPath.split('/').pop() || 'root';
        setMoveData({ files, targetFolder: folderName, targetPath });
        setShowMoveDialog(true);
    };

    const handleFolderSelect = (folder) => {
        setSelectedFolder(folder);
        setFolderNotes(folder.notes || '');
    };

    const handleNotesOpen = () => {
        if (selectedFolder) {
            setFolderNotes(selectedFolder.notes || '');
            setShowNotesDialog(true);
        }
    };

    const handleNotesSave = async () => {
        if (!selectedFolder) return;
        
        setNotesLoading(true);
        try {
            await apiService.updateFolderNotes(selectedFolder.folderId, folderNotes);
            
            // Update local folder data
            const updatedFolder = { ...selectedFolder, notes: folderNotes };
            setSelectedFolder(updatedFolder);
            
            // Update tree data
            if (treeData && treeData.children) {
                const updatedChildren = treeData.children.map(child => 
                    child.folderId === selectedFolder.folderId 
                        ? { ...child, notes: folderNotes }
                        : child
                );
                const newTreeData = { ...treeData, children: updatedChildren };
                setTreeData(newTreeData);
            }
            
            setShowNotesDialog(false);
        } catch (error) {
            alert('Failed to save notes: ' + error.message);
        } finally {
            setNotesLoading(false);
        }
    };

    const handleNotesCancel = () => {
        setFolderNotes(selectedFolder?.notes || '');
        setShowNotesDialog(false);
    };

    const confirmMove = async () => {
        if (moveData) {
            try {
                // Get image IDs from selected files
                const imageIds = currentImages
                    .filter(img => moveData.files.includes(img.fileName))
                    .map(img => img.imageId);
                
                if (imageIds.length > 0) {
                    // Find target folder ID from tree data
                    const targetFolderId = findFolderIdByPath(moveData.targetPath);
                    if (targetFolderId) {
                        await apiService.moveImages(imageIds, targetFolderId);
                        handleRefresh();
                    } else {
                        alert('Target folder not found');
                    }
                } else {
                    alert('No images selected for move');
                }
            } catch (error) {
                alert('Failed to move files: ' + error.message);
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
            <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
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
                                    // NewImplementation - Create folder and get response
                                    const result = await apiService.createFolder(folderName.trim());
                                    
                                    // NewImplementation - Add to tree without API call
                                    if (result.folder && folderCreatedRef.current) {
                                        folderCreatedRef.current(result.folder);
                                    }
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
                    <TreeView 
                        key={refreshKey} 
                        onFolderSelect={handleFolderSelect}
                        onDrop={handleTreeDrop} 
                        refreshKey={refreshKey}
                        onFolderCreated={folderCreatedRef}
                        onTreeDataChange={setTreeData}
                    />
                </div>
            </div>
            <div 
                className="resize-handle"
                onMouseDown={handleMouseDown}
                style={{
                    width: '4px',
                    cursor: 'col-resize',
                    backgroundColor: isResizing ? '#007bff' : 'transparent',
                    borderRight: '1px solid #e1e5e9',
                    userSelect: 'none'
                }}
            />
            <div className="main" style={{ flex: 1 }}>
                <div className="toolbar">
                    <div className="breadcrumb">
                        {selectedFolder ? selectedFolder.name : 'Select a folder'}
                    </div>
                    {selectedFolder && (
                        <button
                            onClick={handleNotesOpen}
                            style={{
                                padding: '6px 12px',
                                background: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginLeft: '10px'
                            }}
                        >
                            <i className="fas fa-sticky-note" style={{ marginRight: '6px' }}></i>
                            Notes
                        </button>
                    )}
                </div>
                <div className="content">
                    <ContentView
                        key={refreshKey}
                        currentFolder={selectedFolder}
                        onRefresh={handleRefresh}
                        onImagesChange={setCurrentImages}
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

            {/* Notes Dialog */}
            {showNotesDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        width: '600px',
                        maxWidth: '90vw',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #e1e5e9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                Notes for "{selectedFolder?.name}"
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleNotesCancel}
                                    disabled={notesLoading}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: notesLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✕
                                </button>
                                <button
                                    onClick={handleNotesSave}
                                    disabled={notesLoading}
                                    style={{
                                        padding: '8px 12px',
                                        background: notesLoading ? '#6c757d' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: notesLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    {notesLoading ? '...' : '✓'}
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '20px', flex: 1 }}>
                            <textarea
                                value={folderNotes}
                                onChange={(e) => setFolderNotes(e.target.value)}
                                placeholder="Add notes for this folder...\n\nYou can use basic markdown:\n- **bold text**\n- *italic text*\n- # Headers\n- - Lists"
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                    minHeight: '200px',
                                    maxHeight: '400px'
                                }}
                                disabled={notesLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FileManager;