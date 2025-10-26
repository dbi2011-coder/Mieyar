// نظام المصادقة المبسط والمباشر
const ADMIN_CREDENTIALS = {
    username: 'عاصم البيشي',
    password: '0509894176'
};

// تسجيل الدخول - بدون Supabase
function loginAdmin(username, password) {
    console.log('محاولة تسجيل دخول:', username);
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        localStorage.setItem('adminUsername', username);
        console.log('✅ تسجيل الدخول ناجح');
        return true;
    }
    console.log('❌ تسجيل الدخول فاشل');
    return false;
}

// تسجيل الخروج
function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUsername');
    console.log('✅ تسجيل الخروج');
}

// التحقق من تسجيل الدخول
function isAdminLoggedIn() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    console.log('فحص التسجيل:', { loggedIn, loginTime });
    
    if (!loggedIn || loggedIn !== 'true') {
        return false;
    }
    
    // التحقق من انتهاء الجلسة (24 ساعة)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const currentDate = new Date();
        const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
        
        console.log('مدة الجلسة:', hoursDiff, 'ساعة');
        
        if (hoursDiff > 24) {
            logoutAdmin();
            return false;
        }
    }
    
    return true;
}

// وقت الجلسة
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
