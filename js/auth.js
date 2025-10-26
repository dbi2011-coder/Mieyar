// نظام المصادقة مع Supabase - الإصدار المبسط
async function loginAdmin(username, password) {
    console.log('🔐 محاولة تسجيل دخول:', username);
    
    try {
        // استخدام الدالة المخزنة في Supabase
        const { data, error } = await supabase.rpc('verify_admin_password', {
            p_username: username,
            p_password: password
        });

        if (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            return false;
        }
        
        if (data) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminLoginTime', new Date().toISOString());
            localStorage.setItem('adminUsername', username);
            console.log('✅ تسجيل الدخول ناجح');
            return true;
        } else {
            console.log('❌ بيانات الدخول غير صحيحة');
            return false;
        }
    } catch (error) {
        console.error('❌ خطأ في الاتصال:', error);
        return false;
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUsername');
    console.log('✅ تم تسجيل الخروج');
}

function isAdminLoggedIn() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!loggedIn || loggedIn !== 'true') {
        return false;
    }
    
    // التحقق من انتهاء الجلسة (24 ساعة)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const currentDate = new Date();
        const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            logoutAdmin();
            return false;
        }
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
