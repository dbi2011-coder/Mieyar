// الدوال العامة والمشتركة بين الصفحات

// دالة لتحميل البيانات من localStorage
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

// دالة لحفظ البيانات في localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

// دالة لعرض رسائل التنبيه بشكل أفضل
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    alertDiv.style.backgroundColor = colors[type] || colors.info;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}

// دالة لتنسيق الوقت
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// دالة للتحقق من صحة رابط YouTube
function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;
    return pattern.test(url);
}

// دالة للتحقق من صحة رابط الصورة
function isValidImageUrl(url) {
    const pattern = /^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
    return pattern.test(url);
}

// دالة لإنشاء معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// دالة لتنظيف المدخلات من الأحرف الضارة
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// دالة للتحقق من اتصال الإنترنت
function checkInternetConnection() {
    return navigator.onLine;
}

// دالة لعرض مؤشر تحميل
function showLoading() {
    let loadingDiv = document.getElementById('loading-indicator');
    
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 10px;">جاري التحميل...</p>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(loadingDiv);
    }
    
    loadingDiv.style.display = 'flex';
}

// دالة لإخفاء مؤشر تحميل
function hideLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// دالة للتحقق من دعم localStorage
function isLocalStorageSupported() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// تهيئة التطبيق
function initializeApp() {
    if (!isLocalStorageSupported()) {
        alert('المتصفح لا يدعم التخزين المحلي. قد لا تعمل بعض الميزات بشكل صحيح.');
        return false;
    }
    
    // تنظيف الجلسات المنتهية
    cleanupExpiredSessions();
    
    return true;
}

// تنظيف الجلسات المنتهية
function cleanupExpiredSessions() {
    const loginTime = localStorage.getItem('adminLoginTime');
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const currentDate = new Date();
        const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminLoginTime');
        }
    }
}

// تشغيل التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});
