// فحص مصادقة المسؤول بشكل منفصل
function checkAdminAuthentication() {
    console.log('🔐 فحص مصادقة المسؤول...');
    
    // طريقة بسيطة للتحقق من localStorage مباشرة
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    console.log('adminLoggedIn:', adminLoggedIn);
    console.log('loginTime:', loginTime);
    
    if (!adminLoggedIn || adminLoggedIn !== 'true') {
        console.log('❌ المسؤول غير مسجل دخول');
        alert('يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة');
        window.location.href = 'index.html';
        return false;
    }
    
    // التحقق من انتهاء الجلسة
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const currentDate = new Date();
        const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            console.log('❌ انتهت مدة الجلسة');
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminLoginTime');
            alert('انتهت مدة الجلسة، يرجى تسجيل الدخول مرة أخرى');
            window.location.href = 'index.html';
            return false;
        }
    }
    
    console.log('✅ المسؤول مسجل دخول بنجاح');
    return true;
}

// تشغيل فحص المصادقة فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء فحص المصادقة...');
    
    if (checkAdminAuthentication()) {
        // إذا كان مسجلاً، تهيئة الواجهة بعد تحميل الملفات
        setTimeout(function() {
            if (typeof initAdmin === 'function') {
                initAdmin();
            }
            
            // إضافة حدث تسجيل الخروج
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                        localStorage.removeItem('adminLoggedIn');
                        localStorage.removeItem('adminLoginTime');
                        window.location.href = 'index.html';
                    }
                });
            }
        }, 500);
    }
});
