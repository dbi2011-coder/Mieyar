// Supabase configuration
const SUPABASE_URL = 'https://eamerqxoxkhergjagxns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWVycXhveGtoZXJnamFneG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDkyNDUsImV4cCI6MjA3NjU4NTI0NX0.41VKtI7XhA0KkF1GdKhRDCrKCmHoIgUUQWiO_7MFwfM';

// Create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
async function supabaseLoginAdmin(username, password) {
    try {
        const { data, error } = await supabaseClient
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

function supabaseLogoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUsername');
}

function supabaseIsAdminLoggedIn() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!loggedIn || !loginTime) {
        return false;
    }
    
    const loginDate = new Date(loginTime);
    const currentDate = new Date();
    const hoursDiff = (currentDate - loginDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        supabaseLogoutAdmin();
        return false;
    }
    
    return true;
}

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
window.supabaseLoginAdmin = supabaseLoginAdmin;
window.supabaseLogoutAdmin = supabaseLogoutAdmin;
window.supabaseIsAdminLoggedIn = supabaseIsAdminLoggedIn;
window.supabaseFetchData = supabaseFetchData;
window.supabaseInsertData = supabaseInsertData;
window.supabaseUpdateData = supabaseUpdateData;
window.supabaseDeleteData = supabaseDeleteData;
