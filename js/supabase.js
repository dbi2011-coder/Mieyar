// Supabase configuration
const SUPABASE_URL = 'https://eamerqxoxkhergjagxns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWVycXhveGtoZXJnamFneG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDkyNDUsImV4cCI6MjA3NjU4NTI0NX0.41VKtI7XhA0KkF1GdKhRDCrKCmHoIgUUQWiO_7MFwfM';

// Create Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
async function loginAdmin(username, password) {
    try {
        const { data, error } = await supabase
            .rpc('verify_admin_password', {
                p_username: username,
                p_password: password
            });

        if (error) {
            console.error('Login error:', error);
            return false;
        }
        
        if (data) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminLoginTime', new Date().toISOString());
            localStorage.setItem('adminUsername', username);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUsername');
}

function isAdminLoggedIn() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!loggedIn || !loginTime) {
        return false;
    }
    
    const loginDate = new Date(loginTime);
    const currentDate = new Date();
    const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        logoutAdmin();
        return false;
    }
    
    return true;
}

// Helper functions
async function fetchData(table, options = {}) {
    try {
        let query = supabase.from(table).select('*');
        
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

async function insertData(table, data) {
    try {
        const { data: result, error } = await supabase
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

async function updateData(table, id, data) {
    try {
        const { error } = await supabase
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

async function deleteData(table, id) {
    try {
        const { error } = await supabase
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
window.supabase = supabase;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.isAdminLoggedIn = isAdminLoggedIn;
window.fetchData = fetchData;
window.insertData = insertData;
window.updateData = updateData;
window.deleteData = deleteData;
