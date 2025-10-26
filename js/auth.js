// نظام المصادقة مع Supabase - الإصدار النهائي

// دالة تسجيل الدخول المعدلة
async function loginAdmin(username, password) {
    console.log('🔐 محاولة تسجيل دخول إلى Supabase:', username);
    
    try {
        // طريقة مباشرة - التحقق من الجدول مباشرة
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.error('❌ خطأ في الاستعلام:', error);
            return false;
        }
        
        if (!data) {
            console.log('❌ المستخدم غير موجود');
            return false;
        }
        
        // استخدام الدالة المخزنة للتحقق من كلمة المرور
        const { data: loginResult, error: loginError } = await supabase
            .rpc('verify_admin_password', {
                p_username: username,
                p_password: password
            });

        if (loginError) {
            console.error('❌ خطأ في التحقق من كلمة المرور:', loginError);
            return false;
        }
        
        if (loginResult) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminLoginTime', new Date().toISOString());
            localStorage.setItem('adminUsername', username);
            console.log('✅ تسجيل الدخول ناجح مع Supabase');
            return true;
        } else {
            console.log('❌ كلمة المرور غير صحيحة');
            return false;
        }
        
    } catch (error) {
        console.error('❌ خطأ غير متوقع:', error);
        return false;
    }
}

// دالة تسجيل الخروج
function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUsername');
    console.log('✅ تم تسجيل الخروج');
}

// دالة التحقق من تسجيل الدخول
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

// دالة الحصول على وقت الجلسة
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
