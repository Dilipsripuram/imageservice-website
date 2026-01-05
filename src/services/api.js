/**
 * API Service Layer
 * Handles all backend communication
 */
class ApiService {
    constructor() {
        this.baseUrl = this.getApiBaseUrl();
    }

    getApiBaseUrl() {
        // Environment-based API URL configuration
        const env = window.location.hostname === 'localhost' ? 'local' : 'prod';
        
        const config = {
            local: 'https://yhmbosh4rf.execute-api.us-east-1.amazonaws.com/prod',
            prod: 'https://yhmbosh4rf.execute-api.us-east-1.amazonaws.com/prod'
        };
        
        return config[env];
    }

    // Helper method to handle API responses and check for auth errors
    async handleResponse(response) {
        if (response.status === 401) {
            // Token expired or invalid - clear auth and redirect to login
            this.logout();
            window.location.reload(); // Force app to show login screen
            throw new Error('Authentication required');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // NewImplementation - Load all folders at once
    async loadFolder(path = '') {
        try {
            const response = await fetch(`${this.baseUrl}/folders`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await this.handleResponse(response);
            
            // NewImplementation - Convert to UI expected format
            const children = data.folders.map(folder => ({
                name: folder.folderName,
                type: 'folder',
                folderId: folder.folderId,
                createdBy: folder.createdBy,
                createdAt: folder.createdAt,
                notes: folder.notes || '',
                children: []
            }));
            
            return {
                name: 'root',
                type: 'folder',
                children
            };
        } catch (error) {
            console.error('Failed to load folder:', error);
            throw error;
        }
    }

    // NewImplementation - Move images to different folder
    async moveImages(imageIds, targetFolderId) {
        try {
            const response = await fetch(`${this.baseUrl}/images`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    imageIds,
                    targetFolderId 
                })
            });
            
            if (!response.ok) {
                throw new Error(`Move failed: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Move images failed:', error);
            throw error;
        }
    }

    // NewImplementation - Move folder to different parent
    async moveFolder(folderId, newParentId) {
        try {
            const response = await fetch(`${this.baseUrl}/folders`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    folderId,
                    newParentId 
                })
            });
            
            if (!response.ok) {
                throw new Error(`Move folder failed: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Move folder failed:', error);
            throw error;
        }
    }

    // NewImplementation - Upload files with batching
    async uploadFiles(folderId, files, onProgress = null) {
        try {
            const MAX_BATCH_SIZE = 5 * 1024 * 1024; // 5MB to stay well under 10MB limit
            
            // Convert files to base64 and calculate sizes
            const fileDataPromises = files.map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    const sizeInBytes = Math.ceil(base64.length * 0.75); // Approximate original size
                    resolve({
                        name: file.name,
                        content: base64,
                        type: file.type,
                        size: sizeInBytes
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }));
            
            const fileData = await Promise.all(fileDataPromises);
            
            // Create batches based on size
            const batches = [];
            let currentBatch = [];
            let currentBatchSize = 0;
            
            for (const file of fileData) {
                // If adding this file would exceed the limit, start a new batch
                if (currentBatchSize + file.size > MAX_BATCH_SIZE && currentBatch.length > 0) {
                    batches.push(currentBatch);
                    currentBatch = [file];
                    currentBatchSize = file.size;
                } else {
                    currentBatch.push(file);
                    currentBatchSize += file.size;
                }
            }
            
            // Add the last batch if it has files
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
            }
            
            // Upload batches sequentially
            let totalUploaded = 0;
            const allResults = {
                uploadedImages: [],
                failedUploads: []
            };
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                
                try {
                    const response = await fetch(`${this.baseUrl}/images`, {
                        method: 'POST',
                        headers: this.getAuthHeaders(),
                        body: JSON.stringify({
                            folderId,
                            files: batch.map(f => ({ name: f.name, content: f.content, type: f.type }))
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Batch ${i + 1} failed: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    // Merge results
                    if (result.uploadedImages) {
                        allResults.uploadedImages.push(...result.uploadedImages);
                    }
                    if (result.failedUploads) {
                        allResults.failedUploads.push(...result.failedUploads);
                    }
                    
                    totalUploaded += batch.length;
                    
                    // Call progress callback if provided
                    if (onProgress) {
                        onProgress(totalUploaded, files.length);
                    }
                    
                } catch (error) {
                    console.error(`Batch ${i + 1} upload failed:`, error);
                    // Mark all files in this batch as failed
                    batch.forEach(file => {
                        allResults.failedUploads.push({
                            fileName: file.name,
                            error: error.message
                        });
                    });
                }
            }
            
            return allResults;
            
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    // NewImplementation - Create folder and return new folder data
    async createFolder(folderName) {
        try {
            const response = await fetch(`${this.baseUrl}/folders`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    folderName 
                })
            });

            if (!response.ok) {
                throw new Error(`Create folder failed: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Create folder failed:', error);
            throw error;
        }
    }

    // NewImplementation - Load images with pagination
    async loadImages(folderId, limit = 20, lastKey = null) {
        try {
            let url = `${this.baseUrl}/images?folderId=${encodeURIComponent(folderId)}&limit=${limit}`;
            if (lastKey) {
                url += `&lastKey=${encodeURIComponent(lastKey)}`;
            }
            
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to load images:', error);
            throw error;
        }
    }

    // NewImplementation - Login function
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseUrl}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                throw new Error('Login failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // NewImplementation - Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }

    // NewImplementation - Logout
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
    }

    // NewImplementation - Rename folder
    async renameFolder(folderId, newFolderName) {
        try {
            const response = await fetch(`${this.baseUrl}/folders`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    folderId,
                    newFolderName 
                })
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Rename folder failed:', error);
            throw error;
        }
    }

    // NewImplementation - Replace image
    async replaceImage(imageId, newFile) {
        try {
            // Convert file to base64
            const base64Content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(newFile);
            });
            
            const response = await fetch(`${this.baseUrl}/images`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    imageId,
                    newImageContent: base64Content,
                    newFileName: newFile.name,
                    newContentType: newFile.type
                })
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Replace image failed:', error);
            throw error;
        }
    }

    // Update folder notes
    async updateFolderNotes(folderId, notes) {
        try {
            const response = await fetch(`${this.baseUrl}/folders`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    folderId,
                    notes 
                })
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Update folder notes failed:', error);
            throw error;
        }
    }
}

// Export as default for ES6 modules
const apiService = new ApiService();
export default apiService;