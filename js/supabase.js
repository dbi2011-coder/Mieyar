// Supabase configuration
const SUPABASE_URL = 'https://eamerqxoxkhergjagxns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWVycXhveGtoZXJnamFneG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDkyNDUsImV4cCI6MjA3NjU4NTI0NX0.41VKtI7XhA0KkF1GdKhRDCrKCmHoIgUUQWiO_7MFwfM';

// Create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions - باستخدام جلسات Supabase الحقيقية
class AdminSession {
    constructor() {
        this.sessionKey = 'admin_session_token';
        this.init();
    }

    init() {
        // محاولة استعادة الجلسة من sessionStorage
        const savedSession = sessionStorage.getItem(this.sessionKey);
        if (savedSession) {
            try {
                this.currentSession = JSON.parse(savedSession);
                console.log('✅ تم استعادة الجلسة:', this.currentSession);
            } catch (e) {
                console.error('❌ خطأ في استعادة الجلسة:', e);
                this.clearSession();
            }
        }
    }

    async login(username, password) {
        try {
            console.log('🔐 محاولة تسجيل الدخول:', username);
            
            const { data, error } = await supabaseClient
                .rpc('verify_admin_password', {
                    p_username: username,
                    p_password: password
                });

            if (error) {
                console.error('❌ خطأ في تسجيل الدخول:', error);
                return false;
            }
            
            console.log('✅ نتيجة التحقق من كلمة المرور:', data);
            
            if (data) {
                // إنشاء جلسة جديدة
                this.currentSession = {
                    username: username,
                    loginTime: new Date().toISOString(),
                    isLoggedIn: true,
                    token: this.generateToken()
                };
                
                // حفظ الجلسة في sessionStorage
                sessionStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession));
                
                console.log('✅ تم تسجيل الدخول بنجاح في Supabase');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            return false;
        }
    }

    logout() {
        this.clearSession();
        console.log('✅ تم تسجيل الخروج');
    }

    isLoggedIn() {
        if (!this.currentSession) {
            return false;
        }
        
        // التحقق من انتهاء الجلسة (24 ساعة)
        const loginDate = new Date(this.currentSession.loginTime);
        const currentDate = new Date();
        const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            this.logout();
            return false;
        }
        
        return this.currentSession.isLoggedIn === true;
    }

    clearSession() {
        this.currentSession = null;
        sessionStorage.removeItem(this.sessionKey);
    }

    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionInfo() {
        return this.currentSession;
    }
}

// إنشاء instance واحدة من AdminSession
const adminSession = new AdminSession();

// Helper functions
async function supabaseFetchData(table, options = {}) {
    try {
        let query = supabaseClient.from(table).select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy, { ascending: options.ascending || false });
        }
        
        if (options.filter) {
            query = query.eq(options.filter.field, options.filter.value);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error(`Error fetching from ${table}:`, error);
        return [];
    }
}

async function supabaseInsertData(table, data) {
    try {
        const { data: result, error } = await supabaseClient
            .from(table)
            .insert([data])
            .select();
        
        if (error) throw error;
        return result ? result[0] : null;
    } catch (error) {
        console.error(`Error inserting into ${table}:`, error);
        return null;
    }
}

async function supabaseUpdateData(table, id, data) {
    try {
        const { error } = await supabaseClient
            .from(table)
            .update(data)
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Error updating ${table}:`, error);
        return false;
    }
}

async function supabaseDeleteData(table, id) {
    try {
        const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Error deleting from ${table}:`, error);
        return false;
    }
}

// Export functions
window.supabase = supabaseClient;
window.supabaseLoginAdmin = (username, password) => adminSession.login(username, password);
window.supabaseLogoutAdmin = () => adminSession.logout();
window.supabaseIsAdminLoggedIn = () => adminSession.isLoggedIn();
window.supabaseFetchData = supabaseFetchData;
window.supabaseInsertData = supabaseInsertData;
window.supabaseUpdateData = supabaseUpdateData;
window.supabaseDeleteData = supabaseDeleteData;

// دالة لفحص حالة الجلسة
window.checkAdminSession = () => {
    console.log('🔐 فحص حالة الجلسة:', adminSession.getSessionInfo());
    return adminSession.isLoggedIn();
};
