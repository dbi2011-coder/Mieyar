// نظام المصادقة مع Supabase
function loginAdmin(username, password) {
    return window.loginAdmin(username, password);
}

function logoutAdmin() {
    return window.logoutAdmin();
}

function isAdminLoggedIn() {
    return window.isAdminLoggedIn();
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
