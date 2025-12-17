export const CONFIG = {
    isGitHubPages: window.location.hostname.includes('github.io'),
    basePath: window.location.hostname.includes('github.io') ? '/medication-diary' : ''
};

export function getAssetPath(path) {
    return CONFIG.basePath + path;
}

export async function dynamicImport(modulePath) {
    try {
        return await import(CONFIG.basePath + modulePath);
    } catch (error) {
        console.warn('Failed to load with base path, trying relative:', error);
        return await import(modulePath);
    }
}