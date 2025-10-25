// نظام المصادقة وإدارة الجلسات

function loginAdmin(username, password) {
    if (username === 'عاصم البيشي' && password === '0509894176') {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        return true;
    }
    return false;
}

function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
}

function isAdminLoggedIn() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!loggedIn || !loginTime) {
        return false;
    }
    
    // التحقق من انتهاء الجلسة (24 ساعة)
    const loginDate = new Date(loginTime);
    const currentDate = new Date();
    const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        logoutAdmin();
        return false;
    }
    
    return true;
}

function getAdminSessionTime() {
    const loginTime = localStorage.getItem('adminLoginTime');
    if (!loginTime) return '0:00';
    
    const loginDate = new Date(loginTime);
    const currentDate = new Date();
    const diffMs = currentDate - loginDate;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}
