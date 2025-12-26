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
            local: 'https://l0mfi5f7ue.execute-api.us-east-1.amazonaws.com/prod',
            prod: 'https://l0mfi5f7ue.execute-api.us-east-1.amazonaws.com/prod'
        };
        
        return config[env];
    }

    async loadFolder(path = '') {
        try {
            const url = path 
                ? `${this.baseUrl}/files?path=${encodeURIComponent(path)}`
                : `${this.baseUrl}/files`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Convert AWS API format to UI expected format
            const children = [
                ...data.folders.map(folder => ({
                    name: folder.name,
                    type: 'folder',
                    children: []
                })),
                ...data.files.map(file => ({
                    name: file.name,
                    type: 'file',
                    size: file.size || 0,
                    modified: file.lastModified || new Date()
                }))
            ];
            
            return {
                name: path || 'root',
                type: 'folder',
                children
            };
        } catch (error) {
            console.error('Failed to load folder:', error);
            throw error;
        }
    }

    async moveFiles(files, targetPath) {
        try {
            const response = await fetch(`${this.baseUrl}/create-folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'move_files',
                    files, 
                    targetPath 
                })
            });
            
            if (!response.ok) {
                throw new Error(`Move failed: ${response.statusText}`);
            }
            return true;
        } catch (error) {
            console.error('Move files failed:', error);
            return false;
        }
    }

    async uploadFiles(targetFolder, files) {
        try {
            const fileData = await Promise.all(
                files.map(file => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve({
                            name: file.name,
                            content: base64,
                            type: file.type
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }))
            );

            const response = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetFolder,
                    files: fileData
                })
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    async createFolder(folderName) {
        try {
            const response = await fetch(`${this.baseUrl}/create-folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'create_folder',
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

    async loadImages(folderPath = '', limit = 20, offset = 0) {
        try {
            const url = `${this.baseUrl}/images?folder=${encodeURIComponent(folderPath)}&limit=${limit}&offset=${offset}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to load images:', error);
            throw error;
        }
    }
}

// Export as default for ES6 modules
const apiService = new ApiService();
export default apiService;